export type PolicyOutcome =
  | 'allowed'
  | 'blocked'
  | 'rerouted'
  | 'queued'
  | 'escalated';

export interface GovernanceDecision {
  requestId: string | null;
  tier: 1 | 2 | 3;
  policyOutcome: PolicyOutcome;
  matchedPolicies: string[];
  denialReason: string | null;
  requiredSkill: string | null;
  requiresAuditEvent: boolean;
  latencyMs: number;
}
