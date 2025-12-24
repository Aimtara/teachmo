/* eslint-env node */
export const ROLE_SCOPES = {
  system_admin: [
    'workflow:manage',
    'workflow:run',
    'partner:portal',
    'partner:admin',
    'partner:submissions',
    'partner:resources',
    'analytics:read',
    'tenants:manage',
  ],
  admin: [
    'workflow:manage',
    'workflow:run',
    'partner:portal',
    'partner:admin',
    'partner:submissions',
    'partner:resources',
    'analytics:read',
    'tenants:manage',
  ],
  district_admin: [
    'workflow:manage',
    'workflow:run',
    'partner:portal',
    'partner:admin',
    'partner:submissions',
    'partner:resources',
    'analytics:read',
    'tenants:manage',
  ],
  school_admin: [
    'workflow:manage',
    'workflow:run',
    'partner:portal',
    'partner:admin',
    'partner:submissions',
    'partner:resources',
    'analytics:read',
  ],
  partner: ['partner:portal', 'partner:submissions', 'partner:resources'],
  teacher: ['workflow:run'],
  parent: [],
};

export function resolveRoleScopes(role) {
  if (!role) return [];
  return ROLE_SCOPES[role] || [];
}
