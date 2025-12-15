import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Simple route guard that redirects when the current user lacks access.
 * Hooks must remain at the top level to satisfy the Rules of Hooks.
 */
const RouteGuard = ({ hasAccess, redirectTo = '/', children }) => {
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!hasAccess) {
      navigate(redirectTo, { replace: true });
    }
  }, [hasAccess, navigate, redirectTo]);

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
};

export default RouteGuard;
