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

/**
 * Replaces secret placeholders in a template string with actual secret values.
 * 
 * @param template - A string containing secret placeholders in the format `{{secret.keyName}}`
 * @param secrets - A record mapping secret keys to their values
 * @returns The template string with all secret placeholders replaced by their actual values
 * @throws {Error} Throws an error with message `missing_secret_{key}` if a referenced secret key is not found in the secrets record
 * 
 * @example
 * ```typescript
 * const template = "Authorization: Bearer {{secret.apiToken}}";
 * const secrets = { apiToken: "abc123" };
 * const result = applySecrets(template, secrets);
 * // Returns: "Authorization: Bearer abc123"
 * ```
 * 
 * @example
 * ```typescript
 * // Multiple secrets in a template
 * const template = "{{secret.username}}:{{secret.password}}";
 * const secrets = { username: "user", password: "pass" };
 * const result = applySecrets(template, secrets);
 * // Returns: "user:pass"
 * ```
 * 
 * @example
 * ```typescript
 * // Missing secret throws an error
 * const template = "Key: {{secret.missingKey}}";
 * const secrets = {};
 * applySecrets(template, secrets);
 * // Throws: Error("missing_secret_missingKey")
 * ```
 */
export function applySecrets(template: string, secrets: Record<string, string>) {
  return template.replace(/{{\s*secret\.([\w-]+)\s*}}/g, (match, key) => {
    if (!(key in secrets)) {
      throw new Error(`missing_secret_${key}`);
    }
    return secrets[key];
  });
}
