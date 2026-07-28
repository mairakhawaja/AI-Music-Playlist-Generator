import apiClient from "../../lib/apiClient";

export interface SavePlaylistRequest {
  generationId: string;
  includedTrackUris: string[];
  playlistName?: string;
}

export interface SavePlaylistResponse {
  playlistId: string;
  playlistUrl: string;
}

/**
 * Save selected tracks as a new Spotify playlist.
 * POST /playlists/save
 */
export async function savePlaylist(
  request: SavePlaylistRequest,
): Promise<SavePlaylistResponse> {
  const response = await apiClient.post<SavePlaylistResponse>(
    "/playlists/save",
    request,
  );
  return response.data;
}

/**
 * Delete (unfollow) a playlist from the user's Spotify account.
 * DELETE /playlists/:id
 */
export async function deletePlaylist(playlistId: string): Promise<void> {
  await apiClient.delete(`/playlists/${playlistId}`);
}
