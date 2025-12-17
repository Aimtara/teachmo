export type DirectorySourceSecrets = Record<string, Record<string, string>>;

let cachedSecrets: DirectorySourceSecrets | null = null;
let cachedEnvValue: string | undefined = undefined;

export function getDirectorySourceSecrets(): DirectorySourceSecrets {
  const currentEnvValue = process.env.DIRECTORY_SOURCE_SECRETS_JSON;

  // Clear cache if environment variable has changed
  if (cachedSecrets && currentEnvValue !== cachedEnvValue) {
    cachedSecrets = null;
  }

  if (cachedSecrets) return cachedSecrets;

  cachedEnvValue = currentEnvValue;
  const raw = currentEnvValue;
  if (!raw) {
    cachedSecrets = {};
    return cachedSecrets;
  }

  try {
    const parsed = JSON.parse(raw);
    cachedSecrets = parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    console.warn('Failed to parse DIRECTORY_SOURCE_SECRETS_JSON', err);
    cachedSecrets = {};
  }

  return cachedSecrets;
}

/**
 * Clears the cached secrets, forcing a reload on the next call to getDirectorySourceSecrets.
 * Useful for testing or when secrets need to be refreshed programmatically.
 */
export function clearSecretsCache(): void {
  cachedSecrets = null;
  cachedEnvValue = undefined;
}

export function applySecrets(template: string, secrets: Record<string, string>) {
  return template.replace(/{{\s*secret\.([\w-]+)\s*}}/g, (match, key) => {
    if (!(key in secrets)) {
      throw new Error(`missing_secret_${key}`);
    }
    return secrets[key];
  });
}
