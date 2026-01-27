import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthenticationStatus } from '@nhost/react';
import Landing from './Landing.jsx';
import { getDefaultPathForRole, useUserRole } from '@/hooks/useUserRole';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import FeatureGate from '@/components/shared/FeatureGate';
import { TelemetryBootstrap } from '@/observability/TelemetryBootstrap';
import { ROUTE_CONFIG } from '@/config/routes';

const FeatureDisabled = lazy(() => import('./FeatureDisabled.jsx'));
const Unauthorized = lazy(() => import('./Unauthorized.jsx'));
const NotFound = lazy(() => import('./NotFound.jsx'));

function RoleRedirect() {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const role = useUserRole();

  if (isLoading) return <p className="p-6 text-gray-600">Checking your session…</p>;
  if (!isAuthenticated) return <Landing />;

  return <Navigate to={getDefaultPathForRole(role)} replace />;
}

export default function Pages() {
  const renderRouteElement = (route) => {
    const element = <route.Component />;
    const gated = route.feature ? <FeatureGate feature={route.feature}>{element}</FeatureGate> : element;

    if (route.requiresAuth === false || route.isPublic) {
      return (
        <Suspense fallback={route.fallback || <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>}>
          {gated}
        </Suspense>
      );
    }

    return (
      <Suspense fallback={route.fallback || <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>}>
        <ProtectedRoute
          allowedRoles={route.allowedRoles}
          requiredScopes={route.requiredScopes}
          requiredActions={route.requiredActions}
          requiresAuth={route.requiresAuth}
        >
          {gated}
        </ProtectedRoute>
      </Suspense>
    );
  };

  return (
    <BrowserRouter>
      <TelemetryBootstrap />
      <Suspense fallback={<div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>}>
        <Routes>
          <Route index element={<RoleRedirect />} />
          {ROUTE_CONFIG.filter((route) => route.path !== '/').map((route) => (
            <Route key={route.name} path={route.path} element={renderRouteElement(route)} />
          ))}
          <Route path="/feature-disabled" element={<FeatureDisabled />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
