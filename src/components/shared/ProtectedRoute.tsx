import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthenticationStatus } from '@nhost/react';
import { useUserRoleState } from '@/hooks/useUserRole';
import { canAll, type Action, type Role } from '@/security/permissions';
import { canAccess } from '@/config/rbac';

const E2E_SESSION_KEY = 'teachmo_e2e_session';

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

  const e2eBypass = React.useMemo(() => {
    const flag = String(import.meta.env.VITE_E2E_BYPASS_AUTH || '').toLowerCase() === 'true';
    if (!flag) return false;
    const isTestMode = String(import.meta.env.MODE || '').toLowerCase() === 'test';
    const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    return isTestMode || isLocalhost;
  }, []);

  const e2eSession = React.useMemo(() => {
    if (!e2eBypass) return null;
    try {
      const raw = window.localStorage.getItem(E2E_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed as { role?: string; accessToken?: string; userId?: string };
    } catch {
      return null;
    }
  }, [e2eBypass]);

  const hasValidE2ESession = !!(e2eSession?.accessToken && e2eSession?.role);
  const useE2EAuth = e2eBypass && hasValidE2ESession;

  const effectiveIsAuthenticated = useE2EAuth ? true : isAuthenticated;
  const effectiveRole = (useE2EAuth ? (e2eSession?.role ?? null) : role) as Role | null;
  const effectiveNeedsOnboarding = useE2EAuth ? false : needsOnboarding;
  const effectiveLoading = useE2EAuth ? false : isLoading || roleLoading;
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

  if (effectiveLoading) {
    return (
      loadingFallback || (
        <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
      )
    );
  }

  if (!effectiveIsAuthenticated && mustBeAuthed) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  // G1: force onboarding for authenticated users missing required identity fields.
  const onboardingAllowedPaths = new Set(['/onboarding', '/auth/callback', '/logout']);
  if (effectiveIsAuthenticated && effectiveNeedsOnboarding && !onboardingAllowedPaths.has(location.pathname)) {
    return <Navigate to="/onboarding" replace state={{ from: location.pathname }} />;
  }

  if (roleWhitelist.length && !canAccess({ role: effectiveRole, allowedRoles: roleWhitelist, requiredScopes })) {
    return <Navigate to={unauthorizedTo} replace />;
  }

  if (requiredScopes?.length && !canAccess({ role: effectiveRole, requiredScopes })) {
    return <Navigate to={unauthorizedTo} replace />;
  }

  if (requiredActionsList.length && !canAll(effectiveRole, requiredActionsList)) {
    return <Navigate to={unauthorizedTo} replace />;
  }

  return <>{children}</>;
}

export { ProtectedRoute };
