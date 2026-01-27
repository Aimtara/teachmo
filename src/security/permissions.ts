export type Role =
  | 'parent'
  | 'teacher'
  | 'school_admin'
  | 'district_admin'
  | 'partner'
  | 'admin'
  | 'system_admin';

// Action strings are intentionally stable API: treat them like a contract.
export type Action =
  | 'messages:read'
  | 'messages:write'
  | 'messages:moderate'
  | 'messages:invite'
  | 'threads:invite_manage'
  | 'directory:manage'
  | 'automation:manage'
  | 'automation:run'
  | 'automation:request_review'
  | 'automation:approve'
  | 'automation:publish'
  | 'automation:replay'
  | 'tenant:manage'
  | 'users:manage'
  | 'analytics:view'
  | 'analytics:export';

const ROLE_PERMS: Record<Role, Set<Action>> = {
  parent: new Set(['messages:read', 'messages:write']),

  teacher: new Set([
    'messages:read',
    'messages:write',
    'messages:invite',
    'threads:invite_manage',
  ]),

  school_admin: new Set([
    'messages:read',
    'messages:write',
    'messages:moderate',
    'messages:invite',
    'threads:invite_manage',
    'directory:manage',
    'automation:manage',
    'automation:run',
    'automation:replay',
    'automation:request_review',
    'tenant:manage',
    'users:manage',
    'analytics:view',
    'analytics:export',
  ]),

  district_admin: new Set([
    'messages:read',
    'messages:write',
    'messages:moderate',
    'messages:invite',
    'threads:invite_manage',
    'directory:manage',
    'automation:manage',
    'automation:run',
    'automation:replay',
    'automation:request_review',
    'automation:approve',
    'automation:publish',
    'tenant:manage',
    'users:manage',
    'analytics:view',
    'analytics:export',
  ]),

  partner: new Set([]),

  admin: new Set([
    'messages:read',
    'messages:write',
    'messages:moderate',
    'messages:invite',
    'threads:invite_manage',
    'directory:manage',
    'automation:manage',
    'automation:run',
    'automation:replay',
    'automation:request_review',
    'automation:approve',
    'automation:publish',
    'tenant:manage',
    'users:manage',
    'analytics:view',
    'analytics:export',
  ]),

  system_admin: new Set([
    'messages:read',
    'messages:write',
    'messages:moderate',
    'messages:invite',
    'threads:invite_manage',
    'directory:manage',
    'automation:manage',
    'automation:run',
    'automation:replay',
    'automation:request_review',
    'automation:approve',
    'automation:publish',
    'tenant:manage',
    'users:manage',
    'analytics:view',
    'analytics:export',
  ]),
};

export function can(role: Role | null | undefined, action: Action): boolean {
  if (!role) return false;
  return ROLE_PERMS[role]?.has(action) ?? false;
}

export function canAll(role: Role | null | undefined, actions: Action[]): boolean {
  if (!actions.length) return true;
  return actions.every((a) => can(role, a));
}
