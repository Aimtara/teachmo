import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import AuthCallback from '@/pages/AuthCallback';

function LoginPage() {
  const [params] = useSearchParams();
  return (
    <div>
      <div>Login Page</div>
      <div data-testid="login-flow-param">{params.get('flow')}</div>
      <div data-testid="login-error-param">{params.get('error') ?? ''}</div>
    </div>
  );
}

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

vi.mock('@/lib/onboardingFlow', () => ({
  getSavedOnboardingFlowPreference: () => 'parent',
  resolveOnboardingPath: () => '/onboarding/parent',
}));

vi.mock('@/observability/telemetry', () => ({
  logAnalyticsEvent: vi.fn().mockResolvedValue(undefined),
}));

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
  });

  it('redirects unauthenticated users back to login instead of hanging on loading screen', async () => {
    render(
      <MemoryRouter initialEntries={['/auth/callback?flow=district']}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Login Page')).toBeInTheDocument();
    expect(screen.getByTestId('login-flow-param')).toHaveTextContent('district');
    expect(screen.getByTestId('login-error-param')).toHaveTextContent('');
  });

  it('preserves flow and appends error=session_expired when redirecting after an auth error', async () => {
    authState.error = { message: 'Session expired' };

    render(
      <MemoryRouter initialEntries={['/auth/callback?flow=district']}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Login Page')).toBeInTheDocument();
    expect(screen.getByTestId('login-flow-param')).toHaveTextContent('district');
    expect(screen.getByTestId('login-error-param')).toHaveTextContent('session_expired');
  });

  it('falls back to saved onboarding preference when no flow param is present', async () => {
    render(
      <MemoryRouter initialEntries={['/auth/callback']}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Login Page')).toBeInTheDocument();
    // getSavedOnboardingFlowPreference() is mocked to return 'parent'
    expect(screen.getByTestId('login-flow-param')).toHaveTextContent('parent');
    expect(screen.getByTestId('login-error-param')).toHaveTextContent('');
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
