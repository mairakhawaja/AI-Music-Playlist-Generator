/**
 * Shared TypeScript interfaces for the AI Music Playlist Generator.
 * All types used across services, routes, and clients are defined here.
 */

/**
 * The three Spotify time ranges used when fetching top tracks and top artists.
 */
export type SpotifyTimeRange = 'short_term' | 'medium_term' | 'long_term';

/**
 * Taste profile assembled from a user's Spotify listening data.
 * Validates: Requirements 3.2
 */
export interface TasteProfile {
  /** Genres ranked by frequency across all top artists, highest count first. */
  rankedGenres: Array<{ genre: string; count: number }>;
  /** Top tracks fetched across all three time ranges. */
  topTracks: Array<{ title: string; artist: string; timeRange: SpotifyTimeRange }>;
  /** Top artists fetched across all three time ranges. */
  topArtists: Array<{ name: string; timeRange: SpotifyTimeRange }>;
  /** Recently played tracks with ISO 8601 playedAt timestamps. */
  recentlyPlayed: Array<{ title: string; artist: string; playedAt: string }>;
}

/**
 * A single raw track recommendation produced by Claude.
 * Validates: Requirements 4.2
 */
export interface CandidateTrack {
  artist: string;
  title: string;
  /** Human-readable explanation from Claude for why this track was chosen. */
  reason: string;
}

/**
 * The full structured response from Claude's `recommend_tracks` tool call.
 * Validates: Requirements 4.2
 */
export interface CandidateList {
  tracks: CandidateTrack[];
}

/**
 * A Spotify track that has been searched, matched, and confirmed as playable
 * and not already in the user's library.
 */
export interface ResolvedTrack {
  /** e.g. "spotify:track:4iV5W9uYEdYUVa79Axb7Rh" */
  spotifyUri: string;
  trackId: string;
  title: string;
  artist: string;
  albumName: string;
  /** 300×300 album art image URL from Spotify. */
  albumArtUrl: string;
  spotifyUrl: string;
  /** Forwarded from the originating CandidateTrack. */
  reason: string;
  durationMs: number;
}

/**
 * The final result returned to the frontend after the generation pipeline runs.
 * Validates: Requirements 5.5
 */
export interface GenerationResult {
  generationId: string;
  /** Up to 25 resolved tracks. */
  tracks: ResolvedTrack[];
  /** True when fewer than 5 tracks were successfully resolved. */
  partialWarning: boolean;
  /** True when the result was served from the Firestore cache. */
  cached: boolean;
}

/**
 * A user's Spotify playlist, as returned by the GET /api/playlists endpoint
 * and used in the playlist-selection UI.
 */
export interface SpotifyPlaylist {
  id: string;
  name: string;
  /** null when the playlist has no cover image. */
  coverImageUrl: string | null;
  trackCount: number;
}

/**
 * Payload signed into the HS256 session JWT.
 * Mirrors the standard JWT `iat` and `exp` numeric date claims.
 */
export interface SessionPayload {
  spotifyUserId: string;
  displayName: string;
  /** Issued-at time (Unix seconds). */
  iat: number;
  /** Expiry time (Unix seconds). */
  exp: number;
}

/**
 * Frontend state for a single track in the review / results UI.
 */
export interface TrackUIState {
  track: ResolvedTrack;
  /** Whether the user has chosen to include this track in the saved playlist. */
  included: boolean;
}
