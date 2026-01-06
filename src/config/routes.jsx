import { lazy } from 'react';

const ENABLE_INTERNAL_ROUTES = import.meta.env.VITE_ENABLE_INTERNAL_ROUTES === 'true';

export const ROUTE_DEFINITIONS = [
  {
    name: 'Landing',
    path: '/',
    Component: lazy(() => import('@/pages/Landing.jsx')),
    isPublic: true
  },
  {
    name: 'Login',
    path: '/login',
    Component: lazy(() => import('@/pages/Login.jsx')),
    isPublic: true,
    fallback: <p className="p-6 text-gray-600">Loading login...</p>
  },
  {
    name: 'Onboarding',
    path: '/onboarding',
    Component: lazy(() => import('@/pages/Onboarding.jsx')),
    isPublic: true
  },
  {
    name: 'AuthCallback',
    path: '/auth/callback',
    Component: lazy(() => import('@/pages/AuthCallback.jsx')),
    isPublic: true
  },
  {
    name: 'UnifiedDiscover',
    path: '/discover',
    Component: lazy(() => import('@/pages/Discover.jsx')),
    requiresAuth: true,
    allowedRoles: ['parent', 'teacher'],
    requiredScopes: ['content:read'],
    feature: 'DISCOVER',
    fallback: <p className="p-6 text-gray-600">Loading discover...</p>
  },
  {
    name: 'UnifiedCommunity',
    path: '/community',
    Component: lazy(() => import('@/pages/Community.jsx')),
    requiresAuth: true,
    allowedRoles: ['parent', 'teacher'],
    requiredScopes: ['content:read'],
    feature: 'COMMUNITY',
    fallback: <p className="p-6 text-gray-600">Loading community...</p>
  },
  {
    name: 'Calendar',
    path: '/calendar',
    Component: lazy(() => import('@/pages/Calendar.jsx')),
    requiresAuth: true,
    allowedRoles: ['parent', 'teacher'],
    requiredScopes: ['content:read'],
    feature: 'CALENDAR',
    fallback: <p className="p-6 text-gray-600">Loading calendar...</p>
  },
  {
    name: 'Messages',
    path: '/messages',
    Component: lazy(() => import('@/pages/Messages.jsx')),
    requiresAuth: true,
    allowedRoles: ['parent', 'teacher'],
    requiredScopes: ['content:read'],
    feature: 'MESSAGING',
    fallback: <p className="p-6 text-gray-600">Loading messages...</p>
  },
  {
    name: 'MessagingRequests',
    path: '/messages/requests',
    Component: lazy(() => import('@/pages/MessagingRequests.jsx')),
    requiresAuth: true,
    allowedRoles: ['teacher', 'school_admin', 'district_admin', 'admin', 'system_admin'],
    requiredScopes: ['content:read'],
    feature: 'MESSAGING',
    fallback: <p className="p-6 text-gray-600">Loading messaging requests...</p>
  },
  {
    name: 'AIAssistant',
    path: '/ai-assistant',
    Component: lazy(() => import('@/pages/AIAssistant.jsx')),
    requiresAuth: true,
    allowedRoles: ['parent', 'teacher', 'school_admin', 'district_admin', 'system_admin'],
    requiredScopes: ['core:dashboard'],
    feature: 'AI_ASSISTANT',
    fallback: <p className="p-6 text-gray-600">Loading AI assistant...</p>
  },
  {
    name: 'Settings',
    path: '/settings',
    Component: lazy(() => import('@/pages/Settings.jsx')),
    requiresAuth: true,
    allowedRoles: ['parent', 'teacher', 'school_admin', 'district_admin', 'system_admin'],
    requiredScopes: ['core:dashboard'],
    fallback: <p className="p-6 text-gray-600">Loading settings...</p>
  },
  {
    name: 'Dashboard',
    path: '/dashboard',
    Component: lazy(() => import('@/pages/Dashboard.jsx')),
    allowedRoles: ['parent', 'teacher', 'system_admin', 'school_admin', 'district_admin'],
    requiredScopes: ['core:dashboard'],
    fallback: <p className="p-6 text-gray-600">Loading dashboard...</p>
  },
  {
    name: 'ParentDashboard',
    path: '/parent/dashboard',
    Component: lazy(() => import('@/pages/ParentDashboard.jsx')),
    allowedRoles: ['parent'],
    requiredScopes: ['content:read'],
    fallback: <p className="p-6 text-gray-600">Loading parent dashboard...</p>
  },
  {
    name: 'ParentOnboarding',
    path: '/onboarding/parent',
    Component: lazy(() => import('@/pages/onboarding/parent')),
    requiresAuth: true,
    allowedRoles: ['parent'],
    fallback: <p className="p-6 text-gray-600">Loading parent onboarding...</p>
  },
  {
    name: 'TeacherOnboarding',
    path: '/onboarding/teacher',
    Component: lazy(() => import('@/pages/onboarding/teacher')),
    requiresAuth: true,
    allowedRoles: ['teacher'],
    fallback: <p className="p-6 text-gray-600">Loading teacher onboarding...</p>
  },
  {
    name: 'TeacherDashboard',
    path: '/teacher/dashboard',
    Component: lazy(() => import('@/pages/TeacherDashboard.jsx')),
    allowedRoles: ['teacher'],
    requiredScopes: ['classrooms:manage'],
    fallback: <p className="p-6 text-gray-600">Loading teacher dashboard...</p>
  },
  {
    name: 'TeacherClasses',
    path: '/teacher-classes',
    Component: lazy(() => import('@/pages/TeacherClasses.jsx')),
    requiresAuth: true,
    allowedRoles: ['teacher'],
    requiredScopes: ['classrooms:manage'],
    feature: 'TEACHER_CLASSES',
    fallback: <p className="p-6 text-gray-600">Loading classes...</p>
  },
  {
    name: 'TeacherAssignments',
    path: '/teacher-assignments',
    Component: lazy(() => import('@/pages/TeacherAssignments.jsx')),
    requiresAuth: true,
    allowedRoles: ['teacher'],
    requiredScopes: ['classrooms:manage'],
    feature: 'TEACHER_ASSIGNMENTS',
    fallback: <p className="p-6 text-gray-600">Loading assignments...</p>
  },
  {
    name: 'TeacherMessages',
    path: '/teacher-messages',
    Component: lazy(() => import('@/pages/TeacherMessages.jsx')),
    requiresAuth: true,
    allowedRoles: ['teacher'],
    requiredScopes: ['classrooms:manage'],
    feature: 'TEACHER_MESSAGES',
    fallback: <p className="p-6 text-gray-600">Loading teacher messages...</p>
  },
  {
    name: 'PartnerDashboard',
    path: '/partners/dashboard',
    Component: lazy(() => import('@/pages/PartnerDashboard.jsx')),
    allowedRoles: ['admin', 'system_admin'],
    fallback: <p className="p-6 text-gray-600">Loading partner portal...</p>
  },
  {
    name: 'PartnerPortal',
    path: '/partners',
    Component: lazy(() => import('@/pages/PartnerPortal.jsx')),
    requiresAuth: true,
    allowedRoles: ['partner', 'admin', 'system_admin'],
    internalOnly: true,
    fallback: <p className="p-6 text-gray-600">Loading partner portal...</p>
  },
  {
    name: 'PartnerSubmissions',
    path: '/partners/submissions',
    Component: lazy(() => import('@/pages/PartnerSubmissions.jsx')),
    requiresAuth: true,
    allowedRoles: ['partner', 'admin', 'system_admin'],
    internalOnly: true,
    fallback: <p className="p-6 text-gray-600">Loading partner submissions...</p>
  },
  {
    name: 'PartnerTraining',
    path: '/partners/training',
    Component: lazy(() => import('@/pages/PartnerTraining.jsx')),
    requiresAuth: true,
    allowedRoles: ['partner', 'admin', 'system_admin'],
    internalOnly: true,
    fallback: <p className="p-6 text-gray-600">Loading partner training...</p>
  },
  {
    name: 'PartnerOffers',
    path: '/partners/offers',
    Component: lazy(() => import('@/pages/PartnerOffers.jsx')),
    requiresAuth: true,
    allowedRoles: ['partner', 'admin', 'system_admin'],
    internalOnly: true,
    fallback: <p className="p-6 text-gray-600">Loading partner offers...</p>
  },
  {
    name: 'PartnerBilling',
    path: '/partners/billing',
    Component: lazy(() => import('@/pages/PartnerBilling.jsx')),
    requiresAuth: true,
    allowedRoles: ['partner', 'admin', 'system_admin'],
    internalOnly: true,
    fallback: <p className="p-6 text-gray-600">Loading partner billing...</p>
  },
  {
    name: 'PartnerIncentives',
    path: '/partners/incentives',
    Component: lazy(() => import('@/pages/PartnerIncentives.jsx')),
    requiresAuth: true,
    allowedRoles: ['partner', 'admin', 'system_admin'],
    internalOnly: true,
    fallback: <p className="p-6 text-gray-600">Loading partner incentives...</p>
  },
  {
    name: 'AdminPartners',
    path: '/admin/partners',
    Component: lazy(() => import('@/pages/PartnerDashboard.jsx')),
    allowedRoles: ['system_admin', 'admin'],
    requiredScopes: ['org:manage'],
    internalOnly: true,
    fallback: <p className="p-6 text-gray-600">Loading partner admin dashboard...</p>
  },
  {
    name: 'AdminDashboard',
    path: '/admin',
    Component: lazy(() => import('@/pages/AdminDashboard.jsx')),
    allowedRoles: ['system_admin', 'school_admin', 'district_admin'],
    requiredScopes: ['org:manage'],
    fallback: <p className="p-6 text-gray-600">Loading admin dashboard...</p>
  },
  {
    name: 'AdminAnalytics',
    path: '/admin/analytics',
    Component: lazy(() => import('@/pages/AdminAnalytics.jsx')),
    allowedRoles: ['system_admin', 'school_admin', 'district_admin'],
    requiredScopes: ['reporting:view'],
    internalOnly: true,
    fallback: <p className="p-6 text-gray-600">Loading admin analytics...</p>
  },
  {
    name: 'AdminNotifications',
    path: '/admin/notifications',
    Component: lazy(() => import('@/pages/AdminNotifications.jsx')),
    allowedRoles: ['system_admin', 'school_admin', 'district_admin'],
    requiredScopes: ['org:manage'],
    internalOnly: true,
    fallback: <p className="p-6 text-gray-600">Loading notifications...</p>
  },
  {
    name: 'AdminWorkflows',
    path: '/admin/workflows',
    Component: lazy(() => import('@/pages/AdminWorkflows.jsx')),
    allowedRoles: ['system_admin', 'school_admin', 'district_admin'],
    requiredScopes: ['automation:manage'],
    internalOnly: true,
    fallback: <p className="p-6 text-gray-600">Loading workflows...</p>
  },
  {
    name: 'AdminTenantSettings',
    path: '/admin/tenant-settings',
    Component: lazy(() => import('@/pages/AdminTenantSettings.jsx')),
    allowedRoles: ['system_admin', 'school_admin', 'district_admin'],
    requiredScopes: ['org:manage'],
    internalOnly: true,
    fallback: <p className="p-6 text-gray-600">Loading tenant settings...</p>
  },
  {
    name: 'AdminSSOSettings',
    path: '/admin/sso',
    Component: lazy(() => import('@/pages/AdminSSOSettings.jsx')),
    allowedRoles: ['system_admin', 'school_admin', 'district_admin', 'admin'],
    requiredScopes: ['tenant:manage'],
    feature: 'ENTERPRISE_SSO',
    internalOnly: true,
    fallback: <p className="p-6 text-gray-600">Loading SSO settings...</p>
  },
  {
    name: 'AdminTenantDomains',
    path: '/admin/tenant-domains',
    Component: lazy(() => import('@/pages/AdminTenantDomains.jsx')),
    allowedRoles: ['system_admin', 'school_admin', 'district_admin', 'admin'],
    requiredScopes: ['tenant:manage'],
    feature: 'ENTERPRISE_SSO',
    internalOnly: true,
    fallback: <p className="p-6 text-gray-600">Loading tenant domains...</p>
  },
  {
    name: 'AdminUsers',
    path: '/admin/users',
    Component: lazy(() => import('@/pages/AdminUsers.jsx')),
    allowedRoles: ['system_admin', 'school_admin', 'district_admin'],
    requiredScopes: ['users:manage'],
    internalOnly: true,
    fallback: <p className="p-6 text-gray-600">Loading admin users...</p>
  },
  {
    name: 'AdminAuditLogs',
    path: '/admin/audit-logs',
    Component: lazy(() => import('@/pages/AdminAuditLogs.jsx')),
    allowedRoles: ['system_admin', 'school_admin', 'district_admin', 'admin'],
    requiredScopes: ['safety:review'],
    feature: 'ENTERPRISE_AUDIT_LOGS',
    internalOnly: true,
    fallback: <p className="p-6 text-gray-600">Loading audit logs...</p>
  },
  {
    name: 'AdminCompliance',
    path: '/admin/compliance',
    Component: lazy(() => import('@/pages/AdminCompliance.jsx')),
    allowedRoles: ['system_admin', 'school_admin', 'district_admin', 'admin'],
    requiredScopes: ['safety:review'],
    internalOnly: true,
    fallback: <p className="p-6 text-gray-600">Loading compliance center...</p>
  },
  {
    name: 'AdminFeatureFlags',
    path: '/admin/feature-flags',
    Component: lazy(() => import('@/pages/AdminFeatureFlags.jsx')),
    allowedRoles: ['system_admin', 'school_admin', 'district_admin', 'admin'],
    requiredScopes: ['tenant:manage'],
    feature: 'ENTERPRISE_FEATURE_FLAGS',
    internalOnly: true,
    fallback: <p className="p-6 text-gray-600">Loading feature flags...</p>
  },
  {
    name: 'AdminAIReview',
    path: '/admin/ai-review',
    Component: lazy(() => import('@/pages/AdminAIReview.jsx')),
    allowedRoles: ['system_admin', 'school_admin', 'district_admin', 'admin'],
    requiredScopes: ['safety:review'],
    feature: 'ENTERPRISE_AI_REVIEW',
    internalOnly: true,
    fallback: <p className="p-6 text-gray-600">Loading AI review queue...</p>
  },
  {
    name: 'AdminAIReviewQueue',
    path: '/admin/ai-review-queue',
    Component: lazy(() => import('@/pages/AdminAIReviewQueue.jsx')),
    allowedRoles: ['system_admin', 'school_admin', 'district_admin', 'admin'],
    requiredScopes: ['safety:review'],
    feature: 'ENTERPRISE_AI_REVIEW',
    internalOnly: true,
    fallback: <p className="p-6 text-gray-600">Loading AI review queue...</p>
  },
  {
    name: 'AdminAIGovernance',
    path: '/admin/ai-governance',
    Component: lazy(() => import('@/pages/AdminAIGovernance.jsx')),
    allowedRoles: ['system_admin', 'school_admin', 'district_admin', 'admin'],
    requiredScopes: ['safety:review'],
    feature: 'ENTERPRISE_AI_GOVERNANCE',
    internalOnly: true,
    fallback: <p className="p-6 text-gray-600">Loading AI governance...</p>
  },
  {
    name: 'AdminSISRoster',
    path: '/admin/sis-roster',
    Component: lazy(() => import('@/pages/AdminSISRoster.jsx')),
    allowedRoles: ['system_admin', 'school_admin', 'district_admin', 'admin'],
    requiredScopes: ['directory:manage'],
    feature: 'ENTERPRISE_SIS_ROSTER',
    internalOnly: true,
    fallback: <p className="p-6 text-gray-600">Loading SIS roster...</p>
  },
  {
    name: 'AdminModerationQueue',
    path: '/admin/moderation/messages',
    Component: lazy(() => import('@/pages/AdminModerationQueue.jsx')),
    allowedRoles: ['school_admin', 'district_admin', 'system_admin', 'admin'],
    requiredScopes: ['safety:review'],
    fallback: <p className="p-6 text-gray-600">Loading moderation queue...</p>
  },
  {
    name: 'AdminMessagingBlocklist',
    path: '/admin/moderation/blocks',
    Component: lazy(() => import('@/pages/AdminMessagingBlocklist.jsx')),
    allowedRoles: ['school_admin', 'district_admin', 'system_admin', 'admin'],
    requiredScopes: ['safety:review'],
    fallback: <p className="p-6 text-gray-600">Loading messaging blocklist...</p>
  },
  {
    name: 'AITransparency',
    path: '/ai/transparency',
    Component: lazy(() => import('@/pages/AITransparency.jsx')),
    isPublic: true,
    feature: 'ENTERPRISE_TRANSPARENCY',
    fallback: <p className="p-6 text-gray-600">Loading AI transparency...</p>
  },
  {
    name: 'SchoolDirectory',
    path: '/school-directory',
    Component: lazy(() => import('@/pages/SchoolDirectory.jsx')),
    requiresAuth: true,
    allowedRoles: ['parent', 'teacher', 'school_admin', 'district_admin', 'system_admin'],
    requiredScopes: ['core:dashboard'],
    feature: 'SCHOOL_DIRECTORY',
    fallback: <p className="p-6 text-gray-600">Loading school directory...</p>
  }
];

const ROUTE_ALIASES = {
  discover: 'UnifiedDiscover',
  community: 'UnifiedCommunity'
};

export const ROUTE_CONFIG = ROUTE_DEFINITIONS.filter(
  (route) => ENABLE_INTERNAL_ROUTES || !route.internalOnly
);

export const ROUTE_MAP = ROUTE_CONFIG.reduce((acc, route) => ({ ...acc, [route.name]: route.path }), {});

export const PUBLIC_PAGES = ROUTE_CONFIG.filter((route) => route.isPublic).map((route) => route.name);

export function resolveRouteName(pageName = '') {
  const normalized = pageName.toLowerCase();
  const aliasMatch = ROUTE_ALIASES[normalized];
  if (aliasMatch && ROUTE_CONFIG.some((route) => route.name === aliasMatch)) return aliasMatch;

  const directMatch = ROUTE_CONFIG.find((route) => route.name.toLowerCase() === normalized);
  if (directMatch) return directMatch.name;

  return pageName;
}

export function findRouteConfig(pageName = '') {
  const resolved = resolveRouteName(pageName);
  return ROUTE_CONFIG.find((route) => route.name === resolved);
}

export function isRouteEnabled(pageName = '') {
  return Boolean(findRouteConfig(pageName));
}
