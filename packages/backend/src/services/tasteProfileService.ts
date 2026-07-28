/**
 * Taste Profile Service
 *
 * Assembles and validates a TasteProfile from raw Spotify listening data.
 * Aggregates genres by frequency, deduplicates tracks and artists across
 * time ranges, and enforces size limits to control downstream prompt size.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import type { TasteProfile, SpotifyTimeRange } from '../lib/types.js';
import type { SpotifyArtist, SpotifyTrack, SpotifyPlayHistoryObject } from '../clients/spotifyClient.js';
import type { RawListeningData } from './listeningDataService.js';
import { logger } from '../lib/logger.js';

// ---------------------------------------------------------------------------
// Constants — size limits per Requirement 3.4
// ---------------------------------------------------------------------------

/** Maximum number of top tracks in the assembled TasteProfile. */
const MAX_TOP_TRACKS = 50;

/** Maximum number of top artists in the assembled TasteProfile. */
const MAX_TOP_ARTISTS = 20;

/** Maximum number of recently played tracks in the assembled TasteProfile. */
const MAX_RECENTLY_PLAYED = 50;

// ---------------------------------------------------------------------------
// Time range priority for flattening (short_term first for recency bias)
// ---------------------------------------------------------------------------

const TIME_RANGE_ORDER: SpotifyTimeRange[] = ['short_term', 'medium_term', 'long_term'];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Aggregates genres from artist detail objects, counts occurrences, and
 * returns them sorted in descending order by frequency.
 *
 * @param artistDetails  Full Spotify artist objects containing genre arrays.
 * @returns Array of `{ genre, count }` sorted highest count first.
 *
 * Requirements: 3.1
 */
export function rankGenres(
  artistDetails: SpotifyArtist[],
): Array<{ genre: string; count: number }> {
  const genreCounts = new Map<string, number>();

  for (const artist of artistDetails) {
    for (const genre of (artist.genres ?? [])) {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    }
  }

  const ranked = Array.from(genreCounts.entries()).map(([genre, count]) => ({
    genre,
    count,
  }));

  // Sort descending by count; stable sort by genre name as tiebreaker
  ranked.sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre));

  return ranked;
}

/**
 * Assembles a complete TasteProfile from raw Spotify listening data.
 *
 * - Ranks genres from all artist details.
 * - Flattens top tracks across all three time ranges, deduplicates by track ID,
 *   and takes the first MAX_TOP_TRACKS entries.
 * - Flattens top artists across all three time ranges, deduplicates by artist ID,
 *   and takes the first MAX_TOP_ARTISTS entries.
 * - Takes the first MAX_RECENTLY_PLAYED recently played tracks.
 *
 * @param rawData        The RawListeningData collected by listeningDataService.
 * @param correlationId  Optional correlation ID for structured logging.
 * @param spotifyUserId  Optional Spotify user ID for structured logging.
 * @returns A fully populated and size-limited TasteProfile.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
export function assembleTasteProfile(
  rawData: RawListeningData,
  correlationId?: string,
  spotifyUserId?: string,
): TasteProfile {
  const startTime = Date.now();
  // --- Ranked Genres ---
  const rankedGenres = rankGenres(rawData.artistDetails);

  // --- Top Tracks: flatten all 3 ranges, deduplicate by track ID, limit to 50 ---
  const topTracks = deduplicateTracks(rawData.topTracks);

  // --- Top Artists: flatten all 3 ranges, deduplicate by artist ID, limit to 20 ---
  const topArtists = deduplicateArtists(rawData.topArtists);

  // --- Recently Played: take first 50 ---
  const recentlyPlayed = rawData.recentlyPlayed
    .slice(0, MAX_RECENTLY_PLAYED)
    .map((item: SpotifyPlayHistoryObject) => ({
      title: item.track.name,
      artist: item.track.artists.map((a) => a.name).join(', '),
      playedAt: item.played_at,
    }));

  const profile: TasteProfile = {
    rankedGenres,
    topTracks,
    topArtists,
    recentlyPlayed,
  };

  if (correlationId) {
    logger.info('Taste profile assembled', {
      correlationId,
      ...(spotifyUserId ? { spotifyUserId } : {}),
      step: 'TASTE_PROFILE_ASSEMBLE',
      durationMs: Date.now() - startTime,
      genreCount: rankedGenres.length,
      topTrackCount: topTracks.length,
      topArtistCount: topArtists.length,
      recentlyPlayedCount: recentlyPlayed.length,
    });
  }

  return profile;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Flattens top tracks from all three time ranges, deduplicates by track ID
 * (keeping the first occurrence — priority: short_term > medium_term > long_term),
 * and returns at most MAX_TOP_TRACKS entries.
 */
function deduplicateTracks(
  topTracksByRange: Record<SpotifyTimeRange, SpotifyTrack[]>,
): TasteProfile['topTracks'] {
  const seen = new Set<string>();
  const result: TasteProfile['topTracks'] = [];

  for (const range of TIME_RANGE_ORDER) {
    for (const track of topTracksByRange[range]) {
      if (seen.has(track.id)) continue;
      seen.add(track.id);

      result.push({
        title: track.name,
        artist: track.artists.map((a) => a.name).join(', '),
        timeRange: range,
      });

      if (result.length >= MAX_TOP_TRACKS) {
        return result;
      }
    }
  }

  return result;
}

/**
 * Flattens top artists from all three time ranges, deduplicates by artist ID
 * (keeping the first occurrence — priority: short_term > medium_term > long_term),
 * and returns at most MAX_TOP_ARTISTS entries.
 */
function deduplicateArtists(
  topArtistsByRange: Record<SpotifyTimeRange, SpotifyArtist[]>,
): TasteProfile['topArtists'] {
  const seen = new Set<string>();
  const result: TasteProfile['topArtists'] = [];

  for (const range of TIME_RANGE_ORDER) {
    for (const artist of topArtistsByRange[range]) {
      if (seen.has(artist.id)) continue;
      seen.add(artist.id);

      result.push({
        name: artist.name,
        timeRange: range,
      });

      if (result.length >= MAX_TOP_ARTISTS) {
        return result;
      }
    }
  }

  return result;
}
