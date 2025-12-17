import { useCallback, useMemo } from 'react';
import { useUserData } from '@nhost/react';
import {
  canAccess,
  getDefaultPathForRole,
  getEffectiveScopes,
  normalizeRole,
  type AccessCheck,
  type AppRole
} from '@/config/rbac';

export function useUserRole(): AppRole {
  const user = useUserData();

  return useMemo(() => normalizeRole(user?.metadata?.role ?? user?.defaultRole), [user]);
}

export function useAuthorization() {
  const role = useUserRole();
  const scopes = useMemo(() => getEffectiveScopes(role), [role]);
  const defaultPath = useMemo(() => getDefaultPathForRole(role), [role]);

  const hasScope = useCallback((scope: string) => scopes.includes(scope), [scopes]);
  const canAccessRoute = useCallback(
    (check?: AccessCheck) => canAccess({ role, ...check }),
    [role]
  );

  return {
    role,
    scopes,
    defaultPath,
    hasScope,
    canAccess: canAccessRoute
  };
}

export { getDefaultPathForRole, canAccess, getEffectiveScopes, normalizeRole as resolveAppRole };
