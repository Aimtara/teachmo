import { useMemo } from 'react';
import { useAuthenticationStatus, useUserData } from '@nhost/react';
import { assertNoProductionBypass, envFlag } from '@/config/env';
import { useUserRole } from '@/hooks/useUserRole';

type E2EMockUser = {
  role?: string | null;
  preferred_active_role?: string | null;
  [key: string]: unknown;
};

type AuthUser = {
  role?: string | null;
  preferred_active_role?: string | null;
  displayName?: string | null;
  email?: string | null;
  metadata?: {
    preferred_active_role?: string | null;
    full_name?: string | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export function useAuth() {
  assertNoProductionBypass();
  const isE2EBypass = envFlag('VITE_E2E_BYPASS_AUTH');
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const userData = useUserData() as AuthUser | null;
  const role = useUserRole();

  const mockUser = useMemo<E2EMockUser | null>(() => {
    if (!isE2EBypass) return null;

    try {
      const stored = window.localStorage.getItem('e2e_mock_user');
      return stored ? (JSON.parse(stored) as E2EMockUser) : null;
    } catch {
      return null;
    }
  }, [isE2EBypass]);

  const user = useMemo(() => {
    if (isE2EBypass) {
      return mockUser;
    }

    if (!userData) {
      return null;
    }

    return {
      ...userData,
      role,
      preferred_active_role: userData.metadata?.preferred_active_role ?? role,
      full_name: userData.displayName ?? userData.metadata?.full_name ?? userData.email,
    };
  }, [isE2EBypass, mockUser, role, userData]);

  return {
    user,
    activeRole: user?.preferred_active_role ?? user?.role ?? null,
    isAuthenticated: isE2EBypass ? Boolean(mockUser) : isAuthenticated,
    loading: isE2EBypass ? false : isLoading,
    refetchUser: async () => {},
  };
}

export default useAuth;
