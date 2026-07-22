/**
 * Application error hierarchy for the AI Music Playlist Generator backend.
 *
 * All thrown errors should extend `AppError` so that `middleware/errorHandler.ts`
 * can map them to the correct HTTP status code and structured response shape.
 */

/**
 * Base class for all operational (expected) errors in the application.
 *
 * @param code         Machine-readable error code, e.g. `'SPOTIFY_RATE_LIMIT'`.
 * @param statusCode   HTTP status code to return to the client.
 * @param message      Human-readable description of what went wrong.
 * @param isOperational `true` (default) means the error was anticipated and the
 *                      process should continue running. `false` flags a
 *                      programming error that should trigger a restart.
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    public readonly message: string,
    public readonly isOperational: boolean = true,
  ) {
    super(message);
    // Restore the correct prototype chain so `instanceof AppError` works
    // even after TypeScript transpilation.
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;

    // Capture a clean stack trace (V8 only; no-op on other engines).
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, new.target);
    }
  }
}

/**
 * Thrown when the Spotify Web API returns an error that exhausted all retries
 * or is otherwise non-recoverable (e.g. 4xx after back-off).
 *
 * Default status: 502 Bad Gateway — the upstream service failed.
 */
export class SpotifyApiError extends AppError {
  constructor(
    code: string = 'SPOTIFY_API_ERROR',
    message: string = 'An error occurred while communicating with the Spotify API.',
    statusCode: number = 502,
    isOperational: boolean = true,
  ) {
    super(code, statusCode, message, isOperational);
  }
}

/**
 * Thrown when the Anthropic Claude API returns an error or a response that
 * cannot be parsed into a valid `CandidateList` after retrying.
 *
 * Default status: 502 Bad Gateway — the upstream AI service failed.
 */
export class ClaudeApiError extends AppError {
  constructor(
    code: string = 'CLAUDE_API_ERROR',
    message: string = 'An error occurred while communicating with the Claude API.',
    statusCode: number = 502,
    isOperational: boolean = true,
  ) {
    super(code, statusCode, message, isOperational);
  }
}

/**
 * Thrown when the session JWT is missing, expired, or invalid.
 *
 * Default status: 401 Unauthorized.
 */
export class AuthError extends AppError {
  constructor(
    code: string = 'AUTH_ERROR',
    message: string = 'Authentication required or session has expired.',
    statusCode: number = 401,
    isOperational: boolean = true,
  ) {
    super(code, statusCode, message, isOperational);
  }
}

/**
 * Thrown when a Firestore read/write operation fails in a way that cannot
 * be retried, or when the cache is in an inconsistent state.
 *
 * Default status: 500 Internal Server Error.
 */
export class CacheError extends AppError {
  constructor(
    code: string = 'CACHE_ERROR',
    message: string = 'An error occurred while accessing the cache.',
    statusCode: number = 500,
    isOperational: boolean = true,
  ) {
    super(code, statusCode, message, isOperational);
  }
}
