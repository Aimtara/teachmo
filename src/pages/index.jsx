import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthenticationStatus } from '@nhost/react';
import Dashboard from './Dashboard.jsx';
import TeacherDashboard from './TeacherDashboard.jsx';
import AdminAnalytics from './AdminAnalytics.jsx';
import PartnerPortal from './PartnerPortal.jsx';
import PartnerSubmissions from './PartnerSubmissions.jsx';
import PartnerTraining from './PartnerTraining.jsx';
import PartnerIncentives from './PartnerIncentives.jsx';
import Landing from './Landing.jsx';
import AuthCallback from './AuthCallback.jsx';
import { getDefaultPathForRole, useUserRole } from '@/hooks/useUserRole';

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const role = useUserRole();

  if (isLoading) return <p className="p-6 text-gray-600">Checking your session…</p>;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to={getDefaultPathForRole(role)} replace />;

  return children;
}

function RoleRedirect() {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const role = useUserRole();

  if (isLoading) return <p className="p-6 text-gray-600">Checking your session…</p>;
  if (!isAuthenticated) return <Landing />;

  return <Navigate to={getDefaultPathForRole(role)} replace />;
}

export default function Pages() {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<RoleRedirect />} />
        <Route
          path="/dashboard"
          element={(
            <ProtectedRoute allowedRoles={['parent', 'teacher', 'system_admin', 'school_admin', 'district_admin']}>
              <Dashboard />
            </ProtectedRoute>
          )}
        />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/teacher/dashboard"
          element={(
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherDashboard />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/analytics"
          element={(
            <ProtectedRoute allowedRoles={['system_admin', 'school_admin', 'district_admin']}>
              <AdminAnalytics />
            </ProtectedRoute>
          )}
        />

        <Route
          path="/partners"
          element={(
            <ProtectedRoute>
              <PartnerPortal />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/partners/submissions"
          element={(
            <ProtectedRoute>
              <PartnerSubmissions />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/partners/training"
          element={(
            <ProtectedRoute>
              <PartnerTraining />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/partners/incentives"
          element={(
            <ProtectedRoute>
              <PartnerIncentives />
            </ProtectedRoute>
          )}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
