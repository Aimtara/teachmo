import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import Login from '@/pages/Login.jsx';

expect.extend(toHaveNoViolations);

vi.mock('@nhost/react', () => ({
  useAuthenticationStatus: () => ({ isAuthenticated: false }),
}));

vi.mock('@/lib/nhostClient', () => ({
  nhost: {
    auth: {
      signIn: vi.fn(),
      signUp: vi.fn(),
      onAuthStateChanged: vi.fn(() => () => {}),
    },
  },
}));

vi.mock('@/components/auth/SocialLoginButtons', () => ({
  SocialLoginButtons: () => null,
}));

vi.mock('@/hooks/useTenantSSOSettings', () => {
  const mockResult = { data: { requireSso: false, providers: [] } };
  return {
    default: () => mockResult,
    useTenantSSOSettings: () => mockResult,
  };
});

vi.mock('@/utils/logger', () => ({
  createLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }),
}));

vi.mock('@/lib/onboardingFlow', () => ({
  ONBOARDING_FLOWS: { PARENT: 'parent', DISTRICT: 'district' },
  normalizeOnboardingFlow: vi.fn((v) => v || 'parent'),
  getSavedOnboardingFlowPreference: vi.fn(() => 'parent'),
  saveOnboardingFlowPreference: vi.fn(),
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
    const user = userEvent.setup();
    const { container } = renderLogin('?flow=parent');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /create a new account/i }));
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
