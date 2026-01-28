import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthenticationStatus } from '@nhost/react';
import { useUserRoleState } from '@/hooks/useUserRole';
import { canAll, type Action, type Role } from '@/security/permissions';
import { canAccess } from '@/config/rbac';

type Props = {
  children: React.ReactNode;
  requiredRole?: string | string[];
  allowedRoles?: string[];
  /**
   * Fine-grained permission gates. If provided, ALL actions must be allowed.
   * This is additive with requiredRole / allowedRoles.
   */
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
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const location = useLocation();
  const { role, loading: roleLoading, needsOnboarding } = useUserRoleState();

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

  if (isLoading || roleLoading) {
    return (
      loadingFallback || (
        <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
      )
    );
  }

  if (!isAuthenticated && mustBeAuthed) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  // G1: force onboarding for authenticated users missing required identity fields.
  if (
    isAuthenticated &&
    needsOnboarding &&
    location.pathname !== '/onboarding' &&
    location.pathname !== '/auth/callback'
  ) {
    return <Navigate to="/onboarding" replace state={{ from: location.pathname }} />;
  }

  if (roleWhitelist.length && !canAccess({ role, allowedRoles: roleWhitelist, requiredScopes })) {
    return <Navigate to={unauthorizedTo} replace />;
  }

  if (requiredScopes?.length && !canAccess({ role, requiredScopes })) {
    return <Navigate to={unauthorizedTo} replace />;
  }

  if (requiredActionsList.length && !canAll(role as Role | null, requiredActionsList)) {
    return <Navigate to={unauthorizedTo} replace />;
  }

  return <>{children}</>;
}

export { ProtectedRoute };
