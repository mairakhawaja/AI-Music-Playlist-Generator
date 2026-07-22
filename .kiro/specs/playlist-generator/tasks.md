# Implementation Plan: AI Music Playlist Generator

## Overview

Implement the full AI Music Playlist Generator feature as a TypeScript monorepo with a React SPA frontend (Firebase Hosting) and a Node.js/TypeScript backend on Google Cloud Run. The build order follows the project plan: scaffolding → auth → data/taste profile → Claude integration → track resolution → frontend UI → save-to-Spotify → observability → deployment.

Property-based tests use **fast-check** and are co-located with the implementation tasks they validate. Unit/integration tests use **Vitest** with **@testing-library/react** for component tests.

---

## Tasks

- [x] 1. Project scaffolding — monorepo structure, tooling, and shared types
  - [x] 1.1 Initialise the monorepo with a `packages/frontend` and `packages/backend` workspace layout
    - Create root `package.json` (npm workspaces), `turbo.json` or root-level scripts, `.nvmrc`, `.gitignore`, and `README.md`
    - Add ESLint + Prettier configs at the root (shared rules) and workspace-level overrides
    - Configure root-level `vitest.config.ts` base plus per-workspace configs with v8 coverage at 80% line threshold
    - _Requirements: 9.4_
  - [x] 1.2 Scaffold the backend package (`packages/backend`)
    - `tsconfig.json` targeting Node 20 ESM; `src/` directory tree matching the design (`routes/`, `services/`, `clients/`, `lib/`, `middleware/`)
    - Add `express`, `@google-cloud/firestore`, `@google-cloud/secret-manager`, `@anthropic-ai/sdk`, `jsonwebtoken`, `axios`, `uuid` as runtime deps (exact versions)
    - Add `vitest`, `fast-check`, `@types/*`, `ts-node`, `nodemon` as dev deps
    - Add `Dockerfile` (multi-stage, node:20-alpine) targeting port 8080
    - _Requirements: 9.1, 9.2_
  - [x] 1.3 Scaffold the frontend package (`packages/frontend`)
    - Vite + React + TypeScript scaffold; `tsconfig.json`; directory tree matching the design (`features/`, `components/`, `lib/`)
    - Add `react`, `react-router-dom`, `axios`, `zustand` as runtime deps (exact versions)
    - Add `vitest`, `@testing-library/react`, `@testing-library/user-event`, `fast-check`, `msw` as dev deps
    - Configure CSS variables matching the design colour palette tokens in `src/index.css`
    - _Requirements: 9.4_
  - [x] 1.4 Define all shared TypeScript interfaces in `packages/backend/src/lib/types.ts`
    - `TasteProfile`, `CandidateTrack`, `CandidateList`, `ResolvedTrack`, `GenerationResult`, `SpotifyPlaylist`, `SessionPayload`, `TrackUIState`, `SpotifyTimeRange`
    - Export each interface; import in service stubs created later
    - _Requirements: 3.2, 4.2, 5.5_

