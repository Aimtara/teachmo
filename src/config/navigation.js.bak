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
  Activity,
  Bell,
  FileText,
  Building2,
  UserCheck,
  Compass,
  BadgePercent,
  CreditCard,
  Handshake,
  Globe,
  ShieldCheck
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
    defaultPage: 'PartnerPortal'
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
      { name: 'Admin Dashboard', page: 'AdminDashboard', icon: Shield, requiredScopes: ['org:manage'] },
      { name: 'Partner Dashboard', page: 'AdminPartners', icon: Users, requiredScopes: ['org:manage'] },
      { name: 'Execution Board', page: 'AdminExecutionBoard', icon: Target, roles: ['system_admin'], requiredScopes: ['system:manage'] },
      { name: 'Command Center', page: 'AdminCommandCenter', icon: Compass, roles: ['system_admin'], requiredScopes: ['system:manage'] },
      { name: 'Analytics', page: 'AdminAnalytics', icon: BarChart3, requiredScopes: ['reporting:view'] },
      { name: 'Observability', page: 'AdminObservability', icon: Activity, requiredScopes: ['org:manage'] },
      { name: 'Ops Orchestrator', page: 'OpsOrchestrator', icon: Activity, roles: ['system_admin'], requiredScopes: ['system:manage'] },
      { name: 'System Health', page: 'AdminSystemHealth', icon: Activity, requiredScopes: ['org:manage'] },
      { name: 'Notifications', page: 'AdminNotifications', icon: Bell, requiredScopes: ['org:manage'] },
      { name: 'Users', page: 'AdminUsers', icon: UserCheck, requiredScopes: ['users:manage'] },
      { name: 'Tenant Settings', page: 'AdminTenantSettings', icon: Building2, requiredScopes: ['org:manage'] },
      { name: 'SSO Policy', page: 'AdminSSOSettings', icon: Shield, requiredScopes: ['tenant:manage'], feature: 'ENTERPRISE_SSO' },
      { name: 'Tenant Domains', page: 'AdminTenantDomains', icon: Globe, requiredScopes: ['tenant:manage'], feature: 'ENTERPRISE_SSO' },
      { name: 'Audit Logs', page: 'AdminAuditLogs', icon: FileText, requiredScopes: ['safety:review'], feature: 'ENTERPRISE_AUDIT_LOGS' },
      { name: 'Compliance Center', page: 'AdminCompliance', icon: ShieldCheck, requiredScopes: ['safety:review'] },
      { name: 'Feature Flags', page: 'AdminFeatureFlags', icon: BadgePercent, requiredScopes: ['tenant:manage'], feature: 'ENTERPRISE_FEATURE_FLAGS' },
      { name: 'AI Governance', page: 'AdminAIGovernance', icon: Bot, requiredScopes: ['safety:review'], feature: 'ENTERPRISE_AI_GOVERNANCE' },
      {
        name: 'AI Prompts',
        page: 'AdminAIPrompts',
        icon: FileText,
        roles: ['system_admin', 'admin'],
        requiredScopes: ['safety:review'],
        feature: 'ENTERPRISE_AI_GOVERNANCE'
      },
      { name: 'AI Review Queue', page: 'AdminAIReviewQueue', icon: Shield, requiredScopes: ['safety:review'], feature: 'ENTERPRISE_AI_REVIEW' },
      { name: 'SIS Roster', page: 'AdminSISRoster', icon: School, requiredScopes: ['directory:manage'], feature: 'ENTERPRISE_SIS_ROSTER' },
      { name: 'Integration Health', page: 'AdminIntegrationHealth', icon: Globe, requiredScopes: ['directory:manage'] },
      { name: 'LMS Integrations', page: 'AdminLMSIntegration', icon: BookOpen, requiredScopes: ['directory:manage'] },
      { name: 'Integration Settings', page: 'AdminIntegrationSettings', icon: Globe, requiredScopes: ['directory:manage'] },
      { name: 'Workflows', page: 'AdminWorkflows', icon: Compass, requiredScopes: ['automation:manage'] },
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
      { name: 'AI Transparency', page: 'AITransparency', icon: FileText, mobileSecondary: true, feature: 'ENTERPRISE_TRANSPARENCY' },
      { name: 'School Directory', page: 'SchoolDirectory', icon: School, feature: 'SCHOOL_DIRECTORY' },
      { name: 'Notifications', page: 'Notifications', icon: Bell }
    ]
  },
  {
    name: 'Partner Portal',
    icon: Handshake,
    roles: ['partner'],
    requiredScopes: ['partner:portal'],
    children: [
      { name: 'Overview', page: 'PartnerPortal', icon: Home },
      { name: 'Offers', page: 'PartnerOffers', icon: BadgePercent },
      { name: 'Incentives', page: 'PartnerIncentives', icon: Award },
      { name: 'Billing', page: 'PartnerBilling', icon: CreditCard },
      { name: 'Submissions', page: 'PartnerSubmissions', icon: FileText },
      { name: 'Training', page: 'PartnerTraining', icon: BookOpen }
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
