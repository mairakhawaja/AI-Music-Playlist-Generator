/**
 * Tests for lib/logger.ts
 *
 * Covers:
 *  - Correct JSON structure and severity mapping
 *  - Redaction of sensitive field names (tokens, keys, secrets)
 *  - Presence of required fields on every log entry
 *  - Optional fields (spotifyUserId, step, durationMs) are included only when provided
 *  - Extra ad-hoc context fields are merged and redacted
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger, type LogEntry } from './logger.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Spy on process.stdout.write and capture each JSON line written. */
function captureStdout(): { lines: () => LogEntry[]; restore: () => void } {
  const raw: string[] = [];
  const spy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    if (typeof chunk === 'string') raw.push(chunk);
    return true;
  });

  return {
    lines: () =>
      raw
        .join('')
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l) as LogEntry),
    restore: () => spy.mockRestore(),
  };
}

const CORRELATION_ID = 'test-correlation-id-1234';

// ---------------------------------------------------------------------------
// Structural correctness
// ---------------------------------------------------------------------------

describe('logger — structural correctness', () => {
  let capture: ReturnType<typeof captureStdout>;

  beforeEach(() => {
    capture = captureStdout();
  });

  afterEach(() => {
    capture.restore();
  });

  it('info() writes a single JSON line with severity INFO', () => {
    logger.info('hello', { correlationId: CORRELATION_ID });
    const [entry] = capture.lines();
    expect(entry.severity).toBe('INFO');
  });

  it('warn() writes severity WARNING', () => {
    logger.warn('careful', { correlationId: CORRELATION_ID });
    const [entry] = capture.lines();
    expect(entry.severity).toBe('WARNING');
  });

  it('error() writes severity ERROR', () => {
    logger.error('boom', { correlationId: CORRELATION_ID });
    const [entry] = capture.lines();
    expect(entry.severity).toBe('ERROR');
  });

  it('every entry has timestamp in ISO8601 format', () => {
    logger.info('ts check', { correlationId: CORRELATION_ID });
    const [entry] = capture.lines();
    expect(() => new Date(entry.timestamp)).not.toThrow();
    // ISO 8601 — ends with Z or has timezone offset
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('every entry carries correlationId', () => {
    logger.info('id check', { correlationId: CORRELATION_ID });
    const [entry] = capture.lines();
    expect(entry.correlationId).toBe(CORRELATION_ID);
  });

  it('every entry carries message', () => {
    logger.info('my message', { correlationId: CORRELATION_ID });
    const [entry] = capture.lines();
    expect(entry.message).toBe('my message');
  });

  it('each call produces exactly one line', () => {
    logger.info('a', { correlationId: CORRELATION_ID });
    logger.warn('b', { correlationId: CORRELATION_ID });
    logger.error('c', { correlationId: CORRELATION_ID });
    expect(capture.lines()).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Optional context fields
// ---------------------------------------------------------------------------

describe('logger — optional context fields', () => {
  let capture: ReturnType<typeof captureStdout>;

  beforeEach(() => {
    capture = captureStdout();
  });

  afterEach(() => {
    capture.restore();
  });

  it('includes spotifyUserId when provided', () => {
    logger.info('msg', { correlationId: CORRELATION_ID, spotifyUserId: 'user123' });
    const [entry] = capture.lines();
    expect(entry.spotifyUserId).toBe('user123');
  });

  it('omits spotifyUserId when not provided', () => {
    logger.info('msg', { correlationId: CORRELATION_ID });
    const [entry] = capture.lines();
    expect(entry).not.toHaveProperty('spotifyUserId');
  });

  it('includes step when provided', () => {
    logger.info('msg', { correlationId: CORRELATION_ID, step: 'CLAUDE_REQUEST' });
    const [entry] = capture.lines();
    expect(entry.step).toBe('CLAUDE_REQUEST');
  });

  it('omits step when not provided', () => {
    logger.info('msg', { correlationId: CORRELATION_ID });
    const [entry] = capture.lines();
    expect(entry).not.toHaveProperty('step');
  });

  it('includes durationMs when provided', () => {
    logger.info('msg', { correlationId: CORRELATION_ID, durationMs: 42 });
    const [entry] = capture.lines();
    expect((entry as LogEntry & { durationMs: number }).durationMs).toBe(42);
  });

  it('omits durationMs when not provided', () => {
    logger.info('msg', { correlationId: CORRELATION_ID });
    const [entry] = capture.lines();
    expect(entry).not.toHaveProperty('durationMs');
  });
});

// ---------------------------------------------------------------------------
// Redaction guard
// ---------------------------------------------------------------------------

describe('logger — redaction guard', () => {
  let capture: ReturnType<typeof captureStdout>;

  beforeEach(() => {
    capture = captureStdout();
  });

  afterEach(() => {
    capture.restore();
  });

  const SENSITIVE_CASES = [
    { key: 'accessToken', value: 'tok_abc123' },
    { key: 'access_token', value: 'tok_abc123' },
    { key: 'refreshToken', value: 'ref_xyz' },
    { key: 'refresh_token', value: 'ref_xyz' },
    { key: 'apiKey', value: 'sk-abc' },
    { key: 'api_key', value: 'sk-abc' },
    { key: 'clientSecret', value: 'secret123' },
    { key: 'client_secret', value: 'secret123' },
    { key: 'signingKey', value: 'jwt_key' },
    { key: 'encryptionKey', value: 'enc_key' },
    { key: 'authorization', value: 'Bearer tok' },
    { key: 'password', value: 'hunter2' },
    { key: 'secret', value: 'supersecret' },
    { key: 'token', value: 'raw_token' },
  ];

  for (const { key, value } of SENSITIVE_CASES) {
    it(`redacts field "${key}"`, () => {
      logger.info('redaction test', {
        correlationId: CORRELATION_ID,
        [key]: value,
      });
      const raw = capture.lines();
      const entry = raw[0] as Record<string, unknown>;
      expect(entry[key]).toBe('[REDACTED]');
      // The real value must not appear anywhere in the serialised output
      expect(JSON.stringify(entry)).not.toContain(value);
    });
  }

  it('does not redact safe non-sensitive fields', () => {
    logger.info('safe fields', {
      correlationId: CORRELATION_ID,
      spotifyUserId: 'user_abc',
      step: 'CACHE_READ',
      durationMs: 100,
    });
    const [entry] = capture.lines();
    expect(entry.spotifyUserId).toBe('user_abc');
    expect(entry.step).toBe('CACHE_READ');
  });

  it('redacts sensitive keys nested inside an extra object', () => {
    logger.info('nested redact', {
      correlationId: CORRELATION_ID,
      metadata: { accessToken: 'tok_secret', label: 'ok' },
    } as Parameters<typeof logger.info>[1]);
    const [entry] = capture.lines();
    const metadata = (entry as Record<string, unknown>).metadata as Record<string, unknown>;
    expect(metadata.accessToken).toBe('[REDACTED]');
    expect(metadata.label).toBe('ok');
  });

  it('does not include sensitive values anywhere in the raw JSON string', () => {
    const tokenValue = 'SUPER_SECRET_TOKEN_VALUE_99';
    logger.info('no leak', {
      correlationId: CORRELATION_ID,
      accessToken: tokenValue,
    });
    const rawLine = process.stdout.write['mock']?.calls?.[0]?.[0] as string | undefined;
    // Re-capture via our spy
    const [entry] = capture.lines();
    expect(JSON.stringify(entry)).not.toContain(tokenValue);
  });
});

// ---------------------------------------------------------------------------
// Output format
// ---------------------------------------------------------------------------

describe('logger — output format', () => {
  let writtenChunks: string[];
  let spy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    writtenChunks = [];
    spy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      if (typeof chunk === 'string') writtenChunks.push(chunk);
      return true;
    });
  });

  afterEach(() => {
    spy.mockRestore();
  });

  it('each call writes valid JSON terminated by a newline', () => {
    logger.info('format test', { correlationId: CORRELATION_ID });
    expect(writtenChunks).toHaveLength(1);
    const chunk = writtenChunks[0];
    expect(chunk).toMatch(/\n$/);
    expect(() => JSON.parse(chunk.trim())).not.toThrow();
  });
});