- [ ] 2. Backend foundation — secrets, logger, errors, correlation ID, encryption
  - [x] 2.1 Implement `lib/secretManager.ts` — load secrets from Secret Manager at startup
    - Fetch `SPOTIFY_CLIENT_SECRET`, `CLAUDE_API_KEY`, `JWT_SIGNING_KEY`, `REFRESH_TOKEN_ENCRYPTION_KEY` at process start; cache in memory; export typed accessor
    - Fail fast with a clear error if any secret is missing
    - _Requirements: 9.1, 9.2, 9.3_
  - [x] 2.2 Implement `lib/logger.ts` — structured JSON logger
    - Cloud Logging–compatible output: `{ severity, timestamp, correlationId, spotifyUserId?, step?, message, durationMs? }`
    - Never include tokens or API keys in log output (redaction guard)
    - _Requirements: 9.5, 10.1, 10.2_
  - [x] 2.3 Implement `lib/errors.ts` — `AppError` base class and typed subclasses
    - `AppError(code, statusCode, message, isOperational)`; subclasses: `SpotifyApiError`, `ClaudeApiError`, `AuthError`, `CacheError`
    - _Requirements: 10.2_
  - [x] 2.4 Implement `lib/correlationId.ts` and `middleware/correlationId.ts`
    - Express middleware: generate UUID v4 per request; attach to `res.locals`; set `X-Correlation-ID` response header
    - _Requirements: 10.3_
  - [ ]* 2.5 Write property test for correlation ID propagation (Property 15)
    - **Property 15: Correlation ID propagates through all log entries**
    - **Validates: Requirements 10.3**
    - Use fast-check to generate random request payloads; assert every log entry and the response header carry the same correlation ID
    - _Test file: `packages/backend/src/lib/correlationId.test.ts`_
  - [-] 2.6 Implement `lib/encryption.ts` — AES-GCM encrypt/decrypt for refresh tokens
    - `encrypt(plaintext: string, key: Buffer): string` (base64 output); `decrypt(ciphertext: string, key: Buffer): string`
    - Use Node.js `crypto` module; 96-bit random IV prepended to ciphertext
    - _Requirements: 1.4, 9.3_
  - [ ]* 2.7 Write property test for refresh token encryption round-trip (Property 1)
    - **Property 1: Refresh token encryption round-trip**
    - **Validates: Requirements 1.4**
    - Use fast-check `fc.string()` arbitrary; assert `decrypt(encrypt(token, key), key) === token` for all inputs
    - _Test file: `packages/backend/src/lib/encryption.test.ts`_
  - [-] 2.8 Implement `middleware/authenticate.ts` — validate session JWT on protected routes
    - Verify HS256 JWT; populate `req.user: SessionPayload`; return 401 on failure
    - _Requirements: 1.5, 1.6_
  - [-] 2.9 Implement `middleware/errorHandler.ts` — global error → structured response
    - Map `AppError` subclasses to HTTP status; return `{ error: { code, message, correlationId } }`; no stack traces
    - _Requirements: 10.2_

- [ ] 3. Spotify OAuth 2.0 PKCE round-trip
  - [ ] 3.1 Implement `services/authService.ts` — PKCE helpers and session JWT signing
    - `generatePkce()`: 96-char URL-safe random `code_verifier`, SHA-256 `code_challenge`; `generateState()`: 16-byte hex
    - `signSessionJwt(payload: SessionPayload): string`; `verifySessionJwt(token: string): SessionPayload`
    - _Requirements: 1.1, 1.2_
  - [ ] 3.2 Implement `clients/firestoreClient.ts` — typed Firestore Admin SDK wrapper
    - Initialise Admin SDK; export typed helpers: `getUser`, `upsertUser`, `savePkceState`, `getPkceState`, `deletePkceState`
    - _Requirements: 1.4, 1.7_
  - [ ] 3.3 Implement token exchange and refresh in `authService.ts`
    - `exchangeCode(code, verifier)`: POST to Spotify token endpoint; returns `{ accessToken, refreshToken, expiresIn }`
    - `refreshAccessToken(encryptedRefreshToken)`: decrypt → POST → return new `accessToken`
    - Encrypt refresh token with `encryption.ts` before writing; upsert Firestore user doc with `displayName`, `encryptedRefreshToken`, `createdAt`
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7_
  - [ ]* 3.4 Write property test for user document upsert fields (Property 2)
    - **Property 2: User document upsert contains required fields**
    - **Validates: Requirements 1.7**
    - Use fast-check `fc.string()` for userId/displayName; mock Firestore; assert written doc always has `displayName` and `createdAt`
    - _Test file: `packages/backend/src/services/authService.test.ts`_
  - [ ] 3.5 Implement `routes/auth.ts`
    - `GET /api/auth/login`: generate PKCE + state, persist `pkceStates/{state}` in Firestore, return `{ authorizeUrl, state }`
    - `GET /api/auth/callback?code=&state=`: verify state, exchange code, set HttpOnly JWT cookie, return `{ displayName }`
    - `POST /api/auth/logout`: clear cookie
    - `GET /api/auth/me` (auth-protected): return `{ spotifyUserId, displayName }` from JWT
    - _Requirements: 1.1, 1.2, 1.3, 1.6_
  - [ ] 3.6 Wire auth routes into `server.ts`
    - Initialise Express app; mount `correlationId` middleware; mount `auth` router; mount `errorHandler`
    - Load secrets via `secretManager.ts` before listening
    - _Requirements: 9.1, 9.2_
  - [ ]* 3.7 Write unit tests for auth flow steps
    - Test login redirect URL contains correct scopes and PKCE params
    - Test callback with valid code succeeds and sets cookie
    - Test callback with mismatched state returns 401
    - Test session expiry returns 401 on protected route
    - _Test file: `packages/backend/src/routes/auth.test.ts`_

