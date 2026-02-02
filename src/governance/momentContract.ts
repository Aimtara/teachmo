export type MomentId =
  | 'morning'
  | 'commute'
  | 'midday'
  | 'afternoon'
  | 'evening'
  | 'latenight';

export interface MomentRules {
  /** Maximum number of seconds of cognitive budget allowed for this moment */
  cognitiveBudgetSeconds: number;
  /** Surfaces that are allowed to render for this moment */
  allowedSurfaces: string[];
  /** Whether navigation elements are allowed */
  allowNavigation: boolean;
  /** Maximum number of primary actions allowed */
  maxPrimaryActions: number;
}

/**
 * The Moment Contract encodes the UX rules for each time-of-day moment.
 * Do not mutate this object at runtime – to change behaviour update these values.
 */
export const MomentContract: Record<MomentId, MomentRules> = {
  morning: {
    cognitiveBudgetSeconds: 10,
    allowedSurfaces: ['PRIMARY_CARD'],
    allowNavigation: false,
    maxPrimaryActions: 1,
  },
  commute: {
    cognitiveBudgetSeconds: 15,
    allowedSurfaces: ['PRIMARY_CARD'],
    allowNavigation: false,
    maxPrimaryActions: 0,
  },
  midday: {
    cognitiveBudgetSeconds: 60,
    allowedSurfaces: ['PRIMARY_CARD', 'EXPLORE'],
    allowNavigation: true,
    maxPrimaryActions: 1,
  },
  afternoon: {
    cognitiveBudgetSeconds: 0,
    allowedSurfaces: ['HELP_NOW'],
    allowNavigation: false,
    maxPrimaryActions: 1,
  },
  evening: {
    cognitiveBudgetSeconds: 40,
    allowedSurfaces: ['PRIMARY_CARD'],
    allowNavigation: true,
    maxPrimaryActions: 0,
  },
  latenight: {
    cognitiveBudgetSeconds: 999,
    allowedSurfaces: ['PRIMARY_CARD', 'LIBRARY'],
    allowNavigation: true,
    maxPrimaryActions: 0,
  },
};

/**
 * Utility to resolve the current moment based on local time.
 * Consumers should override `now` for testing.
 */
export function getCurrentMoment(now: Date = new Date()): MomentId {
  const hour = now.getHours();
  if (hour >= 6 && hour < 9) return 'morning';
  if (hour >= 9 && hour < 12) return 'commute';
  if (hour >= 12 && hour < 15) return 'midday';
  if (hour >= 15 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'latenight';
}
