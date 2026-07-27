/**
 * Typed Firestore Admin SDK wrapper.
 *
 * Initialises the Firestore client once (lazy singleton) and exports typed
 * helpers for all Firestore operations used by the backend:
 *
 *   Users collection  →  users/{spotifyUserId}
 *   PKCE states       →  users/{spotifyUserId}/pkceStates/{state}
 *   Generations       →  users/{spotifyUserId}/generations/{generationId}
 *
 * Requirements: 1.4, 1.7, 11.1, 11.2, 11.3
 */

import { Firestore, Timestamp, FieldValue } from '@google-cloud/firestore';
import type { TasteProfile, CandidateTrack, ResolvedTrack } from '../lib/types.js';

// ---------------------------------------------------------------------------
// Document shapes
// ---------------------------------------------------------------------------

/**
 * The shape of a `users/{spotifyUserId}` document stored in Firestore.
 * Requirements: 1.4, 1.7
 */
export interface UserDoc {
  displayName: string;
  /** AES-GCM encrypted refresh token, base64-encoded. */
  encryptedRefreshToken: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Data required to create or update a user document.
 * `createdAt` is managed internally (set on first write only).
 */
export interface UpsertUserData {
  displayName: string;
  encryptedRefreshToken: string;
}

/**
 * The shape of a `users/{spotifyUserId}/pkceStates/{state}` document.
 * Short-lived; deleted after the OAuth callback completes.
 */
export interface PkceStateDoc {
  /** The PKCE code verifier generated during the login request. */
  codeVerifier: string;
  /** ISO 8601 timestamp of when this state was created. */
  createdAt: string;
}

/**
 * Data written when persisting a new PKCE state.
 */
export interface SavePkceStateData {
  codeVerifier: string;
  createdAt: string;
}

/**
 * The shape of a generation cache document stored in Firestore.
 * Requirements: 11.1, 11.2, 11.3
 */
export interface GenerationDoc {
  generationId: string;
  cacheKey: string;
  inputPlaylistIds: string[];
  tasteProfile: TasteProfile;
  candidateList: CandidateTrack[];
  resolvedTracks: ResolvedTrack[];
  resolvedTrackUris: string[];
  partialWarning: boolean;
  createdAt: string;
  savedPlaylistId?: string;
}

/**
 * Data required to save a generation document.
 */
export interface SaveGenerationData {
  generationId: string;
  cacheKey: string;
  inputPlaylistIds: string[];
  tasteProfile: TasteProfile;
  candidateList: CandidateTrack[];
  resolvedTracks: ResolvedTrack[];
  resolvedTrackUris: string[];
  partialWarning: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// In-memory store for local development (no Firestore needed)
// ---------------------------------------------------------------------------

const useInMemory = process.env['NODE_ENV'] !== 'production';

const memoryStore = {
  users: new Map<string, UserDoc>(),
  pkceStates: new Map<string, PkceStateDoc>(),
  generations: new Map<string, GenerationDoc>(), // keyed by `${userId}/${generationId}`
};

/** Exported for testing so tests can inspect or clear the in-memory store. */
export const _memoryStoreForTesting = memoryStore;

// ---------------------------------------------------------------------------
// Singleton Firestore instance
// ---------------------------------------------------------------------------

let firestoreInstance: Firestore | null = null;

/**
 * Returns (and lazily creates) the shared Firestore instance.
 *
 * Using a singleton avoids creating multiple client instances and mirrors
 * the "check before init" pattern expected when working with Admin SDKs.
 */
function getFirestore(): Firestore {
  if (firestoreInstance === null) {
    firestoreInstance = new Firestore();
  }
  return firestoreInstance;
}

/**
 * Overrides the Firestore instance. Intended for use in tests only.
 * @internal
 */
export function _setFirestoreInstanceForTesting(instance: Firestore): void {
  firestoreInstance = instance;
}

// ---------------------------------------------------------------------------
// User helpers
// ---------------------------------------------------------------------------

/**
 * Fetches the user document for the given Spotify user ID.
 *
 * @returns The user document data, or `null` if no document exists.
 */
export async function getUser(spotifyUserId: string): Promise<UserDoc | null> {
  if (useInMemory) {
    return memoryStore.users.get(spotifyUserId) ?? null;
  }

  const db = getFirestore();
  const snapshot = await db.collection('users').doc(spotifyUserId).get();

  if (!snapshot.exists) {
    return null;
  }

  return snapshot.data() as UserDoc;
}

/**
 * Creates or merges the user document for the given Spotify user ID.
 *
 * - Always sets `updatedAt` to the current server time.
 * - Sets `createdAt` only when the document does not already exist (create path).
 *
 * This is implemented as a Firestore transaction so that `createdAt` is set
 * atomically on first write without overwriting it on subsequent updates.
 *
 * Requirements: 1.7
 */
export async function upsertUser(
  spotifyUserId: string,
  data: UpsertUserData,
): Promise<void> {
  if (useInMemory) {
    const existing = memoryStore.users.get(spotifyUserId);
    const now = Timestamp.now();

    if (!existing) {
      memoryStore.users.set(spotifyUserId, {
        displayName: data.displayName,
        encryptedRefreshToken: data.encryptedRefreshToken,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      memoryStore.users.set(spotifyUserId, {
        ...existing,
        displayName: data.displayName,
        encryptedRefreshToken: data.encryptedRefreshToken,
        updatedAt: now,
      });
    }
    return;
  }

  const db = getFirestore();
  const docRef = db.collection('users').doc(spotifyUserId);

  await db.runTransaction(async (txn) => {
    const snapshot = await txn.get(docRef);
    const now = Timestamp.now();

    if (!snapshot.exists) {
      // First-time write: set all fields including createdAt.
      txn.set(docRef, {
        displayName: data.displayName,
        encryptedRefreshToken: data.encryptedRefreshToken,
        createdAt: now,
        updatedAt: now,
      } satisfies UserDoc);
    } else {
      // Subsequent write: merge display name + token, bump updatedAt only.
      txn.update(docRef, {
        displayName: data.displayName,
        encryptedRefreshToken: data.encryptedRefreshToken,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });
}

// ---------------------------------------------------------------------------
// PKCE state helpers
// ---------------------------------------------------------------------------

/**
 * Persists a short-lived PKCE state document under
 * `users/{spotifyUserId}/pkceStates/{state}`.
 *
 * The `spotifyUserId` used here is a synthetic value (e.g. the `state`
 * parameter itself, or a temporary session ID) because the real Spotify user
 * ID is not yet known at the time of the login request. Callers should use
 * a stable, request-scoped identifier.
 *
 * Per the design, PKCE states are stored at a fixed path so the callback
 * handler can look them up by the `state` query parameter alone. The helper
 * therefore accepts an explicit `userId` to scope the sub-collection.
 *
 * Requirements: 1.1, 1.3
 */
export async function savePkceState(
  state: string,
  data: SavePkceStateData,
): Promise<void> {
  console.log('[DEBUG] savePkceState - useInMemory:', useInMemory, 'state:', state);
  if (useInMemory) {
    memoryStore.pkceStates.set(state, { codeVerifier: data.codeVerifier, createdAt: data.createdAt });
    return;
  }

  const db = getFirestore();
  // Stored as a top-level collection so the callback can look it up by state
  // without knowing the Spotify user ID (which is not available yet).
  await db.collection('pkceStates').doc(state).set({
    codeVerifier: data.codeVerifier,
    createdAt: data.createdAt,
  } satisfies PkceStateDoc);
}

/**
 * Retrieves a PKCE state document by its `state` value.
 *
 * @returns The PKCE state document, or `null` if it does not exist.
 */
export async function getPkceState(state: string): Promise<PkceStateDoc | null> {
  console.log('[DEBUG] getPkceState - useInMemory:', useInMemory, 'state:', state, 'found:', memoryStore.pkceStates.has(state));
  if (useInMemory) {
    return memoryStore.pkceStates.get(state) ?? null;
  }

  const db = getFirestore();
  const snapshot = await db.collection('pkceStates').doc(state).get();

  if (!snapshot.exists) {
    return null;
  }

  return snapshot.data() as PkceStateDoc;
}

/**
 * Deletes a PKCE state document after it has been consumed by the callback.
 * This prevents replay attacks using a captured `state` parameter.
 */
export async function deletePkceState(state: string): Promise<void> {
  if (useInMemory) {
    memoryStore.pkceStates.delete(state);
    return;
  }

  const db = getFirestore();
  await db.collection('pkceStates').doc(state).delete();
}


// ---------------------------------------------------------------------------
// Generation cache helpers
// ---------------------------------------------------------------------------

/**
 * Retrieves a cached generation document by its cache key hash.
 *
 * Looks up the `users/{spotifyUserId}/generations` subcollection for a
 * document where `cacheKey` matches the provided hash.
 *
 * @returns The generation document, or `null` if no match exists.
 * Requirements: 11.2
 */
export async function getGenerationByHash(
  spotifyUserId: string,
  cacheKey: string,
): Promise<GenerationDoc | null> {
  if (useInMemory) {
    const prefix = `${spotifyUserId}/`;
    let best: GenerationDoc | null = null;

    for (const [key, doc] of memoryStore.generations) {
      if (key.startsWith(prefix) && doc.cacheKey === cacheKey) {
        if (!best || doc.createdAt > best.createdAt) {
          best = doc;
        }
      }
    }

    return best;
  }

  const db = getFirestore();
  const snapshot = await db
    .collection('users')
    .doc(spotifyUserId)
    .collection('generations')
    .where('cacheKey', '==', cacheKey)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0].data() as GenerationDoc;
}

/**
 * Saves a generation result to the Firestore cache.
 *
 * Stores the document at `users/{spotifyUserId}/generations/{generationId}`.
 *
 * Requirements: 11.1
 */
export async function saveGeneration(
  spotifyUserId: string,
  data: SaveGenerationData,
): Promise<void> {
  if (useInMemory) {
    const key = `${spotifyUserId}/${data.generationId}`;
    memoryStore.generations.set(key, { ...data });
    return;
  }

  const db = getFirestore();
  await db
    .collection('users')
    .doc(spotifyUserId)
    .collection('generations')
    .doc(data.generationId)
    .set(data);
}

/**
 * Updates a generation document with the saved playlist ID.
 *
 * Requirements: 7.3
 */
export async function updateGenerationWithPlaylist(
  spotifyUserId: string,
  generationId: string,
  savedPlaylistId: string,
): Promise<void> {
  if (useInMemory) {
    const key = `${spotifyUserId}/${generationId}`;
    const existing = memoryStore.generations.get(key);
    if (existing) {
      memoryStore.generations.set(key, { ...existing, savedPlaylistId });
    }
    return;
  }

  const db = getFirestore();
  await db
    .collection('users')
    .doc(spotifyUserId)
    .collection('generations')
    .doc(generationId)
    .update({ savedPlaylistId });
}
