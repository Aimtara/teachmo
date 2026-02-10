/**
 * Declares the valid UI surfaces in Teachmo.
 * Any component that renders outside of these surfaces will be blocked by governance.
 */
export type SurfaceType =
  | 'PRIMARY_CARD'
  | 'HELP_NOW'
  | 'EXPLORE'
  | 'LIBRARY'
  | 'AI_OUTPUT'
  | 'NAVIGATION';
