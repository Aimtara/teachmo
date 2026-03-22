/* eslint-env node */

export function requiresVerifier(decision) {
  return ['rerouted', 'queued', 'escalated'].includes(decision?.policyOutcome);
}

export function isBlocked(decision) {
  return decision?.policyOutcome === 'blocked';
}
