import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuthenticationStatus } from '@nhost/react';

import AdminAnalytics from './AdminAnalytics.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import AuthCallback from './AuthCallback.jsx';
import Dashboard from './Dashboard.jsx';
import Landing from './Landing.jsx';
import Onboarding from './Onboarding.jsx';
import ParentDashboard from './ParentDashboard.jsx';
import ParentOnboardingPage from './onboarding/parent';
import PartnerDashboard from './PartnerDashboard.jsx';
import PartnerIncentives from './PartnerIncentives.jsx';
import PartnerPortal from './PartnerPortal.jsx';
import PartnerSubmissions from './PartnerSubmissions.jsx';
import PartnerTraining from './PartnerTraining.jsx';
import TeacherDashboard from './TeacherDashboard.jsx';
import TeacherOnboardingPage from './onboarding/teacher';
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

export default function Pages() {
  const protectedRoutes = [
    {
      path: '/dashboard',
      component: Dashboard,
      allowedRoles: ['parent', 'teacher', 'system_admin', 'school_admin', 'district_admin']
    },
    { path: '/parent/dashboard', component: ParentDashboard, allowedRoles: ['parent'] },
    { path: '/onboarding/parent', component: ParentOnboardingPage },
    { path: '/onboarding/teacher', component: TeacherOnboardingPage },
    { path: '/teacher/dashboard', component: TeacherDashboard, allowedRoles: ['teacher'] },
    { path: '/partners/dashboard', component: PartnerDashboard, allowedRoles: ['partner'] },
    { path: '/partners', component: PartnerPortal },
    { path: '/partners/submissions', component: PartnerSubmissions },
    { path: '/partners/training', component: PartnerTraining },
    { path: '/partners/incentives', component: PartnerIncentives },
    {
      path: '/admin',
      component: AdminDashboard,
      allowedRoles: ['system_admin', 'school_admin', 'district_admin']
    },
    {
      path: '/admin/analytics',
      component: AdminAnalytics,
      allowedRoles: ['system_admin', 'school_admin', 'district_admin']
    }
  ];

  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<RoleRedirect />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {protectedRoutes.map(({ path, component: Component, allowedRoles }) => (
          <Route
            key={path}
            path={path}
            element={(
              <ProtectedRoute allowedRoles={allowedRoles}>
                <Component />
              </ProtectedRoute>
            )}
          />
        ))}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
