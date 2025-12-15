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
    name: 'Dashboard',
    path: '/dashboard',
    Component: lazy(() => import('@/pages/Dashboard.jsx')),
    allowedRoles: ['parent', 'teacher', 'system_admin', 'school_admin', 'district_admin'],
    fallback: <p className="p-6 text-gray-600">Loading dashboard...</p>
  },
  {
    name: 'ParentDashboard',
    path: '/parent/dashboard',
    Component: lazy(() => import('@/pages/ParentDashboard.jsx')),
    allowedRoles: ['parent'],
    fallback: <p className="p-6 text-gray-600">Loading parent dashboard...</p>
  },
  {
    name: 'ParentOnboarding',
    path: '/onboarding/parent',
    Component: lazy(() => import('@/pages/onboarding/parent')),
    requiresAuth: true,
    fallback: <p className="p-6 text-gray-600">Loading parent onboarding...</p>
  },
  {
    name: 'TeacherOnboarding',
    path: '/onboarding/teacher',
    Component: lazy(() => import('@/pages/onboarding/teacher')),
    requiresAuth: true,
    fallback: <p className="p-6 text-gray-600">Loading teacher onboarding...</p>
  },
  {
    name: 'TeacherDashboard',
    path: '/teacher/dashboard',
    Component: lazy(() => import('@/pages/TeacherDashboard.jsx')),
    allowedRoles: ['teacher'],
    fallback: <p className="p-6 text-gray-600">Loading teacher dashboard...</p>
  },
  {
    name: 'PartnerDashboard',
    path: '/partners/dashboard',
    Component: lazy(() => import('@/pages/PartnerDashboard.jsx')),
    allowedRoles: ['partner'],
    fallback: <p className="p-6 text-gray-600">Loading partner dashboard...</p>
  },
  {
    name: 'PartnerPortal',
    path: '/partners',
    Component: lazy(() => import('@/pages/PartnerPortal.jsx')),
    requiresAuth: true,
    internalOnly: true,
    fallback: <p className="p-6 text-gray-600">Loading partner portal...</p>
  },
  {
    name: 'PartnerSubmissions',
    path: '/partners/submissions',
    Component: lazy(() => import('@/pages/PartnerSubmissions.jsx')),
    requiresAuth: true,
    internalOnly: true,
    fallback: <p className="p-6 text-gray-600">Loading partner submissions...</p>
  },
  {
    name: 'PartnerTraining',
    path: '/partners/training',
    Component: lazy(() => import('@/pages/PartnerTraining.jsx')),
    requiresAuth: true,
    internalOnly: true,
    fallback: <p className="p-6 text-gray-600">Loading partner training...</p>
  },
  {
    name: 'PartnerIncentives',
    path: '/partners/incentives',
    Component: lazy(() => import('@/pages/PartnerIncentives.jsx')),
    requiresAuth: true,
    internalOnly: true,
    fallback: <p className="p-6 text-gray-600">Loading partner incentives...</p>
  },
  {
    name: 'AdminDashboard',
    path: '/admin',
    Component: lazy(() => import('@/pages/AdminDashboard.jsx')),
    allowedRoles: ['system_admin', 'school_admin', 'district_admin'],
    fallback: <p className="p-6 text-gray-600">Loading admin dashboard...</p>
  },
  {
    name: 'AdminAnalytics',
    path: '/admin/analytics',
    Component: lazy(() => import('@/pages/AdminAnalytics.jsx')),
    allowedRoles: ['system_admin', 'school_admin', 'district_admin'],
    internalOnly: true,
    fallback: <p className="p-6 text-gray-600">Loading admin analytics...</p>
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
