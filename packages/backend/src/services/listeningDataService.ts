/**
 * Listening Data Service
 *
 * Fetches all Spotify listening data required to build a user's taste profile.
 * Orchestrates calls to the SpotifyClient for top tracks (×3 time ranges),
 * top artists (×3 time ranges), recently played, playlist tracks, and batch
 * artist objects for genre information.
 *
 * Each fetch step is logged with correlationId, step, message, and durationMs.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 10.1
 */

import type {
  SpotifyClient,
  SpotifyTokenContext,
  SpotifyArtist,
  SpotifyTrack,
  SpotifyPlayHistoryObject,
  SpotifyPlaylistTrackObject,
  SpotifyPagingObject,
} from '../clients/spotifyClient.js';
import { logger } from '../lib/logger.js';
import type { SpotifyTimeRange } from '../lib/types.js';

// ---------------------------------------------------------------------------
// Raw listening data interface
// ---------------------------------------------------------------------------

/**
 * Raw data collected from all Spotify listening data endpoints.
 * Consumed by `tasteProfileService` to assemble the TasteProfile.
 */
export interface RawListeningData {
  /** Top tracks per time range. */
  topTracks: Record<SpotifyTimeRange, SpotifyTrack[]>;
  /** Top artists per time range. */
  topArtists: Record<SpotifyTimeRange, SpotifyArtist[]>;
  /** Recently played tracks. */
  recentlyPlayed: SpotifyPlayHistoryObject[];
  /** Tracks from each selected playlist, keyed by playlist ID. */
  playlistTracks: Record<string, SpotifyPlaylistTrackObject[]>;
  /** Full artist objects (with genres) for all unique artists found. */
  artistDetails: SpotifyArtist[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIME_RANGES: SpotifyTimeRange[] = ['short_term', 'medium_term', 'long_term'];

// ---------------------------------------------------------------------------
// Service implementation
// ---------------------------------------------------------------------------

/**
 * Fetches all listening data for the given user from Spotify.
 *
 * @param spotifyClient   An initialised SpotifyClient instance.
 * @param tokenCtx        The user's current Spotify token context.
 * @param playlistIds     Selected playlist IDs to include in the analysis (may be empty).
 * @param correlationId   Correlation ID for structured logging.
 * @returns A structured `RawListeningData` object containing all fetched data.
 */
export async function fetchAllListeningData(
  spotifyClient: SpotifyClient,
  tokenCtx: SpotifyTokenContext,
  playlistIds: string[],
  correlationId: string,
): Promise<RawListeningData> {
  // --- Top Tracks (×3 ranges) ---
  const topTracks: Record<SpotifyTimeRange, SpotifyTrack[]> = {
    short_term: [],
    medium_term: [],
    long_term: [],
  };

  for (const range of TIME_RANGES) {
    const start = Date.now();
    const page: SpotifyPagingObject<SpotifyTrack> = await spotifyClient.getTopTracks(
      range,
      tokenCtx,
      correlationId,
    );
    topTracks[range] = page.items;

    logger.info(`Fetched top tracks for ${range}`, {
      correlationId,
      step: 'LISTENING_DATA_FETCH',
      durationMs: Date.now() - start,
    });
  }

  // --- Top Artists (×3 ranges) ---
  const topArtists: Record<SpotifyTimeRange, SpotifyArtist[]> = {
    short_term: [],
    medium_term: [],
    long_term: [],
  };

  for (const range of TIME_RANGES) {
    const start = Date.now();
    const page: SpotifyPagingObject<SpotifyArtist> = await spotifyClient.getTopArtists(
      range,
      tokenCtx,
      correlationId,
    );
    topArtists[range] = page.items;

    logger.info(`Fetched top artists for ${range}`, {
      correlationId,
      step: 'LISTENING_DATA_FETCH',
      durationMs: Date.now() - start,
    });
  }

  // --- Recently Played ---
  const recentStart = Date.now();
  const recentlyPlayedResponse = await spotifyClient.getRecentlyPlayed(
    tokenCtx,
    correlationId,
  );
  const recentlyPlayed = recentlyPlayedResponse.items;

  logger.info('Fetched recently played tracks', {
    correlationId,
    step: 'LISTENING_DATA_FETCH',
    durationMs: Date.now() - recentStart,
  });

  // --- Playlist Tracks (if any) ---
  const playlistTracks: Record<string, SpotifyPlaylistTrackObject[]> = {};

  for (const playlistId of playlistIds) {
    const start = Date.now();
    const tracks = await spotifyClient.getPlaylistTracks(
      playlistId,
      tokenCtx,
      correlationId,
    );
    playlistTracks[playlistId] = tracks;

    logger.info(`Fetched tracks for playlist ${playlistId}`, {
      correlationId,
      step: 'LISTENING_DATA_FETCH',
      durationMs: Date.now() - start,
    });
  }

  // --- Batch Artist Objects for Genres ---
  const uniqueArtistIds = collectUniqueArtistIds(topTracks, topArtists, recentlyPlayed, playlistTracks);

  let artistDetails: SpotifyArtist[] = [];
  if (uniqueArtistIds.length > 0) {
    const start = Date.now();
    artistDetails = await spotifyClient.getArtists(
      uniqueArtistIds,
      tokenCtx,
      correlationId,
    );

    logger.info(`Fetched ${artistDetails.length} artist details for genre info`, {
      correlationId,
      step: 'LISTENING_DATA_FETCH',
      durationMs: Date.now() - start,
    });
  }

  return {
    topTracks,
    topArtists,
    recentlyPlayed,
    playlistTracks,
    artistDetails,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Collects all unique artist IDs from the fetched listening data.
 */
function collectUniqueArtistIds(
  topTracks: Record<SpotifyTimeRange, SpotifyTrack[]>,
  topArtists: Record<SpotifyTimeRange, SpotifyArtist[]>,
  recentlyPlayed: SpotifyPlayHistoryObject[],
  playlistTracks: Record<string, SpotifyPlaylistTrackObject[]>,
): string[] {
  const ids = new Set<string>();

  // From top tracks
  for (const range of TIME_RANGES) {
    for (const track of topTracks[range]) {
      for (const artist of track.artists) {
        ids.add(artist.id);
      }
    }
  }

  // From top artists
  for (const range of TIME_RANGES) {
    for (const artist of topArtists[range]) {
      ids.add(artist.id);
    }
  }

  // From recently played
  for (const item of recentlyPlayed) {
    for (const artist of item.track.artists) {
      ids.add(artist.id);
    }
  }

  // From playlist tracks
  for (const tracks of Object.values(playlistTracks)) {
    for (const item of tracks) {
      if (item.track) {
        for (const artist of item.track.artists) {
          ids.add(artist.id);
        }
      }
    }
  }

  return Array.from(ids);
}
