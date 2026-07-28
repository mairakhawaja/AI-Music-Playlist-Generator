/**
 * Typed Spotify Web API wrapper.
 *
 * Provides a typed Axios-based client for all Spotify API calls required by
 * the playlist generator pipeline. All methods accept the caller's current
 * `accessToken` and `encryptedRefreshToken`. On a 401 response the client
 * transparently refreshes the access token (via the injected `refreshFn`) and
 * retries the request exactly once before propagating an error.
 *
 * Includes retry / back-off logic:
 *  - 429: pauses for the `Retry-After` header duration, then retries once.
 *  - 5xx: retries up to 3 times with exponential back-off (1 s, 2 s, 4 s).
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */

import axios, { type AxiosInstance, type AxiosRequestConfig, isAxiosError } from 'axios';
import { SpotifyApiError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import type { SpotifyTimeRange } from '../lib/types.js';

// ---------------------------------------------------------------------------
// Spotify API response shapes (raw, not yet transformed)
// ---------------------------------------------------------------------------

/** A single Spotify artist object as returned by the API. */
export interface SpotifyArtist {
  id: string;
  name: string;
  genres?: string[];
  popularity?: number;
  external_urls: { spotify: string };
  images: Array<{ url: string; width: number; height: number }>;
}

/** A single Spotify track object (simplified — fields used by the pipeline). */
export interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  preview_url: string | null;
  external_urls: { spotify: string };
  artists: Array<{ id: string; name: string }>;
  album: {
    name: string;
    images: Array<{ url: string; width: number; height: number }>;
  };
}

/** Paged response wrapper for top tracks / top artists. */
export interface SpotifyPagingObject<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  href: string;
  next: string | null;
  previous: string | null;
}

/** An item from the recently-played endpoint. */
export interface SpotifyPlayHistoryObject {
  track: SpotifyTrack;
  played_at: string; // ISO 8601
}

/** Paged recently-played response (cursor-based). */
export interface SpotifyRecentlyPlayedResponse {
  items: SpotifyPlayHistoryObject[];
  cursors: { before: string; after: string } | null;
  next: string | null;
  limit: number;
}

/** A track/item inside a playlist items response (Feb 2026: tracks→items rename). */
export interface SpotifyPlaylistTrackObject {
  track: SpotifyTrack | null;
  item?: SpotifyTrack | null;
  added_at: string;
}

/** A Spotify playlist object as returned by GET /me/playlists. */
export interface SpotifyPlaylistObject {
  id: string;
  name: string;
  images: Array<{ url: string; width: number; height: number }> | null;
  tracks?: { total: number };
  items?: { total: number };
  external_urls: { spotify: string };
}

/** Response from POST /me/playlists. */
export interface SpotifyCreatedPlaylist {
  id: string;
  name: string;
  external_urls: { spotify: string };
}

/** Response from GET /search?type=track */
export interface SpotifySearchTracksResponse {
  tracks: SpotifyPagingObject<SpotifyTrack>;
}

// ---------------------------------------------------------------------------
// Token context
// ---------------------------------------------------------------------------

/**
 * All methods on the Spotify client receive this context so they have
 * everything needed to perform a transparent 401 token-refresh retry.
 */
export interface SpotifyTokenContext {
  /** Current short-lived Spotify access token. */
  accessToken: string;
  /**
   * AES-GCM encrypted refresh token stored in Firestore. Passed to
   * `refreshFn` when the access token has expired.
   */
  encryptedRefreshToken: string;
}

/**
 * A function that accepts an encrypted refresh token and returns a fresh
 * Spotify access token. Implemented by `authService.refreshAccessToken`.
 *
 * Injected at construction time to avoid a circular module dependency
 * between `spotifyClient` and `authService`.
 */
export type RefreshTokenFn = (encryptedRefreshToken: string) => Promise<string>;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const SPOTIFY_API_BASE_URL = 'https://api.spotify.com/v1';

/** Maximum number of track URIs accepted by POST /playlists/{id}/items in one call. */
const MAX_URIS_PER_ADD_TRACKS_REQUEST = 100;

/** Maximum items to request per page for list endpoints. */
const DEFAULT_PAGE_LIMIT = 50;

/**
 * Concurrency limit for individual artist fetches.
 * Balanced to avoid Spotify rate limiting while keeping generation fast.
 */
const ARTIST_FETCH_CONCURRENCY = 5;

