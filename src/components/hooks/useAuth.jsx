import { useMemo } from "react";
import { useAuthenticationStatus, useUserData } from "@nhost/react";
import { useUserRole } from "@/hooks/useUserRole";

export function useAuth() {
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