- [ ] 4. Spotify API client with retry / back-off
  - [ ] 4.1 Implement `clients/spotifyClient.ts` — typed Spotify API wrapper
    - Axios instance targeting `https://api.spotify.com/v1`
    - Methods: `getTopTracks(range)`, `getTopArtists(range)`, `getRecentlyPlayed()`, `getPlaylistTracks(id)`, `getArtists(ids[])`, `searchTracks(query)`, `checkLibrary(ids[])`, `getUserPlaylists()`, `createPlaylist(userId, name)`, `addTracksToPlaylist(id, uris[])`
    - Transparent token refresh on 401 using `authService.refreshAccessToken`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [ ] 4.2 Add retry / back-off decorator to `spotifyClient.ts`
    - 429: sleep `Retry-After` seconds, retry once
    - 5xx: retry up to 3 times (1 s, 2 s, 4 s delays); throw `SpotifyApiError` after exhaustion
    - _Requirements: 2.6, 2.7_
  - [ ]* 4.3 Write property test for retry back-off count bound (Property 3)
    - **Property 3: Retry back-off count is bounded**
    - **Validates: Requirements 2.7**
    - Use fast-check to generate sequences of 1–3 consecutive 5xx responses; assert total attempts ≤ 4
    - _Test file: `packages/backend/src/clients/spotifyClient.test.ts`_

- [ ] 5. Listening data retrieval and taste profile assembly
  - [ ] 5.1 Implement `services/listeningDataService.ts`
    - `fetchAllListeningData(userId, playlistIds[])`: call `spotifyClient` for top tracks × 3 ranges, top artists × 3 ranges, recently played, playlist tracks (if any), batch artist objects for genres
    - Return raw data object; log each fetch step with `durationMs`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 10.1_
  - [ ] 5.2 Implement `services/tasteProfileService.ts` — assemble and validate `TasteProfile`
    - `rankGenres(artists[])`: aggregate genres, sort descending by count
    - `assembleTasteProfile(rawData)`: populate all four required fields; enforce size limits (50 tracks, 20 artists, 50 recent)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [ ]* 5.3 Write property test for genre ranking order (Property 4)
    - **Property 4: Genre ranking is sorted by descending frequency**
    - **Validates: Requirements 3.1**
    - Use fast-check `fc.array(fc.record({ genres: fc.array(fc.string()) }))` to generate artist arrays; assert every adjacent pair satisfies `genres[i].count >= genres[i+1].count`
    - _Test file: `packages/backend/src/services/tasteProfileService.test.ts`_
  - [ ]* 5.4 Write property test for taste profile required fields (Property 5)
    - **Property 5: Taste profile contains all required fields**
    - **Validates: Requirements 3.2, 3.3**
    - Use fast-check to generate valid listening data; assert assembled profile always has non-empty `rankedGenres`, `topTracks`, `topArtists`, `recentlyPlayed`
    - _Test file: `packages/backend/src/services/tasteProfileService.test.ts`_
  - [ ]* 5.5 Write property test for taste profile size limits (Property 6)
    - **Property 6: Taste profile respects size limits**
    - **Validates: Requirements 3.4**
    - Use fast-check to generate oversized listening data; assert assembled profile never exceeds 50 top tracks, 20 top artists, 50 recently played
    - _Test file: `packages/backend/src/services/tasteProfileService.test.ts`_