/** Delay between artist fetch batches to avoid 429 rate limiting (ms). */
const ARTIST_FETCH_BATCH_DELAY_MS = 100;

// ---------------------------------------------------------------------------
// SpotifyClient class
// ---------------------------------------------------------------------------

/**
 * Typed Spotify Web API client.
 *
 * Constructed once per request (or shared across a request's lifetime) with
 * the user's token context. A single internal Axios instance targets
 * `https://api.spotify.com/v1` and injects the Bearer token on each call.
 *
 * @example
 * ```ts
 * const client = new SpotifyClient(refreshAccessToken);
 * const topTracks = await client.getTopTracks('short_term', {
 *   accessToken,
 *   encryptedRefreshToken,
 * });
 * ```
 */
export class SpotifyClient {
  private readonly http: AxiosInstance;
  private readonly refreshFn: RefreshTokenFn;

  constructor(refreshFn: RefreshTokenFn) {
    this.refreshFn = refreshFn;

    this.http = axios.create({
      baseURL: SPOTIFY_API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // -------------------------------------------------------------------------
  // Core request helper — handles 401 refresh, 429 rate-limit, 5xx retry
  // -------------------------------------------------------------------------

  /** Maximum number of retries for 5xx server errors. */
  private static readonly MAX_5XX_RETRIES = 3;

  /** Exponential back-off delays (in ms) for 5xx retries. */
  private static readonly BACKOFF_DELAYS_MS = [1000, 2000, 4000];

  /**
   * Simple async sleep utility.
   * Extracted as a method so it can be overridden in tests.
   */
  /* istanbul ignore next -- test override */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Performs a typed Axios request with full resilience:
   *  1. 401: refresh access token and retry once.
   *  2. 429: sleep for the `Retry-After` header duration, retry once.
   *  3. 5xx: retry up to 3 times with exponential back-off (1 s, 2 s, 4 s).
   *
   * After all retries are exhausted, throws `SpotifyApiError`.
   *
   * @param config          Axios request config (url, method, params, data, …).
   * @param tokenCtx        Current token context (mutated on refresh so the
   *                        new token is returned to the caller if needed).
   * @param correlationId   Optional correlation ID for structured logging.
   * @returns The Axios response `data` field, typed as `T`.
   * @throws {SpotifyApiError} On non-retryable errors or failed retry.
   */
  private async request<T>(
    config: AxiosRequestConfig,
    tokenCtx: SpotifyTokenContext,
    correlationId: string = 'unknown',
  ): Promise<T> {
    const makeRequest = async (token: string): Promise<T> => {
      const response = await this.http.request<T>({
        ...config,
        headers: {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    };

    /**
     * Attempts a single request, handling a 401 transparently by refreshing
     * the token and retrying once.
     */
    const attemptWithAuthRetry = async (): Promise<T> => {
      try {
        return await makeRequest(tokenCtx.accessToken);
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 401) {
          // Access token expired — refresh and retry once.
          logger.info('Spotify 401 received, refreshing access token', {
            correlationId,
            step: 'TOKEN_REFRESH',
          });

          let newToken: string;
          try {
            newToken = await this.refreshFn(tokenCtx.encryptedRefreshToken);
          } catch {
            throw new SpotifyApiError(
              'SPOTIFY_TOKEN_REFRESH_FAILED',
              'Failed to refresh Spotify access token. Please re-authenticate.',
              401,
            );
          }

          // Update the context so callers receive the fresh token.
          tokenCtx.accessToken = newToken;

          // Retry with the new token — let errors propagate naturally to the
          // outer retry layer.
          return await makeRequest(newToken);
        }

        // Not a 401 — re-throw for the retry layer to inspect.
        throw err;
      }
    };

    // ----- Retry loop: 429 + 5xx handling -----

    let lastError: unknown;
    let retries5xx = 0;
    let has429Retried = false;

    // Loop until success, non-retryable error, or retry budget exhausted.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        return await attemptWithAuthRetry();
      } catch (err) {
        lastError = err;

        if (!isAxiosError(err) || !err.response) {
          // Network error or non-HTTP error — no retry.
          break;
        }

        const status = err.response.status;

        // --- 429 Rate Limit: sleep Retry-After seconds, retry ONCE ---
        if (status === 429 && !has429Retried) {
          has429Retried = true;

          const retryAfterHeader = err.response.headers?.['retry-after'];
          const retryAfterSeconds = retryAfterHeader
            ? parseInt(String(retryAfterHeader), 10)
            : 1;

          // Cap retry delay at 5 seconds — if Spotify demands longer, fail fast
          const MAX_RETRY_WAIT_SECONDS = 5;
          if (retryAfterSeconds > MAX_RETRY_WAIT_SECONDS) {
            logger.warn(`Spotify 429 with Retry-After ${retryAfterSeconds}s (exceeds cap), failing fast`, {
              correlationId,
              step: 'SPOTIFY_RATE_LIMIT',
            });
            break;
          }

          const sleepMs = (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0)
            ? retryAfterSeconds * 1000
            : 1000;

          logger.info(`Spotify 429 received, retrying after ${sleepMs}ms`, {
            correlationId,
            step: 'SPOTIFY_RATE_LIMIT',
          });

          await this.sleep(sleepMs);
          continue;
        }

        // --- 5xx Server Error: retry up to 3 times with exponential back-off ---
        if (status >= 500 && status <= 599 && retries5xx < SpotifyClient.MAX_5XX_RETRIES) {
          const delayMs = SpotifyClient.BACKOFF_DELAYS_MS[retries5xx]!;
          retries5xx++;

          logger.info(`Spotify ${status} received, retry ${retries5xx}/${SpotifyClient.MAX_5XX_RETRIES} after ${delayMs}ms`, {
            correlationId,
            step: 'SPOTIFY_5XX_RETRY',
          });

          await this.sleep(delayMs);
          continue;
        }

        // Non-retryable status or retries exhausted — break out.
        break;
      }
    }

    // All retries exhausted or non-retryable error — throw SpotifyApiError.
    if (isAxiosError(lastError) && lastError.response) {
      // Log the full Spotify error payload for debugging
      console.error('[SPOTIFY DEBUG] Status:', lastError.response.status,
        'URL:', lastError.config?.url,
        'Response:', JSON.stringify(lastError.response.data));

      throw new SpotifyApiError(
        `SPOTIFY_${lastError.response.status}`,
        `Spotify API returned ${lastError.response.status}: ${lastError.message}`,
        502,
      );
    }

    throw new SpotifyApiError(
      'SPOTIFY_NETWORK_ERROR',
      `Spotify API network error: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
      502,
    );
  }

  // -------------------------------------------------------------------------
  // Listening data methods
  // -------------------------------------------------------------------------

  /**
   * Fetches the authenticated user's top tracks for the given time range.
   * Maps to `GET /me/top/tracks?time_range={range}&limit=20`.
   *
   * Requirements: 2.1
   */
  async getTopTracks(
    range: SpotifyTimeRange,
    tokenCtx: SpotifyTokenContext,
    correlationId?: string,
  ): Promise<SpotifyPagingObject<SpotifyTrack>> {
    return this.request<SpotifyPagingObject<SpotifyTrack>>(
      {
        method: 'GET',
        url: '/me/top/tracks',
        params: { time_range: range, limit: 20 },
      },
      tokenCtx,
      correlationId,
    );
  }

  /**
   * Fetches the authenticated user's top artists for the given time range.
   * Maps to `GET /me/top/artists?time_range={range}&limit=20`.
   *
   * Requirements: 2.2
   */
  async getTopArtists(
    range: SpotifyTimeRange,
    tokenCtx: SpotifyTokenContext,
    correlationId?: string,
  ): Promise<SpotifyPagingObject<SpotifyArtist>> {
    return this.request<SpotifyPagingObject<SpotifyArtist>>(
      {
        method: 'GET',
        url: '/me/top/artists',
        params: { time_range: range, limit: 20 },
      },
      tokenCtx,
      correlationId,
    );
  }

  /**
   * Fetches the authenticated user's recently played tracks.
   * Maps to `GET /me/player/recently-played?limit=20`.
   *
   * Requirements: 2.3
   */
  async getRecentlyPlayed(
    tokenCtx: SpotifyTokenContext,
    correlationId?: string,
  ): Promise<SpotifyRecentlyPlayedResponse> {
    return this.request<SpotifyRecentlyPlayedResponse>(
      {
        method: 'GET',
        url: '/me/player/recently-played',
        params: { limit: 20 },
      },
      tokenCtx,
      correlationId,
    );
  }

  /**
   * Fetches tracks from a single Spotify playlist (up to 100 tracks max).
   * Maps to `GET /playlists/{id}/items` (Feb 2026 rename from /tracks).
   *
   * Caps at 100 tracks per playlist to avoid excessive API calls during
   * generation — we only need a representative sample for taste profiling.
   *
   * Requirements: 2.4
   */
  async getPlaylistTracks(
    playlistId: string,
    tokenCtx: SpotifyTokenContext,
    correlationId?: string,
  ): Promise<SpotifyPlaylistTrackObject[]> {
    const allItems: SpotifyPlaylistTrackObject[] = [];
    let url: string | null = `/playlists/${encodeURIComponent(playlistId)}/items`;
    const maxTracks = 100;

    while (url !== null && allItems.length < maxTracks) {
      const page: SpotifyPagingObject<SpotifyPlaylistTrackObject> =
        await this.request<SpotifyPagingObject<SpotifyPlaylistTrackObject>>(
        {
          method: 'GET',
          // When following the `next` URL it is already absolute; strip the
          // base URL prefix so Axios can apply its own baseURL correctly.
          url: url.startsWith('https://') ? url.replace(SPOTIFY_API_BASE_URL, '') : url,
          params: url.startsWith('https://') ? undefined : { limit: DEFAULT_PAGE_LIMIT },
        },
        tokenCtx,
        correlationId,
      );

      // Normalize: Feb 2026 API returns `item` instead of `track`
      const normalized = page.items.map((entry) => ({
        ...entry,
        track: entry.track ?? entry.item ?? null,
        added_at: entry.added_at,
      }));

      allItems.push(...normalized);
      url = page.next;
    }

    return allItems.slice(0, maxTracks);
  }

  /**
   * Fetches full artist objects (including genres) for the given IDs.
   * Uses individual `GET /artists/{id}` requests (Feb 2026: batch endpoint removed).
   * Fetches in small concurrent batches with delays to avoid rate limiting.
   *
   * Requirements: 2.5
   */
  async getArtists(
    ids: string[],
    tokenCtx: SpotifyTokenContext,
    correlationId?: string,
  ): Promise<SpotifyArtist[]> {
    if (ids.length === 0) {
      return [];
    }

    // Cap the number of artists we fetch to avoid excessive API calls.
    // The taste profile only needs top genre data, so 20 artists is plenty.
    const cappedIds = ids.slice(0, 20);
    const results: SpotifyArtist[] = [];

    // Fetch in small concurrent batches with delay between batches
    for (let i = 0; i < cappedIds.length; i += ARTIST_FETCH_CONCURRENCY) {
      const batch = cappedIds.slice(i, i + ARTIST_FETCH_CONCURRENCY);
      const batchResults = await Promise.allSettled(
        batch.map((id) =>
          this.request<SpotifyArtist>(
            {
              method: 'GET',
              url: `/artists/${encodeURIComponent(id)}`,
            },
            tokenCtx,
            correlationId,
          ),
        ),
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value && result.value.id) {
          results.push(result.value);
        }
        // Skip failed individual fetches gracefully — missing artist won't block pipeline
      }

      // Pause between batches to avoid 429 rate limiting
      if (i + ARTIST_FETCH_CONCURRENCY < cappedIds.length) {
        await this.sleep(ARTIST_FETCH_BATCH_DELAY_MS);
      }
    }

    return results;
  }

  // -------------------------------------------------------------------------
  // Track resolution methods
  // -------------------------------------------------------------------------

  /**
   * Searches for tracks matching the given query string.
   * Maps to `GET /search?q={query}&type=track&limit=5`.
   *
   * Returns up to 5 candidate tracks for the caller to pick from.
   */
  async searchTracks(
    query: string,
    tokenCtx: SpotifyTokenContext,
    correlationId?: string,
  ): Promise<SpotifySearchTracksResponse> {
    return this.request<SpotifySearchTracksResponse>(
      {
        method: 'GET',
        url: '/search',
        params: { q: query, type: 'track', limit: 5 },
      },
      tokenCtx,
      correlationId,
    );
  }

  /**
   * Checks whether the authenticated user has the given track IDs saved in
   * their library.
   * Maps to `GET /me/library/contains?uris={uris}` (Feb 2026: replaces /me/tracks/contains).
   *
   * Accepts track IDs and converts them to Spotify URIs internally.
   * Returns a boolean array parallel to `ids`.
   */
  async checkLibrary(
    ids: string[],
    tokenCtx: SpotifyTokenContext,
    correlationId?: string,
  ): Promise<boolean[]> {
    if (ids.length === 0) {
      return [];
    }

    // Convert plain IDs to Spotify track URIs as required by the new endpoint
    const uris = ids.map((id) => `spotify:track:${id}`);

    return this.request<boolean[]>(
      {
        method: 'GET',
        url: '/me/library/contains',
        params: { uris: uris.join(',') },
      },
      tokenCtx,
      correlationId,
    );
  }

  // -------------------------------------------------------------------------
  // Playlist management methods
  // -------------------------------------------------------------------------

  /**
   * Fetches the authenticated user's Spotify playlists.
   * Maps to `GET /me/playlists?limit=50`.
   *
   * Requirements: 8.1
   */
  async getUserPlaylists(
    tokenCtx: SpotifyTokenContext,
    correlationId?: string,
  ): Promise<SpotifyPagingObject<SpotifyPlaylistObject>> {
    return this.request<SpotifyPagingObject<SpotifyPlaylistObject>>(
      {
        method: 'GET',
        url: '/me/playlists',
        params: { limit: DEFAULT_PAGE_LIMIT },
      },
      tokenCtx,
      correlationId,
    );
  }

  /**
   * Creates a new private playlist in the authenticated user's account.
   * Maps to `POST /me/playlists` (Feb 2026: replaces POST /users/{userId}/playlists).
   *
   * Requirements: 7.1
   */
  async createPlaylist(
    _userId: string,
    name: string,
    tokenCtx: SpotifyTokenContext,
    correlationId?: string,
  ): Promise<SpotifyCreatedPlaylist> {
    return this.request<SpotifyCreatedPlaylist>(
      {
        method: 'POST',
        url: '/me/playlists',
        data: {
          name,
          public: false,
          description: 'Generated by AI Music Playlist Generator',
        },
      },
      tokenCtx,
      correlationId,
    );
  }

  /**
   * Adds tracks to an existing Spotify playlist.
   * Maps to `POST /playlists/{id}/items` (Feb 2026: renamed from /tracks),
   * batching up to 100 URIs per call.
   *
   * Requirements: 7.2
   */
  async addTracksToPlaylist(
    playlistId: string,
    uris: string[],
    tokenCtx: SpotifyTokenContext,
    correlationId?: string,
  ): Promise<void> {
    if (uris.length === 0) {
      return;
    }

    // Batch into chunks of MAX_URIS_PER_ADD_TRACKS_REQUEST (Spotify limit: 100).
    for (let i = 0; i < uris.length; i += MAX_URIS_PER_ADD_TRACKS_REQUEST) {
      const batch = uris.slice(i, i + MAX_URIS_PER_ADD_TRACKS_REQUEST);
      await this.request<{ snapshot_id: string }>(
        {
          method: 'POST',
          url: `/playlists/${encodeURIComponent(playlistId)}/items`,
          data: { uris: batch },
        },
        tokenCtx,
        correlationId,
      );
    }
  }

  /**
   * Unfollows (deletes) a playlist from the authenticated user's account.
   * Maps to `DELETE /me/library` with the playlist URI (Feb 2026 API).
   * For user-owned playlists, unfollowing effectively deletes them.
   */
  async unfollowPlaylist(
    playlistId: string,
    tokenCtx: SpotifyTokenContext,
    correlationId?: string,
  ): Promise<void> {
    await this.request<void>(
      {
        method: 'DELETE',
        url: '/me/library',
        data: { uris: [`spotify:playlist:${playlistId}`] },
      },
      tokenCtx,
      correlationId,
    );
  }
}

// ---------------------------------------------------------------------------
// Factory / singleton helpers
// ---------------------------------------------------------------------------

/**
 * Creates a new `SpotifyClient` instance with the provided token-refresh
 * function.
 *
 * Pass `authService.refreshAccessToken` (once task 3.3 is complete) as the
 * `refreshFn` argument.
 *
 * @example
 * ```ts
 * import { refreshAccessToken } from '../services/authService.js';
 * import { createSpotifyClient } from '../clients/spotifyClient.js';
 *
 * const spotifyClient = createSpotifyClient(refreshAccessToken);
 * ```
 */
export function createSpotifyClient(refreshFn: RefreshTokenFn): SpotifyClient {
  return new SpotifyClient(refreshFn);
}
