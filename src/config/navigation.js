import {
  Home,
  Search,
  Users,
  Calendar,
  MessageCircle,
  Settings,
  BookOpen,
  Target,
  Award,
  Bot,
  School,
  GraduationCap,
  Shield,
  BarChart3,
  Bell,
  FileText,
  Building2,
  UserCheck,
  Workflow,
  Compass
} from 'lucide-react';
import { isRouteEnabled } from './routes';
import { isFeatureEnabled } from './features';
import { canAccess, getDefaultPathForRole, normalizeRole } from './rbac';

export { PUBLIC_PAGES, ROUTE_MAP } from './routes';

export const ROLE_DEFINITIONS = {
  parent: {
    label: 'Parent',
    defaultPage: 'ParentDashboard'
  },
  teacher: {
    label: 'Teacher',
    defaultPage: 'TeacherDashboard'
  },
  school_admin: {
    label: 'School Admin',
    defaultPage: 'AdminDashboard'
  },
  district_admin: {
    label: 'District Admin',
    defaultPage: 'AdminDashboard'
  },
  system_admin: {
    label: 'System Admin',
    defaultPage: 'AdminDashboard'
  },
  partner: {
    label: 'Partner',
    defaultPage: 'PartnerDashboard'
  }
};

export const NAV_STRUCTURE = [
  {
    name: 'Dashboard',
    page: 'Dashboard',
    pageByRole: {
      teacher: 'TeacherDashboard'
    },
    icon: Home,
    roles: ['parent', 'teacher', 'school_admin', 'district_admin', 'system_admin'],
    requiredScopes: ['core:dashboard'],
    mobilePrimary: true
  },
  {
    name: 'Learning',
    icon: BookOpen,
    roles: ['parent', 'teacher'],
    requiredScopes: ['content:read'],
    children: [
      { name: 'Discover', page: 'UnifiedDiscover', icon: Search, mobilePrimary: true, feature: 'DISCOVER' },
      { name: 'Progress', page: 'Progress', icon: Target, mobileSecondary: true },
      { name: 'Achievements', page: 'Achievements', icon: Award, mobileSecondary: true },
      { name: 'Journal', page: 'Journal', icon: FileText, mobileSecondary: true },
      { name: 'Activities', page: 'Activities', icon: Compass, mobileSecondary: true },
      { name: 'Library', page: 'Library', icon: BookOpen, mobileSecondary: true }
    ]
  },
  {
    name: 'Community',
    icon: Users,
    roles: ['parent', 'teacher'],
    requiredScopes: ['content:read'],
    feature: 'COMMUNITY',
    children: [
      { name: 'Community Feed', page: 'UnifiedCommunity', icon: Users, mobileSecondary: true },
      { name: 'Messages', page: 'Messages', icon: MessageCircle, badge: '3', mobilePrimary: true, feature: 'MESSAGING' },
      { name: 'Calendar', page: 'Calendar', icon: Calendar, mobilePrimary: true, feature: 'CALENDAR' }
    ]
  },
  {
    name: 'Teaching',
    icon: GraduationCap,
    roles: ['teacher'],
    requiredScopes: ['classrooms:manage'],
    children: [
      { name: 'My Classes', page: 'TeacherClasses', icon: School, mobilePrimary: true, feature: 'TEACHER_CLASSES' },
      { name: 'Assignments', page: 'TeacherAssignments', icon: FileText, mobileSecondary: true, feature: 'TEACHER_ASSIGNMENTS' },
      { name: 'Teacher Messages', page: 'TeacherMessages', icon: MessageCircle, mobilePrimary: true, feature: 'TEACHER_MESSAGES' }
    ]
  },
  {
    name: 'Administration',
    icon: Shield,
    roles: ['school_admin', 'district_admin', 'system_admin'],
    requiredScopes: ['org:manage'],
    children: [
      { name: 'Analytics', page: 'AdminAnalytics', icon: BarChart3, requiredScopes: ['reporting:view'] },
      { name: 'Workflows', page: 'AdminWorkflows', icon: Workflow, requiredScopes: ['org:manage'] },
      { name: 'User Management', page: 'AdminSystemUsers', icon: UserCheck, roles: ['system_admin'], requiredScopes: ['users:manage'] },
      { name: 'School Users', page: 'AdminSchoolUsers', icon: UserCheck, roles: ['school_admin'], requiredScopes: ['org:manage'] },
      { name: 'District Users', page: 'AdminDistrictUsers', icon: UserCheck, roles: ['district_admin'], requiredScopes: ['district:manage'] },
      { name: 'Districts', page: 'AdminDistricts', icon: Building2, roles: ['system_admin'], requiredScopes: ['district:manage'] },
      { name: 'Schools', page: 'AdminSchools', icon: School, roles: ['system_admin', 'district_admin'], requiredScopes: ['org:manage'] },
      { name: 'Licenses', page: 'AdminLicenses', icon: FileText, requiredScopes: ['users:manage'] },
      { name: 'Message Reports', page: 'AdminModerationQueue', icon: Shield, requiredScopes: ['safety:review'] },
      { name: 'Messaging Blocks', page: 'AdminMessagingBlocklist', icon: Shield, requiredScopes: ['safety:review'] }
    ]
  },
  {
    name: 'Tools',
    icon: Bot,
    roles: ['parent', 'teacher', 'school_admin', 'district_admin', 'system_admin'],
    requiredScopes: ['core:dashboard'],
    children: [
      { name: 'AI Coach', page: 'AIAssistant', icon: Bot, mobilePrimary: true, feature: 'AI_ASSISTANT' },
      { name: 'School Directory', page: 'SchoolDirectory', icon: School, feature: 'SCHOOL_DIRECTORY' },
      { name: 'Notifications', page: 'Notifications', icon: Bell }
    ]
  },
  {
    name: 'Settings',
    page: 'Settings',
    icon: Settings,
    roles: ['parent', 'teacher', 'school_admin', 'district_admin', 'system_admin'],
    requiredScopes: ['core:dashboard'],
    mobileSecondary: true
  }
];

