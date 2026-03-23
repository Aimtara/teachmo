import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from '@/pages/Login';

vi.mock('@nhost/react', () => ({
  useAuthenticationStatus: () => ({ isAuthenticated: false }),
}));

const ssoState = { data: { requireSso: false, providers: [] } };
const { signInMock, signUpMock, resetPasswordMock } = vi.hoisted(() => ({
  signInMock: vi.fn().mockResolvedValue({ error: null }),
  signUpMock: vi.fn().mockResolvedValue({ session: null, error: null }),
  resetPasswordMock: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock('@/hooks/useTenantSSOSettings', () => ({
  default: () => ssoState,
}));

vi.mock('@/lib/nhostClient', () => ({
  nhost: {
    auth: {
      signIn: signInMock,
      signUp: signUpMock,
      resetPassword: resetPasswordMock,
    },
  },
}));

vi.mock('@/utils/logger', () => ({
  createLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }),
}));

describe('Login flow query-state handling', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    ssoState.data = { requireSso: false, providers: [] };
    signInMock.mockClear();
    signUpMock.mockClear();
    signUpMock.mockResolvedValue({ session: null, error: null });
    resetPasswordMock.mockClear();
    resetPasswordMock.mockResolvedValue({ error: null });
  });

  it('shows a session-expired message when callback returns with error=session_expired', async () => {
    render(
      <MemoryRouter initialEntries={['/login?flow=district&error=session_expired']}>
        <Login />
      </MemoryRouter>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Your session expired. Please sign in again.');
  });


  it('shows a clear message for structured callback errors', async () => {
    render(
      <MemoryRouter initialEntries={['/login?flow=parent&error=invalid_sso_state']}>
        <Login />
      </MemoryRouter>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Your sign-in request expired. Please start sign-in again.');
  });

  it('persists normalized query flow to session storage for post-login routing', async () => {
    render(
      <MemoryRouter initialEntries={['/login?flow=unexpected']}>
        <Login />
      </MemoryRouter>
    );

    expect(await screen.findByText(/parent or guardian/i)).toBeInTheDocument();
    expect(window.sessionStorage.getItem('teachmo:onboarding-flow')).toBe('parent');
  });



  it('submits parent sign-up with profile metadata mapped for downstream DB provisioning', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/login?flow=parent']}>
        <Login />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /create a new account/i }));
    await user.type(screen.getByPlaceholderText(/full name/i), 'Parent User');
    await user.type(screen.getByPlaceholderText(/email address/i), 'parent@example.com');
    await user.type(screen.getByPlaceholderText(/^password$/i), 'Password123!');
    await user.type(screen.getByPlaceholderText(/confirm password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(signUpMock).toHaveBeenCalledWith({
      email: 'parent@example.com',
      password: 'Password123!',
      options: {
        displayName: 'Parent User',
        metadata: {
          app_role: 'parent',
          role: 'parent',
          preferred_active_role: 'parent',
          onboarding_flow: 'parent',
          full_name: 'Parent User',
        },
      },
    });
    expect(await screen.findByText(/account created\. check your email/i)).toBeInTheDocument();
  });


  it('triggers forgot-password reset for parent sign-in mode', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/login?flow=parent']}>
        <Login />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText(/email address/i), 'parent@example.com');
    await user.click(screen.getByRole('button', { name: /forgot password\?/i }));

    expect(resetPasswordMock).toHaveBeenCalledWith({ email: 'parent@example.com' });
    expect(await screen.findByText(/password reset instructions were sent/i)).toBeInTheDocument();
  });

  it('clears callback error when switching between sign-in and sign-up modes', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/login?flow=parent&error=auth_error']}>
        <Login />
      </MemoryRouter>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not complete sign in. Please try again.');
    await user.click(screen.getByRole('button', { name: /create a new account/i }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('respects flow from query string for district SSO messaging', async () => {
    ssoState.data = { requireSso: true, providers: ['azuread'] };
    render(
      <MemoryRouter initialEntries={['/login?flow=district']}>
        <Login />
      </MemoryRouter>
    );

    expect(await screen.findByText(/school or district/i)).toBeInTheDocument();
    expect(screen.getByText(/district sso is required/i)).toBeInTheDocument();
  });
});
