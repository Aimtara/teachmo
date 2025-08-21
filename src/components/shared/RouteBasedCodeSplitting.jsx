import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { LoadingSpinner } from '@/components/shared/LoadingStates';
import GlobalErrorBoundary from '@/components/shared/GlobalErrorBoundary';

// Lazy load pages with code splitting
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const UnifiedDiscover = React.lazy(() => import('@/pages/UnifiedDiscover'));
const UnifiedCommunity = React.lazy(() => import('@/pages/UnifiedCommunity'));
const Calendar = React.lazy(() => import('@/pages/Calendar'));
const Messages = React.lazy(() => import('@/pages/Messages'));
const AIAssistant = React.lazy(() => import('@/pages/AIAssistant'));
const Settings = React.lazy(() => import('@/pages/Settings'));
const Progress = React.lazy(() => import('@/pages/Progress'));
const Achievements = React.lazy(() => import('@/pages/Achievements'));
const Journal = React.lazy(() => import('@/pages/Journal'));

// Admin pages
const AdminAnalytics = React.lazy(() => import('@/pages/AdminAnalytics'));
const SystemUsers = React.lazy(() => import('@/pages/SystemUsers'));
const SchoolUsers = React.lazy(() => import('@/pages/SchoolUsers'));
const DistrictUsers = React.lazy(() => import('@/pages/DistrictUsers'));
const SystemDistricts = React.lazy(() => import('@/pages/SystemDistricts'));
const SystemSchools = React.lazy(() => import('@/pages/SystemSchools'));
const LicenseManagement = React.lazy(() => import('@/pages/LicenseManagement'));
const ModerationDashboard = React.lazy(() => import('@/pages/ModerationDashboard'));
const SchoolDirectory = React.lazy(() => import('@/pages/SchoolDirectory'));

// Teacher pages
const TeacherDashboard = React.lazy(() => import('@/pages/TeacherDashboard'));
const TeacherClasses = React.lazy(() => import('@/pages/TeacherClasses'));
const TeacherMessages = React.lazy(() => import('@/pages/TeacherMessages'));
const TeacherAssignments = React.lazy(() => import('@/pages/TeacherAssignments'));

// Other pages
const Notifications = React.lazy(() => import('@/pages/Notifications'));
const Landing = React.lazy(() => import('@/pages/Landing'));
const Onboarding = React.lazy(() => import('@/pages/Onboarding'));

const LazyRouteWrapper = ({ children }) => (
  <GlobalErrorBoundary>
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading page..." />
      </div>
    }>
      {children}
    </Suspense>
  </GlobalErrorBoundary>
);

export default function RouteBasedCodeSplitting() {
  return (
    <Routes>
      {/* Core User Routes */}
      <Route path="/dashboard" element={<LazyRouteWrapper><Dashboard /></LazyRouteWrapper>} />
      <Route path="/discover" element={<LazyRouteWrapper><UnifiedDiscover /></LazyRouteWrapper>} />
      <Route path="/community" element={<LazyRouteWrapper><UnifiedCommunity /></LazyRouteWrapper>} />
      <Route path="/calendar" element={<LazyRouteWrapper><Calendar /></LazyRouteWrapper>} />
      <Route path="/messages" element={<LazyRouteWrapper><Messages /></LazyRouteWrapper>} />
      <Route path="/ai-assistant" element={<LazyRouteWrapper><AIAssistant /></LazyRouteWrapper>} />
      <Route path="/settings" element={<LazyRouteWrapper><Settings /></LazyRouteWrapper>} />
      <Route path="/progress" element={<LazyRouteWrapper><Progress /></LazyRouteWrapper>} />
      <Route path="/achievements" element={<LazyRouteWrapper><Achievements /></LazyRouteWrapper>} />
      <Route path="/journal" element={<LazyRouteWrapper><Journal /></LazyRouteWrapper>} />
      <Route path="/notifications" element={<LazyRouteWrapper><Notifications /></LazyRouteWrapper>} />

      {/* Admin Routes */}
      <Route path="/admin/analytics" element={<LazyRouteWrapper><AdminAnalytics /></LazyRouteWrapper>} />
      <Route path="/admin/system-users" element={<LazyRouteWrapper><SystemUsers /></LazyRouteWrapper>} />
      <Route path="/admin/school-users" element={<LazyRouteWrapper><SchoolUsers /></LazyRouteWrapper>} />
      <Route path="/admin/district-users" element={<LazyRouteWrapper><DistrictUsers /></LazyRouteWrapper>} />
      <Route path="/admin/districts" element={<LazyRouteWrapper><SystemDistricts /></LazyRouteWrapper>} />
      <Route path="/admin/schools" element={<LazyRouteWrapper><SystemSchools /></LazyRouteWrapper>} />
      <Route path="/admin/licenses" element={<LazyRouteWrapper><LicenseManagement /></LazyRouteWrapper>} />
      <Route path="/admin/moderation" element={<LazyRouteWrapper><ModerationDashboard /></LazyRouteWrapper>} />
      <Route path="/school-directory" element={<LazyRouteWrapper><SchoolDirectory /></LazyRouteWrapper>} />

      {/* Teacher Routes */}
      <Route path="/teacher/dashboard" element={<LazyRouteWrapper><TeacherDashboard /></LazyRouteWrapper>} />
      <Route path="/teacher/classes" element={<LazyRouteWrapper><TeacherClasses /></LazyRouteWrapper>} />
      <Route path="/teacher/messages" element={<LazyRouteWrapper><TeacherMessages /></LazyRouteWrapper>} />
      <Route path="/teacher/assignments" element={<LazyRouteWrapper><TeacherAssignments /></LazyRouteWrapper>} />

      {/* Public Routes */}
      <Route path="/" element={<LazyRouteWrapper><Landing /></LazyRouteWrapper>} />
      <Route path="/onboarding" element={<LazyRouteWrapper><Onboarding /></LazyRouteWrapper>} />
    </Routes>
  );
}