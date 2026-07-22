/**
 * Authentication routes for the AI Music Playlist Generator.
 *
 * Endpoints:
 *   GET  /api/auth/login     — Initiates Spotify PKCE login flow
 *   GET  /api/auth/callback  — Handles Spotify OAuth callback
 *   POST /api/auth/logout    — Clears session cookie
 *   GET  /api/auth/me        — Returns current user info (auth-protected)
 *
 * Requirements: 1.1, 1.2, 1.3, 1.6
 */

import { Router, type Request, type Response } from 'express';
import axios from 'axios';
import {
  generatePkce,
  generateState,
  exchangeCode,
  signSessionJwt,
} from '../services/authService.js';
import {
  savePkceState,
  getPkceState,
  deletePkceState,
} from '../clients/firestoreClient.js';
import { authenticate } from '../middleware/authenticate.js';
import { AuthError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Spotify OAuth scopes required by the application.
 * Covers: user profile, listening data, library access, playlist management.
 */
const SPOTIFY_SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-top-read',
  'user-read-recently-played',
  'user-library-read',
  'playlist-read-private',
  'playlist-modify-private',
  'playlist-modify-public',
].join(' ');

/** Spotify authorization endpoint. */
const SPOTIFY_AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';

/** Spotify user profile endpoint. */
const SPOTIFY_ME_URL = 'https://api.spotify.com/v1/me';

/** Session cookie name. */
const SESSION_COOKIE_NAME = 'session';

/** Session cookie max age: 1 hour in milliseconds. */
const SESSION_COOKIE_MAX_AGE = 3600 * 1000;

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

/**
 * GET /api/auth/login
 *
 * Generates a PKCE code challenge and a random state parameter, persists the
 * state + verifier in Firestore, and returns the Spotify authorize URL for
 * the frontend to redirect the user.
 *
 * Response: { authorizeUrl: string, state: string }
 *
 * Requirements: 1.1, 1.2
 */
router.get('/login', async (req: Request, res: Response): Promise<void> => {
  const correlationId = (res.locals['correlationId'] as string | undefined) ?? 'unknown';

  try {
    const clientId = process.env['SPOTIFY_CLIENT_ID'];
    if (!clientId) {
      throw new AuthError(
        'MISSING_CLIENT_ID',
        'SPOTIFY_CLIENT_ID environment variable is not set.',
        500,
      );
    }

    const redirectUri = process.env['SPOTIFY_REDIRECT_URI'];
    if (!redirectUri) {
      throw new AuthError(
        'MISSING_REDIRECT_URI',
        'SPOTIFY_REDIRECT_URI environment variable is not set.',
        500,
      );
    }

    // Generate PKCE bundle and state
    const pkce = generatePkce();
    const state = generateState();

    // Persist the state + verifier in Firestore
    await savePkceState(state, {
      codeVerifier: pkce.codeVerifier,
      createdAt: new Date().toISOString(),
    });

    // Build the Spotify authorize URL
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: SPOTIFY_SCOPES,
      code_challenge: pkce.codeChallenge,
      code_challenge_method: pkce.codeChallengeMethod,
      state,
    });

    const authorizeUrl = `${SPOTIFY_AUTHORIZE_URL}?${params.toString()}`;

    logger.info('Login initiated, authorize URL generated', {
      correlationId,
      step: 'AUTH_LOGIN',
    });

    res.json({ authorizeUrl, state });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({
        error: { code: err.code, message: err.message, correlationId },
      });
      return;
    }
    logger.error('Unexpected error during login', {
      correlationId,
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.', correlationId },
    });
  }
});

/**
 * GET /api/auth/callback?code=&state=
 *
 * Handles the Spotify OAuth callback:
 *  1. Verifies the state parameter against Firestore
 *  2. Deletes the state doc (prevents replay)
 *  3. Exchanges the authorization code for tokens (via authService)
 *  4. Fetches the user's Spotify profile (spotifyUserId, displayName)
 *  5. Signs a session JWT and sets it as an HttpOnly cookie
 *  6. Returns { displayName }
 *
 * Requirements: 1.3, 1.6
 */
