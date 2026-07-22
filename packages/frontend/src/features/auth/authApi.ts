import apiClient from "../../lib/apiClient";

export interface MeResponse {
  spotifyUserId: string;
  displayName: string;
}

/**
 * Initiates Spotify login by fetching the authorize URL from the backend
 * and redirecting the browser to it.
 */
export async function login(): Promise<void> {
  const { data } = await apiClient.get<{ authorizeUrl: string }>(
    "/auth/login",
  );
  window.location.href = data.authorizeUrl;
}

/**
 * Logs the user out by calling the backend logout endpoint.
 */
export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}

/**
 * Fetches the currently authenticated user's profile.
 */
export async function getMe(): Promise<MeResponse> {
  const { data } = await apiClient.get<MeResponse>("/auth/me");
  return data;
}
