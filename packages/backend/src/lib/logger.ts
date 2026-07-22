/**
 * Structured JSON logger for Cloud Logging compatibility.
 *
 * Log format:
 * {
 *   severity: "INFO" | "WARNING" | "ERROR",
 *   timestamp: "<ISO8601>",
 *   correlationId: "<uuid-v4>",
 *   spotifyUserId?: string,
 *   step?: string,
 *   message: string,
 *   durationMs?: number
 * }
 *
 * Sensitive field names (tokens, keys) are redacted before output.
 * All output via process.stdout.write, one JSON entry per line.
 */

/** Severity levels matching Cloud Logging's severity field. */
export type Severity = 'INFO' | 'WARNING' | 'ERROR';

/** Step identifiers used throughout the generation pipeline. */
export type PipelineStep =
  | 'TASTE_PROFILE_ASSEMBLE'
  | 'CLAUDE_REQUEST'
  | 'TRACK_RESOLUTION'
  | 'LISTENING_DATA_FETCH'
  | 'PLAYLIST_SAVE'
  | 'TOKEN_EXCHANGE'
  | 'TOKEN_REFRESH'
  | 'CACHE_READ'
  | 'CACHE_WRITE'
  | 'AUTH_CALLBACK'
  | 'AUTH_LOGIN'
  | string;

/** Shape of a single structured log entry. */
export interface LogEntry {
  severity: Severity;
  timestamp: string;
  correlationId: string;
  spotifyUserId?: string;
  step?: PipelineStep;
  message: string;
  durationMs?: number;
}

/** Fields accepted by the logger methods. correlationId is required. */
export interface LogContext {
  correlationId: string;
  spotifyUserId?: string;
  step?: PipelineStep;
  durationMs?: number;
  /** Any additional ad-hoc fields to include in the log entry. */
  [key: string]: unknown;
}

/**
 * Known sensitive field names whose values must never appear in log output.
 * Matching is case-insensitive.
 */
const SENSITIVE_FIELD_PATTERNS: RegExp[] = [
  /access[-_]?token/i,
  /refresh[-_]?token/i,
  /api[-_]?key/i,
  /client[-_]?secret/i,
  /jwt[-_]?signing[-_]?key/i,
  /signing[-_]?key/i,
  /encryption[-_]?key/i,
  /authorization/i,
  /password/i,
  /secret/i,
  /bearer/i,
  /^token$/i,
  /^key$/i,
];

const REDACTED = '[REDACTED]';

/**
 * Returns true if the given field name matches a sensitive pattern.
 */
function isSensitiveKey(key: string): boolean {
  return SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Recursively scrubs sensitive field names from an object.
 * Does not mutate the input; returns a new sanitised copy.
 */
function redact(value: unknown, depth = 0): unknown {
  // Guard against excessive depth (e.g. circular-ish structures from the caller)
  if (depth > 8) return value;

  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }

  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    result[k] = isSensitiveKey(k) ? REDACTED : redact(v, depth + 1);
  }
  return result;
}

/**
 * Extracts the standard LogContext fields and returns the rest as extra
 * ad-hoc fields to merge into the log entry (after redaction).
 */
function buildEntry(
  severity: Severity,
  message: string,
  context: LogContext,
): LogEntry & Record<string, unknown> {
  const { correlationId, spotifyUserId, step, durationMs, ...extra } = context;

  const base: LogEntry = {
    severity,
    timestamp: new Date().toISOString(),
    correlationId,
    message,
  };

  if (spotifyUserId !== undefined) base.spotifyUserId = spotifyUserId;
  if (step !== undefined) base.step = step;
  if (durationMs !== undefined) base.durationMs = durationMs;

  // Merge any ad-hoc extra fields, after redacting them
  const sanitisedExtra = redact(extra) as Record<string, unknown>;

  return { ...base, ...sanitisedExtra };
}

/**
 * Writes a single JSON-encoded log entry to stdout, terminated by a newline.
 * This matches the Cloud Run / Cloud Logging expectation: one JSON object per line.
 */
function write(entry: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(entry) + '\n');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Structured JSON logger. All methods write to process.stdout.
 * Sensitive field names are redacted automatically.
 *
 * @example
 * logger.info('Generation started', { correlationId, spotifyUserId, step: 'CLAUDE_REQUEST' });
 * logger.warn('Partial results', { correlationId, spotifyUserId, durationMs: 340 });
 * logger.error('Pipeline failed', { correlationId, spotifyUserId });
 */
export const logger = {
  info(message: string, context: LogContext): void {
    write(buildEntry('INFO', message, context));
  },

  warn(message: string, context: LogContext): void {
    write(buildEntry('WARNING', message, context));
  },

  error(message: string, context: LogContext): void {
    write(buildEntry('ERROR', message, context));
  },
} as const;
