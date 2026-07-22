/**
 * Authentication service — PKCE helpers, token exchange/refresh, and session JWT.
 *
 * Implements the Spotify OAuth 2.0 PKCE flow helpers, token exchange and
 * refresh, and the HS256 session JWT used throughout the application.
 *
 * PKCE implementation details (per design doc):
 *   - code_verifier : 96-character URL-safe base64 random string
 *   - code_challenge: SHA-256 hash of the verifier, base64url-encoded (S256)
 *   - state         : 16-byte random value, hex-encoded (CSRF prevention)
 *
 * JWT details:
 *   - Algorithm : HS256
 *   - Signing key: loaded from Secret Manager (JWT_SIGNING_KEY)
 *   - Expiry    : 1 hour
 *
 * Token exchange / refresh:
 *   - Spotify client ID from env SPOTIFY_CLIENT_ID
 *   - Spotify client secret from Secret Manager (SPOTIFY_CLIENT_SECRET)
 *   - Refresh token encryption key from Secret Manager (REFRESH_TOKEN_ENCRYPTION_KEY)
 *     stored as a 64-char hex string (32 bytes)
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */

import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { getSecret } from '../lib/secretManager.js';
import { AuthError } from '../lib/errors.js';
import { encrypt, decrypt } from '../lib/encryption.js';
import { upsertUser } from '../clients/firestoreClient.js';
import type { SessionPayload } from '../lib/types.js';

// ---------------------------------------------------------------------------
// PKCE helpers
// ---------------------------------------------------------------------------

/**
 * Result of a single PKCE generation.
 */
export interface PkceBundle {
  /** 96-character URL-safe base64 random string. Stored server-side for the callback. */
  codeVerifier: string;
  /** SHA-256 hash of `codeVerifier`, base64url-encoded. Sent to Spotify as the challenge. */
  codeChallenge: string;
  /** S256 — the only supported PKCE challenge method. */
  codeChallengeMethod: 'S256';
}

/**
 * Generates a PKCE bundle for the Spotify OAuth authorization request.
 *
 * - `codeVerifier` : 96 characters of URL-safe base64 (from 72 random bytes,
 *   base64url-encoded, yielding exactly 96 characters with no padding).
 * - `codeChallenge`: SHA-256 hash of the verifier, base64url-encoded (S256 method).
 *
 * @returns A `PkceBundle` containing the verifier, challenge, and method.
 */
export function generatePkce(): PkceBundle {
  // 72 random bytes → base64url (no padding) → 96 characters
  const codeVerifier = randomBytes(72).toString('base64url');

  // SHA-256 hash of the UTF-8 encoded verifier, then base64url-encode
  const codeChallenge = createHash('sha256').update(codeVerifier, 'utf8').digest('base64url');

  return { codeVerifier, codeChallenge, codeChallengeMethod: 'S256' };
}

/**
 * Generates a random state parameter for CSRF prevention.
 *
 * @returns A 32-character lowercase hex string derived from 16 random bytes.
 */
export function generateState(): string {
  return randomBytes(16).toString('hex');
}

// ---------------------------------------------------------------------------
// Session JWT helpers
// ---------------------------------------------------------------------------

/** JWT expiry — 1 hour in seconds. */
const JWT_EXPIRY_SECONDS = 3600;

/**
 * Signs a `SessionPayload` as an HS256 JWT with a 1-hour expiry.
 *
 * The signing key is fetched from the in-memory secret cache via
 * `getSecret('JWT_SIGNING_KEY')`. Call `loadSecrets()` before using this function.
 *
 * @param payload - The session data to embed in the JWT (spotifyUserId, displayName).
 *   `iat` and `exp` are set automatically by `jsonwebtoken`; any values you pass
 *   will be overridden.
 * @returns A signed JWT string.
 */
export function signSessionJwt(payload: Omit<SessionPayload, 'iat' | 'exp'>): string {
  const signingKey = getSecret('JWT_SIGNING_KEY');

  return jwt.sign(payload, signingKey, {
    algorithm: 'HS256',
    expiresIn: JWT_EXPIRY_SECONDS,
  });
}

/**
 * Verifies an HS256 session JWT and returns the typed `SessionPayload`.
 *
 * @param token - The JWT string to verify.
 * @returns The verified and typed `SessionPayload`.
 * @throws {AuthError} with code `'SESSION_EXPIRED'` if the token has expired.
 * @throws {AuthError} with code `'INVALID_SESSION'` for any other verification failure.
 */
export function verifySessionJwt(token: string): SessionPayload {
  const signingKey = getSecret('JWT_SIGNING_KEY');

  let decoded: jwt.JwtPayload | string;
  try {
    decoded = jwt.verify(token, signingKey, { algorithms: ['HS256'] });
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AuthError('SESSION_EXPIRED', 'Session has expired. Please log in again.', 401);
    }
    throw new AuthError('INVALID_SESSION', 'Invalid session token. Please log in.', 401);
  }

  if (typeof decoded === 'string' || decoded === null) {
    throw new AuthError('INVALID_SESSION', 'Unexpected JWT payload format.', 401);
  }

  const { spotifyUserId, displayName, iat, exp } = decoded as Record<string, unknown>;

  if (
    typeof spotifyUserId !== 'string' ||
    typeof displayName !== 'string' ||
    typeof iat !== 'number' ||
    typeof exp !== 'number'
  ) {
    throw new AuthError('INVALID_SESSION', 'JWT payload is missing required fields.', 401);
  }

  return { spotifyUserId, displayName, iat, exp };
}

