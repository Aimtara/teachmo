type GovernanceDecision = {
  policyOutcome?: string | null;
};

export function requiresVerifier(decision: GovernanceDecision | null | undefined): boolean {
  return ['rerouted', 'queued', 'escalated'].includes(String(decision?.policyOutcome || ''));
}

export function isBlocked(decision: GovernanceDecision | null | undefined): boolean {
  return decision?.policyOutcome === 'blocked';
}
