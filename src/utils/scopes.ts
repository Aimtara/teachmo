export type DataScopes = Record<string, any>;

export const SYSTEM_SCOPE_DEFAULTS: DataScopes = {
  directory: { email: true, names: false, externalIds: true },
  messaging: { sendInvites: true, useEmail: true },
  analytics: { enabled: false }
};

export function mergeScopes(base: DataScopes = {}, override: DataScopes = {}): DataScopes {
  const result: DataScopes = { ...(base || {}) };
  Object.entries(override || {}).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = mergeScopes(result[key] || {}, value as DataScopes);
    } else {
      result[key] = value;
    }
  });
  return result;
}

export function resolveEffectiveScopes(scopes?: { districtScopes?: DataScopes; schoolScopes?: DataScopes }) {
  return mergeScopes(mergeScopes(SYSTEM_SCOPE_DEFAULTS, scopes?.districtScopes ?? {}), scopes?.schoolScopes ?? {});
}
