import { describe, it, expect } from 'vitest';
import {
  AppError,
  SpotifyApiError,
  ClaudeApiError,
  AuthError,
  CacheError,
} from './errors.js';

// ---------------------------------------------------------------------------
// AppError — base class
// ---------------------------------------------------------------------------

describe('AppError', () => {
  it('stores all constructor arguments as readonly properties', () => {
    const err = new AppError('TEST_CODE', 418, "I'm a teapot", false);

    expect(err.code).toBe('TEST_CODE');
    expect(err.statusCode).toBe(418);
    expect(err.message).toBe("I'm a teapot");
    expect(err.isOperational).toBe(false);
  });

  it('defaults isOperational to true', () => {
    const err = new AppError('TEST_CODE', 500, 'oops');
    expect(err.isOperational).toBe(true);
  });

  it('is an instance of Error', () => {
    const err = new AppError('TEST_CODE', 500, 'oops');
    expect(err).toBeInstanceOf(Error);
  });

  it('has the correct name property', () => {
    const err = new AppError('TEST_CODE', 500, 'oops');
    expect(err.name).toBe('AppError');
  });

  it('instanceof check works after transpilation', () => {
    const err = new AppError('TEST_CODE', 500, 'oops');
    expect(err).toBeInstanceOf(AppError);
  });
});

// ---------------------------------------------------------------------------
// SpotifyApiError
// ---------------------------------------------------------------------------

describe('SpotifyApiError', () => {
  it('defaults to statusCode 502', () => {
    const err = new SpotifyApiError();
    expect(err.statusCode).toBe(502);
  });

  it('defaults to code SPOTIFY_API_ERROR', () => {
    const err = new SpotifyApiError();
    expect(err.code).toBe('SPOTIFY_API_ERROR');
  });

  it('accepts custom code and message', () => {
    const err = new SpotifyApiError('SPOTIFY_RATE_LIMIT', 'Rate limited by Spotify');
    expect(err.code).toBe('SPOTIFY_RATE_LIMIT');
    expect(err.message).toBe('Rate limited by Spotify');
  });

  it('accepts a custom statusCode', () => {
    const err = new SpotifyApiError('SPOTIFY_RATE_LIMIT', 'Rate limited', 429);
    expect(err.statusCode).toBe(429);
  });

  it('is an instance of AppError and Error', () => {
    const err = new SpotifyApiError();
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
  });

  it('instanceof SpotifyApiError works after transpilation', () => {
    const err = new SpotifyApiError();
    expect(err).toBeInstanceOf(SpotifyApiError);
  });
});

// ---------------------------------------------------------------------------
// ClaudeApiError
// ---------------------------------------------------------------------------

describe('ClaudeApiError', () => {
  it('defaults to statusCode 502', () => {
    const err = new ClaudeApiError();
    expect(err.statusCode).toBe(502);
  });

  it('defaults to code CLAUDE_API_ERROR', () => {
    const err = new ClaudeApiError();
    expect(err.code).toBe('CLAUDE_API_ERROR');
  });

  it('accepts custom code, message, and statusCode', () => {
    const err = new ClaudeApiError('CLAUDE_PARSE_ERROR', 'Malformed response', 502);
    expect(err.code).toBe('CLAUDE_PARSE_ERROR');
    expect(err.message).toBe('Malformed response');
    expect(err.statusCode).toBe(502);
  });

  it('is an instance of AppError', () => {
    const err = new ClaudeApiError();
    expect(err).toBeInstanceOf(AppError);
  });

  it('instanceof ClaudeApiError works after transpilation', () => {
    const err = new ClaudeApiError();
    expect(err).toBeInstanceOf(ClaudeApiError);
  });
});

// ---------------------------------------------------------------------------
// AuthError
// ---------------------------------------------------------------------------

describe('AuthError', () => {
  it('defaults to statusCode 401', () => {
    const err = new AuthError();
    expect(err.statusCode).toBe(401);
  });

  it('defaults to code AUTH_ERROR', () => {
    const err = new AuthError();
    expect(err.code).toBe('AUTH_ERROR');
  });

  it('accepts custom code and message', () => {
    const err = new AuthError('SESSION_EXPIRED', 'Your session has expired.');
    expect(err.code).toBe('SESSION_EXPIRED');
    expect(err.message).toBe('Your session has expired.');
  });

  it('is an instance of AppError', () => {
    const err = new AuthError();
    expect(err).toBeInstanceOf(AppError);
  });

  it('instanceof AuthError works after transpilation', () => {
    const err = new AuthError();
    expect(err).toBeInstanceOf(AuthError);
  });
});

// ---------------------------------------------------------------------------
// CacheError
// ---------------------------------------------------------------------------

describe('CacheError', () => {
  it('defaults to statusCode 500', () => {
    const err = new CacheError();
    expect(err.statusCode).toBe(500);
  });

  it('defaults to code CACHE_ERROR', () => {
    const err = new CacheError();
    expect(err.code).toBe('CACHE_ERROR');
  });

  it('accepts custom code, message, and isOperational', () => {
    const err = new CacheError('CACHE_WRITE_FAILED', 'Could not write to Firestore', 500, false);
    expect(err.code).toBe('CACHE_WRITE_FAILED');
    expect(err.message).toBe('Could not write to Firestore');
    expect(err.isOperational).toBe(false);
  });

  it('is an instance of AppError', () => {
    const err = new CacheError();
    expect(err).toBeInstanceOf(AppError);
  });

  it('instanceof CacheError works after transpilation', () => {
    const err = new CacheError();
    expect(err).toBeInstanceOf(CacheError);
  });
});

// ---------------------------------------------------------------------------
// Cross-class polymorphism
// ---------------------------------------------------------------------------

describe('AppError subclass polymorphism', () => {
  const errors = [
    new SpotifyApiError(),
    new ClaudeApiError(),
    new AuthError(),
    new CacheError(),
  ];

  it.each(errors)('$name is an instance of AppError', (err) => {
    expect(err).toBeInstanceOf(AppError);
  });

  it.each(errors)('$name is an instance of Error', (err) => {
    expect(err).toBeInstanceOf(Error);
  });

  it.each(errors)('$name has a non-empty code', (err) => {
    expect(err.code).toBeTruthy();
  });

  it.each(errors)('$name has a positive statusCode', (err) => {
    expect(err.statusCode).toBeGreaterThan(0);
  });

  it.each(errors)('$name has isOperational true by default', (err) => {
    expect(err.isOperational).toBe(true);
  });
});
