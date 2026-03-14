import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from '@/pages/Login';

vi.mock('@nhost/react', () => ({
  useAuthenticationStatus: () => ({ isAuthenticated: false }),
}));

const ssoState = { data: { requireSso: false, providers: [] } };

vi.mock('@/hooks/useTenantSSOSettings', () => ({
  default: () => ssoState,
}));

vi.mock('@/lib/nhostClient', () => ({
  nhost: {
    auth: {
      signIn: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ session: null, error: null }),
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
  });

  it('shows a session-expired message when callback returns with error=session_expired', async () => {
    render(
      <MemoryRouter initialEntries={['/login?flow=district&error=session_expired']}>
        <Login />
      </MemoryRouter>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Your session expired. Please sign in again.');
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
