export type PolicyOutcome =
  | 'allowed'
  | 'blocked'
  | 'rerouted'
  | 'queued'
  | 'escalated';

export type GovernanceTier = 1 | 2 | 3;

export interface GovernanceDecision {
  requestId: string | null;
  tier: GovernanceTier;
  policyOutcome: PolicyOutcome;
  matchedPolicies: string[];
  denialReason: string | null;
  requiredSkill: string | null;
  requiresAuditEvent?: boolean;
  latencyMs?: number;
}

export interface VerifierResult {
  ok: boolean;
  issues: string[];
  content?: string;
}
