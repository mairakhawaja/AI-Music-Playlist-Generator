/**
 * Playlist save service — creates and populates a Spotify playlist.
 *
 * Responsibilities:
 *   - Build a default playlist name from a Date (ISO 8601 format).
 *   - Create a private Spotify playlist in the user's account.
 *   - Add the user's selected tracks to the newly created playlist.
 *   - Update the Firestore generation document with `savedPlaylistId`.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.6
 */

import { Firestore } from '@google-cloud/firestore';
import type { SpotifyClient, SpotifyTokenContext } from '../clients/spotifyClient.js';
import { logger } from '../lib/logger.js';

// ---------------------------------------------------------------------------
// Firestore singleton (mirrors firestoreClient.ts lazy-init pattern)
// ---------------------------------------------------------------------------

let firestoreInstance: Firestore | null = null;

function getFirestore(): Firestore {
  if (firestoreInstance === null) {
    firestoreInstance = new Firestore();
  }
  return firestoreInstance;
}

/**
 * Overrides the Firestore instance for testing.
 * @internal
 */
export function _setFirestoreInstanceForTesting(instance: Firestore): void {
  firestoreInstance = instance;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The result returned after successfully saving a playlist. */
export interface SavePlaylistResult {
  playlistId: string;
  playlistUrl: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds the default playlist name using ISO 8601 date format.
 *
 * @param date The generation date used to format the name.
 * @returns A string matching the pattern "AI Music Generator — YYYY-MM-DD".
 *
 * Requirements: 7.6
 */
export function buildDefaultName(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `AI Music Generator \u2014 ${year}-${month}-${day}`;
}

// ---------------------------------------------------------------------------
// Main service function
// ---------------------------------------------------------------------------

/**
 * Creates a new private Spotify playlist, adds the selected tracks, and
 * updates the Firestore generation cache document with the `savedPlaylistId`.
 *
 * @param userId              The authenticated user's Spotify user ID.
 * @param generationId        The generation cache document ID.
 * @param includedUris        Array of Spotify track URIs to add to the playlist.
 * @param spotifyClient       A configured SpotifyClient instance.
 * @param tokenCtx            The user's Spotify token context.
 * @param correlationId       Request correlation ID for structured logging.
 * @param playlistName        Optional custom playlist name; defaults to ISO 8601 pattern.
 * @returns The saved playlist's Spotify ID and URL.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.6
 */
export async function savePlaylist(
  userId: string,
  generationId: string,
  includedUris: string[],
  spotifyClient: SpotifyClient,
  tokenCtx: SpotifyTokenContext,
  correlationId: string,
  playlistName?: string,
): Promise<SavePlaylistResult> {
  const name = playlistName?.trim() || buildDefaultName(new Date());

  // ── Step 1: Create the private playlist ───────────────────────────────────
  const createStart = Date.now();
  const createdPlaylist = await spotifyClient.createPlaylist(
    userId,
    name,
    tokenCtx,
    correlationId,
  );
  const createDurationMs = Date.now() - createStart;

  logger.info('Spotify playlist created', {
    correlationId,
    spotifyUserId: userId,
    step: 'PLAYLIST_SAVE',
    durationMs: createDurationMs,
  });

  // ── Step 2: Add tracks to the playlist ────────────────────────────────────
  const addStart = Date.now();
  await spotifyClient.addTracksToPlaylist(
    createdPlaylist.id,
    includedUris,
    tokenCtx,
    correlationId,
  );
  const addDurationMs = Date.now() - addStart;

  logger.info('Tracks added to playlist', {
    correlationId,
    spotifyUserId: userId,
    step: 'PLAYLIST_SAVE',
    durationMs: addDurationMs,
  });

  // ── Step 3: Update Firestore generation doc with savedPlaylistId ──────────
  const fsStart = Date.now();
  const db = getFirestore();
  await db
    .collection('users')
    .doc(userId)
    .collection('generations')
    .doc(generationId)
    .update({ savedPlaylistId: createdPlaylist.id });
  const fsDurationMs = Date.now() - fsStart;

  logger.info('Generation document updated with savedPlaylistId', {
    correlationId,
    spotifyUserId: userId,
    step: 'PLAYLIST_SAVE',
    durationMs: fsDurationMs,
  });

  return {
    playlistId: createdPlaylist.id,
    playlistUrl: createdPlaylist.external_urls.spotify,
  };
}
