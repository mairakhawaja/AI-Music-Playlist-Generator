# Requirements Document

## Introduction

The Spotify Playlist Generator (marketed as "AI Music Generator") is a web application that helps users discover new music tailored to their personal taste. A user connects their Spotify account via OAuth 2.0, selects playlists and/or relies on their listening history, and triggers a generation pipeline. The backend assembles a taste profile from Spotify listening data, sends it to an LLM (Claude), receives ~25 song recommendations, resolves each to a real Spotify track, and returns a reviewable list. The user can toggle individual tracks and save the result as a new private playlist in their Spotify account.

This document covers MVP scope and post-MVP (V1) additions. Post-MVP requirements are clearly marked.

---

## Glossary

- **App**: The Spotify Playlist Generator web application (React SPA + Node.js/TypeScript backend).
- **Backend**: The Node.js/TypeScript server running on Google Cloud Run.
- **Frontend**: The React single-page application served to the user's browser.
- **Spotify_API**: The Spotify Web API endpoints available to new apps as of November 2024.
- **Claude**: The Anthropic Claude LLM used to generate song recommendations.
- **OAuth_Flow**: The OAuth 2.0 Authorization Code flow with PKCE used to authenticate users with Spotify.
- **Access_Token**: The short-lived Spotify API token obtained after OAuth authorization.
- **Refresh_Token**: The long-lived Spotify token stored encrypted in Firestore to re-acquire Access_Tokens.
- **Taste_Profile**: A compact JSON object derived from the user's listening data, summarizing top tracks, top artists, ranked genres, and recently played tracks.
- **Candidate_List**: The raw list of ~30 {artist, title, reason} objects returned by Claude.
- **Resolved_Track**: A Spotify track that has been matched to a Candidate_List entry via Spotify Search and is confirmed not already in the user's library.
- **Generation**: A single end-to-end run of the pipeline that produces a list of Resolved_Tracks.
- **Playlist**: A Spotify playlist object owned by the authenticated user.
- **Firestore**: Google Cloud Firestore, used as the application database.
- **Secret_Manager**: Google Secret Manager, used to store the Spotify client secret and Claude API key.
- **Generation_Cache**: A Firestore document under `users/{spotifyUserId}/generations/{genId}` that records the inputs and outputs of a Generation.
- **Discovery_Dial**: (V1) A slider control ranging from "Safe" to "Adventurous" that influences recommendation diversity.
- **Vibe_Prompt**: (V1) A free-text input that adds user intent to the prompt sent to Claude.

---

## Requirements

---

### Requirement 1: Spotify Authentication

**User Story:** As a new visitor, I want to connect my Spotify account, so that the App can access my listening data and act on my behalf.

#### Acceptance Criteria

1. THE App SHALL implement the OAuth 2.0 Authorization Code flow with PKCE to authenticate users with Spotify.
2. WHEN a user initiates login, THE Frontend SHALL redirect the user to the Spotify authorization URL with a PKCE code challenge and the required permission scopes.
3. WHEN Spotify redirects back with an authorization code, THE Backend SHALL exchange the code for an Access_Token and Refresh_Token using the PKCE code verifier.
4. THE Backend SHALL store the Refresh_Token encrypted in Firestore under `users/{spotifyUserId}` and SHALL NOT persist the Refresh_Token in plaintext.
5. WHEN an Access_Token has expired, THE Backend SHALL use the stored Refresh_Token to obtain a new Access_Token before making Spotify_API calls.
6. IF the Refresh_Token exchange fails, THEN THE Backend SHALL return an authentication error response and SHALL require the user to re-authenticate.
7. WHEN a user successfully authenticates, THE Backend SHALL create or update the Firestore document at `users/{spotifyUserId}` with `displayName` and `createdAt` fields.

---

### Requirement 2: Listening Data Retrieval

**User Story:** As an authenticated user, I want the App to read my Spotify listening history and selected playlists, so that it can understand my musical taste.

