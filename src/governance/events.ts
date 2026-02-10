export type GovernanceEvent =
  | { type: 'SURFACE_BLOCKED'; surface: SurfaceType; moment: MomentId; timestamp: number }
  | { type: 'AI_TRUNCATED'; moment: MomentId; timestamp: number }
  | { type: 'ROUTE_DENIED'; route: string; moment: MomentId; timestamp: number }
  | { type: 'COGNITIVE_BUDGET_EXCEEDED'; moment: MomentId; timestamp: number };

type GovernanceEventPayload<T extends GovernanceEvent['type']> =
  Omit<Extract<GovernanceEvent, { type: T }>, 'type' | 'timestamp'>;

const STORAGE_KEY = 'teachmo_governance_events_v1';
const MAX_EVENTS = 500;

function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    const testKey = '__teachmo_governance_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function loadEventsFromStorage(): GovernanceEvent[] {
  if (!isStorageAvailable()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Best-effort validation to avoid throwing on malformed entries.
    const safeEvents: GovernanceEvent[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      if (typeof item.type !== 'string' || typeof item.moment !== 'string') continue;
      if (typeof item.timestamp !== 'number') continue;

      // We trust the shape sufficiently for internal inspection.
      safeEvents.push(item as GovernanceEvent);
      if (safeEvents.length >= MAX_EVENTS) {
        break;
      }
    }

    return safeEvents;
  } catch {
    return [];
  }
}

function persistEventsToStorage(events: GovernanceEvent[]): void {
  if (!isStorageAvailable()) {
    return;
  }

  try {
    const trimmed = events.length > MAX_EVENTS ? events.slice(-MAX_EVENTS) : events;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Swallow storage errors; observability should not break app flows.
  }
}

const events: GovernanceEvent[] = loadEventsFromStorage();

/** Logs a governance event internally. This never surfaces to end users. */
export function logGovernanceEvent<T extends GovernanceEvent['type']>(
  eventType: T,
  payload: GovernanceEventPayload<T>,
): void {
  // Append the event to our internal array. In a real implementation this
  // could post to an API or analytics service. For now we store it and
  // persist a bounded history to localStorage for cross-session inspection.
  const event: GovernanceEvent = { 
    type: eventType, 
    timestamp: Date.now(),
    ...payload 
  } as GovernanceEvent;
  events.push(event);

  // Enforce max history size in memory as well.
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }

  persistEventsToStorage(events);
}

/** Returns a copy of all governance events for inspection. */
export function getGovernanceEvents(): GovernanceEvent[] {
  return [...events];
}
