import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLogout } from '@/hooks/useLogout';
import { ONBOARDING_FLOW_KEY } from '@/lib/onboardingFlow';

const navigateMock = vi.fn();
const signOutMock = vi.fn().mockResolvedValue(undefined);

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@nhost/react', () => ({
  useSignOut: () => ({ signOut: signOutMock }),
}));

function Harness() {
  const logout = useLogout();
  return <button onClick={() => logout()}>logout</button>;
}

describe('useLogout', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    signOutMock.mockClear();
    window.sessionStorage.setItem(ONBOARDING_FLOW_KEY, 'parent');
    window.sessionStorage.setItem('teachmo:active-role', 'teacher');
    window.sessionStorage.setItem('onboarding_intent', 'parent');
  });

  it('signs out, clears cache/session artifacts, and navigates to login', async () => {
    const queryClient = new QueryClient();
    const clearSpy = vi.spyOn(queryClient, 'clear');
    const cancelSpy = vi.spyOn(queryClient, 'cancelQueries');

    render(
      <QueryClientProvider client={queryClient}>
        <Harness />
      </QueryClientProvider>
    );

    await userEvent.click(screen.getByRole('button', { name: 'logout' }));

    await waitFor(() => {
      expect(cancelSpy).toHaveBeenCalled();
      expect(signOutMock).toHaveBeenCalled();
      expect(clearSpy).toHaveBeenCalled();
      expect(window.sessionStorage.getItem(ONBOARDING_FLOW_KEY)).toBeNull();
      expect(window.sessionStorage.getItem('teachmo:active-role')).toBeNull();
      expect(window.sessionStorage.getItem('onboarding_intent')).toBeNull();
      expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true });
    });
  });
});
