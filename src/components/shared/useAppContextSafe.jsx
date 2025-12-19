import { useAuth } from "@/components/hooks/useAuth";

export function useAppContextSafe() {
  const { user, activeRole, isAuthenticated, loading } = useAuth();
  return { user, activeRole, isAuthenticated, loading };
}
