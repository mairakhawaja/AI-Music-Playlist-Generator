import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

/**
 * The four secrets loaded from Google Secret Manager at backend startup.
 * Requirements: 9.1, 9.2, 9.3
 */
export type SecretName =
  | 'SPOTIFY_CLIENT_SECRET'
  | 'CLAUDE_API_KEY'
  | 'JWT_SIGNING_KEY'
  | 'REFRESH_TOKEN_ENCRYPTION_KEY';

const SECRET_NAMES: SecretName[] = [
  'SPOTIFY_CLIENT_SECRET',
  'CLAUDE_API_KEY',
  'JWT_SIGNING_KEY',
  'REFRESH_TOKEN_ENCRYPTION_KEY',
];

/** In-memory cache populated once at startup. */
const secretCache = new Map<SecretName, string>();

/**
 * Loads all required secrets from Google Secret Manager into the in-memory
 * cache. Must be called once before the HTTP server starts listening.
 *
 * The GCP project ID is resolved from the environment variable
 * `GOOGLE_CLOUD_PROJECT` (set automatically on Cloud Run) or the
 * `GCP_PROJECT_ID` fallback for local development.
 *
 * @throws {Error} If any secret fails to load or its value is empty.
 */
export async function loadSecrets(): Promise<void> {
  const projectId = process.env['GOOGLE_CLOUD_PROJECT'] ?? process.env['GCP_PROJECT_ID'];
  if (!projectId) {
    throw new Error(
      'Secret Manager: GCP project ID is not set. ' +
        'Provide GOOGLE_CLOUD_PROJECT or GCP_PROJECT_ID environment variable.',
    );
  }

  const client = new SecretManagerServiceClient();

  const results = await Promise.allSettled(
    SECRET_NAMES.map(async (name) => {
      const secretPath = `projects/${projectId}/secrets/${name}/versions/latest`;
      const [version] = await client.accessSecretVersion({ name: secretPath });
      const payload = version.payload?.data;

      if (!payload) {
        throw new Error(`Secret Manager: secret "${name}" returned an empty payload.`);
      }

      const value =
        typeof payload === 'string'
          ? payload
          : Buffer.from(payload as Uint8Array).toString('utf8');

      if (!value.trim()) {
        throw new Error(`Secret Manager: secret "${name}" has an empty value.`);
      }

      secretCache.set(name, value);
      return name;
    }),
  );

  const failures = results
    .map((result, i) => ({ result, name: SECRET_NAMES[i]! }))
    .filter(({ result }) => result.status === 'rejected');

  if (failures.length > 0) {
    const messages = failures
      .map(
        ({ name, result }) =>
          `  - ${name}: ${(result as PromiseRejectedResult).reason instanceof Error ? (result as PromiseRejectedResult).reason.message : String((result as PromiseRejectedResult).reason)}`,
      )
      .join('\n');

    throw new Error(
      `Secret Manager: failed to load ${failures.length} required secret(s):\n${messages}\n` +
        'The backend cannot start without all required secrets.',
    );
  }
}

/**
 * Returns the cached value for the given secret name.
 *
 * @throws {Error} If `loadSecrets()` has not been called or the secret is not
 *   present in the cache (should not happen after a successful `loadSecrets()`
 *   call, but guards against misuse).
 */
export function getSecret(name: SecretName): string {
  const value = secretCache.get(name);
  if (value === undefined) {
    throw new Error(
      `Secret Manager: "${name}" is not in the cache. ` +
        'Ensure loadSecrets() completed successfully before calling getSecret().',
    );
  }
  return value;
}

/**
 * Clears the secret cache. Intended for use in tests only.
 * @internal
 */
export function _clearSecretCacheForTesting(): void {
  secretCache.clear();
}