#### Acceptance Criteria

1. WHEN a Generation is initiated, THE Backend SHALL fetch the user's top tracks for each of the three Spotify time ranges: `short_term`, `medium_term`, and `long_term` using `GET /me/top/tracks`.
2. WHEN a Generation is initiated, THE Backend SHALL fetch the user's top artists for each of the three Spotify time ranges using `GET /me/top/artists`.
3. WHEN a Generation is initiated, THE Backend SHALL fetch the user's recently played tracks using `GET /me/player/recently-played`.
4. WHEN a user selects one or more playlists, THE Backend SHALL fetch all tracks from each selected playlist using `GET /playlists/{id}/tracks`.
5. THE Backend SHALL fetch full artist objects for all unique artists present in the retrieved listening data using `GET /artists` (batch endpoint) to obtain genre information.
6. IF a Spotify_API call returns a 429 status code, THEN THE Backend SHALL retry the request after the duration specified in the `Retry-After` header.
7. IF a Spotify_API call returns a 5xx status code, THEN THE Backend SHALL retry the request up to 3 times with exponential back-off before returning an error to the caller.

---

### Requirement 3: Taste Profile Assembly

**User Story:** As an authenticated user, I want the App to build a taste profile from my listening data, so that recommendations are genuinely tailored to me.

#### Acceptance Criteria

1. WHEN listening data has been retrieved, THE Backend SHALL aggregate artist genres into a ranked genre list ordered by frequency of occurrence across all retrieved data.
2. THE Backend SHALL assemble a Taste_Profile JSON object containing: ranked genre list, top tracks (with artist and title), top artists (with name), and recently played tracks (with artist and title).
3. THE Taste_Profile SHALL include data from all three time ranges for top tracks and top artists so that both long-term preferences and recent shifts are represented.
4. THE Backend SHALL limit the Taste_Profile to a maximum of 50 top tracks, 20 top artists, and 50 recently played tracks to control prompt size.
5. THE Backend SHALL store the assembled Taste_Profile in the Generation_Cache document before sending it to Claude.

---

### Requirement 4: LLM Recommendation Generation

**User Story:** As an authenticated user, I want the App to use AI to suggest songs I haven't heard that match my taste, so that I discover new music without manual effort.

#### Acceptance Criteria

1. WHEN a Taste_Profile is assembled, THE Backend SHALL send it to Claude via the Anthropic API and request approximately 30 candidate song recommendations.
2. THE Backend SHALL instruct Claude to return recommendations as a structured JSON array where each element contains `artist`, `title`, and `reason` fields.
3. IF Claude returns a malformed or non-parseable JSON response, THEN THE Backend SHALL retry the request once and, if still malformed, SHALL return an error to the Frontend.
4. THE Backend SHALL instruct Claude to recommend songs that the user is unlikely to have heard before, based on the Taste_Profile data provided.
5. THE Backend SHALL read the Claude API key from Secret_Manager and SHALL NOT store it in environment variables or source code.
6. THE Backend SHALL store the raw Candidate_List returned by Claude in the Generation_Cache document.

---

### Requirement 5: Track Resolution

**User Story:** As an authenticated user, I want every recommended song to be a real, playable Spotify track, so that I can actually listen to and save what the App suggests.

#### Acceptance Criteria

1. FOR EACH entry in the Candidate_List, THE Backend SHALL query `GET /search` on the Spotify_API using the entry's `artist` and `title` fields to find a matching track.
2. WHEN a search returns one or more results, THE Backend SHALL select the first result whose artist name and track title closely match the Candidate_List entry.
3. IF no Spotify track can be matched to a Candidate_List entry, THEN THE Backend SHALL discard that entry and SHALL NOT include it in the resolved list.
4. THE Backend SHALL check each matched track against the user's existing library and SHALL discard any track already present in the user's Spotify library.
5. AFTER discarding unresolvable and duplicate entries, THE Backend SHALL return at most 25 Resolved_Tracks to the Frontend.
6. IF fewer than 5 Resolved_Tracks remain after filtering, THEN THE Backend SHALL return a partial-results warning alongside the available tracks.
7. THE Backend SHALL store the list of resolved Spotify track URIs in the Generation_Cache document.

