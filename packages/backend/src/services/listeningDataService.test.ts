/**
 * Unit tests for listeningDataService.
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 10.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAllListeningData } from './listeningDataService.js';
import type { SpotifyClient, SpotifyTokenContext } from '../clients/spotifyClient.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createMockTrack(id: string, artistId: string, artistName: string) {
  return {
    id,
    name: `Track ${id}`,
    uri: `spotify:track:${id}`,
    duration_ms: 200000,
    external_urls: { spotify: `https://open.spotify.com/track/${id}` },
    artists: [{ id: artistId, name: artistName }],
    album: {
      name: `Album ${id}`,
      images: [{ url: `https://img/${id}.jpg`, width: 300, height: 300 }],
    },
  };
}

function createMockArtist(id: string, name: string, genres: string[] = []) {
  return {
    id,
    name,
    genres,
    popularity: 80,
    external_urls: { spotify: `https://open.spotify.com/artist/${id}` },
    images: [{ url: `https://img/${id}.jpg`, width: 300, height: 300 }],
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

const mockTokenCtx: SpotifyTokenContext = {
  accessToken: 'test-access-token',
  encryptedRefreshToken: 'test-encrypted-refresh',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('listeningDataService', () => {
  let mockClient: {
    getTopTracks: ReturnType<typeof vi.fn>;
    getTopArtists: ReturnType<typeof vi.fn>;
    getRecentlyPlayed: ReturnType<typeof vi.fn>;
    getPlaylistTracks: ReturnType<typeof vi.fn>;
    getArtists: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockClient = {
      getTopTracks: vi.fn(),
      getTopArtists: vi.fn(),
      getRecentlyPlayed: vi.fn(),
      getPlaylistTracks: vi.fn(),
      getArtists: vi.fn(),
    };
  });

  it('fetches top tracks for all 3 time ranges', async () => {
    const track = createMockTrack('t1', 'a1', 'Artist 1');
    mockClient.getTopTracks.mockResolvedValue(createPagingObject([track]));
    mockClient.getTopArtists.mockResolvedValue(createPagingObject([]));
    mockClient.getRecentlyPlayed.mockResolvedValue({ items: [], cursors: null, next: null, limit: 50 });
    mockClient.getArtists.mockResolvedValue([createMockArtist('a1', 'Artist 1', ['pop'])]);

    const result = await fetchAllListeningData(
      mockClient as unknown as SpotifyClient,
      mockTokenCtx,
      [],
      'corr-123',
    );

    expect(mockClient.getTopTracks).toHaveBeenCalledTimes(3);
    expect(mockClient.getTopTracks).toHaveBeenCalledWith('short_term', mockTokenCtx, 'corr-123');
    expect(mockClient.getTopTracks).toHaveBeenCalledWith('medium_term', mockTokenCtx, 'corr-123');
    expect(mockClient.getTopTracks).toHaveBeenCalledWith('long_term', mockTokenCtx, 'corr-123');
    expect(result.topTracks.short_term).toEqual([track]);
    expect(result.topTracks.medium_term).toEqual([track]);
    expect(result.topTracks.long_term).toEqual([track]);
  });

  it('fetches top artists for all 3 time ranges', async () => {
    const artist = createMockArtist('a1', 'Artist 1', ['rock']);
    mockClient.getTopTracks.mockResolvedValue(createPagingObject([]));
    mockClient.getTopArtists.mockResolvedValue(createPagingObject([artist]));
    mockClient.getRecentlyPlayed.mockResolvedValue({ items: [], cursors: null, next: null, limit: 50 });
    mockClient.getArtists.mockResolvedValue([artist]);

    const result = await fetchAllListeningData(
      mockClient as unknown as SpotifyClient,
      mockTokenCtx,
      [],
      'corr-456',
    );

    expect(mockClient.getTopArtists).toHaveBeenCalledTimes(3);
    expect(mockClient.getTopArtists).toHaveBeenCalledWith('short_term', mockTokenCtx, 'corr-456');
    expect(mockClient.getTopArtists).toHaveBeenCalledWith('medium_term', mockTokenCtx, 'corr-456');
    expect(mockClient.getTopArtists).toHaveBeenCalledWith('long_term', mockTokenCtx, 'corr-456');
    expect(result.topArtists.short_term).toEqual([artist]);
  });

  it('fetches recently played tracks', async () => {
    const track = createMockTrack('t2', 'a2', 'Artist 2');
    const playHistoryItem = { track, played_at: '2024-01-01T12:00:00Z' };

    mockClient.getTopTracks.mockResolvedValue(createPagingObject([]));
    mockClient.getTopArtists.mockResolvedValue(createPagingObject([]));
    mockClient.getRecentlyPlayed.mockResolvedValue({ items: [playHistoryItem], cursors: null, next: null, limit: 50 });
    mockClient.getArtists.mockResolvedValue([createMockArtist('a2', 'Artist 2')]);

    const result = await fetchAllListeningData(
      mockClient as unknown as SpotifyClient,
      mockTokenCtx,
      [],
      'corr-789',
    );

    expect(mockClient.getRecentlyPlayed).toHaveBeenCalledWith(mockTokenCtx, 'corr-789');
    expect(result.recentlyPlayed).toEqual([playHistoryItem]);
  });

  it('fetches playlist tracks for each selected playlist', async () => {
    const track = createMockTrack('t3', 'a3', 'Artist 3');
    const playlistTrackItem = { track, added_at: '2024-01-01T12:00:00Z' };

    mockClient.getTopTracks.mockResolvedValue(createPagingObject([]));
    mockClient.getTopArtists.mockResolvedValue(createPagingObject([]));
    mockClient.getRecentlyPlayed.mockResolvedValue({ items: [], cursors: null, next: null, limit: 50 });
    mockClient.getPlaylistTracks.mockResolvedValue([playlistTrackItem]);
    mockClient.getArtists.mockResolvedValue([createMockArtist('a3', 'Artist 3')]);

    const result = await fetchAllListeningData(
      mockClient as unknown as SpotifyClient,
      mockTokenCtx,
      ['playlist-1', 'playlist-2'],
      'corr-plist',
    );

    expect(mockClient.getPlaylistTracks).toHaveBeenCalledTimes(2);
    expect(mockClient.getPlaylistTracks).toHaveBeenCalledWith('playlist-1', mockTokenCtx, 'corr-plist');
    expect(mockClient.getPlaylistTracks).toHaveBeenCalledWith('playlist-2', mockTokenCtx, 'corr-plist');
    expect(result.playlistTracks['playlist-1']).toEqual([playlistTrackItem]);
    expect(result.playlistTracks['playlist-2']).toEqual([playlistTrackItem]);
  });

  it('collects unique artist IDs and fetches batch artist details', async () => {
    const track1 = createMockTrack('t1', 'a1', 'Artist 1');
    const track2 = createMockTrack('t2', 'a1', 'Artist 1'); // same artist
    const track3 = createMockTrack('t3', 'a2', 'Artist 2');

    mockClient.getTopTracks.mockResolvedValue(createPagingObject([track1, track2, track3]));
    mockClient.getTopArtists.mockResolvedValue(createPagingObject([]));
    mockClient.getRecentlyPlayed.mockResolvedValue({ items: [], cursors: null, next: null, limit: 50 });
    mockClient.getArtists.mockResolvedValue([
      createMockArtist('a1', 'Artist 1', ['pop']),
      createMockArtist('a2', 'Artist 2', ['rock']),
    ]);

    const result = await fetchAllListeningData(
      mockClient as unknown as SpotifyClient,
      mockTokenCtx,
      [],
      'corr-unique',
    );

    // Should only call with unique IDs (a1, a2)
    expect(mockClient.getArtists).toHaveBeenCalledTimes(1);
    const calledIds = mockClient.getArtists.mock.calls[0][0] as string[];
    expect(calledIds).toHaveLength(2);
    expect(calledIds).toContain('a1');
    expect(calledIds).toContain('a2');
    expect(result.artistDetails).toHaveLength(2);
  });

  it('does not call getArtists when no artists are found', async () => {
    mockClient.getTopTracks.mockResolvedValue(createPagingObject([]));
    mockClient.getTopArtists.mockResolvedValue(createPagingObject([]));
    mockClient.getRecentlyPlayed.mockResolvedValue({ items: [], cursors: null, next: null, limit: 50 });

    const result = await fetchAllListeningData(
      mockClient as unknown as SpotifyClient,
      mockTokenCtx,
      [],
      'corr-empty',
    );

    expect(mockClient.getArtists).not.toHaveBeenCalled();
    expect(result.artistDetails).toEqual([]);
  });

  it('returns a complete RawListeningData structure', async () => {
    mockClient.getTopTracks.mockResolvedValue(createPagingObject([]));
    mockClient.getTopArtists.mockResolvedValue(createPagingObject([]));
    mockClient.getRecentlyPlayed.mockResolvedValue({ items: [], cursors: null, next: null, limit: 50 });

    const result = await fetchAllListeningData(
      mockClient as unknown as SpotifyClient,
      mockTokenCtx,
      [],
      'corr-struct',
    );

    expect(result).toHaveProperty('topTracks');
    expect(result).toHaveProperty('topArtists');
    expect(result).toHaveProperty('recentlyPlayed');
    expect(result).toHaveProperty('playlistTracks');
    expect(result).toHaveProperty('artistDetails');
    expect(result.topTracks).toHaveProperty('short_term');
    expect(result.topTracks).toHaveProperty('medium_term');
    expect(result.topTracks).toHaveProperty('long_term');
    expect(result.topArtists).toHaveProperty('short_term');
    expect(result.topArtists).toHaveProperty('medium_term');
    expect(result.topArtists).toHaveProperty('long_term');
  });
});
