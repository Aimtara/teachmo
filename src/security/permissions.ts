export type Role =
  | 'parent'
  | 'teacher'
  | 'school_admin'
  | 'district_admin'
  | 'partner'
  | 'admin'
  | 'system_admin';

export type Action =
  | 'messages:read'
  | 'messages:write'
  | 'messages:moderate'
  | 'messages:invite'
  | 'threads:invite_manage'
  | 'directory:manage';

const ROLE_PERMS: Record<Role, Set<Action>> = {
  parent: new Set(['messages:read', 'messages:write']),
  teacher: new Set(['messages:read', 'messages:write', 'messages:invite', 'threads:invite_manage']),
  school_admin: new Set(['messages:read', 'messages:write', 'messages:moderate', 'messages:invite', 'threads:invite_manage', 'directory:manage']),
  district_admin: new Set([
    'messages:read',
    'messages:write',
    'messages:moderate',
    'messages:invite',
    'threads:invite_manage',
    'directory:manage',
  ]),
  partner: new Set([]),
  admin: new Set(['messages:read', 'messages:write', 'messages:moderate', 'messages:invite', 'threads:invite_manage', 'directory:manage']),
  system_admin: new Set([
    'messages:read',
    'messages:write',
    'messages:moderate',
    'messages:invite',
    'threads:invite_manage',
    'directory:manage',
  ]),
};

export function can(role: Role | null | undefined, action: Action): boolean {
  if (!role) return false;
  return ROLE_PERMS[role]?.has(action) ?? false;
}
