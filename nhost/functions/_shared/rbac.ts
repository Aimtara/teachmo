export type Role =
  | 'parent'
  | 'teacher'
  | 'school_admin'
  | 'district_admin'
  | 'partner'
  | 'admin'
  | 'system_admin';

export type Action =
  | 'automation:request_review'
  | 'automation:approve'
  | 'automation:publish'
  | 'automation:replay'
  | 'automation:manage'
  | 'automation:run'
  | 'tenant:manage'
  | 'users:manage'
  | 'analytics:view'
  | 'analytics:export'
  | 'messages:moderate';

const ROLE_ACTIONS: Record<Role, Set<Action>> = {
  parent: new Set([]),
  teacher: new Set([]),
  partner: new Set([]),
  school_admin: new Set([
    'automation:manage',
    'automation:run',
    'automation:replay',
    'automation:request_review',
    'tenant:manage',
    'users:manage',
    'analytics:view',
    'analytics:export',
    'messages:moderate',
  ]),
  district_admin: new Set([
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
    'messages:moderate',
  ]),
  admin: new Set([
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
    'messages:moderate',
  ]),
  system_admin: new Set([
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
    'messages:moderate',
  ]),
};

export function hasAction(role: string | null | undefined, action: Action): boolean {
  if (!role) return false;
  const key = role as Role;
  const set = ROLE_ACTIONS[key];
  return set ? set.has(action) : false;
}

/**
 * Same as hasAction, but accepts an arbitrary action string.
 * Unknown actions are denied (fail-closed).
 */
export function hasActionName(role: string | null | undefined, action: string): boolean {
  if (!role) return false;
  const key = role as Role;
  const set = ROLE_ACTIONS[key];
  return set ? set.has(action as Action) : false;
}

export function requireAction(role: string | null | undefined, action: Action) {
  if (!hasAction(role, action)) {
    throw new Error(`Insufficient permissions: requires ${action}`);
  }
}
