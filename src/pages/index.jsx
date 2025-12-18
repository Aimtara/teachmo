import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuthenticationStatus } from '@nhost/react';
import LazyPageWrapper from '@/components/shared/LazyPageWrapper';
import { useAuthorization } from '@/hooks/useUserRole';
import { ROUTE_CONFIG } from '@/config/routes';
import FeatureGate from '@/components/shared/FeatureGate';
import RequirePermission from '@/components/security/RequirePermission';
import Landing from './Landing.jsx';

const AcceptInvite = lazy(() => import('./AcceptInvite.jsx'));
const AdminDirectoryImport = lazy(() => import('./AdminDirectoryImport.jsx'));
const AdminDirectorySources = lazy(() => import('./AdminDirectorySources.jsx'));
const AdminDirectoryImportPreview = lazy(() => import('./AdminDirectoryImportPreview.jsx'));
const Notifications = lazy(() => import('./Notifications.jsx'));

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
    {
      key: 'accept-invite',
      path: '/accept-invite',
      Component: AcceptInvite
    },
    {
      key: 'admin-directory-import',
      path: '/admin/directory-import',
      Component: AdminDirectoryImport,
      allowedRoles: ['school_admin', 'district_admin', 'system_admin'],
      requiresAuth: true
    },
    {
      key: 'admin-directory-import-preview',
      path: '/admin/directory-import/preview/:previewId',
      Component: AdminDirectoryImportPreview,
      allowedRoles: ['school_admin', 'district_admin', 'system_admin'],
      requiresAuth: true
    },
    {
      key: 'admin-directory-sources',
      path: '/admin/directory-sources',
      Component: AdminDirectorySources,
      allowedRoles: ['school_admin', 'district_admin', 'system_admin', 'admin'],
      requiresAuth: true
    },
    {
      key: 'notifications',
      path: '/notifications',
      Component: Notifications,
      allowedRoles: ['parent', 'teacher', 'school_admin', 'district_admin', 'system_admin', 'admin'],
      requiresAuth: true
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
          {routeConfig.map(
            ({
              key,
              index,
              path,
              Component,
              element,
              allowedRoles,
              requiresAuth,
              requiredScopes,
              feature,
              fallback,
              wrap = true
            }) => {
              const content = Component ? <Component /> : element;
              const wrappedContent = wrap ? withLazyWrapper(content, fallback) : content;
              const gatedContent = feature ? (
                <FeatureGate feature={feature}>
                  {wrappedContent}
                </FeatureGate>
              ) : (
                wrappedContent
              );

              if (path === '/messages') {
                return (
                  <Route
                    key={key || path}
                    path={path}
                    element={(
                      <ProtectedRoute
                        allowedRoles={['parent', 'teacher', 'school_admin', 'district_admin', 'admin']}
                        requiredScopes={requiredScopes}
                      >
                        <RequirePermission action="messages:read">
                          <FeatureGate feature="MESSAGING">
                            {wrappedContent}
                          </FeatureGate>
                        </RequirePermission>
                      </ProtectedRoute>
                    )}
                  />
                );
              }

              if (path === '/admin/directory-import' || path === '/admin/directory-import/preview/:previewId') {
                return (
                  <Route
                    key={key || path}
                    path={path}
                    element={(
                      <ProtectedRoute
                        allowedRoles={allowedRoles || ['school_admin', 'district_admin', 'system_admin']}
                        requiredScopes={requiredScopes}
                      >
                        <RequirePermission action="directory:manage">
                          {wrappedContent}
                        </RequirePermission>
                      </ProtectedRoute>
                    )}
                  />
                );
              }

              if (path === '/admin/directory-sources') {
                return (
                  <Route
                    key={key || path}
                    path={path}
                    element={(
                      <ProtectedRoute
                        allowedRoles={allowedRoles || ['school_admin', 'district_admin', 'system_admin', 'admin']}
                        requiredScopes={requiredScopes}
                      >
                        <RequirePermission action="directory:manage">
                          {wrappedContent}
                        </RequirePermission>
                      </ProtectedRoute>
                    )}
                  />
                );
              }

              const hasRoleRequirement = Array.isArray(allowedRoles) && allowedRoles.length > 0;
              const hasScopeRequirement = Array.isArray(requiredScopes) && requiredScopes.length > 0;
              const shouldProtect = requiresAuth || hasRoleRequirement || hasScopeRequirement;
              const protectedContent = shouldProtect ? (
                <ProtectedRoute allowedRoles={allowedRoles} requiredScopes={requiredScopes}>
                  {gatedContent}
                </ProtectedRoute>
              ) : (
                gatedContent
              );

              return (
                <Route
                  key={key || path}
                  {...(index ? { index: true } : { path })}
                  element={protectedContent}
                />
              );
            }
          )}
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