---

### Requirement 6: Reviewable Results Display

**User Story:** As an authenticated user, I want to review the recommended tracks before saving them, so that I can curate the final playlist to my liking.

#### Acceptance Criteria

1. WHEN the Backend returns Resolved_Tracks, THE Frontend SHALL display each track with: album art, track title, artist name, the Claude-generated reason, and a link to open the track in Spotify.
2. THE Frontend SHALL render an include/exclude toggle for each track, defaulting all tracks to included.
3. WHEN a user toggles a track to excluded, THE Frontend SHALL visually distinguish it from included tracks.
4. THE Frontend SHALL display a count of currently included tracks and update it in real time as the user changes toggles.
5. WHILE a Generation is in progress, THE Frontend SHALL display a loading indicator and SHALL disable the Generate Playlist button.
6. IF the Backend returns an error during Generation, THEN THE Frontend SHALL display a human-readable error message and SHALL re-enable the Generate Playlist button.

---

### Requirement 7: Save to Spotify

**User Story:** As an authenticated user, I want to save the curated list as a new Spotify playlist, so that I can listen to my recommendations in the Spotify app.

#### Acceptance Criteria

1. WHEN a user initiates a save, THE Backend SHALL create a new private Spotify playlist in the user's account using `POST /users/{id}/playlists`.
2. THE Backend SHALL add only the tracks whose include toggle is set to included to the new playlist using `POST /playlists/{id}/tracks`.
3. WHEN the playlist is successfully created and populated, THE Backend SHALL update the Generation_Cache document with the `savedPlaylistId`.
4. WHEN the playlist is successfully saved, THE Frontend SHALL display a confirmation message with a direct link to the new playlist in Spotify.
5. IF the playlist creation or track-add call fails, THEN THE Backend SHALL return an error response and THE Frontend SHALL display a human-readable error message without losing the user's current track selection.
6. THE Backend SHALL name the new playlist with a default name of "AI Music Generator — [ISO 8601 date]" unless the user provides a custom name.

---

### Requirement 8: Playlist Selection

**User Story:** As an authenticated user, I want to select which of my Spotify playlists to include in the taste analysis, so that I can influence what kind of music the App recommends.

#### Acceptance Criteria

1. WHEN an authenticated user opens the generation screen, THE Frontend SHALL fetch and display the user's Spotify playlists using `GET /me/playlists`.
2. THE Frontend SHALL allow the user to select zero or more playlists to include in the taste analysis.
3. WHEN zero playlists are selected, THE Backend SHALL rely solely on top tracks, top artists, and recently played data to build the Taste_Profile.
4. THE Frontend SHALL display each playlist with its name and cover image.

---

### Requirement 9: Data Security and Secrets Management

**User Story:** As the system operator, I want all secrets and user credentials stored securely, so that the App does not expose sensitive data through misconfiguration.

#### Acceptance Criteria

1. THE Backend SHALL retrieve the Spotify client secret from Secret_Manager at startup and SHALL NOT store it in source code or unencrypted environment variables.
2. THE Backend SHALL retrieve the Claude API key from Secret_Manager at startup and SHALL NOT store it in source code or unencrypted environment variables.
3. THE Backend SHALL encrypt all Refresh_Tokens before writing them to Firestore using a key retrieved from Secret_Manager.
4. THE App SHALL communicate between Frontend and Backend exclusively over HTTPS.
5. THE Backend SHALL emit structured JSON logs to Google Cloud Logging and SHALL NOT include Access_Tokens, Refresh_Tokens, or API keys in log output.

---

### Requirement 10: Observability and Error Handling

