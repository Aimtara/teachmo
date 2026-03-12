export const ONBOARDING_FLOW_KEY = 'teachmo:onboarding-flow';

export const ONBOARDING_FLOWS = {
  PARENT: 'parent',
  DISTRICT: 'district',
} as const;

export type OnboardingFlow = (typeof ONBOARDING_FLOWS)[keyof typeof ONBOARDING_FLOWS];

type Role = 'teacher' | 'parent' | string | null | undefined;

type ResolveOnboardingPathInput = {
  role: Role;
  preferredFlow?: string | null;
};

export function normalizeOnboardingFlow(value: string | null | undefined): OnboardingFlow {
  if (value === ONBOARDING_FLOWS.PARENT) return ONBOARDING_FLOWS.PARENT;
  return ONBOARDING_FLOWS.DISTRICT;
}

export function saveOnboardingFlowPreference(flow: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(ONBOARDING_FLOW_KEY, normalizeOnboardingFlow(flow));
}

export function getSavedOnboardingFlowPreference(): OnboardingFlow {
  if (typeof window === 'undefined') return ONBOARDING_FLOWS.DISTRICT;
  return normalizeOnboardingFlow(window.sessionStorage.getItem(ONBOARDING_FLOW_KEY));
}

export function resolveOnboardingPath({ role, preferredFlow }: ResolveOnboardingPathInput): string {
  if (role === 'teacher') return '/onboarding/teacher';
  if (role === 'parent') return '/onboarding/parent';
  if (normalizeOnboardingFlow(preferredFlow) === ONBOARDING_FLOWS.PARENT) return '/onboarding/parent';
  return '/onboarding';
}

export function clearSavedOnboardingFlowPreference(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(ONBOARDING_FLOW_KEY);
}
