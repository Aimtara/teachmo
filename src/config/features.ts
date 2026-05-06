import { useStore } from '@/components/hooks/useStore';
import { envFlag } from '@/config/env';

export const FEATURES = {
  DISCOVER: true,
  COMMUNITY: false,

  CALENDAR: false,
  OFFICE_HOURS: false,
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

  GAMIFICATION: false,
  LEADERBOARDS: false,
  RANKINGS: false,
  CHALLENGES: false,
  ASSIGNMENT_SYNC: false,
  AI_SENSITIVE_RECOMMENDATIONS: false,
  ADMIN_ANALYTICS_SENSITIVE: false,
  SAFESPACE_EMERGENCY_NOTIFIER: false,
  LTI_DEEP_INTEGRATIONS: false,

  // Keep anything “imported but not verified” OFF by default.
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function isFeatureEnabled(key: FeatureKey): boolean {
  const state = useStore.getState?.();
  const featureFlags = state?.featureFlags ?? {};
  if (featureFlags && Object.prototype.hasOwnProperty.call(featureFlags, key)) {
    return Boolean(featureFlags[key]);
  }

  if (
    envFlag(`VITE_FEATURE_${key}`, { defaultValue: false, strict: true }) ||
    envFlag(`VITE_E2E_FEATURE_${key}`, { defaultValue: false, strict: true })
  ) {
    return true;
  }

  return Boolean(FEATURES[key]);
}
