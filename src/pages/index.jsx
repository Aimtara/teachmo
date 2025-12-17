import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuthenticationStatus } from '@nhost/react';
import LazyPageWrapper from '@/components/shared/LazyPageWrapper';
import { useAuthorization } from '@/hooks/useUserRole';
import { ROUTE_CONFIG } from '@/config/routes';
import Landing from './Landing.jsx';

function ProtectedRoute({ children, allowedRoles, requiredScopes }) {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const { defaultPath, canAccess } = useAuthorization();

  if (isLoading) return <p className="p-6 text-gray-600">Checking your session…</p>;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!canAccess({ allowedRoles, requiredScopes })) return <Navigate to={defaultPath} replace />;

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
  requiredScopes: PropTypes.arrayOf(PropTypes.string)
};

function RoleRedirect() {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const { defaultPath } = useAuthorization();

  if (isLoading) return <p className="p-6 text-gray-600">Checking your session…</p>;
  if (!isAuthenticated) return <Landing />;

  return <Navigate to={defaultPath} replace />;
}

export default function Pages() {
  const defaultFallback = <p className="p-6 text-gray-600">Loading page...</p>;
  const withLazyWrapper = (children, fallback = defaultFallback) => (
    <LazyPageWrapper fallback={fallback}>{children}</LazyPageWrapper>
  );

  const routeConfig = [
    {
      key: 'index',
      index: true,
      element: <RoleRedirect />
    },
    ...ROUTE_CONFIG,
    {
      key: 'not-found',
      path: '*',
      element: <Navigate to="/" replace />,
      wrap: false
    }
  ];

  return (
    <BrowserRouter>
      <Suspense fallback={defaultFallback}>
        <Routes>
          {routeConfig.map(({
            key,
            index,
            path,
            Component,
            element,
            allowedRoles,
            requiresAuth,
            requiredScopes,
            fallback,
            wrap = true
          }) => {
            const content = Component ? <Component /> : element;
            const wrappedContent = wrap ? withLazyWrapper(content, fallback) : content;
            const hasRoleRequirement = Array.isArray(allowedRoles) && allowedRoles.length > 0;
            const hasScopeRequirement = Array.isArray(requiredScopes) && requiredScopes.length > 0;
            const shouldProtect = requiresAuth || hasRoleRequirement || hasScopeRequirement;
            const protectedContent = shouldProtect ? (
              <ProtectedRoute allowedRoles={allowedRoles} requiredScopes={requiredScopes}>
                {wrappedContent}
              </ProtectedRoute>
            ) : (
              wrappedContent
            );

            return (
              <Route
                key={key || path}
                {...(index ? { index: true } : { path })}
                element={protectedContent}
              />
            );
          })}
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
