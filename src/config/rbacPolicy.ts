import { type AppRole } from '@/config/rbac';

export type Permission =
  | 'manage_sso_providers'
  | 'manage_role_permissions'
  | 'manage_dsar_requests'
  | 'manage_notifications'
  | 'manage_prompts'
  | 'manage_ai_budgets'
  | 'manage_impersonation'
  | 'manage_reports'
  | 'manage_sis_sync'
  | 'manage_sis_permissions'
  | 'view_logs'
  | 'manage_partner_incentives';

type PolicyEntry = {
  actions: Permission[];
};

const ADMIN_ACTIONS: Permission[] = [
  'manage_sso_providers',
  'manage_dsar_requests',
  'manage_notifications',
  'manage_ai_budgets',
  'manage_reports',
  'manage_sis_sync',
  'manage_sis_permissions',
  'view_logs',
];

const SYSTEM_ADMIN_ACTIONS: Permission[] = [
  ...ADMIN_ACTIONS,
  'manage_role_permissions',
  'manage_impersonation',
  'manage_partner_incentives',
  'manage_prompts',
];

export const rbacPolicy: Record<AppRole, PolicyEntry> = {
  parent: { actions: [] },
  teacher: { actions: [] },
  partner: { actions: [] },
  school_admin: { actions: ADMIN_ACTIONS },
  district_admin: { actions: ADMIN_ACTIONS },
  system_admin: { actions: SYSTEM_ADMIN_ACTIONS },
};
