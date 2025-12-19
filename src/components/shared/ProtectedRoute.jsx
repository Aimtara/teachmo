import PropTypes from "prop-types";
import { Navigate } from "react-router-dom";
import { useAuthenticationStatus } from "@nhost/react";
import { getDefaultPathForRole, useUserRole } from "@/hooks/useUserRole";

export default function ProtectedRoute({ children, allowedRoles, redirectTo = "/" }) {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const role = useUserRole();

  if (isLoading) {
    return <p className="p-6 text-gray-600">Checking your session…</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={getDefaultPathForRole(role)} replace />;
  }

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
  redirectTo: PropTypes.string
};
