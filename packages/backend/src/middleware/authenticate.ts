import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getSecret } from '../lib/secretManager.js';
import type { SessionPayload } from '../lib/types.js';

/**
 * Augment the Express `Request` type so that `req.user` is available on
 * routes protected by this middleware, without unsafe casting at every call site.
 */
declare global {
  namespace Express {
    interface Request {
      /**
       * The verified session payload, populated by `authenticate` middleware.
       * Present only on protected routes; undefined on public routes.
       */
      user?: SessionPayload;
    }
  }
}

/**
 * Express middleware that validates the HS256 session JWT carried in the
 * `session` HttpOnly cookie. On success it populates `req.user` with the
 * decoded `SessionPayload` and calls `next()`. On any failure it returns a
 * 401 response with a structured error body.
 *
 * Error response shape:
 * ```json
 * { "error": { "code": "AUTH_REQUIRED", "message": "...", "correlationId": "..." } }
 * ```
 *
 * Requirements: 1.5, 1.6
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const correlationId = (res.locals['correlationId'] as string | undefined) ?? 'unknown';

  // Extract the JWT from the `session` HttpOnly cookie.
  const token: string | undefined = req.cookies?.['session'];

  if (!token) {
    res.status(401).json({
      error: {
        code: 'AUTH_REQUIRED',
        message: 'No session token provided. Please log in.',
        correlationId,
      },
    });
    return;
  }

  let signingKey: string;
  try {
    signingKey = getSecret('JWT_SIGNING_KEY');
  } catch {
    // Secret cache not populated — treat as a server-side configuration error
    // but surface it as a 401 to avoid leaking internal state.
    res.status(401).json({
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Authentication service is temporarily unavailable.',
        correlationId,
      },
    });
    return;
  }

  try {
    const payload = jwt.verify(token, signingKey, { algorithms: ['HS256'] });

    // jwt.verify returns string | JwtPayload; we cast after basic shape validation.
    if (typeof payload === 'string' || !payload) {
      throw new Error('Unexpected JWT payload type.');
    }

    const { spotifyUserId, displayName, iat, exp } = payload as Record<string, unknown>;

    if (
      typeof spotifyUserId !== 'string' ||
      typeof displayName !== 'string' ||
      typeof iat !== 'number' ||
      typeof exp !== 'number'
    ) {
      throw new Error('JWT payload is missing required fields.');
    }

    req.user = { spotifyUserId, displayName, iat, exp };
    next();
  } catch (err) {
    const isExpired = err instanceof jwt.TokenExpiredError;
    const message = isExpired
      ? 'Session has expired. Please log in again.'
      : 'Invalid session token. Please log in.';

    res.status(401).json({
      error: {
        code: 'AUTH_REQUIRED',
        message,
        correlationId,
      },
    });
  }
}
