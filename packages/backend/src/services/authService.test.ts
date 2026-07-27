/**
 * Unit tests for authService.ts — PKCE helpers and session JWT signing.
 *
 * Requirements: 1.1, 1.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { generatePkce, generateState, signSessionJwt, verifySessionJwt } from './authService.js';
import { _clearSecretCacheForTesting } from '../lib/secretManager.js';
import { AuthError } from '../lib/errors.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Seeds the in-memory secret cache with a test JWT signing key. */
function seedJwtKey(key = 'test-signing-key-that-is-at-least-32-chars-long!!') {
  // Access the internal cache via the module's exported test helper.
  // We populate it by directly importing and calling the private setter
  // exposed for testing. Since there is none, we reach into the module
  // via a small vi.mock trick — instead, we rely on the fact that
  // secretManager exports `_clearSecretCacheForTesting` and we manually
  // set the value by calling the real module with mocked internals.
  //
  // The simplest approach: mock `getSecret` for these tests.
}

// ---------------------------------------------------------------------------
// Mock secretManager so tests run without GCP credentials
// ---------------------------------------------------------------------------

vi.mock('../lib/secretManager.js', () => {
  const cache = new Map<string, string>();

  return {
    getSecret: (name: string) => {
      const val = cache.get(name);
      if (!val) throw new Error(`Secret "${name}" not in cache`);
      return val;
    },
    _clearSecretCacheForTesting: () => cache.clear(),
    _setSecretForTesting: (name: string, value: string) => cache.set(name, value),
  };
});

// Import after the mock is set up so all dependents pick up the mock.
const { _setSecretForTesting } = await import('../lib/secretManager.js') as {
  _setSecretForTesting: (name: string, value: string) => void;
  _clearSecretCacheForTesting: () => void;
};

const TEST_JWT_KEY = 'test-jwt-signing-key-that-is-long-enough-for-hs256-tests!!';

beforeEach(() => {
  _setSecretForTesting('JWT_SIGNING_KEY', TEST_JWT_KEY);
});

afterEach(() => {
  _clearSecretCacheForTesting();
});

// ---------------------------------------------------------------------------
// generatePkce()
// ---------------------------------------------------------------------------

describe('generatePkce', () => {
  it('returns a codeVerifier of exactly 96 characters', () => {
    const { codeVerifier } = generatePkce();
    expect(codeVerifier).toHaveLength(96);
  });

  it('codeVerifier contains only URL-safe base64 characters', () => {
    const { codeVerifier } = generatePkce();
    // URL-safe base64: A-Z, a-z, 0-9, -, _  (no +, /, or =)
    expect(codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('returns codeChallengeMethod of "S256"', () => {
    const { codeChallengeMethod } = generatePkce();
    expect(codeChallengeMethod).toBe('S256');
  });

  it('codeChallenge is the SHA-256 base64url digest of the codeVerifier', () => {
    const { codeVerifier, codeChallenge } = generatePkce();
    const expected = createHash('sha256').update(codeVerifier, 'utf8').digest('base64url');
    expect(codeChallenge).toBe(expected);
  });

  it('codeChallenge contains only URL-safe base64 characters', () => {
    const { codeChallenge } = generatePkce();
    expect(codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('produces different values on each call (randomness)', () => {
    const first = generatePkce();
    const second = generatePkce();
    expect(first.codeVerifier).not.toBe(second.codeVerifier);
    expect(first.codeChallenge).not.toBe(second.codeChallenge);
  });
});

// ---------------------------------------------------------------------------
// generateState()
// ---------------------------------------------------------------------------

describe('generateState', () => {
  it('returns a 32-character lowercase hex string', () => {
    const state = generateState();
    expect(state).toHaveLength(32);
    expect(state).toMatch(/^[0-9a-f]+$/);
  });

  it('produces different values on each call (randomness)', () => {
    const states = new Set(Array.from({ length: 10 }, () => generateState()));
    expect(states.size).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// signSessionJwt() / verifySessionJwt() round-trip
// ---------------------------------------------------------------------------

describe('signSessionJwt / verifySessionJwt', () => {
  const samplePayload = {
    spotifyUserId: 'user_abc123',
    displayName: 'Alice',
  };

  it('signs a JWT and verifySessionJwt decodes the original payload', () => {
    const token = signSessionJwt(samplePayload);
    const result = verifySessionJwt(token);

    expect(result.spotifyUserId).toBe(samplePayload.spotifyUserId);
    expect(result.displayName).toBe(samplePayload.displayName);
  });

  it('decoded payload contains numeric iat and exp fields', () => {
    const before = Math.floor(Date.now() / 1000);
    const token = signSessionJwt(samplePayload);
    const after = Math.floor(Date.now() / 1000);

    const result = verifySessionJwt(token);

    expect(typeof result.iat).toBe('number');
    expect(typeof result.exp).toBe('number');
    expect(result.iat).toBeGreaterThanOrEqual(before);
    expect(result.iat).toBeLessThanOrEqual(after);
  });

  it('exp is approximately 1 hour after iat', () => {
    const token = signSessionJwt(samplePayload);
    const { iat, exp } = verifySessionJwt(token);
    expect(exp - iat).toBe(3600);
  });

  it('returns an AuthError with code SESSION_EXPIRED for an expired token', async () => {
    // Sign with an immediate expiry by manipulating the token directly
    // — use a very small expiresIn so the token is already expired.
    // We do this by importing jwt directly.
    const { default: jwt } = await import('jsonwebtoken');
    const expired = jwt.sign(samplePayload, TEST_JWT_KEY, { algorithm: 'HS256', expiresIn: -1 });

    expect(() => verifySessionJwt(expired)).toThrow(AuthError);
    try {
      verifySessionJwt(expired);
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).code).toBe('SESSION_EXPIRED');
      expect((err as AuthError).statusCode).toBe(401);
    }
  });

  it('throws AuthError with code INVALID_SESSION for a tampered token', () => {
    const token = signSessionJwt(samplePayload);
    const tampered = token.slice(0, -5) + 'XXXXX';

    expect(() => verifySessionJwt(tampered)).toThrow(AuthError);
    try {
      verifySessionJwt(tampered);
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).code).toBe('INVALID_SESSION');
    }
  });

  it('throws AuthError when the signing key has changed', () => {
    const token = signSessionJwt(samplePayload);

    // Change the key in the mock cache
    _setSecretForTesting('JWT_SIGNING_KEY', 'a-completely-different-key-that-wont-match!!');

    expect(() => verifySessionJwt(token)).toThrow(AuthError);
  });
});