// ---------------------------------------------------------------------------
// Spotify token exchange and refresh
// ---------------------------------------------------------------------------

/** The Spotify token endpoint. */
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

/**
 * Shape of a successful Spotify token endpoint response.
 */
interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token: string;
}

/**
 * Returns the 32-byte AES-256 key used to encrypt/decrypt refresh tokens.
 * The key is stored in Secret Manager as a 64-character hex string.
 */
function getEncryptionKey(): Buffer {
  const hexKey = getSecret('REFRESH_TOKEN_ENCRYPTION_KEY');
  return Buffer.from(hexKey, 'hex');
}

/**
 * Exchanges a Spotify authorization code for access and refresh tokens,
 * encrypts the refresh token, and upserts the Firestore user document.
 *
 * @param code           - The authorization code received from Spotify callback.
 * @param codeVerifier   - The PKCE code verifier generated during the login request.
 * @param spotifyUserId  - The Spotify user ID (`me.id`) obtained after exchange.
 * @param displayName    - The Spotify display name to store in Firestore.
 * @returns An object with `accessToken`, `refreshToken` (plaintext), and `expiresIn`.
 * @throws {AuthError} if the Spotify token endpoint returns an error.
 *
 * Requirements: 1.3, 1.4, 1.7
 */
export async function exchangeCode(
  code: string,
  codeVerifier: string,
  spotifyUserId: string,
  displayName: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const clientId = process.env['SPOTIFY_CLIENT_ID'];
  if (!clientId) {
    throw new AuthError(
      'MISSING_CLIENT_ID',
      'SPOTIFY_CLIENT_ID environment variable is not set.',
      500,
    );
  }

  const clientSecret = getSecret('SPOTIFY_CLIENT_SECRET');

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env['SPOTIFY_REDIRECT_URI'] ?? '',
    code_verifier: codeVerifier,
    client_id: clientId,
  });

  let tokenData: SpotifyTokenResponse;
  try {
    const response = await axios.post<SpotifyTokenResponse>(SPOTIFY_TOKEN_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      },
    });
    tokenData = response.data;
  } catch (err) {
    const message =
      axios.isAxiosError(err)
        ? `Spotify token exchange failed: ${err.response?.status ?? 'unknown'} ${JSON.stringify(err.response?.data ?? {})}`
        : 'Spotify token exchange failed with an unexpected error.';
    throw new AuthError('TOKEN_EXCHANGE_FAILED', message, 401);
  }

  // Encrypt the refresh token before persisting (Requirement 1.4)
  const encryptionKey = getEncryptionKey();
  const encryptedRefreshToken = encrypt(tokenData.refresh_token, encryptionKey);

  // Upsert the Firestore user document (Requirement 1.7)
  await upsertUser(spotifyUserId, {
    displayName,
    encryptedRefreshToken,
  });

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresIn: tokenData.expires_in,
  };
}

/**
 * Uses a stored encrypted refresh token to obtain a fresh Spotify access token.
 *
 * @param encryptedRefreshToken - The AES-GCM encrypted refresh token (base64)
 *   as stored in Firestore.
 * @returns A new Spotify access token string.
 * @throws {AuthError} if decryption fails or the Spotify refresh endpoint
 *   returns an error.
 *
 * Requirements: 1.5, 1.6
 */
export async function refreshAccessToken(encryptedRefreshToken: string): Promise<string> {
  const clientId = process.env['SPOTIFY_CLIENT_ID'];
  if (!clientId) {
    throw new AuthError(
      'MISSING_CLIENT_ID',
      'SPOTIFY_CLIENT_ID environment variable is not set.',
      500,
    );
  }

  const clientSecret = getSecret('SPOTIFY_CLIENT_SECRET');

  // Decrypt the stored refresh token
  let refreshToken: string;
  try {
    const encryptionKey = getEncryptionKey();
    refreshToken = decrypt(encryptedRefreshToken, encryptionKey);
  } catch {
    throw new AuthError(
      'REFRESH_TOKEN_DECRYPT_FAILED',
      'Failed to decrypt the stored refresh token. Re-authentication required.',
      401,
    );
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  });

  let tokenData: SpotifyTokenResponse;
  try {
    const response = await axios.post<SpotifyTokenResponse>(SPOTIFY_TOKEN_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      },
    });
    tokenData = response.data;
  } catch (err) {
    const message =
      axios.isAxiosError(err)
        ? `Spotify token refresh failed: ${err.response?.status ?? 'unknown'} ${JSON.stringify(err.response?.data ?? {})}`
        : 'Spotify token refresh failed with an unexpected error.';
    // Requirement 1.6: if refresh fails, require re-authentication
    throw new AuthError('TOKEN_REFRESH_FAILED', message, 401);
  }

  return tokenData.access_token;
}
