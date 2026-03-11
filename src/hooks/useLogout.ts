import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignOut } from '@nhost/react';
import { useQueryClient } from '@tanstack/react-query';
import { clearSavedActiveRole } from '@/lib/activeRole';

const ONBOARDING_FLOW_KEY = 'teachmo:onboarding-flow';

/**
 * Centralized logout that clears auth session + cached tenant/user data.
 */
export function useLogout() {
  const { signOut } = useSignOut();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useCallback(async () => {
    await queryClient.cancelQueries();

    try {
      await signOut();
    } catch {
      // continue cleanup even if upstream sign-out call fails
    }

    queryClient.clear();
    clearSavedActiveRole();
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(ONBOARDING_FLOW_KEY);
    }

    navigate('/login', { replace: true });
  }, [navigate, queryClient, signOut]);
}

export default useLogout;
