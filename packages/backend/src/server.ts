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

import { config } from 'dotenv';
import { resolve } from 'node:path';

// Load .env from monorepo root (works regardless of CWD)
config({ path: resolve(process.cwd(), '.env') });
// Also try monorepo root if running from packages/backend
config({ path: resolve(process.cwd(), '../../.env') });

import { createRequire } from 'node:module';
import express from 'express';
import cookieParser from 'cookie-parser';
import correlationIdMiddleware from './middleware/correlationId.js';
import { logger } from './lib/logger.js';
import authRouter from './routes/auth.js';
import generateRouter from './routes/generate.js';
import playlistsRouter from './routes/playlists.js';

// Read version from package.json (works in both npm start and direct node execution)
const require = createRequire(import.meta.url);
const { version: APP_VERSION } = require('../package.json') as { version: string };

// ── App factory ──────────────────────────────────────────────────────────────

function createApp(): express.Application {
  const app = express();

  // Parse JSON request bodies
  app.use(express.json());

  // Parse cookies (needed for session JWT in HttpOnly cookie)
  app.use(cookieParser());

  // CORS — allow frontend origin to call the backend in production
  const frontendUrl = process.env['FRONTEND_URL'] ?? 'https://127.0.0.1:5173';
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', frontendUrl);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Correlation-ID');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Attach a UUID v4 correlation ID to every request and response header
  app.use(correlationIdMiddleware);

  // ── Health check (no auth required) ───────────────────────────────────────
  // Used by Cloud Run's liveness / readiness probes.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version: APP_VERSION });
  });

  // ── API routes ─────────────────────────────────────────────────────────────
  // Route modules are mounted here as they are implemented in subsequent tasks.
  app.use('/api/auth', authRouter);
  app.use('/api/generate', generateRouter);
  app.use('/api/playlists', playlistsRouter);

  return app;
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  const port = parseInt(process.env['PORT'] ?? '8080', 10);
  const correlationId = 'startup';

  // Load secrets before doing anything else. In production this fetches from
  // Google Secret Manager; in other environments it reads from env vars.
  const { loadSecrets } = await import('./lib/secretManager.js');
  await loadSecrets();
  logger.info('Secrets loaded successfully', { correlationId });

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
