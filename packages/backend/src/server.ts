/**
 * Backend entry point for the AI Music Playlist Generator.
 *
 * Start-up sequence:
 *  1. Load all secrets from Google Secret Manager (fails fast if any are missing)
 *  2. Create the Express app and attach global middleware
 *  3. Mount route handlers
 *  4. Start the HTTP server on PORT (default 8080)
 *
 * Requirements: 9.1, 9.2
 */

import express from 'express';
import correlationIdMiddleware from './middleware/correlationId.js';
import { logger } from './lib/logger.js';

// ── App factory ──────────────────────────────────────────────────────────────

function createApp(): express.Application {
  const app = express();

  // Parse JSON request bodies
  app.use(express.json());

  // Attach a UUID v4 correlation ID to every request and response header
  app.use(correlationIdMiddleware);

  // ── Health check (no auth required) ───────────────────────────────────────
  // Used by Cloud Run's liveness / readiness probes.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version: process.env['npm_package_version'] ?? '0.0.1' });
  });

  // ── API routes ─────────────────────────────────────────────────────────────
  // Route modules are mounted here as they are implemented in subsequent tasks.
  // Example (uncomment when route files exist):
  //   import authRouter from './routes/auth.js';
  //   app.use('/api/auth', authRouter);

  return app;
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  const port = parseInt(process.env['PORT'] ?? '8080', 10);
  const correlationId = 'startup';

  // In production, load secrets from Google Secret Manager before doing
  // anything else. Skip in test environments where secrets are mocked/stubbed.
  if (process.env['NODE_ENV'] === 'production') {
    const { loadSecrets } = await import('./lib/secretManager.js');
    await loadSecrets();
    logger.info('Secrets loaded from Secret Manager', { correlationId });
  }

  const app = createApp();

  app.listen(port, () => {
    logger.info(`Server listening on port ${port}`, {
      correlationId,
      step: 'AUTH_LOGIN', // reuse existing step constant as startup marker
    });
  });
}

bootstrap().catch((err: unknown) => {
  // Use stderr directly here — logger may not be initialised if startup fails
  // before secrets are loaded.
  process.stderr.write(
    `[FATAL] Server failed to start: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
