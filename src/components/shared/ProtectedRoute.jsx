import PropTypes from "prop-types";
import { Navigate } from "react-router-dom";
import { useAuthenticationStatus } from "@nhost/react";
import { getDefaultPathForRole, useAuthorization } from "@/hooks/useUserRole";

/**
 * ProtectedRoute - GitHub migration-friendly guard
 *
 * Supports both GitHub and Base44 prop shapes:
 * - allowedRoles?: string[]
 * - requiredScopes?: string[]
 * - requireAuth?: boolean (Base44)
 */
export default function ProtectedRoute({
  children,
  allowedRoles,
  requiredScopes,
  requireAuth = true,
  fallbackPath = "/"
}) {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const { role, defaultPath, canAccess } = useAuthorization();
  const hasAccess = canAccess({ allowedRoles, requiredScopes });

  if (!requireAuth) return children;
  if (isLoading) return <p className="p-6 text-gray-600">Checking your session…</p>;
  if (!isAuthenticated) return <Navigate to={fallbackPath} replace />;
  if (!hasAccess) return <Navigate to={defaultPath || getDefaultPathForRole(role)} replace />;

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
  requiredScopes: PropTypes.arrayOf(PropTypes.string),
  requireAuth: PropTypes.bool,
  fallbackPath: PropTypes.string
};
