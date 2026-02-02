import { getGovernanceEvents } from './events';

/**
 * Represents the readiness status for a given pilot readiness dimension.
 * READY means there are no known blockers, AT_RISK means there are
 * warning signs, and NOT_READY means the product should not be piloted
 * without further iteration.
 */
export type ReadinessStatus = 'READY' | 'AT_RISK' | 'NOT_READY';

/**
 * A composite snapshot of pilot readiness across key dimensions. These
 * categories align with the pilot school readiness scorecard: parent
 * experience, school communication, compliance, and operational load.
 */
export interface PilotSnapshot {
  parentExperience: ReadinessStatus;
  schoolCommunication: ReadinessStatus;
  compliance: ReadinessStatus;
  operationalLoad: ReadinessStatus;
}

/**
 * Produces a naive pilot readiness snapshot by inspecting governance
 * events. This is a placeholder implementation: real versions should
 * incorporate real user metrics, teacher feedback, and compliance
 * checklists. Nonetheless, it allows the founder to get a feel for
 * emerging risks without sifting through raw logs.
 */
export function getPilotReadinessSnapshot(): PilotSnapshot {
  const events = getGovernanceEvents();
  const totalEvents = events.length;

  // Very simple heuristics: heavy usage of governance blocking implies
  // operational strain or UX rough edges, which in turn could degrade
  // parent experience. Adjust thresholds as data becomes available.
  const parentExperience: ReadinessStatus =
    totalEvents < 5 ? 'READY' : totalEvents < 10 ? 'AT_RISK' : 'NOT_READY';

  // We assume school communication channels are always summarised into
  // Today for early pilots. If a different implementation is added this
  // function should inspect corresponding events or metrics.
  const schoolCommunication: ReadinessStatus = 'READY';

  // Compliance is assumed ready until regulated data surfaces. In the
  // future, this should check data minimisation and privacy controls.
  const compliance: ReadinessStatus = 'READY';

  // Operational load: if many governance events are firing, it may
  // indicate a confusing product or heavy intervention load. Use the
  // same heuristic as parent experience for now.
  const operationalLoad: ReadinessStatus = parentExperience;

  return { parentExperience, schoolCommunication, compliance, operationalLoad };
}
