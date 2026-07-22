/**
 * Playlist routes for the AI Music Playlist Generator.
 *
 * Endpoints:
 *   GET  /api/playlists      — Returns user's Spotify playlists
 *   POST /api/playlists/save — Saves reviewed tracks as a new Spotify playlist (task 10.4)
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
import { AppError, AuthError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import type { SpotifyPlaylist } from '../lib/types.js';

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

/**
 * GET /api/playlists
 *
 * Fetches and returns the authenticated user's Spotify playlists, transformed
 * to the `SpotifyPlaylist[]` shape expected by the frontend.
 *
 * Response: SpotifyPlaylist[]
 *
 * Requirements: 8.1
 */
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  const correlationId = (res.locals['correlationId'] as string | undefined) ?? 'unknown';
  const user = req.user!;

  try {
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

    const accessToken = await refreshAccessToken(userDoc.encryptedRefreshToken);

    const tokenCtx: SpotifyTokenContext = {
      accessToken,
      encryptedRefreshToken: userDoc.encryptedRefreshToken,
    };

    // ── Fetch playlists from Spotify ────────────────────────────────────────
    const response = await spotifyClient.getUserPlaylists(tokenCtx, correlationId);

    // Transform Spotify API response to the SpotifyPlaylist[] shape
    const playlists: SpotifyPlaylist[] = response.items.map((item) => ({
      id: item.id,
      name: item.name,
      coverImageUrl: item.images && item.images.length > 0 ? item.images[0]!.url : null,
      trackCount: item.tracks.total,
    }));

    logger.info('User playlists fetched', {
      correlationId,
      spotifyUserId: user.spotifyUserId,
      step: 'PLAYLISTS_FETCH',
      playlistCount: playlists.length,
    });

    res.json(playlists);
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        error: { code: err.code, message: err.message, correlationId },
      });
      return;
    }

    logger.error('Unexpected error fetching playlists', {
      correlationId,
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while fetching playlists.',
        correlationId,
      },
    });
  }
});

/**
 * POST /api/playlists/save
 *
 * Placeholder for task 10.4. Will validate request body and call
 * `playlistSaveService.savePlaylist` to create a new Spotify playlist.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
router.post('/save', authenticate, async (_req: Request, res: Response): Promise<void> => {
  const correlationId = (res.locals['correlationId'] as string | undefined) ?? 'unknown';

  // TODO: Implement in task 10.4
  res.status(501).json({
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Playlist save is not yet implemented.',
      correlationId,
    },
  });
});

export default router;