- [ ] 6. Claude integration — candidate list generation
  - [ ] 6.1 Implement `clients/claudeClient.ts` — Anthropic SDK wrapper
    - Initialise `@anthropic-ai/sdk` with key from `secretManager`
    - Single method `requestRecommendations(tasteProfile: TasteProfile): Promise<CandidateList>` using tool-use call with `recommend_tracks` tool schema matching `CandidateList`
    - _Requirements: 4.1, 4.5_
  - [ ] 6.2 Implement `services/claudeService.ts` — orchestrate prompt and parse response
    - Build prompt instructing Claude to recommend ~30 tracks the user is unlikely to have heard; include full `TasteProfile` JSON
    - Parse and validate tool-use result against `CandidateList` schema; retry once on malformed response; throw `ClaudeApiError` if still invalid
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [ ]* 6.3 Write property test for candidate list required fields (Property 7)
    - **Property 7: Candidate list entries have required fields**
    - **Validates: Requirements 4.2**
    - Use fast-check to generate mock Anthropic tool-use responses; assert every `CandidateTrack` has non-empty `artist`, `title`, and `reason`
    - _Test file: `packages/backend/src/services/claudeService.test.ts`_
  - [ ]* 6.4 Write unit test for Claude malformed JSON retry behaviour
    - Mock Anthropic SDK to return malformed JSON on first call, valid on second; assert exactly 2 calls made and valid result returned
    - _Test file: `packages/backend/src/services/claudeService.test.ts`_

- [ ] 7. Track resolution — search, dedup, and library filter
  - [ ] 7.1 Implement `services/trackResolutionService.ts`
    - `resolveTrack(candidate: CandidateTrack, userId)`: search Spotify, pick first result with close artist+title match, check library; return `ResolvedTrack` or `null`
    - `resolveAll(candidates, userId)`: iterate, filter nulls, enforce ≤ 25 limit, set `partialWarning` if < 5 remain
    - Attach `reason` from `CandidateTrack` to each `ResolvedTrack`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  - [ ]* 7.2 Write property test for resolved list purity (Property 8)
    - **Property 8: Resolved list contains no library duplicates or unresolved entries**
    - **Validates: Requirements 5.3, 5.4**
    - Use fast-check to generate candidate lists and library snapshots; assert every returned `ResolvedTrack` has a valid URI and is not in the library set
    - _Test file: `packages/backend/src/services/trackResolutionService.test.ts`_
  - [ ]* 7.3 Write property test for resolved list max 25 (Property 9)
    - **Property 9: Resolved list length is bounded at 25**
    - **Validates: Requirements 5.5**
    - Use fast-check `fc.array(fc.record({...}), { maxLength: 100 })` for candidate lists; assert returned list length ≤ 25
    - _Test file: `packages/backend/src/services/trackResolutionService.test.ts`_
  - [ ]* 7.4 Write property test for partial-results warning threshold (Property 10)
    - **Property 10: Partial-results warning fires below threshold**
    - **Validates: Requirements 5.6**
    - Use fast-check to generate resolution outcomes with 0–25 resolved tracks; assert `partialWarning === true` iff count < 5
    - _Test file: `packages/backend/src/services/trackResolutionService.test.ts`_