const hasAccess = (item, userRole) =>
  canAccess({ role: userRole, allowedRoles: item.roles, requiredScopes: item.requiredScopes });
const isFeatureVisible = (item) => !item.feature || isFeatureEnabled(item.feature);

export function getNavigationForRole(userRole = 'parent') {
  const normalizedRole = normalizeRole(userRole);

  return NAV_STRUCTURE
    .filter((section) => hasAccess(section, normalizedRole) && isFeatureVisible(section))
    .map((section) => {
      const baseSection = {
        ...section,
        page: section.pageByRole?.[normalizedRole] || section.page
      };

      if (!section.children) return baseSection;

      const allowedChildren = section.children
        .filter((child) => isFeatureVisible(child))
        .filter((child) =>
          hasAccess(
            {
              ...child,
              roles: child.roles || section.roles,
              requiredScopes: child.requiredScopes || section.requiredScopes
            },
            normalizedRole
          )
        )
        .map((child) => ({ ...child, page: child.pageByRole?.[normalizedRole] || child.page }))
        .filter((child) => !child.page || isRouteEnabled(child.page));
      return { ...baseSection, children: allowedChildren };
    })
    .map((section) => ({
      ...section,
      page: section.page || section.pageByRole?.[normalizedRole]
    }))
    .filter((section) => !section.page || isRouteEnabled(section.page))
    .filter((section) => !section.children || section.children.length > 0);
}

export function getMobileNavigation(userRole = 'parent') {
  const normalizedRole = normalizeRole(userRole);
  const nav = getNavigationForRole(normalizedRole);
  const homePage =
    ROLE_DEFINITIONS[normalizedRole]?.defaultPage ||
    ROLE_DEFINITIONS.parent.defaultPage ||
    getDefaultPathForRole(normalizedRole);

  const flattened = [];
  nav.forEach((section) => {
    if (section.page && (section.mobilePrimary || section.mobileSecondary)) {
      flattened.push({ ...section, isPrimary: Boolean(section.mobilePrimary) });
    }

    if (section.children) {
      section.children.forEach((child) => {
        if (child.mobilePrimary || child.mobileSecondary) {
          flattened.push({ ...child, isPrimary: Boolean(child.mobilePrimary) });
        }
      });
    }
  });

  const uniqueByPage = new Map();
  flattened.forEach(item => {
    if (!uniqueByPage.has(item.page)) {
      uniqueByPage.set(item.page, item);
    }
  });

  const mobileItems = Array.from(uniqueByPage.values());
  mobileItems.unshift({
    icon: Home,
    label: 'Home',
    name: 'Home',
    page: homePage,
    isPrimary: true
  });

  return mobileItems;
}
