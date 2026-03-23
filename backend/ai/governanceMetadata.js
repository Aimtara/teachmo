/* eslint-env node */

export function buildGovernanceMetadata(decision, extra = {}) {
  return {
    requestId: decision?.requestId ?? null,
    tier: decision?.tier ?? null,
    policyOutcome: decision?.policyOutcome ?? null,
    matchedPolicies: decision?.matchedPolicies ?? [],
    denialReason: decision?.denialReason ?? null,
    requiredSkill: decision?.requiredSkill ?? null,
    ...extra,
  };
}