- [ ] 8. Generation service, caching, and backend generate route
  - [ ] 8.1 Implement `services/generationService.ts` — orchestrate the full pipeline with caching
    - `generate(userId, playlistIds[])`: compute SHA-256 cache key from `{ userId, sortedPlaylistIds }`, check Firestore for non-stale entry, return cached result if hit
    - On miss: call `listeningDataService` → `tasteProfileService` → store profile → `claudeService` → store candidates → `trackResolutionService` → store URIs → return `GenerationResult`
    - Mark entry stale after 24 h; store `isStale: true` on read if `createdAt + 24h < now`
    - Log each pipeline step with `step` field and `durationMs`
    - _Requirements: 3.5, 4.6, 5.7, 11.1, 11.2, 11.3, 10.1_
  - [ ]* 8.2 Write property test for cache idempotence (Property 16)
    - **Property 16: Cache returns identical result for identical inputs**
    - **Validates: Requirements 11.1, 11.2**
    - Use fast-check to generate `(userId, sortedPlaylistIds)` pairs; seed Firestore mock with a non-stale generation; assert second call returns identical tracks without invoking Spotify or Claude mocks
    - _Test file: `packages/backend/src/services/generationService.test.ts`_
  - [ ]* 8.3 Write unit test for cache staleness (24-hour TTL boundary)
    - Simulate `createdAt` = 25 hours ago; assert a fresh generation is triggered
    - _Test file: `packages/backend/src/services/generationService.test.ts`_
  - [ ] 8.4 Implement `routes/generate.ts` and `routes/playlists.ts` (read path)
    - `POST /api/generate`: validate body, call `generationService.generate`, return `GenerationResult`
    - `GET /api/playlists`: proxy `spotifyClient.getUserPlaylists()` to frontend
    - Mount both routes in `server.ts` behind `authenticate` middleware
    - _Requirements: 8.1, 11.1_

- [ ] 9. Checkpoint — backend pipeline complete
  - Ensure all backend tests pass (`npx vitest run` in `packages/backend`), ask the user if questions arise.


- [ ] 10. Save-to-Spotify backend service and route
  - [ ] 10.1 Implement `services/playlistSaveService.ts`
    - `buildDefaultName(date: Date): string`: return `"AI Music Generator — YYYY-MM-DD"` (ISO 8601)
    - `savePlaylist(userId, generationId, includedUris[], playlistName?)`: create private playlist via `spotifyClient.createPlaylist`, add tracks, update Firestore generation doc with `savedPlaylistId`
    - _Requirements: 7.1, 7.2, 7.3, 7.6_
  - [ ]* 10.2 Write property test for default playlist name format (Property 13)
    - **Property 13: Default playlist name follows ISO 8601 format**
    - **Validates: Requirements 7.6**
    - Use fast-check `fc.date()` arbitrary; assert `buildDefaultName(date)` always matches `"AI Music Generator — YYYY-MM-DD"` pattern
    - _Test file: `packages/backend/src/services/playlistSaveService.test.ts`_
  - [ ]* 10.3 Write unit test for playlist save failure path
    - Mock `spotifyClient.createPlaylist` to throw; assert 502 response returned and Firestore doc not updated
    - _Test file: `packages/backend/src/services/playlistSaveService.test.ts`_
  - [ ] 10.4 Implement `POST /api/playlists/save` in `routes/playlists.ts`
    - Validate `{ generationId, includedTrackUris, playlistName? }` body; call `playlistSaveService.savePlaylist`; return `{ playlistId, playlistUrl }`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 11. Frontend — shared UI components and API client
  - [ ] 11.1 Implement shared UI primitives in `packages/frontend/src/components/ui/`
    - `Button.tsx` (primary / ghost variants, disabled state, loading spinner slot)
    - `Card.tsx` (rounded 16px, shadow, dark bg per design tokens)
    - `PillBadge.tsx` (genre / reason pill)
    - `LoadingSpinner.tsx` (full-screen and inline variants)
    - `ErrorBanner.tsx` (human-readable message + correlation ID display)
    - Apply CSS variable tokens from `index.css`
    - _Requirements: 6.5, 6.6, 10.4_
  - [ ] 11.2 Implement `lib/apiClient.ts` — Axios instance with auth header injection
    - Base URL from `VITE_API_BASE_URL` env var; attach session cookie (withCredentials); extract `X-Correlation-ID` from responses; dispatch errors to error state
    - _Requirements: 9.4, 10.4_
  - [ ] 11.3 Implement `lib/correlationId.ts` (frontend) — reads `X-Correlation-ID` from responses and logs to console
    - _Requirements: 10.4_

