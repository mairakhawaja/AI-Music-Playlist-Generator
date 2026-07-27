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
import { savePlaylist } from '../services/playlistSaveService.js';
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
  const requestStart = Date.now();

  logger.info('Playlists fetch request received', {
    correlationId,
    spotifyUserId: user.spotifyUserId,
    step: 'PLAYLISTS_FETCH',
  });

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
      durationMs: Date.now() - requestStart,
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
 * Validates request body and calls `playlistSaveService.savePlaylist` to create
 * a new private Spotify playlist with the user's selected tracks.
 *
 * Request body: { generationId: string, includedTrackUris: string[], playlistName?: string }
 * Response:     { playlistId: string, playlistUrl: string }
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
router.post('/save', authenticate, async (req: Request, res: Response): Promise<void> => {
  const correlationId = (res.locals['correlationId'] as string | undefined) ?? 'unknown';
  const user = req.user!;
  const requestStart = Date.now();

  logger.info('Playlist save request received', {
    correlationId,
    spotifyUserId: user.spotifyUserId,
    step: 'PLAYLIST_SAVE',
  });

  try {
    // ── Validate request body ─────────────────────────────────────────────────
    const { generationId, includedTrackUris, playlistName } = req.body as Record<string, unknown>;

    if (typeof generationId !== 'string' || generationId.trim().length === 0) {
      res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'generationId must be a non-empty string.',
          correlationId,
        },
      });
      return;
    }

    if (
      !Array.isArray(includedTrackUris) ||
      includedTrackUris.length === 0 ||
      !includedTrackUris.every((uri) => typeof uri === 'string' && uri.trim().length > 0)
    ) {
      res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'includedTrackUris must be a non-empty array of non-empty strings.',
          correlationId,
        },
      });
      return;
    }

    if (playlistName !== undefined && typeof playlistName !== 'string') {
      res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'playlistName must be a string if provided.',
          correlationId,
        },
      });
      return;
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

    const accessToken = await refreshAccessToken(userDoc.encryptedRefreshToken);

    const tokenCtx: SpotifyTokenContext = {
      accessToken,
      encryptedRefreshToken: userDoc.encryptedRefreshToken,
    };

    // ── Save playlist ───────────────────────────────────────────────────────
    const result = await savePlaylist(
      user.spotifyUserId,
      generationId.trim(),
      includedTrackUris as string[],
      spotifyClient,
      tokenCtx,
      correlationId,
      typeof playlistName === 'string' ? playlistName : undefined,
    );

    logger.info('Playlist saved successfully', {
      correlationId,
      spotifyUserId: user.spotifyUserId,
      step: 'PLAYLIST_SAVE_SUCCESS',
      durationMs: Date.now() - requestStart,
    });

    res.json({
      playlistId: result.playlistId,
      playlistUrl: result.playlistUrl,
    });
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        error: { code: err.code, message: err.message, correlationId },
      });
      return;
    }

    logger.error('Unexpected error saving playlist', {
      correlationId,
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while saving the playlist.',
        correlationId,
      },
    });
  }
});

export default router;
