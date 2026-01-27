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

function resolveNhostRole(user: ReturnType<typeof useUserData>) {
  if (!user) return undefined;

  const metadataRole =
    typeof user?.metadata?.preferred_active_role === 'string'
      ? user.metadata.preferred_active_role
      : typeof user?.metadata?.role === 'string'
        ? user.metadata.role
        : undefined;

  const claimRole =
    metadataRole ||
    (Array.isArray(user?.roles) && typeof user.roles[0] === 'string' ? user.roles[0] : undefined) ||
    (typeof user?.defaultRole === 'string' ? user.defaultRole : undefined);

  return normalizeRole(claimRole);
}

export function useUserRole(): AppRole {
  const user = useUserData();

  return useMemo(() => resolveNhostRole(user), [user]);
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
