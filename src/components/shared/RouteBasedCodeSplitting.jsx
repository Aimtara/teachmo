import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { LoadingSpinner } from '@/components/shared/LoadingStates';
import GlobalErrorBoundary from '@/components/shared/GlobalErrorBoundary';
import { ROUTE_MAP } from '@/config/navigation';

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
const PartnerPortal = React.lazy(() => import('@/pages/PartnerPortal'));
const PartnerSubmissions = React.lazy(() => import('@/pages/PartnerSubmissions'));
const PartnerTraining = React.lazy(() => import('@/pages/PartnerTraining'));
const PartnerOffers = React.lazy(() => import('@/pages/PartnerOffers'));
const PartnerBilling = React.lazy(() => import('@/pages/PartnerBilling'));
const PartnerIncentives = React.lazy(() => import('@/pages/PartnerIncentives'));
const PartnerDashboard = React.lazy(() => import('@/pages/PartnerDashboard'));

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

const ROUTE_COMPONENTS = [
  { page: 'Dashboard', Component: Dashboard },
  { page: 'UnifiedDiscover', Component: UnifiedDiscover },
  { page: 'UnifiedCommunity', Component: UnifiedCommunity },
  { page: 'Calendar', Component: Calendar },
  { page: 'Messages', Component: Messages },
  { page: 'AIAssistant', Component: AIAssistant },
  { page: 'Settings', Component: Settings },
  { page: 'Progress', Component: Progress },
  { page: 'Achievements', Component: Achievements },
  { page: 'Journal', Component: Journal },
  { page: 'Notifications', Component: Notifications },
  { page: 'AdminAnalytics', Component: AdminAnalytics },
  { page: 'AdminSystemUsers', Component: SystemUsers },
  { page: 'AdminSchoolUsers', Component: SchoolUsers },
  { page: 'AdminDistrictUsers', Component: DistrictUsers },
  { page: 'AdminDistricts', Component: SystemDistricts },
  { page: 'AdminSchools', Component: SystemSchools },
  { page: 'AdminLicenses', Component: LicenseManagement },
  { page: 'AdminModeration', Component: ModerationDashboard },
  { page: 'SchoolDirectory', Component: SchoolDirectory },
  { page: 'TeacherDashboard', Component: TeacherDashboard },
  { page: 'TeacherClasses', Component: TeacherClasses },
  { page: 'TeacherMessages', Component: TeacherMessages },
  { page: 'TeacherAssignments', Component: TeacherAssignments },
  { page: 'Landing', Component: Landing },
  { page: 'Onboarding', Component: Onboarding },
  { page: 'PartnerPortal', Component: PartnerPortal },
  { page: 'PartnerSubmissions', Component: PartnerSubmissions },
  { page: 'PartnerTraining', Component: PartnerTraining },
  { page: 'PartnerOffers', Component: PartnerOffers },
  { page: 'PartnerBilling', Component: PartnerBilling },
  { page: 'PartnerIncentives', Component: PartnerIncentives },
  { page: 'PartnerDashboard', Component: PartnerDashboard },
  { page: 'AdminPartners', Component: PartnerDashboard }
];

export default function RouteBasedCodeSplitting() {
  return (
    <Routes>
      {ROUTE_COMPONENTS.map(({ page, Component }) => (
        <Route
          key={page}
          path={ROUTE_MAP[page] || '/'}
          element={(
            <LazyRouteWrapper>
              <Component />
            </LazyRouteWrapper>
          )}
        />
      ))}
    </Routes>
  );
}