**User Story:** As the system operator, I want comprehensive structured logging and graceful error handling, so that I can diagnose production issues quickly.

#### Acceptance Criteria

1. THE Backend SHALL emit a structured JSON log entry for each significant event in the Generation pipeline, including data retrieval, taste profile assembly, Claude request, and track resolution steps.
2. WHEN an unhandled exception occurs, THE Backend SHALL log the error with stack trace and context at ERROR severity and SHALL return a 500 response with a generic error message to the Frontend.
3. THE Backend SHALL include a correlation ID in every log entry and in every API response header so that a full Generation run can be traced across log entries.
4. WHEN the Backend returns any error response, THE Frontend SHALL surface a human-readable message to the user and SHALL log the correlation ID in the browser console for support purposes.

---

### Requirement 11: Caching and Idempotency

**User Story:** As an authenticated user, I want the App to avoid redundant API calls during a session, so that generation is fast and does not exhaust Spotify or Claude API rate limits.

#### Acceptance Criteria

1. THE Backend SHALL store each completed Generation in a Generation_Cache document in Firestore so that subsequent requests for the same inputs can retrieve the cached result.
2. WHEN a Generation request is received with inputs matching an existing Generation_Cache entry, THE Backend SHALL return the cached Resolved_Tracks without re-calling Spotify_API or Claude.
3. THE Backend SHALL treat a Generation_Cache entry as stale after 24 hours and SHALL trigger a fresh Generation when a stale entry is requested.

---

## Post-MVP Requirements (V1)

---

### Requirement 12: Vibe Prompt (V1)

**User Story:** As an authenticated user, I want to describe a mood or intent in my own words before generating, so that the recommendations reflect what I'm looking for right now rather than only my historical taste.

#### Acceptance Criteria

1. WHERE the Vibe_Prompt feature is enabled, THE Frontend SHALL display a free-text input field on the generation screen.
2. WHEN a user submits a Vibe_Prompt, THE Backend SHALL include the Vibe_Prompt text in the prompt sent to Claude alongside the Taste_Profile.
3. THE Backend SHALL sanitize the Vibe_Prompt to remove content that could alter the structure or intent of the Claude prompt before including it.
4. THE Backend SHALL limit the Vibe_Prompt to a maximum of 280 characters and THE Frontend SHALL enforce this limit with a character counter.

---

### Requirement 13: Discovery Dial (V1)

**User Story:** As an authenticated user, I want to control how adventurous the recommendations are, so that I can choose between safe familiar-sounding picks and more surprising discoveries.

#### Acceptance Criteria

1. WHERE the Discovery_Dial feature is enabled, THE Frontend SHALL display a slider control with a range from 1 ("Safe") to 5 ("Adventurous"), defaulting to 3.
2. WHEN a user sets the Discovery_Dial value, THE Backend SHALL translate the value into explicit instructions in the Claude prompt that describe the desired level of genre and artist divergence from the Taste_Profile.
3. THE Backend SHALL include the Discovery_Dial value in the Generation_Cache document so that cached results are keyed by dial setting as well as taste profile.

---

### Requirement 14: Recommendation Feedback and Regeneration (V1)

**User Story:** As an authenticated user, I want to rate or reject individual recommendations and regenerate, so that the App learns from my real-time feedback and improves the playlist.

#### Acceptance Criteria

1. WHERE the feedback feature is enabled, THE Frontend SHALL display a thumbs-down control on each track in the results list.
2. WHEN a user marks one or more tracks with thumbs-down, THE Frontend SHALL send the rejected track identifiers to the Backend along with the original Generation ID.
3. WHEN the user triggers regeneration with feedback, THE Backend SHALL include the rejected track list in the Claude prompt and SHALL instruct Claude to avoid recommending those tracks or closely similar ones.
4. THE Backend SHALL store the feedback and regeneration event in the Generation_Cache document associated with the original Generation ID.
