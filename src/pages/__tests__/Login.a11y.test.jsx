import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import Login from '@/pages/Login.jsx';

expect.extend(toHaveNoViolations);

jest.mock('@/lib/nhostClient', () => ({
  nhost: {
    auth: {
      signIn: jest.fn(),
      signUp: jest.fn(),
      onAuthStateChanged: jest.fn(() => () => {}),
    },
  },
}));

jest.mock('@/components/auth/SocialLoginButtons', () => ({
  SocialLoginButtons: () => null,
}));

jest.mock('@/hooks/useTenantSSOSettings', () => () => ({
  data: { requireSso: false, providers: [] },
}));

jest.mock('@/utils/logger', () => ({
  createLogger: () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }),
}));

jest.mock('@/lib/onboardingFlow', () => ({
  ONBOARDING_FLOWS: { PARENT: 'parent', DISTRICT: 'district' },
  normalizeOnboardingFlow: jest.fn((v) => v || 'parent'),
  getSavedOnboardingFlowPreference: jest.fn(() => 'district'),
  saveOnboardingFlowPreference: jest.fn(),
}));

function renderLogin(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/login${search}`]}>
      <Login />
    </MemoryRouter>
  );
}

describe('Login page accessibility', () => {
  it('passes a11y checks on sign-in view', async () => {
    const { container } = renderLogin();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('passes a11y checks on parent sign-up view', async () => {
    const { container } = renderLogin('?flow=parent');
    // Click "Create a new account" button to switch to sign-up mode
    const button = container.querySelector('button[type="button"]');
    if (button) button.click();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
