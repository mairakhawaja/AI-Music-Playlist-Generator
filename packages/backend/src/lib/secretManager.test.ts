import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @google-cloud/secret-manager before importing the module under test
// ---------------------------------------------------------------------------
const mockAccessSecretVersion = vi.fn();

vi.mock('@google-cloud/secret-manager', () => {
  function SecretManagerServiceClient(this: unknown) {
    (this as { accessSecretVersion: typeof mockAccessSecretVersion }).accessSecretVersion =
      mockAccessSecretVersion;
  }
  return { SecretManagerServiceClient };
});

// Import after the mock is set up
import {
  loadSecrets,
  getSecret,
  _clearSecretCacheForTesting,
  type SecretName,
} from './secretManager.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SECRET_NAMES: SecretName[] = [
  'SPOTIFY_CLIENT_SECRET',
  'CLAUDE_API_KEY',
  'JWT_SIGNING_KEY',
  'REFRESH_TOKEN_ENCRYPTION_KEY',
];

/** Returns a successful Secret Manager response for the given value. */
function makeSecretResponse(value: string) {
  return [{ payload: { data: Buffer.from(value) } }];
}

function setupSuccessfulSecrets(overrides: Partial<Record<SecretName, string>> = {}) {
  const defaults: Record<SecretName, string> = {
    SPOTIFY_CLIENT_SECRET: 'spotify-secret-value',
    CLAUDE_API_KEY: 'claude-api-key-value',
    JWT_SIGNING_KEY: 'jwt-signing-key-value',
    REFRESH_TOKEN_ENCRYPTION_KEY: 'encryption-key-value',
  };

  const values = { ...defaults, ...overrides };

  mockAccessSecretVersion.mockImplementation(({ name }: { name: string }) => {
    const secretName = SECRET_NAMES.find((n) => name.includes(n));
    if (secretName) {
      return Promise.resolve(makeSecretResponse(values[secretName]));
    }
    return Promise.reject(new Error(`Unknown secret path: ${name}`));
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('secretManager', () => {
  beforeEach(() => {
    _clearSecretCacheForTesting();
    vi.clearAllMocks();
    process.env['GOOGLE_CLOUD_PROJECT'] = 'test-project';
  });

  afterEach(() => {
    delete process.env['GOOGLE_CLOUD_PROJECT'];
    delete process.env['GCP_PROJECT_ID'];
    _clearSecretCacheForTesting();
  });

  // -------------------------------------------------------------------------
  // loadSecrets — happy path
  // -------------------------------------------------------------------------

  it('loads all four secrets and caches them', async () => {
    setupSuccessfulSecrets();

    await loadSecrets();

    expect(getSecret('SPOTIFY_CLIENT_SECRET')).toBe('spotify-secret-value');
    expect(getSecret('CLAUDE_API_KEY')).toBe('claude-api-key-value');
    expect(getSecret('JWT_SIGNING_KEY')).toBe('jwt-signing-key-value');
    expect(getSecret('REFRESH_TOKEN_ENCRYPTION_KEY')).toBe('encryption-key-value');
  });

  it('calls Secret Manager exactly once per secret', async () => {
    setupSuccessfulSecrets();

    await loadSecrets();

    expect(mockAccessSecretVersion).toHaveBeenCalledTimes(4);
  });

  it('requests the "latest" version for every secret', async () => {
    setupSuccessfulSecrets();

    await loadSecrets();

    SECRET_NAMES.forEach((name) => {
      expect(mockAccessSecretVersion).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining(`${name}/versions/latest`),
        }),
      );
    });
  });

  it('uses GCP_PROJECT_ID env var when GOOGLE_CLOUD_PROJECT is absent', async () => {
    delete process.env['GOOGLE_CLOUD_PROJECT'];
    process.env['GCP_PROJECT_ID'] = 'fallback-project';
    setupSuccessfulSecrets();

    await loadSecrets();

    expect(mockAccessSecretVersion).toHaveBeenCalledWith(
      expect.objectContaining({ name: expect.stringContaining('fallback-project') }),
    );
  });

  // -------------------------------------------------------------------------
  // loadSecrets — fail-fast on missing project ID
  // -------------------------------------------------------------------------

  it('throws a clear error when no project ID env var is set', async () => {
    delete process.env['GOOGLE_CLOUD_PROJECT'];
    delete process.env['GCP_PROJECT_ID'];

    await expect(loadSecrets()).rejects.toThrow(/GCP project ID is not set/);
  });

  // -------------------------------------------------------------------------
  // loadSecrets — fail-fast on secret load failures
  // -------------------------------------------------------------------------

  it('throws a startup error listing all failed secrets', async () => {
    mockAccessSecretVersion.mockRejectedValue(new Error('permission denied'));

    await expect(loadSecrets()).rejects.toThrow(/failed to load 4 required secret\(s\)/);
  });

  it('includes the secret name in the error message when one secret fails', async () => {
    mockAccessSecretVersion.mockImplementation(({ name }: { name: string }) => {
      if (name.includes('CLAUDE_API_KEY')) {
        return Promise.reject(new Error('not found'));
      }
      const secretName = SECRET_NAMES.find((n) => name.includes(n))!;
      return Promise.resolve(makeSecretResponse(`value-for-${secretName}`));
    });

    await expect(loadSecrets()).rejects.toThrow(/CLAUDE_API_KEY/);
  });

  it('throws when a secret payload is empty', async () => {
    mockAccessSecretVersion.mockImplementation(({ name }: { name: string }) => {
      if (name.includes('JWT_SIGNING_KEY')) {
        return Promise.resolve([{ payload: { data: Buffer.from('') } }]);
      }
      const secretName = SECRET_NAMES.find((n) => name.includes(n))!;
      return Promise.resolve(makeSecretResponse(`value-for-${secretName}`));
    });

    await expect(loadSecrets()).rejects.toThrow(/JWT_SIGNING_KEY/);
  });

  it('throws when a secret payload is null', async () => {
    mockAccessSecretVersion.mockImplementation(({ name }: { name: string }) => {
      if (name.includes('SPOTIFY_CLIENT_SECRET')) {
        return Promise.resolve([{ payload: null }]);
      }
      const secretName = SECRET_NAMES.find((n) => name.includes(n))!;
      return Promise.resolve(makeSecretResponse(`value-for-${secretName}`));
    });

    await expect(loadSecrets()).rejects.toThrow(/SPOTIFY_CLIENT_SECRET/);
  });

  // -------------------------------------------------------------------------
  // getSecret — cache access
  // -------------------------------------------------------------------------

  it('throws a clear error when getSecret is called before loadSecrets', () => {
    // Cache was cleared in beforeEach
    expect(() => getSecret('CLAUDE_API_KEY')).toThrow(
      /not in the cache.*loadSecrets\(\)/i,
    );
  });

  it('returns the same value on repeated calls without re-fetching', async () => {
    setupSuccessfulSecrets({ SPOTIFY_CLIENT_SECRET: 'stable-value' });

    await loadSecrets();

    expect(getSecret('SPOTIFY_CLIENT_SECRET')).toBe('stable-value');
    expect(getSecret('SPOTIFY_CLIENT_SECRET')).toBe('stable-value');
    // Still only called once (from loadSecrets)
    expect(mockAccessSecretVersion).toHaveBeenCalledTimes(4);
  });

  // -------------------------------------------------------------------------
  // String payload (non-Buffer) handling
  // -------------------------------------------------------------------------

  it('handles string payloads returned by the SDK', async () => {
    mockAccessSecretVersion.mockImplementation(() =>
      Promise.resolve([{ payload: { data: 'string-secret-value' } }]),
    );

    await loadSecrets();

    // All four values should be the same string
    expect(getSecret('CLAUDE_API_KEY')).toBe('string-secret-value');
  });
});
