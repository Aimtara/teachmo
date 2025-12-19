import React from "react";
import PropTypes from "prop-types";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthenticationStatus } from "@nhost/react";
import { useAuthorization } from "@/hooks/useUserRole";
import { LoadingSpinner } from "@/components/shared/LoadingStates";

export default function ProtectedRoute({
  children,
  allowedRoles,
  requiredScopes,
  fallbackPath = "/",
  loadingLabel = "Loading..."
}) {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const { defaultPath, canAccess } = useAuthorization();

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <LoadingSpinner message={loadingLabel} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  if (!canAccess({ allowedRoles, requiredScopes })) {
    return <Navigate to={defaultPath || fallbackPath} replace />;
  }

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
  requiredScopes: PropTypes.arrayOf(PropTypes.string),
  fallbackPath: PropTypes.string,
  loadingLabel: PropTypes.string
};