- [ ] 12. Frontend — authentication feature
  - [ ] 12.1 Implement `features/auth/authApi.ts`, `useAuth.ts`, `AuthGuard.tsx`, and `AuthCallback.tsx`
    - `authApi.ts`: `login()` → GET `/api/auth/login` then redirect; `logout()` → POST `/api/auth/logout`; `getMe()` → GET `/api/auth/me`
    - `useAuth.ts`: Zustand slice holding `{ spotifyUserId, displayName, isAuthenticated }`; initialise on mount via `getMe()`
    - `AuthGuard.tsx`: wraps protected routes; redirects to login if not authenticated
    - `AuthCallback.tsx`: handles `/callback` route; calls `GET /api/auth/callback` forwarding query params; on success navigates to `/generate`
    - _Requirements: 1.1, 1.2, 1.3_
  - [ ] 12.2 Wire `App.tsx` with React Router routes: `/` (connect screen), `/callback`, `/generate` (protected), `/results` (protected)
    - _Requirements: 1.1_

- [ ] 13. Frontend — playlist selector and generate screen
  - [ ] 13.1 Implement `features/generator/generatorApi.ts` and `PlaylistSelector.tsx`
    - `generatorApi.ts`: `getPlaylists()` → GET `/api/playlists`; `generate(playlistIds[])` → POST `/api/generate`
    - `PlaylistSelector.tsx`: responsive grid of playlist cards; selected state with Spotify-green border; fetch on mount; expose `selectedIds` via controlled props
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [ ]* 13.2 Write property test for playlist card render fields (Property 14)
    - **Property 14: Playlist card render includes name and image**
    - **Validates: Requirements 8.4**
    - Use fast-check to generate `SpotifyPlaylist` objects; render with `@testing-library/react`; assert name always present and image URL present when non-null
    - _Test file: `packages/frontend/src/features/generator/PlaylistSelector.test.tsx`_
  - [ ] 13.3 Implement `GenerateButton.tsx` and `GeneratorPage.tsx`
    - `GenerateButton.tsx`: full-width on mobile, centered on desktop; loading spinner; disabled state per design spec
    - `GeneratorPage.tsx`: compose `PlaylistSelector` + `GenerateButton`; on click call `generate()`, navigate to `/results` on success; show `ErrorBanner` on failure
    - _Requirements: 6.5, 6.6_

