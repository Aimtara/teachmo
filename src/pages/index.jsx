import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthenticationStatus } from '@nhost/react';
import Dashboard from './Dashboard.jsx';
import AdminAnalytics from './AdminAnalytics.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import AdminWorkflows from './AdminWorkflows.jsx';
import AdminTenantSettings from './AdminTenantSettings.jsx';
import AdminUsers from './AdminUsers.jsx';
import AdminAIGovernance from './AdminAIGovernance.jsx';
import AIFineTuning from './AIFineTuning.jsx';
import AIPromptLibrary from './AIPromptLibrary.jsx';
import PartnerPortal from './PartnerPortal.jsx';
import PartnerSubmissions from './PartnerSubmissions.jsx';
import PartnerTraining from './PartnerTraining.jsx';
import PartnerIncentives from './PartnerIncentives.jsx';
import PartnerOffers from './PartnerOffers.jsx';
import PartnerBilling from './PartnerBilling.jsx';
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
import { TelemetryBootstrap } from '@/observability/TelemetryBootstrap';

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
    <BrowserRouter>
      <TelemetryBootstrap />
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
              <ProtectedRoute allowedRoles={['admin', 'system_admin']}>
                <PartnerDashboard />
              </ProtectedRoute>
            )}
          />

          <Route
            path="/partners"
            element={(
              <ProtectedRoute allowedRoles={['partner', 'admin', 'system_admin']}>
                <PartnerPortal />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/partners/submissions"
            element={(
              <ProtectedRoute allowedRoles={['partner', 'admin', 'system_admin']}>
                <PartnerSubmissions />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/partners/training"
            element={(
              <ProtectedRoute allowedRoles={['partner', 'admin', 'system_admin']}>
                <PartnerTraining />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/partners/incentives"
            element={(
              <ProtectedRoute allowedRoles={['partner', 'admin', 'system_admin']}>
                <PartnerIncentives />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/partners/offers"
            element={(
              <ProtectedRoute allowedRoles={['partner', 'admin', 'system_admin']}>
                <PartnerOffers />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/partners/billing"
            element={(
              <ProtectedRoute allowedRoles={['partner', 'admin', 'system_admin']}>
                <PartnerBilling />
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
            path="/admin/partners"
            element={(
              <ProtectedRoute allowedRoles={['admin', 'system_admin']}>
                <PartnerDashboard />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/workflows"
            element={(
              <ProtectedRoute allowedRoles={['system_admin', 'school_admin', 'district_admin']} requiredActions={['automation:manage']}>
                <AdminWorkflows />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/tenant-settings"
            element={(
              <ProtectedRoute allowedRoles={['system_admin', 'school_admin', 'district_admin']} requiredActions={['tenant:manage']}>
                <AdminTenantSettings />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/users"
            element={(
              <ProtectedRoute allowedRoles={['system_admin', 'school_admin', 'district_admin']} requiredActions={['users:manage']}>
                <AdminUsers />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/analytics"
            element={(
              <ProtectedRoute allowedRoles={['system_admin', 'school_admin', 'district_admin']} requiredActions={['analytics:view']}>
                <AdminAnalytics />
              </ProtectedRoute>
            )}
          />
          <Route path="/admin/ai-governance" element={<AdminAIGovernance />} />
          <Route path="/admin/ai-fine-tuning" element={<AIFineTuning />} />
          <Route path="/admin/ai-prompts" element={<AIPromptLibrary />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
