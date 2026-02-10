import { MomentId } from './momentContract';

/**
 * A feature can either be a free navigation destination (FEATURE) or a
 * contextual intervention that Teachmo surfaces on the user’s behalf
 * (INTERVENTION). Interventions are surfaced automatically within the
 * Today orchestrator and are tightly bound to the moment contract.
 */
export type FeatureType = 'FEATURE' | 'INTERVENTION';

/**
 * Describes a single feature or intervention in the product. The
 * `moments` array declares which moments this capability is allowed to
 * appear in. The `lastReviewed` property is a free‑form ISO date and
 * should be updated whenever a founder explicitly reviews the entry.
 */
export interface FeatureDefinition {
  /** Human‑friendly name of the capability */
  name: string;
  /** Whether this capability is surfaced automatically or requires navigation */
  type: FeatureType;
  /** Moments in which this capability is allowed */
  moments: MomentId[];
  /** ISO date when this entry was last reviewed */
  lastReviewed: string;
}

/**
 * A static registry of known capabilities within Teachmo. This list is
 * intentionally small to encourage deliberate additions. When new
 * functionality is introduced, it should be registered here with its
 * appropriate type and allowed moments. Leaving a capability out of
 * this list will cause it to be flagged as ⚠ in the founder dashboard.
 */
export const FeatureRegistry: FeatureDefinition[] = [
  {
    name: 'Daily Tip',
    type: 'INTERVENTION',
    moments: ['morning'],
    lastReviewed: '2026-02-01',
  },
  {
    name: 'Explore',
    type: 'FEATURE',
    moments: ['midday', 'latenight'],
    lastReviewed: '2026-02-01',
  },
  {
    name: 'Help Me Now',
    type: 'INTERVENTION',
    moments: ['afternoon'],
    lastReviewed: '2026-02-01',
  },
  {
    name: 'Library',
    type: 'FEATURE',
    moments: ['latenight'],
    lastReviewed: '2026-02-01',
  },
];

/**
 * Finds a feature definition by name. Returns undefined if the feature
 * isn’t registered. This is useful when gating new functionality.
 */
export function getFeatureDefinition(name: string): FeatureDefinition | undefined {
  return FeatureRegistry.find((def) => def.name === name);
}
