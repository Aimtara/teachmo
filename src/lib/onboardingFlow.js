export const ONBOARDING_FLOW_KEY = 'teachmo:onboarding-flow';

export const ONBOARDING_FLOWS = {
  PARENT: 'parent',
  DISTRICT: 'district',
};

export function normalizeOnboardingFlow(value) {
  if (value === ONBOARDING_FLOWS.PARENT) return ONBOARDING_FLOWS.PARENT;
  return ONBOARDING_FLOWS.DISTRICT;
}

export function saveOnboardingFlowPreference(flow) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(ONBOARDING_FLOW_KEY, normalizeOnboardingFlow(flow));
}

export function getSavedOnboardingFlowPreference() {
  if (typeof window === 'undefined') return ONBOARDING_FLOWS.DISTRICT;
  return normalizeOnboardingFlow(window.sessionStorage.getItem(ONBOARDING_FLOW_KEY));
}

export function resolveOnboardingPath({ role, preferredFlow }) {
  if (role === 'teacher') return '/onboarding/teacher';
  if (role === 'parent') return '/onboarding/parent';
  if (normalizeOnboardingFlow(preferredFlow) === ONBOARDING_FLOWS.PARENT) return '/onboarding/parent';
  return '/onboarding';
}

export function clearSavedOnboardingFlowPreference() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(ONBOARDING_FLOW_KEY);
}
