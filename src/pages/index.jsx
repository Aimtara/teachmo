import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuthenticationStatus } from '@nhost/react';
import LazyPageWrapper from '@/components/shared/LazyPageWrapper';
import { getDefaultPathForRole, useUserRole } from '@/hooks/useUserRole';

const Dashboard = lazy(() => import('./Dashboard.jsx'));
const TeacherDashboard = lazy(() => import('./TeacherDashboard.jsx'));
const AdminAnalytics = lazy(() => import('./AdminAnalytics.jsx'));
const AdminDashboard = lazy(() => import('./AdminDashboard.jsx'));
const PartnerPortal = lazy(() => import('./PartnerPortal.jsx'));
const PartnerSubmissions = lazy(() => import('./PartnerSubmissions.jsx'));
const PartnerTraining = lazy(() => import('./PartnerTraining.jsx'));
const PartnerIncentives = lazy(() => import('./PartnerIncentives.jsx'));
const PartnerDashboard = lazy(() => import('./PartnerDashboard.jsx'));
const ParentDashboard = lazy(() => import('./ParentDashboard.jsx'));
const Landing = lazy(() => import('./Landing.jsx'));
const Onboarding = lazy(() => import('./Onboarding.jsx'));
const AuthCallback = lazy(() => import('./AuthCallback.jsx'));
const ParentOnboardingPage = lazy(() => import('./onboarding/parent'));
const TeacherOnboardingPage = lazy(() => import('./onboarding/teacher'));

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const role = useUserRole();

  if (isLoading) return <p className="p-6 text-gray-600">Checking your session…</p>;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to={getDefaultPathForRole(role)} replace />;

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string)
};

function RoleRedirect() {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const role = useUserRole();

  if (isLoading) return <p className="p-6 text-gray-600">Checking your session…</p>;
  if (!isAuthenticated) return <Landing />;

  return <Navigate to={getDefaultPathForRole(role)} replace />;
}

export default function Pages() {
  const defaultFallback = <p className="p-6 text-gray-600">Loading page...</p>;
  const withLazyWrapper = (children, fallback = defaultFallback) => (
    <LazyPageWrapper fallback={fallback}>{children}</LazyPageWrapper>
  );

  return (
    <BrowserRouter>
      <Suspense fallback={defaultFallback}>
        <Routes>
          <Route index element={withLazyWrapper(<RoleRedirect />)} />
          <Route path="/onboarding" element={withLazyWrapper(<Onboarding />)} />
          <Route path="/auth/callback" element={withLazyWrapper(<AuthCallback />)} />

          <Route
            path="/dashboard"
            element={(
              <ProtectedRoute allowedRoles={['parent', 'teacher', 'system_admin', 'school_admin', 'district_admin']}>
                {withLazyWrapper(<Dashboard />, <p className="p-6 text-gray-600">Loading dashboard...</p>)}
              </ProtectedRoute>
            )}
          />

          <Route
            path="/parent/dashboard"
            element={(
              <ProtectedRoute allowedRoles={['parent']}>
                {withLazyWrapper(<ParentDashboard />, <p className="p-6 text-gray-600">Loading parent dashboard...</p>)}
              </ProtectedRoute>
            )}
          />

          <Route
            path="/onboarding/parent"
            element={(
              <ProtectedRoute>
                {withLazyWrapper(<ParentOnboardingPage />, <p className="p-6 text-gray-600">Loading parent onboarding...</p>)}
              </ProtectedRoute>
            )}
          />
          <Route
            path="/onboarding/teacher"
            element={(
              <ProtectedRoute>
                {withLazyWrapper(<TeacherOnboardingPage />, <p className="p-6 text-gray-600">Loading teacher onboarding...</p>)}
              </ProtectedRoute>
            )}
          />
          <Route
            path="/teacher/dashboard"
            element={(
              <ProtectedRoute allowedRoles={['teacher']}>
                {withLazyWrapper(<TeacherDashboard />, <p className="p-6 text-gray-600">Loading teacher dashboard...</p>)}
              </ProtectedRoute>
            )}
          />

          <Route
            path="/partners/dashboard"
            element={(
              <ProtectedRoute allowedRoles={['partner']}>
                {withLazyWrapper(<PartnerDashboard />, <p className="p-6 text-gray-600">Loading partner dashboard...</p>)}
              </ProtectedRoute>
            )}
          />

          <Route
            path="/partners"
            element={(
              <ProtectedRoute>
                {withLazyWrapper(<PartnerPortal />, <p className="p-6 text-gray-600">Loading partner portal...</p>)}
              </ProtectedRoute>
            )}
          />
          <Route
            path="/partners/submissions"
            element={(
              <ProtectedRoute>
                {withLazyWrapper(<PartnerSubmissions />, <p className="p-6 text-gray-600">Loading partner submissions...</p>)}
              </ProtectedRoute>
            )}
          />
          <Route
            path="/partners/training"
            element={(
              <ProtectedRoute>
                {withLazyWrapper(<PartnerTraining />, <p className="p-6 text-gray-600">Loading partner training...</p>)}
              </ProtectedRoute>
            )}
          />
          <Route
            path="/partners/incentives"
            element={(
              <ProtectedRoute>
                {withLazyWrapper(<PartnerIncentives />, <p className="p-6 text-gray-600">Loading partner incentives...</p>)}
              </ProtectedRoute>
            )}
          />

          <Route
            path="/admin"
            element={(
              <ProtectedRoute allowedRoles={['system_admin', 'school_admin', 'district_admin']}>
                {withLazyWrapper(<AdminDashboard />, <p className="p-6 text-gray-600">Loading admin dashboard...</p>)}
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/analytics"
            element={(
              <ProtectedRoute allowedRoles={['system_admin', 'school_admin', 'district_admin']}>
                {withLazyWrapper(<AdminAnalytics />, <p className="p-6 text-gray-600">Loading admin analytics...</p>)}
              </ProtectedRoute>
            )}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
