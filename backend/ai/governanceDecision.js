/* eslint-env node */

export const POLICY_OUTCOMES = Object.freeze({
  ALLOWED: 'allowed',
  BLOCKED: 'blocked',
  REROUTED: 'rerouted',
  QUEUED: 'queued',
  ESCALATED: 'escalated',
});

export const TIERS = Object.freeze({
  TIER_1: 1,
  TIER_2: 2,
  TIER_3: 3,
});

export function createGovernanceDecision({
  requestId,
  tier = TIERS.TIER_1,
  policyOutcome = POLICY_OUTCOMES.ALLOWED,
  matchedPolicies = [],
  denialReason = null,
  requiredSkill = null,
  requiresAuditEvent = false,
  latencyMs = 0,
} = {}) {
  if (!Object.values(POLICY_OUTCOMES).includes(policyOutcome)) {
    throw new Error(`Invalid policyOutcome: ${policyOutcome}`);
  }

  if (!Object.values(TIERS).includes(tier)) {
    throw new Error(`Invalid tier: ${tier}`);
  }

  const normalizedLatencyMs = Number(latencyMs);

  return Object.freeze({
    requestId: requestId ?? null,
    tier,
    policyOutcome,
    matchedPolicies: Array.isArray(matchedPolicies) ? [...matchedPolicies] : [],
    denialReason: denialReason ?? null,
    requiredSkill: requiredSkill ?? null,
    requiresAuditEvent: Boolean(requiresAuditEvent),
    latencyMs: Number.isFinite(normalizedLatencyMs) && normalizedLatencyMs >= 0
      ? normalizedLatencyMs
      : 0,
  });
}

export function isBlocked(decision) {
  return decision?.policyOutcome === POLICY_OUTCOMES.BLOCKED;
}

export function requiresSkill(decision) {
  return Boolean(decision?.requiredSkill);
}
