import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthenticationStatus } from '@nhost/react';
import { useUserRoleState } from '@/hooks/useUserRole';
import { canAll, type Action, type Role } from '@/security/permissions';
import { canAccess } from '@/config/rbac';
import { getSavedOnboardingFlowPreference, resolveOnboardingPath } from '@/lib/onboardingFlow';

let allowDevAuthBypassForTests = true;

export function __setAllowDevAuthBypassForTests(value: boolean) {
  allowDevAuthBypassForTests = value;
}

type Props = {
  children: React.ReactNode;
  requiredRole?: string | string[];
  allowedRoles?: string[];
  requiredActions?: Action | Action[];
  requiredScopes?: string[];
  redirectTo?: string;
  unauthorizedTo?: string;
  loadingFallback?: React.ReactNode;
  requireAuth?: boolean;
  requiresAuth?: boolean;
};

export default function ProtectedRoute({
  children,
  requiredRole,
  allowedRoles,
  requiredActions,
  requiredScopes,
  redirectTo = '/login',
  unauthorizedTo = '/unauthorized',
  loadingFallback,
  requireAuth,
  requiresAuth,
}: Props) {
  const location = useLocation();

  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const { role, roleSource, loading: roleLoading, needsOnboarding } = useUserRoleState();

  const roleWhitelist = React.useMemo(() => {
    if (allowedRoles?.length) return allowedRoles;
    if (!requiredRole) return [];
    return Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  }, [allowedRoles, requiredRole]);

  const requiredActionsList = React.useMemo(() => {
    if (!requiredActions) return [];
    return Array.isArray(requiredActions) ? requiredActions : [requiredActions];
  }, [requiredActions]);

  const mustBeAuthed = React.useMemo(
    () => requireAuth ?? requiresAuth ?? true,
    [requireAuth, requiresAuth]
  );


  // 🚀 GOD MODE DEV SWITCH
  // Keep hook order stable by evaluating this after hooks are declared.
  if (
    import.meta.env.DEV &&
    allowDevAuthBypassForTests &&
    import.meta.env.VITE_DISABLE_DEV_ROUTE_BYPASS !== 'true'
  ) {
    return <>{children}</>;
  }

  if (isLoading || roleLoading) {
    return loadingFallback || <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  if (!isAuthenticated && mustBeAuthed) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  // G1: force onboarding for authenticated users missing required identity fields.
  const onboardingAllowedPaths = new Set([
    '/onboarding',
    '/onboarding/parent',
    '/onboarding/teacher',
    '/auth/callback',
    '/logout',
  ]);
  if (isAuthenticated && needsOnboarding && !onboardingAllowedPaths.has(location.pathname)) {
    return (
      <Navigate
        to={resolveOnboardingPath({
          role: roleSource === 'unknown' ? null : role,
          preferredFlow: getSavedOnboardingFlowPreference(),
        })}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (roleWhitelist.length && !canAccess({ role: role as Role | null, allowedRoles: roleWhitelist, requiredScopes })) {
    return <Navigate to={unauthorizedTo} replace />;
  }

  if (requiredScopes?.length && !canAccess({ role: role as Role | null, requiredScopes })) {
    return <Navigate to={unauthorizedTo} replace />;
  }

  if (requiredActionsList.length && !canAll(role as Role | null, requiredActionsList)) {
    return <Navigate to={unauthorizedTo} replace />;
  }

  return <>{children}</>;
}

export { ProtectedRoute };
