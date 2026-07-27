import apiClient from "../../lib/apiClient";

export interface SpotifyPlaylist {
  id: string;
  name: string;
  coverImageUrl: string | null;
  trackCount: number;
}

export interface ResolvedTrack {
  spotifyUri: string;
  trackId: string;
  title: string;
  artist: string;
  albumName: string;
  albumArtUrl: string;
  spotifyUrl: string;
  reason: string;
  durationMs: number;
}

export interface GenerationResult {
  generationId: string;
  tracks: ResolvedTrack[];
  partialWarning: boolean;
  cached: boolean;
}

/**
 * Fetch the authenticated user's Spotify playlists.
 * GET /playlists
 */
export async function getPlaylists(): Promise<SpotifyPlaylist[]> {
  const response = await apiClient.get<SpotifyPlaylist[]>("/playlists");
  return response.data;
}

/**
 * Trigger playlist generation with the selected playlist IDs.
 * POST /generate
 */
export async function generate(
  playlistIds: string[],
): Promise<GenerationResult> {
  const response = await apiClient.post<GenerationResult>("/generate", {
    playlistIds,
  });
  return response.data;
}
