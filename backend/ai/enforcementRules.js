// JS compatibility shim – see enforcementRules.ts for the typed source.

export function requiresVerifier(decision) {
  return ['rerouted', 'queued', 'escalated'].includes(String(decision?.policyOutcome || ''));
}

export function isBlocked(decision) {
  return decision?.policyOutcome === 'blocked';
}
