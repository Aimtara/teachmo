import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthGuard } from '@/components/layout/AuthGuard';

const authState = {
  isLoading: false,
  isAuthenticated: false,
  user: null,
};

vi.mock('@nhost/react', () => ({
  useAuthenticationStatus: () => ({
    isLoading: authState.isLoading,
    isAuthenticated: authState.isAuthenticated,
  }),
  useUserData: () => authState.user,
}));

vi.mock('@/hooks/useTenantFeatureFlags', () => ({
  useTenantFeatureFlags: () => ({ data: {} }),
}));

function Probe() {
  const { status, error } = useAuthGuard();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="error">{error?.message ?? ''}</span>
    </div>
  );
}

describe('useAuthGuard', () => {
  beforeEach(() => {
    authState.isLoading = false;
    authState.isAuthenticated = false;
    authState.user = null;
  });

  it('returns authenticated when auth session and user are both hydrated', () => {
    authState.isAuthenticated = true;
    authState.user = { id: 'u1' };

    render(<Probe />);

    expect(screen.getByTestId('status').textContent).toBe('authenticated');
  });

  it('transitions to error status when authenticated state persists without user hydration', async () => {
    vi.useFakeTimers();
    authState.isAuthenticated = true;
    authState.user = null;

    render(<Probe />);

    expect(screen.getByTestId('status').textContent).toBe('loading');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    expect(screen.getByTestId('status').textContent).toBe('unauthorized');
    expect(screen.getByTestId('error').textContent).toContain('Please sign in again');

    vi.useRealTimers();
  });
});
