import {
  ONBOARDING_FLOWS,
  normalizeOnboardingFlow,
  saveOnboardingFlowPreference,
  getSavedOnboardingFlowPreference,
  clearSavedOnboardingFlowPreference,
  ONBOARDING_FLOW_KEY,
  resolveOnboardingPath,
} from '../onboardingFlow';

describe('normalizeOnboardingFlow', () => {
  it('returns parent for the parent flow value', () => {
    expect(normalizeOnboardingFlow('parent')).toBe(ONBOARDING_FLOWS.PARENT);
  });

  it('returns district for the district flow value', () => {
    expect(normalizeOnboardingFlow('district')).toBe(ONBOARDING_FLOWS.DISTRICT);
  });

  it('defaults to parent for unknown values', () => {
    expect(normalizeOnboardingFlow('unknown')).toBe(ONBOARDING_FLOWS.PARENT);
    expect(normalizeOnboardingFlow(null)).toBe(ONBOARDING_FLOWS.PARENT);
    expect(normalizeOnboardingFlow(undefined)).toBe(ONBOARDING_FLOWS.PARENT);
    expect(normalizeOnboardingFlow('')).toBe(ONBOARDING_FLOWS.PARENT);
  });
});

describe('saveOnboardingFlowPreference', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('persists the parent flow', () => {
    saveOnboardingFlowPreference(ONBOARDING_FLOWS.PARENT);
    expect(window.sessionStorage.getItem(ONBOARDING_FLOW_KEY)).toBe(ONBOARDING_FLOWS.PARENT);
  });

  it('normalizes and persists the parent flow for unknown values', () => {
    saveOnboardingFlowPreference('anything-else');
    expect(window.sessionStorage.getItem(ONBOARDING_FLOW_KEY)).toBe(ONBOARDING_FLOWS.PARENT);
  });

  it('persists the district flow', () => {
    saveOnboardingFlowPreference(ONBOARDING_FLOWS.DISTRICT);
    expect(window.sessionStorage.getItem(ONBOARDING_FLOW_KEY)).toBe(ONBOARDING_FLOWS.DISTRICT);
  });
});

describe('getSavedOnboardingFlowPreference', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('returns parent when nothing has been saved (default)', () => {
    expect(getSavedOnboardingFlowPreference()).toBe(ONBOARDING_FLOWS.PARENT);
  });

  it('returns the saved parent preference', () => {
    saveOnboardingFlowPreference(ONBOARDING_FLOWS.PARENT);
    expect(getSavedOnboardingFlowPreference()).toBe(ONBOARDING_FLOWS.PARENT);
  });

  it('returns district after saving the district preference', () => {
    saveOnboardingFlowPreference(ONBOARDING_FLOWS.DISTRICT);
    expect(getSavedOnboardingFlowPreference()).toBe(ONBOARDING_FLOWS.DISTRICT);
  });
});

describe('resolveOnboardingPath', () => {
  it('routes a teacher role to /onboarding/teacher regardless of flow', () => {
    expect(resolveOnboardingPath({ role: 'teacher', preferredFlow: ONBOARDING_FLOWS.PARENT })).toBe(
      '/onboarding/teacher'
    );
    expect(resolveOnboardingPath({ role: 'teacher', preferredFlow: ONBOARDING_FLOWS.DISTRICT })).toBe(
      '/onboarding/teacher'
    );
  });

  it('routes a parent role with parent flow to /onboarding/parent', () => {
    expect(resolveOnboardingPath({ role: 'parent', preferredFlow: ONBOARDING_FLOWS.PARENT })).toBe(
      '/onboarding/parent'
    );
  });

  it('routes a parent role to /onboarding/parent regardless of flow', () => {
    expect(resolveOnboardingPath({ role: 'parent', preferredFlow: ONBOARDING_FLOWS.DISTRICT })).toBe(
      '/onboarding/parent'
    );
  });

  it('routes a non-teacher/non-parent role with parent flow to /onboarding/parent', () => {
    expect(resolveOnboardingPath({ role: 'admin', preferredFlow: ONBOARDING_FLOWS.PARENT })).toBe(
      '/onboarding/parent'
    );
  });

  it('falls back to /onboarding/parent for unknown roles and unknown flows', () => {
    expect(resolveOnboardingPath({ role: 'unknown', preferredFlow: undefined })).toBe('/onboarding/parent');
    expect(resolveOnboardingPath({ role: undefined, preferredFlow: null })).toBe('/onboarding/parent');
  });
});


describe('clearSavedOnboardingFlowPreference', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('removes the saved onboarding flow from session storage', () => {
    saveOnboardingFlowPreference(ONBOARDING_FLOWS.PARENT);
    clearSavedOnboardingFlowPreference();
    expect(window.sessionStorage.getItem(ONBOARDING_FLOW_KEY)).toBeNull();
  });
});