- [ ] 14. Frontend — results display, track toggles, and track selection count
  - [ ] 14.1 Implement `features/playlist/TrackCard.tsx` and `TrackToggle.tsx`
    - `TrackCard.tsx`: 72×72 album art (left), title + artist + reason (right), toggle (top-right), Spotify link, hover scale animation; excluded state: dim overlay + muted text per design spec
    - `TrackToggle.tsx`: spring scale animation on click; visual colour change for excluded state
    - _Requirements: 6.1, 6.2, 6.3_
  - [ ]* 14.2 Write property test for track card render fields (Property 11)
    - **Property 11: Track card render includes all required display fields**
    - **Validates: Requirements 6.1**
    - Use fast-check to generate `ResolvedTrack` objects; render `TrackCard`; assert album art URL, title, artist, reason, and Spotify URL are all present in output
    - _Test file: `packages/frontend/src/features/playlist/TrackCard.test.tsx`_
  - [ ] 14.3 Implement `IncludedCount.tsx` and the track selection Zustand slice
    - Selection slice: `TrackUIState[]`, `toggleTrack(trackId)`, `includedCount` derived selector
    - `IncludedCount.tsx`: pill badge with animated counter; updates in real time on toggle
    - _Requirements: 6.2, 6.4_
  - [ ]* 14.4 Write property test for track selection count invariant (Property 12)
    - **Property 12: Track selection count matches included tracks**
    - **Validates: Requirements 6.2, 6.4**
    - Use fast-check `fc.array(fc.record({ included: fc.boolean() }))` to generate `TrackUIState[]` arrays; assert `includedCount === tracks.filter(t => t.included).length` for all combinations
    - _Test file: `packages/frontend/src/features/playlist/trackSelection.test.ts`_
  - [ ] 14.5 Implement `ResultsPage.tsx` — compose track list, count badge, and save form
    - Fetch `GenerationResult` from router state (passed via navigation); render `TrackCard` per track with staggered fade-in animation; show `partialWarning` pill if flagged; render `SavePlaylistForm`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 5.6_

- [ ] 15. Frontend — save playlist form and confirmation
  - [ ] 15.1 Implement `features/playlist/SavePlaylistForm.tsx` and `playlistApi.ts`
    - `playlistApi.ts`: `savePlaylist({ generationId, includedTrackUris, playlistName? })` → POST `/api/playlists/save`
    - `SavePlaylistForm.tsx`: optional custom name input (placeholder = default ISO 8601 name); Save button; on success display confirmation message with direct Spotify playlist link; on failure show `ErrorBanner` without clearing track selection
    - _Requirements: 7.1, 7.2, 7.4, 7.5, 7.6_
  - [ ]* 15.2 Write unit test for save confirmation and error states
    - Mock `playlistApi.savePlaylist` to succeed → assert confirmation + link rendered
    - Mock to fail → assert `ErrorBanner` shown and track toggle state unchanged
    - _Test file: `packages/frontend/src/features/playlist/SavePlaylistForm.test.tsx`_

- [ ] 16. Checkpoint — full UI integration
  - Ensure all frontend tests pass (`npx vitest run` in `packages/frontend`) and all backend tests still pass, ask the user if questions arise.


- [ ] 17. Integration tests — full pipeline and error paths
  - [ ] 17.1 Write integration test for full generation pipeline (backend)
    - Use `nock` to mock Spotify endpoints and Anthropic SDK; feed fixture taste profile → fixture Claude response → fixture Spotify search results; assert `GenerationResult` structure is correct
    - _Requirements: 2.1–2.5, 3.1–3.5, 4.1–4.6, 5.1–5.7_
  - [ ]* 17.2 Write integration test for token refresh path
    - Mock Spotify to return 401 on first request, valid on retry after token refresh; assert final result is returned without error
    - _Requirements: 1.5_
  - [ ]* 17.3 Write integration test for playlist save end-to-end
    - Mock Spotify `createPlaylist` and `addTracks` endpoints; call `POST /api/playlists/save`; assert playlist ID and URL returned and Firestore doc updated
    - _Requirements: 7.1–7.4_
  - [ ]* 17.4 Write integration test for Claude error and retry
    - Mock Anthropic SDK to return malformed JSON twice; assert 502 `ClaudeApiError` propagated to frontend
    - _Requirements: 4.3_

- [ ] 18. Observability — structured logging and error surfacing
  - [ ] 18.1 Add structured log calls to all remaining backend services and routes
    - Each significant pipeline step emits `{ severity, timestamp, correlationId, spotifyUserId, step, message, durationMs }`
    - Verify no token, key, or secret values appear in any log call
    - _Requirements: 9.5, 10.1, 10.2, 10.3_
  - [ ]* 18.2 Write unit tests for empty / sparse data edge cases
    - User with no recently played tracks → `TasteProfile` built successfully with empty `recentlyPlayed`
    - User with no top artists → `rankedGenres` falls back gracefully
    - `POST /api/generate` with zero selected playlists → relies on top tracks and recently played only
    - _Requirements: 8.3, 3.2_

