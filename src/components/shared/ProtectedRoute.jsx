import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthenticationStatus, useUserData } from '@nhost/react';
import { getDefaultPathForRole, getEffectiveScopes, normalizeRole } from '@/config/rbac';

export default function ProtectedRoute({
  children,
  allowedRoles,
  requiredScopes,
  requireAuth,
  requiresAuth,
  redirectTo = '/login',
  fallback
}) {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const user = useUserData();
  const location = useLocation();

  const role = normalizeRole(user?.metadata?.role ?? user?.defaultRole);
  const scopes = getEffectiveScopes(role);
  const mustAuth = requireAuth ?? requiresAuth ?? Boolean(allowedRoles?.length || requiredScopes?.length);
  const defaultRedirect = getDefaultPathForRole(role) || redirectTo;

  if (isLoading) {
    return fallback || <p className="p-6 text-gray-600">Checking your session…</p>;
  }

  if (mustAuth && !isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles?.length && role && !allowedRoles.includes(role)) {
    return <Navigate to={defaultRedirect} replace />;
  }

  if (requiredScopes?.length) {
    const hasRequiredScopes = requiredScopes.every((scope) => scopes.includes(scope));
    if (!hasRequiredScopes) {
      return <Navigate to={defaultRedirect} replace />;
    }
  }

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
  requiredScopes: PropTypes.arrayOf(PropTypes.string),
  requireAuth: PropTypes.bool,
  requiresAuth: PropTypes.bool,
  redirectTo: PropTypes.string,
  fallback: PropTypes.node
};
