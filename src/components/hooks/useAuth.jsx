import { useMemo } from "react";
import { useAuthenticationStatus, useUserData } from "@nhost/react";
import { useUserRole } from "@/hooks/useUserRole";

export function useAuth() {
  // G3 Gate: E2E Auth Bypass
  // Allows smoke tests to run against localhost without hitting real Nhost.
  const isE2EBypass = import.meta.env.VITE_E2E_BYPASS_AUTH === 'true';

  if (isE2EBypass) {
    // Read mock session injected by Playwright
    let mockUser = null;
    try {
      const stored = window.localStorage.getItem('e2e_mock_user');
      if (stored) mockUser = JSON.parse(stored);
    } catch (e) {
      /* ignore */
    }

    return {
      user: mockUser,
      activeRole: mockUser?.role || null,
      isAuthenticated: !!mockUser,
      loading: false,
      refetchUser: async () => {}
    };
  }

  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const userData = useUserData();
  const role = useUserRole();

  const user = useMemo(() => {
    if (!userData) return null;
    return {
      ...userData,
      role,
      preferred_active_role: userData?.metadata?.preferred_active_role || role,
      full_name:
        userData?.displayName ||
        userData?.metadata?.full_name ||
        userData?.email
    };
  }, [userData, role]);

  return {
    user,
    activeRole: user?.preferred_active_role || user?.role || null,
    isAuthenticated,
    loading: isLoading,
    refetchUser: async () => {}
  };
}

export default useAuth;
