/**
 * Declares the valid UI surfaces in Teachmo.
 * Governance and enforcement mechanisms (e.g., SurfaceBoundary) use these
 * surface identifiers to determine where components are allowed to render.
 */
export type SurfaceType =
  | 'PRIMARY_CARD'
  | 'HELP_NOW'
  | 'EXPLORE'
  | 'LIBRARY'
  | 'AI_OUTPUT'
  | 'NAVIGATION';
