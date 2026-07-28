/**
 * Anthropic Claude API client wrapper.
 *
 * Provides a single method `requestRecommendations` that sends a user's
 * TasteProfile to Claude via the Anthropic SDK using tool-use (forcing
 * structured JSON output) and returns a typed `CandidateList`.
 *
 * The API key is lazily fetched from Secret Manager via `getSecret`.
 *
 * Requirements: 4.1, 4.5
 */

import Anthropic from '@anthropic-ai/sdk';
import { getSecret } from '../lib/secretManager.js';
import { ClaudeApiError } from '../lib/errors.js';
import type { TasteProfile, CandidateList } from '../lib/types.js';

// ---------------------------------------------------------------------------
// Module-level lazy singleton
// ---------------------------------------------------------------------------

let anthropicClient: Anthropic | null = null;

/**
 * Returns the shared Anthropic client instance, initialising it lazily on
 * first access with the API key from Secret Manager.
 */
function getClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = getSecret('CLAUDE_API_KEY');
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

// ---------------------------------------------------------------------------
// Tool schema definition — forces Claude to output structured CandidateList
// ---------------------------------------------------------------------------

/**
 * The `recommend_tracks` tool schema. When Claude is instructed to use this
 * tool, it must produce output conforming to `CandidateList`:
 * `{ tracks: Array<{ artist: string, title: string, reason: string }> }`
 */
const RECOMMEND_TRACKS_TOOL: Anthropic.Tool = {
  name: 'recommend_tracks',
  description:
    'Returns a list of song recommendations based on the user\'s taste profile. ' +
    'Each recommendation includes the artist name, track title, and a brief reason ' +
    'explaining why the user would enjoy it.',
  input_schema: {
    type: 'object' as const,
    properties: {
      tracks: {
        type: 'array',
        description: 'Array of recommended tracks.',
        items: {
          type: 'object',
          properties: {
            artist: {
              type: 'string',
              description: 'The artist or band name.',
            },
            title: {
              type: 'string',
              description: 'The track title.',
            },
            reason: {
              type: 'string',
              description:
                'A brief human-readable explanation of why this track matches the user\'s taste.',
            },
          },
          required: ['artist', 'title', 'reason'],
        },
      },
    },
    required: ['tracks'],
  },
};

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a music recommendation expert. Your task is to recommend approximately 30 songs that a user is unlikely to have heard before, based on their taste profile.

Guidelines:
- Recommend tracks the user is UNLIKELY to already know — avoid obvious hits from artists they already listen to.
- Draw from the user's genre preferences and listening patterns, but suggest songs from lesser-known artists or deep cuts from well-known artists.
- Vary the recommendations across different genres present in their taste profile.
- Each recommendation must include the artist name, exact track title, and a brief reason explaining why it fits the user's taste.
- Aim for exactly 30 recommendations.
- Use the recommend_tracks tool to return your recommendations in the required structured format.`;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sends the user's taste profile to Claude and requests ~30 track
 * recommendations via a tool-use call.
 *
 * The response is parsed from the `recommend_tracks` tool call output and
 * returned as a typed `CandidateList`.
 *
 * @param tasteProfile The assembled taste profile for the user.
 * @returns A `CandidateList` containing ~30 candidate tracks.
 * @throws {ClaudeApiError} If the API call fails or returns an unexpected
 *   response format (no tool-use block found).
 */
export async function requestRecommendations(
  tasteProfile: TasteProfile,
): Promise<CandidateList> {
  const client = getClient();

  const userMessage = `Here is my listening taste profile:\n\n${JSON.stringify(tasteProfile, null, 2)}\n\nPlease recommend approximately 30 tracks I'm unlikely to have heard, based on this profile. Use the recommend_tracks tool to return your recommendations.`;

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [RECOMMEND_TRACKS_TOOL],
      tool_choice: { type: 'tool', name: 'recommend_tracks' },
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown error communicating with Claude API';
    throw new ClaudeApiError(
      'CLAUDE_REQUEST_FAILED',
      `Claude API request failed: ${message}`,
      502,
    );
  }

  // Extract the tool-use content block from the response.
  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ContentBlock & { type: 'tool_use' } =>
      block.type === 'tool_use' && block.name === 'recommend_tracks',
  );

  if (!toolUseBlock) {
    throw new ClaudeApiError(
      'CLAUDE_NO_TOOL_USE',
      'Claude response did not contain a recommend_tracks tool-use block.',
      502,
    );
  }

  // The `input` field contains the structured tool output matching our schema.
  const candidateList = toolUseBlock.input as CandidateList;

  return candidateList;
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/**
 * Resets the lazily-initialised Anthropic client. Intended for tests only.
 * @internal
 */
export function _resetClientForTesting(): void {
  anthropicClient = null;
}
