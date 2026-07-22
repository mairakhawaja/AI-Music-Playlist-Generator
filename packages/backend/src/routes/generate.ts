/**
 * Generation route for the AI Music Playlist Generator.
 *
 * Endpoint:
 *   POST /api/generate — Runs (or returns cached) generation pipeline.
 *
 * Protected by `authenticate` middleware (mounted in server.ts).
 *
 * Requirements: 8.1, 11.1
 */

import { Router, type Request, type Response } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { getUser } from '../clients/firestoreClient.js';
import { createSpotifyClient, type SpotifyTokenContext } from '../clients/spotifyClient.js';
import { refreshAccessToken } from '../services/authService.js';
import { generate } from '../services/generationService.js';
import { AppError, AuthError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

/**
 * POST /api/generate
 *
 * Validates the request body, constructs a SpotifyClient and token context
 * from the user's stored credentials, and calls `generationService.generate`.
 *
 * Request body: { playlistIds?: string[] }
 * Response: GenerationResult
 *
 * Requirements: 8.1, 11.1
 */
router.post('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  const correlationId = (res.locals['correlationId'] as string | undefined) ?? 'unknown';
  const user = req.user!;

  try {
    // ── Body validation ─────────────────────────────────────────────────────
    const { playlistIds } = req.body as { playlistIds?: unknown };

    if (playlistIds !== undefined) {
      if (
        !Array.isArray(playlistIds) ||
        !playlistIds.every((id): id is string => typeof id === 'string')
      ) {
        res.status(400).json({
          error: {
            code: 'INVALID_INPUT',
            message: 'playlistIds must be an array of strings.',
            correlationId,
          },
        });
        return;
      }
    }

    // ── Retrieve user's encrypted refresh token from Firestore ──────────────
    const userDoc = await getUser(user.spotifyUserId);
    if (!userDoc) {
      throw new AuthError(
        'USER_NOT_FOUND',
        'User record not found. Please re-authenticate.',
        401,
      );
    }

    // ── Build SpotifyClient and token context ───────────────────────────────
    const spotifyClient = createSpotifyClient(refreshAccessToken);

    // Obtain a fresh access token from the encrypted refresh token.
    const accessToken = await refreshAccessToken(userDoc.encryptedRefreshToken);

    const tokenCtx: SpotifyTokenContext = {
      accessToken,
      encryptedRefreshToken: userDoc.encryptedRefreshToken,
    };

    // ── Run the generation pipeline ─────────────────────────────────────────
    const result = await generate(
      user.spotifyUserId,
      playlistIds as string[] | undefined,
      spotifyClient,
      tokenCtx,
      correlationId,
    );

    logger.info('Generation completed', {
      correlationId,
      spotifyUserId: user.spotifyUserId,
      step: 'GENERATION_COMPLETE',
      cached: result.cached,
      trackCount: result.tracks.length,
    });

    res.json(result);
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        error: { code: err.code, message: err.message, correlationId },
      });
      return;
    }

    logger.error('Unexpected error during generation', {
      correlationId,
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred during generation.',
        correlationId,
      },
    });
  }
});

export default router;
