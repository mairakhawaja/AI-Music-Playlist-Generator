/**
 * Generation pipeline orchestrator — assembles the full pipeline with caching.
 *
 * Computes a SHA-256 cache key from `{ userId, sortedPlaylistIds }`, checks
 * Firestore for a non-stale entry, and returns the cached result if hit.
 * On miss: calls listeningDataService -> tasteProfileService -> claudeService
 * -> trackResolutionService, stores results at each step, and returns a
 * GenerationResult.
 *
 * Requirements: 3.5, 4.6, 5.7, 11.1, 11.2, 11.3, 10.1
 */

import { createHash } from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import type { SpotifyClient, SpotifyTokenContext } from '../clients/spotifyClient.js';
import type { GenerationResult, TasteProfile, CandidateList } from '../lib/types.js';
import { logger } from '../lib/logger.js';
import { fetchAllListeningData } from './listeningDataService.js';
import { assembleTasteProfile } from './tasteProfileService.js';
import { generateCandidateList } from './claudeService.js';
import { resolveAll } from './trackResolutionService.js';
import {
  getGenerationByHash,
  saveGeneration,
  type GenerationDoc,
} from '../clients/firestoreClient.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Cache staleness threshold in milliseconds (24 hours). */
const CACHE_STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Computes the cache key for a generation request.
 * SHA-256 of JSON-serialized `{ userId, sortedPlaylistIds }`.
 */
export function computeCacheKey(userId: string, playlistIds: string[] | undefined): string {
  const sortedIds = [...(playlistIds ?? [])].sort();
  const payload = JSON.stringify({ userId, sortedPlaylistIds: sortedIds });
  return createHash('sha256').update(payload).digest('hex');
}

/**
 * Runs (or returns cached) the full generation pipeline.
 *
 * @param spotifyUserId      The authenticated user's Spotify ID.
 * @param playlistIds        Optional array of playlist IDs to include in taste analysis.
 * @param spotifyClient      A configured SpotifyClient instance for API calls.
 * @param tokenCtx           The user's Spotify token context for API authorization.
 * @param correlationId      Request correlation ID for structured logging.
 * @returns The generation result containing resolved tracks.
 *
 * Requirements: 3.5, 4.6, 5.7, 11.1, 11.2, 11.3, 10.1
 */
export async function generate(
  spotifyUserId: string,
  playlistIds: string[] | undefined,
  spotifyClient: SpotifyClient,
  tokenCtx: SpotifyTokenContext,
  correlationId: string,
): Promise<GenerationResult> {
  const startTime = Date.now();
  const cacheKey = computeCacheKey(spotifyUserId, playlistIds);

  // ── Check cache ────────────────────────────────────────────────────────────
  logger.info('Checking generation cache', {
    correlationId,
    spotifyUserId,
    step: 'CACHE_CHECK',
  });

  const cachedDoc = await getGenerationByHash(spotifyUserId, cacheKey);

  if (cachedDoc && !isStale(cachedDoc)) {
    logger.info('Cache hit — returning cached generation result', {
      correlationId,
      spotifyUserId,
      step: 'CACHE_HIT',
      durationMs: Date.now() - startTime,
    });

    return {
      generationId: cachedDoc.generationId,
      tracks: cachedDoc.resolvedTracks,
      partialWarning: cachedDoc.partialWarning,
      cached: true,
    };
  }

  // ── Cache miss — run the full pipeline ─────────────────────────────────────
  logger.info('Cache miss — running full generation pipeline', {
    correlationId,
    spotifyUserId,
    step: 'PIPELINE_START',
  });

  // Step 1: Fetch listening data
  const fetchStart = Date.now();
  const rawListeningData = await fetchAllListeningData(
    spotifyClient,
    tokenCtx,
    playlistIds ?? [],
    correlationId,
    spotifyUserId,
  );
  logger.info('Listening data fetched', {
    correlationId,
    spotifyUserId,
    step: 'LISTENING_DATA_COMPLETE',
    durationMs: Date.now() - fetchStart,
  });

  // Step 2: Assemble taste profile
  const profileStart = Date.now();
  const tasteProfile: TasteProfile = assembleTasteProfile(rawListeningData, correlationId, spotifyUserId);
  logger.info('Taste profile assembled', {
    correlationId,
    spotifyUserId,
    step: 'TASTE_PROFILE_ASSEMBLE',
    durationMs: Date.now() - profileStart,
  });

  // Step 3: Generate candidate list via Claude
  const claudeStart = Date.now();
  const candidateList: CandidateList = await generateCandidateList(
    tasteProfile,
    correlationId,
    spotifyUserId,
  );
  logger.info('Claude candidate list received', {
    correlationId,
    spotifyUserId,
    step: 'CLAUDE_REQUEST',
    durationMs: Date.now() - claudeStart,
    trackCount: candidateList.tracks.length,
  });

  // Step 4: Resolve tracks on Spotify
  const resolveStart = Date.now();
  const { tracks: resolvedTracks, partialWarning } = await resolveAll(
    candidateList.tracks,
    spotifyClient,
    tokenCtx,
    correlationId,
    spotifyUserId,
  );
  logger.info('Track resolution complete', {
    correlationId,
    spotifyUserId,
    step: 'TRACK_RESOLUTION',
    durationMs: Date.now() - resolveStart,
    trackCount: resolvedTracks.length,
  });

  // Step 5: Store in Firestore cache
  const generationId = `gen_${uuidv4()}`;

  await saveGeneration(spotifyUserId, {
    generationId,
    cacheKey,
    inputPlaylistIds: playlistIds ?? [],
    tasteProfile,
    candidateList: candidateList.tracks,
    resolvedTracks,
    resolvedTrackUris: resolvedTracks.map((t) => t.spotifyUri),
    partialWarning,
    createdAt: new Date().toISOString(),
  });

  logger.info('Generation pipeline complete', {
    correlationId,
    spotifyUserId,
    step: 'PIPELINE_COMPLETE',
    durationMs: Date.now() - startTime,
    generationId,
  });

  return {
    generationId,
    tracks: resolvedTracks,
    partialWarning,
    cached: false,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Checks whether a cached generation doc is stale (> 24 hours old).
 */
function isStale(doc: GenerationDoc): boolean {
  const createdAt = new Date(doc.createdAt).getTime();
  const now = Date.now();
  return now - createdAt > CACHE_STALE_THRESHOLD_MS;
}
