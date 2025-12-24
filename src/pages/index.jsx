import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthenticationStatus } from '@nhost/react';
import Dashboard from './Dashboard.jsx';
import AdminAnalytics from './AdminAnalytics.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import AdminWorkflows from './AdminWorkflows.jsx';
import PartnerPortal from './PartnerPortal.jsx';
import PartnerSubmissions from './PartnerSubmissions.jsx';
import PartnerTraining from './PartnerTraining.jsx';
import PartnerIncentives from './PartnerIncentives.jsx';
import PartnerDashboard from './PartnerDashboard.jsx';
import ParentDashboard from './ParentDashboard.jsx';
import TeacherDashboard from './TeacherDashboard.jsx';
import Landing from './Landing.jsx';
import Onboarding from './Onboarding.jsx';
import AuthCallback from './AuthCallback.jsx';
import ParentOnboardingPage from './onboarding/parent';
import TeacherOnboardingPage from './onboarding/teacher';
import { getDefaultPathForRole, useUserRole } from '@/hooks/useUserRole';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

// Base44 UI parity track (incremental)
import UnifiedDiscover from './UnifiedDiscover.jsx';
import UnifiedCommunity from './UnifiedCommunity.jsx';

const Messages = lazy(() => import('./Messages.jsx'));
const AIAssistant = lazy(() => import('./AIAssistant.jsx'));
const Settings = lazy(() => import('./Settings.jsx'));
const TeacherClasses = lazy(() => import('./TeacherClasses.jsx'));
const TeacherAssignments = lazy(() => import('./TeacherAssignments.jsx'));
const TeacherMessages = lazy(() => import('./TeacherMessages.jsx'));
const SchoolDirectory = lazy(() => import('./SchoolDirectory.jsx'));

function RoleRedirect() {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const role = useUserRole();

  if (isLoading) return <p className="p-6 text-gray-600">Checking your session…</p>;
  if (!isAuthenticated) return <Landing />;

  return <Navigate to={getDefaultPathForRole(role)} replace />;
}

export default function Pages() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>}>
      <Routes>
        <Route index element={<RoleRedirect />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Base44 parity routes */}
          <Route path="/discover" element={<UnifiedDiscover />} />
          <Route path="/community" element={<UnifiedCommunity />} />
          <Route
            path="/messages"
            element={(
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/ai-assistant"
            element={(
              <ProtectedRoute>
                <AIAssistant />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/settings"
            element={(
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            )}
          />

          <Route
            path="/dashboard"
            element={(
              <ProtectedRoute allowedRoles={['parent', 'teacher', 'system_admin', 'school_admin', 'district_admin']}>
                <Dashboard />
              </ProtectedRoute>
            )}
          />

          <Route
            path="/parent/dashboard"
            element={(
              <ProtectedRoute allowedRoles={['parent']}>
                <ParentDashboard />
              </ProtectedRoute>
            )}
          />

          <Route
            path="/onboarding/parent"
            element={(
              <ProtectedRoute>
                <ParentOnboardingPage />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/onboarding/teacher"
            element={(
              <ProtectedRoute>
                <TeacherOnboardingPage />
              </ProtectedRoute>
            )}
          />

          <Route
            path="/teacher/dashboard"
            element={(
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherDashboard />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/teacher/classes"
            element={(
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherClasses />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/teacher/assignments"
            element={(
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherAssignments />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/teacher/messages"
            element={(
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherMessages />
              </ProtectedRoute>
            )}
          />

          <Route
            path="/school-directory"
            element={(
              <ProtectedRoute>
                <SchoolDirectory />
              </ProtectedRoute>
            )}
          />

          <Route
            path="/partners/dashboard"
            element={(
              <ProtectedRoute allowedRoles={['partner']}>
                <PartnerDashboard />
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

          <Route
            path="/admin"
            element={(
              <ProtectedRoute allowedRoles={['system_admin', 'school_admin', 'district_admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            )}
          />
        <Route
          path="/admin/workflows"
          element={(
            <ProtectedRoute allowedRoles={['system_admin', 'school_admin', 'district_admin']}>
              <AdminWorkflows />
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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
