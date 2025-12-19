export type DataScopes = Record<string, unknown>;

export const SYSTEM_SCOPE_DEFAULTS: DataScopes = {
  directory: { email: true, names: false, externalIds: true },
  messaging: { sendInvites: true, useEmail: true },
  analytics: { enabled: false }
};

export function mergeScopes(base: DataScopes = {}, override: DataScopes = {}): DataScopes {
  const result: DataScopes = { ...(base || {}) };
  Object.entries(override || {}).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nestedBase = (result[key] as DataScopes | undefined) || {};
      result[key] = mergeScopes(nestedBase, value as DataScopes);
    } else {
      result[key] = value;
    }
  });
  return result;
}

export function resolveEffectiveScopes(scopes?: { districtScopes?: DataScopes; schoolScopes?: DataScopes }) {
  return mergeScopes(mergeScopes(SYSTEM_SCOPE_DEFAULTS, scopes?.districtScopes ?? {}), scopes?.schoolScopes ?? {});
}
