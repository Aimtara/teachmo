import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import AuthCallback from '@/pages/AuthCallback';

const authState = {
  isAuthenticated: false,
  isLoading: false,
  error: null,
  user: null,
};

const roleState = {
  role: 'parent',
  loading: false,
  needsOnboarding: false,
  tenantScope: null,
};

vi.mock('@nhost/react', () => ({
  useAuthenticationStatus: () => ({
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    error: authState.error,
  }),
  useUserData: () => authState.user,
}));

vi.mock('@/hooks/useUserRole', () => ({
  getDefaultPathForRole: () => '/parent/dashboard',
  useUserRoleState: () => roleState,
}));

const { saveOnboardingFlowPreferenceMock } = vi.hoisted(() => ({
  saveOnboardingFlowPreferenceMock: vi.fn(),
}));

vi.mock('@/lib/onboardingFlow', () => ({
  getSavedOnboardingFlowPreference: () => 'parent',
  normalizeOnboardingFlow: (value) => (value === 'district' ? 'district' : 'parent'),
  resolveOnboardingPath: () => '/onboarding/parent',
  saveOnboardingFlowPreference: saveOnboardingFlowPreferenceMock,
}));

vi.mock('@/observability/telemetry', () => ({
  logAnalyticsEvent: vi.fn().mockResolvedValue(undefined),
}));


function LoginSpy() {
  const location = useLocation();
  return <div data-testid="login-location">{location.search}</div>;
}

describe('AuthCallback', () => {
  beforeEach(() => {
    authState.isAuthenticated = false;
    authState.isLoading = false;
    authState.error = null;
    authState.user = null;
    roleState.role = 'parent';
    roleState.loading = false;
    roleState.needsOnboarding = false;
    roleState.tenantScope = null;
    saveOnboardingFlowPreferenceMock.mockClear();
  });

  it('redirects unauthenticated users back to login instead of hanging on loading screen', async () => {
    render(
      <MemoryRouter initialEntries={['/auth/callback?flow=district']}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Login Page')).toBeInTheDocument();
  });


  it('preserves structured auth error codes in the login redirect', async () => {
    authState.error = { code: 'invalid_provider_state', message: 'Provider state mismatch' };

    render(
      <MemoryRouter initialEntries={['/auth/callback?flow=parent']}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/login" element={<LoginSpy />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByTestId('login-location')).toHaveTextContent('error=invalid_provider_state');
  });


  it('normalizes unknown callback flow values before redirecting to login', async () => {
    render(
      <MemoryRouter initialEntries={['/auth/callback?flow=unexpected']}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/login" element={<LoginSpy />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByTestId('login-location')).toHaveTextContent('flow=parent');
  });

  it('redirects authenticated users to their default dashboard', async () => {
    authState.isAuthenticated = true;
    authState.user = { id: 'u1' };

    render(
      <MemoryRouter initialEntries={['/auth/callback?flow=parent']}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/parent/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
  });
});
