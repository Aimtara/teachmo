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

  if (![1, 2, 3].includes(tier)) {
    throw new Error(`Invalid tier: ${tier}`);
  }

  return Object.freeze({
    requestId: requestId ?? null,
    tier,
    policyOutcome,
    matchedPolicies: Array.isArray(matchedPolicies) ? [...matchedPolicies] : [],
    denialReason: denialReason ?? null,
    requiredSkill: requiredSkill ?? null,
    requiresAuditEvent: Boolean(requiresAuditEvent),
    latencyMs: Number(latencyMs) || 0,
  });
}

export function isBlocked(decision) {
  return decision?.policyOutcome === POLICY_OUTCOMES.BLOCKED;
}

export function requiresSkill(decision) {
  return (
    decision?.policyOutcome === POLICY_OUTCOMES.REROUTED ||
    decision?.policyOutcome === POLICY_OUTCOMES.QUEUED
  );
}
