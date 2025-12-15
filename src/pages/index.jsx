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

  const routeConfig = [
    {
      key: 'index',
      index: true,
      element: <RoleRedirect />
    },
    {
      path: '/onboarding',
      Component: Onboarding
    },
    {
      path: '/auth/callback',
      Component: AuthCallback
    },
    {
      path: '/dashboard',
      Component: Dashboard,
      allowedRoles: ['parent', 'teacher', 'system_admin', 'school_admin', 'district_admin'],
      fallback: <p className="p-6 text-gray-600">Loading dashboard...</p>
    },
    {
      path: '/parent/dashboard',
      Component: ParentDashboard,
      allowedRoles: ['parent'],
      fallback: <p className="p-6 text-gray-600">Loading parent dashboard...</p>
    },
    {
      path: '/onboarding/parent',
      Component: ParentOnboardingPage,
      requiresAuth: true,
      fallback: <p className="p-6 text-gray-600">Loading parent onboarding...</p>
    },
    {
      path: '/onboarding/teacher',
      Component: TeacherOnboardingPage,
      requiresAuth: true,
      fallback: <p className="p-6 text-gray-600">Loading teacher onboarding...</p>
    },
    {
      path: '/teacher/dashboard',
      Component: TeacherDashboard,
      allowedRoles: ['teacher'],
      fallback: <p className="p-6 text-gray-600">Loading teacher dashboard...</p>
    },
    {
      path: '/partners/dashboard',
      Component: PartnerDashboard,
      allowedRoles: ['partner'],
      fallback: <p className="p-6 text-gray-600">Loading partner dashboard...</p>
    },
    {
      path: '/partners',
      Component: PartnerPortal,
      requiresAuth: true,
      fallback: <p className="p-6 text-gray-600">Loading partner portal...</p>
    },
    {
      path: '/partners/submissions',
      Component: PartnerSubmissions,
      requiresAuth: true,
      fallback: <p className="p-6 text-gray-600">Loading partner submissions...</p>
    },
    {
      path: '/partners/training',
      Component: PartnerTraining,
      requiresAuth: true,
      fallback: <p className="p-6 text-gray-600">Loading partner training...</p>
    },
    {
      path: '/partners/incentives',
      Component: PartnerIncentives,
      requiresAuth: true,
      fallback: <p className="p-6 text-gray-600">Loading partner incentives...</p>
    },
    {
      path: '/admin',
      Component: AdminDashboard,
      allowedRoles: ['system_admin', 'school_admin', 'district_admin'],
      fallback: <p className="p-6 text-gray-600">Loading admin dashboard...</p>
    },
    {
      path: '/admin/analytics',
      Component: AdminAnalytics,
      allowedRoles: ['system_admin', 'school_admin', 'district_admin'],
      fallback: <p className="p-6 text-gray-600">Loading admin analytics...</p>
    },
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
            fallback,
            wrap = true
          }) => {
            const content = Component ? <Component /> : element;
            const wrappedContent = wrap ? withLazyWrapper(content, fallback) : content;
            const shouldProtect = requiresAuth || allowedRoles;
            const protectedContent = shouldProtect ? (
              <ProtectedRoute allowedRoles={allowedRoles}>{wrappedContent}</ProtectedRoute>
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
