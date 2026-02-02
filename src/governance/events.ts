export type GovernanceEvent =
  | { type: 'SURFACE_BLOCKED'; surface: string; moment: string }
  | { type: 'AI_TRUNCATED'; moment: string }
  | { type: 'ROUTE_DENIED'; route: string; moment: string }
  | { type: 'COGNITIVE_BUDGET_EXCEEDED'; moment: string };

type GovernanceEventPayload<T extends GovernanceEvent['type']> =
  Omit<Extract<GovernanceEvent, { type: T }>, 'type'>;

const events: GovernanceEvent[] = [];

/** Logs a governance event internally. This never surfaces to end users. */
export function logGovernanceEvent<T extends GovernanceEvent['type']>(
  eventType: T,
  payload: GovernanceEventPayload<T>,
): void {
  // Append the event to our internal array. In a real implementation this
  // could post to an API or analytics service. For now we simply store it.
  const event: GovernanceEvent = { type: eventType, ...payload };
  events.push(event);
}

/** Returns a copy of all governance events for inspection. */
export function getGovernanceEvents(): GovernanceEvent[] {
  return [...events];
}
