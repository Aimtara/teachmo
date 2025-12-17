export type DirectorySourceSecrets = Record<string, Record<string, string>>;

let cachedSecrets: DirectorySourceSecrets | null = null;

export function getDirectorySourceSecrets(): DirectorySourceSecrets {
  if (cachedSecrets) return cachedSecrets;

  const raw = process.env.DIRECTORY_SOURCE_SECRETS_JSON;
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

export function applySecrets(template: string, secrets: Record<string, string>) {
  return template.replace(/{{\s*secret\.([\w-]+)\s*}}/g, (match, key) => {
    if (!(key in secrets)) {
      throw new Error(`missing_secret_${key}`);
    }
    return secrets[key];
  });
}
