/**
 * Typed Firestore Admin SDK wrapper.
 *
 * Initialises the Firestore client once (lazy singleton) and exports typed
 * helpers for all Firestore operations used by the backend:
 *
 *   Users collection  →  users/{spotifyUserId}
 *   PKCE states       →  users/{spotifyUserId}/pkceStates/{state}
 *
 * Requirements: 1.4, 1.7
 */

import { Firestore, Timestamp, FieldValue } from '@google-cloud/firestore';

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

// ---------------------------------------------------------------------------
// User helpers
// ---------------------------------------------------------------------------

/**
 * Fetches the user document for the given Spotify user ID.
 *
 * @returns The user document data, or `null` if no document exists.
 */
export async function getUser(spotifyUserId: string): Promise<UserDoc | null> {
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
  const db = getFirestore();
  await db.collection('pkceStates').doc(state).delete();
}
