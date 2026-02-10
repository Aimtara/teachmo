import { getGovernanceEvents, GovernanceEvent } from './events';

/**
 * Aggregated counts of governance events by type. Useful for summarising
 * drift in a single glance. The dashboard can display this summary or
 * send it via digest. More sophisticated versions could segment by
 * moment or include timestamps.
 */
export interface GovernanceSummary {
  total: number;
  byType: Record<GovernanceEvent['type'], number>;
}

export function getGovernanceSummary(): GovernanceSummary {
  const events = getGovernanceEvents();
  const summary: GovernanceSummary = {
    total: events.length,
    byType: {
      SURFACE_BLOCKED: 0,
      AI_TRUNCATED: 0,
      ROUTE_DENIED: 0,
      COGNITIVE_BUDGET_EXCEEDED: 0,
    },
  };
  for (const ev of events) {
    summary.byType[ev.type] += 1;
  }
  return summary;
}