router.get('/callback', async (req: Request, res: Response): Promise<void> => {
  const correlationId = (res.locals['correlationId'] as string | undefined) ?? 'unknown';

  try {
    const code = req.query['code'] as string | undefined;
    const state = req.query['state'] as string | undefined;

    if (!code || !state) {
      throw new AuthError(
        'INVALID_CALLBACK',
        'Missing code or state query parameter.',
        400,
      );
    }

    // Verify state exists in Firestore
    const pkceState = await getPkceState(state);
    if (!pkceState) {
      throw new AuthError(
        'INVALID_STATE',
        'Invalid or expired state parameter. Please try logging in again.',
        401,
      );
    }

    // Delete the state doc to prevent replay attacks
    await deletePkceState(state);

    const { codeVerifier } = pkceState;

    const clientId = process.env['SPOTIFY_CLIENT_ID'];
    if (!clientId) {
      throw new AuthError(
        'MISSING_CLIENT_ID',
        'SPOTIFY_CLIENT_ID environment variable is not set.',
        500,
      );
    }

    // Exchange code for access token so we can call /me to get user info.
    // exchangeCode() in authService will perform a second exchange to handle
    // persistence — acceptable since this is a one-time auth flow.
    const { getSecret } = await import('../lib/secretManager.js');
    const clientSecret = getSecret('SPOTIFY_CLIENT_SECRET');
    const redirectUri = process.env['SPOTIFY_REDIRECT_URI'] ?? '';

    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
      client_id: clientId,
    });

    let accessToken: string;
    try {
      const tokenResponse = await axios.post(
        'https://accounts.spotify.com/api/token',
        tokenParams,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization:
              'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
          },
        },
      );
      accessToken = tokenResponse.data.access_token;
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? `Spotify token exchange failed: ${err.response?.status ?? 'unknown'}`
        : 'Spotify token exchange failed.';
      throw new AuthError('TOKEN_EXCHANGE_FAILED', message, 401);
    }

    // Fetch Spotify user profile
    let spotifyUserId: string;
    let displayName: string;
    try {
      const meResponse = await axios.get(SPOTIFY_ME_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      spotifyUserId = meResponse.data.id;
      displayName = meResponse.data.display_name ?? meResponse.data.id;
    } catch (err) {
      throw new AuthError(
        'SPOTIFY_PROFILE_FAILED',
        'Failed to fetch Spotify user profile.',
        502,
      );
    }

    // Exchange code and persist user (this does its own token exchange + upsert)
    await exchangeCode(code, codeVerifier, spotifyUserId, displayName);

    // Sign session JWT
    const token = signSessionJwt({ spotifyUserId, displayName });

    // Set HttpOnly cookie
    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_COOKIE_MAX_AGE,
    });

    logger.info('User authenticated successfully', {
      correlationId,
      spotifyUserId,
      step: 'AUTH_CALLBACK',
    });

    res.json({ displayName });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({
        error: { code: err.code, message: err.message, correlationId },
      });
      return;
    }
    logger.error('Unexpected error during callback', {
      correlationId,
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.', correlationId },
    });
  }
});

/**
 * POST /api/auth/logout
 *
 * Clears the session cookie and returns 200.
 */
router.post('/logout', (_req: Request, res: Response): void => {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  });
  res.status(200).json({ message: 'Logged out successfully.' });
});

/**
 * GET /api/auth/me
 *
 * Protected by `authenticate` middleware. Returns the current user's
 * Spotify user ID and display name from the session JWT payload.
 *
 * Response: { spotifyUserId: string, displayName: string }
 */
router.get('/me', authenticate, (req: Request, res: Response): void => {
  const user = req.user!;
  res.json({ spotifyUserId: user.spotifyUserId, displayName: user.displayName });
});

export default router;
