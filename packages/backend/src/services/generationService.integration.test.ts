/**
 * Integration test for the full generation pipeline.
 *
 * Mocks external dependencies (spotifyClient, claudeClient, firestoreClient)
 * via vi.mock, then calls `generate()` and asserts the returned
 * `GenerationResult` structure is correct.
 *
 * Validates: Requirements 2.1–2.5, 3.1–3.5, 4.1–4.6, 5.1–5.7
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SpotifyTokenContext } from '../clients/spotifyClient.js';
import type { GenerationResult } from '../lib/types.js';

// ---------------------------------------------------------------------------
// Mocks — set up before importing the module under test
// ---------------------------------------------------------------------------

// Mock firestoreClient
vi.mock('../clients/firestoreClient.js', () => ({
  getGenerationByHash: vi.fn(),
  saveGeneration: vi.fn(),
}));

// Mock claudeClient (used by claudeService)
vi.mock('../clients/claudeClient.js', () => ({
  requestRecommendations: vi.fn(),
}));

// Mock logger to suppress output
vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Import modules after mocks are set up
// ---------------------------------------------------------------------------

import { generate } from './generationService.js';
import { getGenerationByHash, saveGeneration } from '../clients/firestoreClient.js';
import { requestRecommendations } from '../clients/claudeClient.js';

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

function createFixtureTrack(id: string, artistId: string, artistName: string) {
  return {
    id,
    name: `Track ${id}`,
    uri: `spotify:track:${id}`,
    duration_ms: 210000,
    external_urls: { spotify: `https://open.spotify.com/track/${id}` },
    artists: [{ id: artistId, name: artistName }],
    album: {
      name: `Album ${id}`,
      images: [{ url: `https://i.scdn.co/image/${id}`, width: 300, height: 300 }],
    },
  };
}

function createFixtureArtist(id: string, name: string, genres: string[] = ['indie rock']) {
  return {
    id,
    name,
    genres,
    popularity: 75,
    external_urls: { spotify: `https://open.spotify.com/artist/${id}` },
    images: [{ url: `https://i.scdn.co/image/${id}`, width: 300, height: 300 }],
  };
}

function createPagingObject<T>(items: T[]) {
  return {
    items,
    total: items.length,
    limit: 50,
    offset: 0,
    href: 'https://api.spotify.com/v1/test',
    next: null,
    previous: null,
  };
}

/** Fixture candidate list as Claude would return */
const fixtureCandidateList = {
  tracks: [
    { artist: 'New Artist 1', title: 'Track NA1', reason: 'Great indie vibes' },
    { artist: 'New Artist 2', title: 'Track NA2', reason: 'Matches your genre taste' },
    { artist: 'New Artist 3', title: 'Track NA3', reason: 'Similar production style' },
    { artist: 'New Artist 4', title: 'Track NA4', reason: 'Fresh take on rock' },
    { artist: 'New Artist 5', title: 'Track NA5', reason: 'Deep cut recommendation' },
    { artist: 'New Artist 6', title: 'Track NA6', reason: 'Experimental sounds you might enjoy' },
  ],
};

/** Fixture Spotify search results that match the candidates */
function createSearchResult(candidateIndex: number) {
  const id = `resolved_${candidateIndex}`;
  const artistName = `New Artist ${candidateIndex}`;
  return {
    tracks: createPagingObject([
      {
        id,
        name: `Track NA${candidateIndex}`,
        uri: `spotify:track:${id}`,
        duration_ms: 230000 + candidateIndex * 1000,
        external_urls: { spotify: `https://open.spotify.com/track/${id}` },
        artists: [{ id: `artist_${candidateIndex}`, name: artistName }],
        album: {
          name: `Album NA${candidateIndex}`,
          images: [{ url: `https://i.scdn.co/image/${id}`, width: 300, height: 300 }],
        },
      },
    ]),
  };
}

