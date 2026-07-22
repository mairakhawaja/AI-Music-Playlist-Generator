/**
 * Claude recommendation service — orchestrates prompt construction, calls the
 * Claude client, and validates the structured response.
 *
 * Retry policy:
 * - If `requestRecommendations` throws (API error), retry ONCE then propagate.
 * - If the response is parseable but fails CandidateList validation (missing
 *   fields), retry ONCE then throw `ClaudeApiError('CLAUDE_MALFORMED_RESPONSE')`.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import { requestRecommendations } from '../clients/claudeClient.js';
import { ClaudeApiError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import type { TasteProfile, CandidateList, CandidateTrack } from '../lib/types.js';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Returns true if every entry in the candidate list has non-empty `artist`,
 * `title`, and `reason` string fields.
 */
function isValidCandidateList(candidateList: CandidateList): boolean {
  if (!candidateList || !Array.isArray(candidateList.tracks)) {
    return false;
  }

  return candidateList.tracks.every(
    (track: CandidateTrack) =>
      typeof track.artist === 'string' &&
      track.artist.trim().length > 0 &&
      typeof track.title === 'string' &&
      track.title.trim().length > 0 &&
      typeof track.reason === 'string' &&
      track.reason.trim().length > 0,
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates a candidate list of ~30 track recommendations from Claude based on
 * the user's taste profile.
 *
 * Handles both API errors and malformed responses with a single retry.
 *
 * @param tasteProfile The assembled taste profile for the user.
 * @param correlationId The request correlation ID for structured logging.
 * @returns A validated `CandidateList` with ~30 candidate tracks.
 * @throws {ClaudeApiError} If both attempts fail (API error or malformed response).
 */
export async function generateCandidateList(
  tasteProfile: TasteProfile,
  correlationId: string,
): Promise<CandidateList> {
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const startTime = Date.now();

    try {
      logger.info(`Claude recommendation request attempt ${attempt}`, {
        correlationId,
        step: 'CLAUDE_REQUEST',
        attempt,
      });

      const candidateList = await requestRecommendations(tasteProfile);
      const durationMs = Date.now() - startTime;

      // Validate the response structure
      if (isValidCandidateList(candidateList)) {
        logger.info('Claude recommendation request succeeded', {
          correlationId,
          step: 'CLAUDE_REQUEST',
          durationMs,
          attempt,
          trackCount: candidateList.tracks.length,
        });
        return candidateList;
      }

      // Validation failed — log and retry or throw
      logger.warn(
        `Claude response failed validation on attempt ${attempt}`,
        {
          correlationId,
          step: 'CLAUDE_REQUEST',
          durationMs,
          attempt,
        },
      );

      if (attempt === maxAttempts) {
        throw new ClaudeApiError(
          'CLAUDE_MALFORMED_RESPONSE',
          'Claude returned a malformed response that failed validation after retry.',
          502,
        );
      }
    } catch (error) {
      const durationMs = Date.now() - startTime;

      // If it's our own ClaudeApiError for malformed response, just throw it
      if (
        error instanceof ClaudeApiError &&
        error.code === 'CLAUDE_MALFORMED_RESPONSE'
      ) {
        throw error;
      }

      logger.error(
        `Claude request failed on attempt ${attempt}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          correlationId,
          step: 'CLAUDE_REQUEST',
          durationMs,
          attempt,
        },
      );

      // On the last attempt, propagate the error
      if (attempt === maxAttempts) {
        if (error instanceof ClaudeApiError) {
          throw error;
        }
        throw new ClaudeApiError(
          'CLAUDE_REQUEST_FAILED',
          `Claude API request failed after ${maxAttempts} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
          502,
        );
      }
    }
  }

  // TypeScript exhaustiveness — should never reach here
  throw new ClaudeApiError(
    'CLAUDE_REQUEST_FAILED',
    'Claude API request failed unexpectedly.',
    502,
  );
}
