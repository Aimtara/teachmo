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
  Compass,
  MessageSquare
} from 'lucide-react';

export const ROLE_DEFINITIONS = {
  parent: {
    label: 'Parent',
    defaultPage: 'Dashboard'
  },
  teacher: {
    label: 'Teacher',
    defaultPage: 'TeacherDashboard'
  },
  school_admin: {
    label: 'School Admin',
    defaultPage: 'Dashboard'
  },
  district_admin: {
    label: 'District Admin',
    defaultPage: 'Dashboard'
  },
  system_admin: {
    label: 'System Admin',
    defaultPage: 'Dashboard'
  }
};

export const PUBLIC_PAGES = ['Landing', 'Onboarding'];

export const ROUTE_MAP = {
  Landing: '/',
  Onboarding: '/onboarding',
  Dashboard: '/dashboard',
  TeacherDashboard: '/teacher/dashboard',
  UnifiedDiscover: '/discover',
  UnifiedCommunity: '/community',
  Calendar: '/calendar',
  Messages: '/messages',
  AIAssistant: '/ai-assistant',
  Settings: '/settings',
  Progress: '/progress',
  Achievements: '/achievements',
  Journal: '/journal',
  Notifications: '/notifications',
  TeacherClasses: '/teacher/classes',
  TeacherMessages: '/teacher/messages',
  TeacherAssignments: '/teacher/assignments',
  SchoolDirectory: '/school-directory',
  Announcements: '/announcements',
  Activities: '/activities',
  Library: '/library',
  Children: '/children',
  Upgrade: '/upgrade',
  ResourceDetail: '/resources',
  PrivacyRights: '/privacy-rights',
  DoNotSell: '/do-not-sell',
  ChildSetup: '/child-setup',
  AdminUserEdit: '/admin/users',
  AdminAnalytics: '/admin/analytics',
  AdminLicenses: '/admin/licenses',
  AdminModeration: '/admin/moderation',
  AdminDistricts: '/admin/districts',
  AdminSchools: '/admin/schools',
  AdminSystemUsers: '/admin/system-users',
  AdminSchoolUsers: '/admin/school-users',
  AdminDistrictUsers: '/admin/district-users'
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
    mobilePrimary: true
  },
  {
    name: 'Learning',
    icon: BookOpen,
    roles: ['parent', 'teacher'],
    children: [
      { name: 'Discover', page: 'UnifiedDiscover', icon: Search, mobilePrimary: true },
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
    children: [
      { name: 'Community Feed', page: 'UnifiedCommunity', icon: Users, mobileSecondary: true },
      { name: 'Messages', page: 'Messages', icon: MessageCircle, badge: '3', mobilePrimary: true },
      { name: 'Calendar', page: 'Calendar', icon: Calendar, mobilePrimary: true }
    ]
  },
  {
    name: 'Teaching',
    icon: GraduationCap,
    roles: ['teacher'],
    children: [
      { name: 'My Classes', page: 'TeacherClasses', icon: School, mobilePrimary: true },
      { name: 'Assignments', page: 'TeacherAssignments', icon: FileText, mobileSecondary: true },
      { name: 'Teacher Messages', page: 'TeacherMessages', icon: MessageCircle, mobilePrimary: true }
    ]
  },
  {
    name: 'Administration',
    icon: Shield,
    roles: ['school_admin', 'district_admin', 'system_admin'],
    children: [
      { name: 'Analytics', page: 'AdminAnalytics', icon: BarChart3 },
      { name: 'User Management', page: 'AdminSystemUsers', icon: UserCheck, roles: ['system_admin'] },
      { name: 'School Users', page: 'AdminSchoolUsers', icon: UserCheck, roles: ['school_admin'] },
      { name: 'District Users', page: 'AdminDistrictUsers', icon: UserCheck, roles: ['district_admin'] },
      { name: 'Districts', page: 'AdminDistricts', icon: Building2, roles: ['system_admin'] },
      { name: 'Schools', page: 'AdminSchools', icon: School, roles: ['system_admin', 'district_admin'] },
      { name: 'Licenses', page: 'AdminLicenses', icon: FileText },
      { name: 'Moderation', page: 'AdminModeration', icon: Shield }
    ]
  },
  {
    name: 'Tools',
    icon: Bot,
    roles: ['parent', 'teacher', 'school_admin', 'district_admin', 'system_admin'],
    children: [
      { name: 'AI Coach', page: 'AIAssistant', icon: Bot, mobilePrimary: true },
      { name: 'School Directory', page: 'SchoolDirectory', icon: School },
      { name: 'Notifications', page: 'Notifications', icon: Bell }
    ]
  },
  {
    name: 'Settings',
    page: 'Settings',
    icon: Settings,
    roles: ['parent', 'teacher', 'school_admin', 'district_admin', 'system_admin'],
    mobileSecondary: true
  }
];

const hasRoleAccess = (roles, userRole) => {
  if (!roles || roles.length === 0) return true;
  return roles.includes(userRole);
};

export function getNavigationForRole(userRole = 'parent') {
  return NAV_STRUCTURE
    .filter(section => hasRoleAccess(section.roles, userRole))
    .map(section => {
      const baseSection = {
        ...section,
        page: section.pageByRole?.[userRole] || section.page
      };

      if (!section.children) return baseSection;
      const allowedChildren = section.children
        .filter(child => hasRoleAccess(child.roles || section.roles, userRole))
        .map(child => ({ ...child, page: child.pageByRole?.[userRole] || child.page }));
      return { ...baseSection, children: allowedChildren };
    })
    .filter(section => !section.children || section.children.length > 0);
}

export function getMobileNavigation(userRole = 'parent') {
  const nav = getNavigationForRole(userRole);
  const homePage = ROLE_DEFINITIONS[userRole]?.defaultPage || ROLE_DEFINITIONS.parent.defaultPage;

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
