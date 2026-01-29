import { useStore } from '@/components/hooks/useStore';

export const FEATURES = {
  DISCOVER: true,
  COMMUNITY: false,

  CALENDAR: false,
  MESSAGING: false,
  AI_ASSISTANT: false,

  TEACHER_CLASSES: false,
  TEACHER_ASSIGNMENTS: false,
  TEACHER_MESSAGES: false,

  PARTNER_PORTAL: false,
  SCHOOL_DIRECTORY: false,

  ENTERPRISE_SSO: false,
  ENTERPRISE_AUDIT_LOGS: false,
  ENTERPRISE_FEATURE_FLAGS: false,
  ENTERPRISE_AI_GOVERNANCE: false,
  ENTERPRISE_AI_REVIEW: false,
  ENTERPRISE_SIS_ROSTER: false,
  ENTERPRISE_TRANSPARENCY: true,
  ENTERPRISE_MODE: false,
  FEATURE_I18N: false,

  // Keep anything “imported but not verified” OFF by default.
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function isFeatureEnabled(key: FeatureKey): boolean {
  const state = useStore.getState?.();
  const featureFlags = state?.featureFlags ?? {};
  if (featureFlags && Object.prototype.hasOwnProperty.call(featureFlags, key)) {
    return Boolean(featureFlags[key]);
  }

  return Boolean(FEATURES[key]);
}
