/**
 * Track Resolution Service
 *
 * Resolves Claude-generated CandidateTrack entries into real, playable Spotify
 * tracks by searching the Spotify API, validating artist/title match, and
 * filtering out tracks already in the user's library.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import type { SpotifyClient, SpotifyTokenContext, SpotifyTrack } from '../clients/spotifyClient.js';
import { logger } from '../lib/logger.js';
import type { CandidateTrack, ResolvedTrack } from '../lib/types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of resolved tracks to return. */
const MAX_RESOLVED_TRACKS = 25;

/** Threshold below which we emit a partial-results warning. */
const PARTIAL_WARNING_THRESHOLD = 5;

// ---------------------------------------------------------------------------
// Matching helpers
// ---------------------------------------------------------------------------

/**
 * Determines whether a Spotify track result is a "close match" to the
 * candidate's artist and title. Matching is case-insensitive and uses
 * substring inclusion — either the result contains the candidate value or
 * vice versa.
 */
export function isCloseMatch(
  candidate: { artist: string; title: string },
  spotifyTrack: SpotifyTrack,
): boolean {
  const candidateArtist = candidate.artist.toLowerCase().trim();
  const candidateTitle = candidate.title.toLowerCase().trim();

  const trackTitle = spotifyTrack.name.toLowerCase().trim();
  const trackArtists = spotifyTrack.artists.map((a) => a.name.toLowerCase().trim());

  // Title match: either contains the other
  const titleMatches =
    trackTitle.includes(candidateTitle) || candidateTitle.includes(trackTitle);

  // Artist match: at least one Spotify artist name contains the candidate or vice versa
  const artistMatches = trackArtists.some(
    (artistName) =>
      artistName.includes(candidateArtist) || candidateArtist.includes(artistName),
  );

  return titleMatches && artistMatches;
}

// ---------------------------------------------------------------------------
// Core resolution
// ---------------------------------------------------------------------------

/**
 * Resolves a single CandidateTrack to a ResolvedTrack by:
 * 1. Searching Spotify with `"artist title"` query
 * 2. Picking the first result with a close artist+title match
 * 3. Checking whether the track is already in the user's library
 * 4. Returning the ResolvedTrack if not in library, or null otherwise
 *
 * @returns A `ResolvedTrack` if the candidate was successfully resolved and
 *          is not in the user's library, otherwise `null`.
 */
export async function resolveTrack(
  candidate: CandidateTrack,
  spotifyClient: SpotifyClient,
  tokenCtx: SpotifyTokenContext,
  correlationId: string,
): Promise<ResolvedTrack | null> {
  const query = `${candidate.artist} ${candidate.title}`;

  let searchResponse;
  try {
    searchResponse = await spotifyClient.searchTracks(query, tokenCtx, correlationId);
  } catch (error) {
    logger.warn(`Track search failed for "${query}"`, {
      correlationId,
      step: 'TRACK_RESOLUTION',
    });
    return null;
  }

  const results = searchResponse.tracks.items;
  if (results.length === 0) {
    return null;
  }

  // Pick first close match
  const matched = results.find((track) => isCloseMatch(candidate, track));
  if (!matched) {
    return null;
  }

  // Check whether the track is already in the user's library
  let inLibrary: boolean[];
  try {
    inLibrary = await spotifyClient.checkLibrary([matched.id], tokenCtx, correlationId);
  } catch (error) {
    logger.warn(`Library check failed for track "${matched.id}"`, {
      correlationId,
      step: 'TRACK_RESOLUTION',
    });
    return null;
  }

  if (inLibrary[0]) {
    // Track already in user's library — discard
    return null;
  }

  // Build the ResolvedTrack
  const albumArtUrl =
    matched.album.images.find((img) => img.width === 300)?.url ??
    matched.album.images[0]?.url ??
    '';

  const resolvedTrack: ResolvedTrack = {
    spotifyUri: matched.uri,
    trackId: matched.id,
    title: matched.name,
    artist: matched.artists.map((a) => a.name).join(', '),
    albumName: matched.album.name,
    albumArtUrl,
    spotifyUrl: matched.external_urls.spotify,
    reason: candidate.reason,
    durationMs: matched.duration_ms,
  };

  return resolvedTrack;
}

// ---------------------------------------------------------------------------
// Batch resolution
// ---------------------------------------------------------------------------

/**
 * Result from resolving a batch of candidate tracks.
 */
export interface ResolveAllResult {
  /** Successfully resolved tracks (at most 25). */
  tracks: ResolvedTrack[];
  /** True when fewer than 5 tracks were resolved. */
  partialWarning: boolean;
}

/**
 * Iterates over a list of CandidateTrack entries, resolving each one via
 * Spotify search and library check. Filters nulls, enforces a maximum of
 * 25 resolved tracks, and sets `partialWarning` if fewer than 5 remain.
 *
 * @returns An object containing the resolved tracks and a partial warning flag.
 */
export async function resolveAll(
  candidates: CandidateTrack[],
  spotifyClient: SpotifyClient,
  tokenCtx: SpotifyTokenContext,
  correlationId: string,
  spotifyUserId?: string,
): Promise<ResolveAllResult> {
  const startTime = Date.now();
  const resolved: ResolvedTrack[] = [];

  for (const candidate of candidates) {
    // Stop collecting once we hit the cap
    if (resolved.length >= MAX_RESOLVED_TRACKS) {
      break;
    }

    const track = await resolveTrack(candidate, spotifyClient, tokenCtx, correlationId);
    if (track !== null) {
      resolved.push(track);
    }
  }

  const partialWarning = resolved.length < PARTIAL_WARNING_THRESHOLD;

  const durationMs = Date.now() - startTime;
  logger.info(
    `Track resolution complete: ${resolved.length} tracks resolved from ${candidates.length} candidates`,
    {
      correlationId,
      ...(spotifyUserId ? { spotifyUserId } : {}),
      step: 'TRACK_RESOLUTION',
      durationMs,
      resolvedCount: resolved.length,
      candidateCount: candidates.length,
    },
  );

  if (partialWarning) {
    logger.warn(
      `Partial results: only ${resolved.length} tracks resolved (threshold: ${PARTIAL_WARNING_THRESHOLD})`,
      {
        correlationId,
        ...(spotifyUserId ? { spotifyUserId } : {}),
        step: 'TRACK_RESOLUTION',
      },
    );
  }

  return { tracks: resolved, partialWarning };
}
