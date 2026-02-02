import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthenticationStatus } from '@nhost/react';

import { ROUTE_CONFIG } from '@/config/routes.jsx';
import { getDefaultPathForRole, useUserRoleState } from '@/hooks/useUserRole';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import FeatureGate from '@/components/shared/FeatureGate';
import Landing from './Landing.jsx';
import { TelemetryBootstrap } from '@/observability/TelemetryBootstrap';
import Healthz from './Healthz.tsx';
import Maintenance from './Maintenance.tsx';

const MAINTENANCE_MODE = String(import.meta.env.VITE_MAINTENANCE_MODE ?? '').toLowerCase() === 'true';

function RoleRedirect() {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const { role, loading: roleLoading, needsOnboarding } = useUserRoleState();

  if (isLoading || roleLoading)
    return <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!isAuthenticated) return <Landing />;

  if (needsOnboarding) return <Navigate to="/onboarding" replace />;

  return <Navigate to={getDefaultPathForRole(role)} replace />;
}

const DEFAULT_FALLBACK = (
  <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
);

function buildRouteElement(route) {
  const Component = route.Component;
  let element = (
    <Suspense fallback={route.fallback ?? DEFAULT_FALLBACK}>
      <Component />
    </Suspense>
  );
  const isPartnerRoute = Boolean(route.path?.startsWith('/partners') || route.path === '/partner');

  if (route.feature) {
    element = (
      <FeatureGate feature={route.feature} fallback={route.featureFallback}>
        {element}
      </FeatureGate>
    );
  }

  const requireAuth = route.requiresAuth ?? !route.isPublic;
  const needsAuthWrapper = requireAuth || (route.allowedRoles?.length ?? 0) > 0 || (route.requiredScopes?.length ?? 0) > 0;

  if (needsAuthWrapper) {
    element = (
      <ProtectedRoute requireAuth={requireAuth} allowedRoles={route.allowedRoles} requiredScopes={route.requiredScopes}>
        {element}
      </ProtectedRoute>
    );
  }

  if (isPartnerRoute) {
    element = <div className="theme-partner font-sans">{element}</div>;
  }

  return element;
}

export default function Pages() {
  // Emergency kill switch: keep /healthz accessible so ops can verify deploys.
  if (MAINTENANCE_MODE) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/healthz" element={<Healthz />} />
          <Route path="*" element={<Maintenance />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <TelemetryBootstrap />
      <Routes>
        {/* Root: smart redirect (auth -> role home, unauth -> marketing landing) */}
        <Route path="/" element={<RoleRedirect />} />

        {/* Public health endpoint */}
        <Route path="/healthz" element={<Healthz />} />

        {/* Config-driven routes */}
        {ROUTE_CONFIG.filter((r) => r.path !== '/').map((route) => (
          <Route key={route.name} path={route.path} element={buildRouteElement(route)} />
        ))}

        {/* Back-compat aliases (older URLs) */}
        <Route path="/teacher/classes" element={<Navigate to="/teacher-classes" replace />} />
        <Route path="/teacher/assignments" element={<Navigate to="/teacher-assignments" replace />} />
        <Route path="/teacher/messages" element={<Navigate to="/teacher-messages" replace />} />

        {/* Default: send folks somewhere sensible */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
