import { getGovernanceEvents, GovernanceEvent } from './events';

/**
 * Defines the possible gate status values. Gates are soft heuristics for
 * whether the product is ready to launch. They map directly to the
 * launch gates described in the product manifesto. See docs for details.
 */
export type GateStatus = 'PASS' | 'AT_RISK' | 'FAIL';

/**
 * Holds the evaluation state for all launch gates. Each gate (G0–G4)
 * reflects a different aspect of product readiness. G0 represents
 * foundational coherence, while G4 represents overall launch readiness.
 */
export interface LaunchGateStates {
  G0: GateStatus;
  G1: GateStatus;
  G2: GateStatus;
  G3: GateStatus;
  G4: GateStatus;
}

/**
 * Assigns human‑readable descriptions to each gate. These mirror the
 * definitions from the launch manifesto. Feel free to update the text
 * here if the meanings of the gates evolve over time.
 */
export const LaunchGateDescriptions: Record<keyof LaunchGateStates, string> = {
  G0: 'Product Coherence',
  G1: 'UX & Routing Integrity',
  G2: 'Intervention Quality',
  G3: 'Emotional Safety & Trust',
  G4: 'Overall Launch Readiness',
};

/**
 * Evaluates the current launch gate state based on logged governance
 * events. This is intentionally heuristic: it looks at the volume and
 * types of governance events and infers whether something might be
 * drifting. In the absence of real telemetry, these thresholds are
 * conservative and can be tuned later.
 */
export function evaluateLaunchGates(): LaunchGateStates {
  const events = getGovernanceEvents();

  const count = (type: GovernanceEvent['type']) =>
    events.filter((ev) => ev.type === type).length;

  const surfaceBlocked = count('SURFACE_BLOCKED');
  const routeDenied = count('ROUTE_DENIED');
  const aiTruncated = count('AI_TRUNCATED');
  const cognitiveExceeded = count('COGNITIVE_BUDGET_EXCEEDED');

  // G0 is currently static. If more structural checks are added (e.g.
  // ensuring the MomentContract exists or that routes are defined), they
  // should be evaluated here. For now, we assume coherence is baked in.
  const G0: GateStatus = 'PASS';

  // G1: UX & Routing Integrity
  // If surfaces are blocked or routes denied frequently, we treat this as
  // drift. A few events are expected during development. Thresholds can
  // be tuned as usage data arrives.
  let G1: GateStatus = 'PASS';
  const surfaceOrRoute = surfaceBlocked + routeDenied;
  if (surfaceOrRoute > 10) G1 = 'FAIL';
  else if (surfaceOrRoute > 3) G1 = 'AT_RISK';

  // G2: Intervention Quality
  // AI truncation is a signal that interventions are getting too heavy or
  // verbose. A high count means quality is declining.
  let G2: GateStatus = 'PASS';
  if (aiTruncated > 10) G2 = 'FAIL';
  else if (aiTruncated > 3) G2 = 'AT_RISK';

  // G3: Emotional Safety & Trust
  // Exceeding cognitive budget signals that the system might be overloading
  // parents. Again we use simple thresholds for now.
  let G3: GateStatus = 'PASS';
  if (cognitiveExceeded > 10) G3 = 'FAIL';
  else if (cognitiveExceeded > 3) G3 = 'AT_RISK';

  // G4: Overall Launch Readiness
  // Any gate failing means G4 fails. Any gate at risk means G4 is at risk.
  let G4: GateStatus = 'PASS';
  const statuses = [G0, G1, G2, G3];
  if (statuses.includes('FAIL')) G4 = 'FAIL';
  else if (statuses.includes('AT_RISK')) G4 = 'AT_RISK';

  return { G0, G1, G2, G3, G4 };
}
