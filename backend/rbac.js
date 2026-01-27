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
    'tenant:manage',
    'users:manage',
    'directory:manage',
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
    'tenant:manage',
    'users:manage',
    'directory:manage',
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
    'tenant:manage',
    'users:manage',
    'directory:manage',
  ],
  school_admin: [
    'workflow:manage',
    'workflow:run',
    'partner:portal',
    'partner:admin',
    'partner:submissions',
    'partner:resources',
    'analytics:read',
    'tenant:manage',
    'users:manage',
    'directory:manage',
  ],
  partner: ['partner:portal', 'partner:submissions', 'partner:resources'],
  teacher: ['workflow:run'],
  parent: [],
};

export function resolveRoleScopes(role) {
  if (!role) return [];
  return ROLE_SCOPES[role] || [];
}
