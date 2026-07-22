import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

/**
 * Global Express error-handling middleware.
 *
 * Contract:
 * - Logs the error at ERROR severity with full stack trace and correlation ID.
 * - Maps `AppError` subclasses to their declared `statusCode`.
 * - Treats any non-`AppError` instance as an unhandled error (status 500,
 *   generic message) so no implementation details leak to the client.
 * - Response body: `{ error: { code, message, correlationId } }` — never
 *   includes a stack trace.
 *
 * Mount this as the **last** middleware in `server.ts` so it catches errors
 * forwarded by all earlier handlers via `next(err)`.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  const correlationId = (res.locals['correlationId'] as string | undefined) ?? 'unknown';

  if (err instanceof AppError) {
    // Operational error — log with context, respond with AppError's own status
    logger.error(err.message, {
      correlationId,
      step: 'ERROR_HANDLER',
      errorCode: err.code,
      statusCode: err.statusCode,
      isOperational: err.isOperational,
      stack: err.stack,
    });

    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        correlationId,
      },
    });
  } else {
    // Unhandled / programming error — log full details, return generic 500
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;

    logger.error('An unexpected internal error occurred.', {
      correlationId,
      step: 'ERROR_HANDLER',
      errorCode: 'INTERNAL_SERVER_ERROR',
      originalMessage: message,
      stack,
    });

    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred. Please try again later.',
        correlationId,
      },
    });
  }
}

export default errorHandler;
