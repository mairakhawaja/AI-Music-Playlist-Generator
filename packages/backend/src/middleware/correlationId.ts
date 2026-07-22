import type { Request, Response, NextFunction } from 'express';
import { generateCorrelationId } from '../lib/correlationId.js';

/**
 * Express middleware that generates a UUID v4 correlation ID for every
 * incoming request, attaches it to `res.locals.correlationId`, and sets
 * the `X-Correlation-ID` response header so it is visible to callers.
 */
function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId = generateCorrelationId();
  res.locals['correlationId'] = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
}

export default correlationIdMiddleware;
