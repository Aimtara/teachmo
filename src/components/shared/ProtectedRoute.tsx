import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthenticationStatus } from '@nhost/react';
import { useUserRole } from '@/hooks/useUserRole';
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
  redirectTo = '/login',
  unauthorizedTo = '/unauthorized',
  loadingFallback,
  requireAuth,
  requiresAuth,
}: Props) {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const location = useLocation();
  const role = useUserRole();

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

  if (isLoading) {
    return (
      loadingFallback || (
        <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
      )
    );
  }

  if (!isAuthenticated && mustBeAuthed) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  if (roleWhitelist.length && !canAccess({ role, allowedRoles: roleWhitelist })) {
    return <Navigate to={unauthorizedTo} replace />;
  }

  if (requiredActionsList.length && !canAll(role as Role | null, requiredActionsList)) {
    return <Navigate to={unauthorizedTo} replace />;
  }

  return <>{children}</>;
}