const mockTokenCtx: SpotifyTokenContext = {
  accessToken: 'test-access-token',
  encryptedRefreshToken: 'test-encrypted-refresh-token',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generationService integration — full pipeline', () => {
  let mockSpotifyClient: {
    getTopTracks: ReturnType<typeof vi.fn>;
    getTopArtists: ReturnType<typeof vi.fn>;
    getRecentlyPlayed: ReturnType<typeof vi.fn>;
    getPlaylistTracks: ReturnType<typeof vi.fn>;
    getArtists: ReturnType<typeof vi.fn>;
    searchTracks: ReturnType<typeof vi.fn>;
    checkLibrary: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up Spotify client mock
    mockSpotifyClient = {
      getTopTracks: vi.fn(),
      getTopArtists: vi.fn(),
      getRecentlyPlayed: vi.fn(),
      getPlaylistTracks: vi.fn(),
      getArtists: vi.fn(),
      searchTracks: vi.fn(),
      checkLibrary: vi.fn(),
    };

    // --- Spotify listening data responses ---
    const fixtureTopTrack = createFixtureTrack('top1', 'art1', 'Loved Artist');
    mockSpotifyClient.getTopTracks.mockResolvedValue(createPagingObject([fixtureTopTrack]));

    const fixtureArtist = createFixtureArtist('art1', 'Loved Artist', ['indie rock', 'dream pop']);
    mockSpotifyClient.getTopArtists.mockResolvedValue(createPagingObject([fixtureArtist]));

    mockSpotifyClient.getRecentlyPlayed.mockResolvedValue({
      items: [
        {
          track: createFixtureTrack('recent1', 'art1', 'Loved Artist'),
          played_at: '2024-06-15T10:30:00Z',
        },
      ],
      cursors: null,
      next: null,
      limit: 50,
    });

    // getPlaylistTracks returns an array directly (not a paging object)
    const playlistTrack = createFixtureTrack('plt1', 'art1', 'Loved Artist');
    mockSpotifyClient.getPlaylistTracks.mockResolvedValue([
      { track: playlistTrack, added_at: '2024-05-01T08:00:00Z' },
    ]);

    mockSpotifyClient.getArtists.mockResolvedValue([fixtureArtist]);

    // --- Spotify search results (one per candidate) ---
    mockSpotifyClient.searchTracks.mockImplementation(async (query: string) => {
      // Extract the candidate index from the query
      const match = query.match(/New Artist (\d+)/);
      if (match) {
        return createSearchResult(parseInt(match[1], 10));
      }
      return { tracks: createPagingObject([]) };
    });

    // --- Library check: none of the resolved tracks are in the user's library ---
    mockSpotifyClient.checkLibrary.mockResolvedValue([false]);

    // --- Claude returns fixture candidate list ---
    vi.mocked(requestRecommendations).mockResolvedValue(fixtureCandidateList);

    // --- Firestore: cache miss, then save succeeds ---
    vi.mocked(getGenerationByHash).mockResolvedValue(null);
    vi.mocked(saveGeneration).mockResolvedValue(undefined);
  });

  it('produces a valid GenerationResult with correct structure', async () => {
    const result: GenerationResult = await generate(
      'user123',
      ['playlist-abc'],
      mockSpotifyClient as any,
      mockTokenCtx,
      'corr-integ-001',
    );

    // Top-level fields
    expect(result).toHaveProperty('generationId');
    expect(result.generationId).toMatch(/^gen_/);
    expect(result).toHaveProperty('tracks');
    expect(result).toHaveProperty('partialWarning');
    expect(result).toHaveProperty('cached');
    expect(result.cached).toBe(false);
    expect(Array.isArray(result.tracks)).toBe(true);
  });

  it('returns ResolvedTrack objects with all required fields', async () => {
    const result = await generate(
      'user123',
      [],
      mockSpotifyClient as any,
      mockTokenCtx,
      'corr-integ-002',
    );

    expect(result.tracks.length).toBeGreaterThan(0);

    for (const track of result.tracks) {
      expect(track).toHaveProperty('spotifyUri');
      expect(track.spotifyUri).toMatch(/^spotify:track:/);
      expect(track).toHaveProperty('trackId');
      expect(typeof track.trackId).toBe('string');
      expect(track.trackId.length).toBeGreaterThan(0);
      expect(track).toHaveProperty('title');
      expect(typeof track.title).toBe('string');
      expect(track.title.length).toBeGreaterThan(0);
      expect(track).toHaveProperty('artist');
      expect(typeof track.artist).toBe('string');
      expect(track.artist.length).toBeGreaterThan(0);
      expect(track).toHaveProperty('albumName');
      expect(typeof track.albumName).toBe('string');
      expect(track).toHaveProperty('albumArtUrl');
      expect(typeof track.albumArtUrl).toBe('string');
      expect(track).toHaveProperty('spotifyUrl');
      expect(track.spotifyUrl).toMatch(/^https:\/\/open\.spotify\.com\/track\//);
      expect(track).toHaveProperty('reason');
      expect(typeof track.reason).toBe('string');
      expect(track.reason.length).toBeGreaterThan(0);
      expect(track).toHaveProperty('durationMs');
      expect(typeof track.durationMs).toBe('number');
      expect(track.durationMs).toBeGreaterThan(0);
    }
  });

  it('calls all Spotify listening data endpoints', async () => {
    await generate(
      'user123',
      ['playlist-1'],
      mockSpotifyClient as any,
      mockTokenCtx,
      'corr-integ-003',
    );

    // Top tracks fetched for all 3 time ranges
    expect(mockSpotifyClient.getTopTracks).toHaveBeenCalledTimes(3);
    expect(mockSpotifyClient.getTopTracks).toHaveBeenCalledWith('short_term', mockTokenCtx, 'corr-integ-003');
    expect(mockSpotifyClient.getTopTracks).toHaveBeenCalledWith('medium_term', mockTokenCtx, 'corr-integ-003');
    expect(mockSpotifyClient.getTopTracks).toHaveBeenCalledWith('long_term', mockTokenCtx, 'corr-integ-003');

    // Top artists fetched for all 3 time ranges
    expect(mockSpotifyClient.getTopArtists).toHaveBeenCalledTimes(3);

    // Recently played
    expect(mockSpotifyClient.getRecentlyPlayed).toHaveBeenCalledTimes(1);

    // Playlist tracks for the selected playlist
    expect(mockSpotifyClient.getPlaylistTracks).toHaveBeenCalledWith('playlist-1', mockTokenCtx, 'corr-integ-003');

    // Artist batch for genres
    expect(mockSpotifyClient.getArtists).toHaveBeenCalled();
  });

  it('calls Claude with the taste profile', async () => {
    await generate(
      'user123',
      [],
      mockSpotifyClient as any,
      mockTokenCtx,
      'corr-integ-004',
    );

    expect(requestRecommendations).toHaveBeenCalledTimes(1);
    const calledProfile = vi.mocked(requestRecommendations).mock.calls[0][0];
    expect(calledProfile).toHaveProperty('rankedGenres');
    expect(calledProfile).toHaveProperty('topTracks');
    expect(calledProfile).toHaveProperty('topArtists');
    expect(calledProfile).toHaveProperty('recentlyPlayed');
  });

  it('resolves candidates via Spotify search and library check', async () => {
    const result = await generate(
      'user123',
      [],
      mockSpotifyClient as any,
      mockTokenCtx,
      'corr-integ-005',
    );

    // searchTracks called for each candidate
    expect(mockSpotifyClient.searchTracks).toHaveBeenCalledTimes(fixtureCandidateList.tracks.length);

    // checkLibrary called for each successful search result
    expect(mockSpotifyClient.checkLibrary).toHaveBeenCalled();

    // All 6 candidates should resolve (none in library, all matching)
    expect(result.tracks).toHaveLength(6);
    expect(result.partialWarning).toBe(false);
  });

  it('saves the generation to Firestore cache', async () => {
    const result = await generate(
      'user123',
      ['playlist-xyz'],
      mockSpotifyClient as any,
      mockTokenCtx,
      'corr-integ-006',
    );

    expect(saveGeneration).toHaveBeenCalledTimes(1);
    const [userId, data] = vi.mocked(saveGeneration).mock.calls[0];
    expect(userId).toBe('user123');
    expect(data.generationId).toBe(result.generationId);
    expect(data.cacheKey).toBeDefined();
    expect(data.inputPlaylistIds).toEqual(['playlist-xyz']);
    expect(data.tasteProfile).toHaveProperty('rankedGenres');
    expect(data.candidateList).toEqual(fixtureCandidateList.tracks);
    expect(data.resolvedTracks).toEqual(result.tracks);
    expect(data.resolvedTrackUris).toEqual(result.tracks.map((t) => t.spotifyUri));
    expect(data.partialWarning).toBe(result.partialWarning);
    expect(data.createdAt).toBeDefined();
  });

  it('returns cached result when Firestore has a non-stale entry', async () => {
    const cachedDoc = {
      generationId: 'gen_cached_123',
      cacheKey: 'some-hash',
      inputPlaylistIds: [],
      tasteProfile: { rankedGenres: [], topTracks: [], topArtists: [], recentlyPlayed: [] },
      candidateList: [],
      resolvedTracks: [
        {
          spotifyUri: 'spotify:track:cached1',
          trackId: 'cached1',
          title: 'Cached Track',
          artist: 'Cached Artist',
          albumName: 'Cached Album',
          albumArtUrl: 'https://i.scdn.co/image/cached1',
          spotifyUrl: 'https://open.spotify.com/track/cached1',
          reason: 'Previously generated',
          durationMs: 200000,
        },
      ],
      resolvedTrackUris: ['spotify:track:cached1'],
      partialWarning: false,
      createdAt: new Date().toISOString(), // Fresh — not stale
    };

    vi.mocked(getGenerationByHash).mockResolvedValue(cachedDoc);

    const result = await generate(
      'user123',
      [],
      mockSpotifyClient as any,
      mockTokenCtx,
      'corr-integ-007',
    );

    expect(result.cached).toBe(true);
    expect(result.generationId).toBe('gen_cached_123');
    expect(result.tracks).toEqual(cachedDoc.resolvedTracks);

    // Pipeline should NOT have been called
    expect(mockSpotifyClient.getTopTracks).not.toHaveBeenCalled();
    expect(requestRecommendations).not.toHaveBeenCalled();
    expect(saveGeneration).not.toHaveBeenCalled();
  });

  it('sets partialWarning when fewer than 5 tracks resolve', async () => {
    // Only return results for the first 3 candidates, others return empty
    let callCount = 0;
    mockSpotifyClient.searchTracks.mockImplementation(async () => {
      callCount++;
      if (callCount <= 3) {
        return createSearchResult(callCount);
      }
      return { tracks: createPagingObject([]) };
    });

    const result = await generate(
      'user123',
      [],
      mockSpotifyClient as any,
      mockTokenCtx,
      'corr-integ-008',
    );

    expect(result.tracks).toHaveLength(3);
    expect(result.partialWarning).toBe(true);
  });

  it('filters out tracks already in the user library', async () => {
    // Mark first 3 tracks as already in library, rest are not
    let checkCount = 0;
    mockSpotifyClient.checkLibrary.mockImplementation(async () => {
      checkCount++;
      return checkCount <= 3 ? [true] : [false];
    });

    const result = await generate(
      'user123',
      [],
      mockSpotifyClient as any,
      mockTokenCtx,
      'corr-integ-009',
    );

    // 6 candidates, first 3 filtered out by library check, 3 remain
    expect(result.tracks).toHaveLength(3);
    expect(result.partialWarning).toBe(true);
  });
});
