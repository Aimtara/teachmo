import React, { lazy } from 'react';
import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';
import { useAuthenticationStatus } from '@nhost/react';
import { getDefaultPathForRole, useUserRole } from '@/hooks/useUserRole';

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

const Dashboard = lazy(() => import('@/pages/Dashboard.jsx'));
const TeacherDashboard = lazy(() => import('@/pages/TeacherDashboard.jsx'));
const AdminAnalytics = lazy(() => import('@/pages/AdminAnalytics.jsx'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard.jsx'));
const PartnerPortal = lazy(() => import('@/pages/PartnerPortal.jsx'));
const PartnerSubmissions = lazy(() => import('@/pages/PartnerSubmissions.jsx'));
const PartnerTraining = lazy(() => import('@/pages/PartnerTraining.jsx'));
const PartnerIncentives = lazy(() => import('@/pages/PartnerIncentives.jsx'));
const PartnerDashboard = lazy(() => import('@/pages/PartnerDashboard.jsx'));
const ParentDashboard = lazy(() => import('@/pages/ParentDashboard.jsx'));
const Landing = lazy(() => import('@/pages/Landing.jsx'));
const Onboarding = lazy(() => import('@/pages/Onboarding.jsx'));
const AuthCallback = lazy(() => import('@/pages/AuthCallback.jsx'));
const ParentOnboardingPage = lazy(() => import('@/pages/onboarding/parent'));
const TeacherOnboardingPage = lazy(() => import('@/pages/onboarding/teacher'));

export const ROUTE_CONFIG = [
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

export const PUBLIC_ROUTE_PATHS = ROUTE_CONFIG
  .filter(({ allowedRoles, requiresAuth }) => !allowedRoles && !requiresAuth)
  .flatMap(({ path, index }) => {
    if (path === '*') return [];
    if (index) return ['/'];
    return path ? [path] : [];
  });

export { ProtectedRoute };