- [ ] 19. Deployment configuration
  - [ ] 19.1 Finalise `Dockerfile` and Cloud Run configuration
    - Multi-stage build: `node:20-alpine` builder → slim production image
    - Confirm port 8080, `NODE_ENV=production`, concurrency 80; document env var vs. Secret Manager split
    - Add `GET /health` route returning `{ status: 'ok', version }` (used by Cloud Run health check)
    - _Requirements: 9.1, 9.2, 9.4_
  - [ ] 19.2 Create `firebase.json` and `.firebaserc` for Firebase Hosting
    - SPA rewrite: all routes → `index.html`; long-lived cache headers for hashed assets; no-store for `index.html`
    - _Requirements: 9.4_
  - [ ] 19.3 Create GitHub Actions CI/CD workflow (`.github/workflows/deploy.yml`)
    - Steps: `npm run typecheck && npx vitest run` (both packages) → `docker build` → push to Artifact Registry → `gcloud run deploy` → `firebase deploy --only hosting`
    - _Requirements: 9.4_

- [ ] 20. Final checkpoint — all tests pass, build clean
  - Ensure `npx vitest run` passes in both `packages/frontend` and `packages/backend`; TypeScript compiles without errors in both packages; ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP build
- Every property-based test task references its design property number and the requirements clause it validates
- Checkpoints (tasks 9, 16, 20) gate the next phase; do not skip them
- The `--run` flag (`npx vitest run`) is used throughout to avoid watch mode
- Secrets are never passed via environment variables in production; `secretManager.ts` is the single loading point
- The `X-Correlation-ID` header is the primary support-debugging tool; it flows from middleware through every log line to the frontend console


## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4"] },
    { "id": 3, "tasks": ["2.1", "2.2", "2.3", "2.4"] },
    { "id": 4, "tasks": ["2.6", "2.8", "2.9"] },
    { "id": 5, "tasks": ["2.5", "2.7", "3.1", "3.2"] },
    { "id": 6, "tasks": ["3.3", "4.1"] },
    { "id": 7, "tasks": ["3.4", "3.5", "4.2"] },
    { "id": 8, "tasks": ["3.6", "3.7", "4.3"] },
    { "id": 9, "tasks": ["5.1"] },
    { "id": 10, "tasks": ["5.2"] },
    { "id": 11, "tasks": ["5.3", "5.4", "5.5", "6.1"] },
    { "id": 12, "tasks": ["6.2"] },
    { "id": 13, "tasks": ["6.3", "6.4", "7.1"] },
    { "id": 14, "tasks": ["7.2", "7.3", "7.4", "8.1"] },
    { "id": 15, "tasks": ["8.2", "8.3"] },
    { "id": 16, "tasks": ["8.4", "10.1"] },
    { "id": 17, "tasks": ["10.2", "10.3", "10.4", "11.1"] },
    { "id": 18, "tasks": ["11.2", "11.3"] },
    { "id": 19, "tasks": ["12.1"] },
    { "id": 20, "tasks": ["12.2", "13.1"] },
    { "id": 21, "tasks": ["13.2", "13.3"] },
    { "id": 22, "tasks": ["14.1"] },
    { "id": 23, "tasks": ["14.2", "14.3"] },
    { "id": 24, "tasks": ["14.4", "14.5"] },
    { "id": 25, "tasks": ["15.1"] },
    { "id": 26, "tasks": ["15.2", "17.1"] },
    { "id": 27, "tasks": ["17.2", "17.3", "17.4", "18.1"] },
    { "id": 28, "tasks": ["18.2"] },
    { "id": 29, "tasks": ["19.1", "19.2"] },
    { "id": 30, "tasks": ["19.3"] }
  ]
}
```
