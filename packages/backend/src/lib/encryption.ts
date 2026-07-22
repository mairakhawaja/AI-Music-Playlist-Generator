/**
 * AES-256-GCM encryption utilities for Spotify refresh tokens.
 *
 * Each encrypt call generates a random 96-bit (12-byte) IV. The output is a
 * single base64 string with the layout:
 *
 *   [12-byte IV][16-byte GCM auth tag][ciphertext bytes]
 *
 * This self-contained format means decrypt needs only the ciphertext string
 * and the same 256-bit key — no additional state is required.
 *
 * Requirements: 1.4, 9.3
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/** AES-GCM algorithm identifier. */
const ALGORITHM = 'aes-256-gcm';

/** IV length in bytes (96 bits). */
const IV_LENGTH = 12;

/** GCM authentication tag length in bytes (128 bits — the maximum). */
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts `plaintext` using AES-256-GCM with a fresh random 96-bit IV.
 *
 * @param plaintext - The string to encrypt (e.g. a Spotify refresh token).
 * @param key       - A 256-bit (32-byte) key fetched from Secret Manager.
 * @returns A base64-encoded string containing [IV | auth tag | ciphertext].
 * @throws {RangeError} if `key` is not exactly 32 bytes.
 */
export function encrypt(plaintext: string, key: Buffer): string {
  if (key.length !== 32) {
    throw new RangeError(
      `Encryption key must be 32 bytes (256 bits); received ${key.length} bytes.`,
    );
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encryptedBuffer = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Layout: IV (12 bytes) | auth tag (16 bytes) | ciphertext (variable)
  const output = Buffer.concat([iv, authTag, encryptedBuffer]);
  return output.toString('base64');
}

/**
 * Decrypts a base64-encoded ciphertext produced by {@link encrypt}.
 *
 * @param ciphertext - The base64 string returned by `encrypt`.
 * @param key        - The same 256-bit (32-byte) key used to encrypt.
 * @returns The original plaintext string.
 * @throws {RangeError}  if `key` is not exactly 32 bytes.
 * @throws {Error}       if the ciphertext is too short to contain IV + auth tag.
 * @throws {Error}       if GCM authentication fails (tampered data or wrong key).
 */
export function decrypt(ciphertext: string, key: Buffer): string {
  if (key.length !== 32) {
    throw new RangeError(
      `Encryption key must be 32 bytes (256 bits); received ${key.length} bytes.`,
    );
  }

  const buf = Buffer.from(ciphertext, 'base64');

  const minimumLength = IV_LENGTH + AUTH_TAG_LENGTH;
  if (buf.length < minimumLength) {
    throw new Error(
      `Ciphertext is too short: expected at least ${minimumLength} bytes, got ${buf.length}.`,
    );
  }

  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encryptedData = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
