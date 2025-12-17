export const FEATURES = {
  DISCOVER: true,
  COMMUNITY: true,

  CALENDAR: false,
  MESSAGING: false,
  AI_ASSISTANT: false,

  TEACHER_CLASSES: false,
  TEACHER_ASSIGNMENTS: false,
  TEACHER_MESSAGES: false,

  PARTNER_PORTAL: false,
  SCHOOL_DIRECTORY: false,

  // Keep anything “imported but not verified” OFF by default.
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function isFeatureEnabled(key: FeatureKey): boolean {
  return Boolean(FEATURES[key]);
}
