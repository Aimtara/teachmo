import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuthenticationStatus, useUserData, useUserId } from '@nhost/react';
import { useQueryClient } from '@tanstack/react-query';
import {
  canAccess,
  getDefaultPathForRole,
  getEffectiveScopes,
  normalizeRole,
  type AccessCheck,
  type AppRole
} from '@/config/rbac';
import { useTenantScope } from '@/hooks/useTenantScope';
import { reconcileProfileRole } from '@/domains/auth';
import { getSavedActiveRole } from '@/lib/activeRole';

function resolveNhostRole(user: ReturnType<typeof useUserData>) {
  if (!user) return undefined;

  const candidateRoles = [
    getSavedActiveRole(),
    typeof user?.metadata?.preferred_active_role === 'string' ? user.metadata.preferred_active_role : null,
    typeof user?.metadata?.role === 'string' ? user.metadata.role : null,
    ...(Array.isArray(user?.roles) ? user.roles : []),
    typeof user?.defaultRole === 'string' ? user.defaultRole : null,
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);

  if (!candidateRoles.length) return normalizeRole(undefined);

  const normalizedAllowedRoles = new Set(
    [
      ...(Array.isArray(user?.roles) ? user.roles : []),
      typeof user?.defaultRole === 'string' ? user.defaultRole : null,
    ]
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .map((value) => normalizeRole(value))
  );

  for (const role of candidateRoles) {
    const normalized = normalizeRole(role);
    if (!normalizedAllowedRoles.size || normalizedAllowedRoles.has(normalized)) {
      return normalized;
    }
  }

  return normalizeRole(candidateRoles[0]);
}

export type UserRoleSource = 'jwt' | 'profile' | 'unknown';

export type UserRoleState = {
  role: AppRole;
  loading: boolean;
  /** True when an authenticated user is missing required identity fields (ex: full name). */
  needsOnboarding: boolean;
  roleSource: UserRoleSource;
  tenantScope: ReturnType<typeof useTenantScope>['data'] | null;
};

/**
 * G1: Deterministic role + onboarding readiness.
 *
 * Rules:
 * - JWT role drives access & routing (source of truth for Hasura permissions anyway).
 * - `profiles.app_role` is reconciled to match JWT role when possible so the UI stays consistent.
 * - onboarding is required when `full_name` is missing.
 */
export function useUserRoleState(): UserRoleState {
  const { isAuthenticated, isLoading: authLoading } = useAuthenticationStatus();
  const user = useUserData();
  const userId = useUserId();
  const tenant = useTenantScope();
  const queryClient = useQueryClient();
  const reconciledRef = useRef(false);

  const jwtRole = useMemo(() => resolveNhostRole(user), [user]);
  const profileRole = useMemo(() => normalizeRole(tenant.data?.role ?? null), [tenant.data?.role]);
  const role = useMemo(() => normalizeRole(jwtRole ?? profileRole), [jwtRole, profileRole]);

  const roleSource: UserRoleSource = useMemo(() => {
    if (jwtRole) return 'jwt';
    if (tenant.data?.role) return 'profile';
    return 'unknown';
  }, [jwtRole, tenant.data?.role]);

  const loading = authLoading || (isAuthenticated && tenant.isLoading);
  const canEvaluateOnboarding = isAuthenticated && !loading && tenant.isSuccess;
  const needsOnboarding = Boolean(
    canEvaluateOnboarding && (!tenant.data?.profileId || !tenant.data?.fullName)
  );

  // Best-effort: reconcile DB role to JWT role so the UI has a stable signal.
  useEffect(() => {
    if (!isAuthenticated) {
      reconciledRef.current = false;
      return;
    }
    if (!userId) return;
    if (loading) return;
    if (reconciledRef.current) return;

    const jwtNormalized = normalizeRole(jwtRole ?? null);
    const dbNormalized = normalizeRole(tenant.data?.role ?? null);
    if (jwtRole && tenant.data && jwtNormalized !== dbNormalized) {
      reconciledRef.current = true;
      reconcileProfileRole(userId, jwtNormalized)
        .then(() => queryClient.invalidateQueries({ queryKey: ['tenant-scope', userId] }))
        .catch(() => {
          // ignore; permissions may prevent this for some roles
        });
    } else {
      reconciledRef.current = true;
    }
  }, [isAuthenticated, userId, loading, jwtRole, tenant.data, queryClient]);

  return {
    role,
    loading,
    needsOnboarding,
    roleSource,
    tenantScope: tenant.data ?? null
  };
}

export function useUserRole(): AppRole {
  // Back-compat: callers expect a plain role.
  const { role } = useUserRoleState();
  return role;
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
