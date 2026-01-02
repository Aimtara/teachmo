export type AppRole =
  | 'parent'
  | 'teacher'
  | 'school_admin'
  | 'district_admin'
  | 'system_admin'
  | 'partner';

export type RoleDefinition = {
  id: AppRole;
  label: string;
  defaultPath: string;
  scopes: string[];
  inherits?: AppRole[];
};

const ROLE_ALIASES: Record<string, AppRole> = {
  admin: 'system_admin'
};

export const ROLE_DEFINITIONS: Record<AppRole, RoleDefinition> = {
  parent: {
    id: 'parent',
    label: 'Parent/Guardian',
    defaultPath: '/parent/dashboard',
    scopes: ['core:dashboard', 'content:read', 'child:read', 'messages:basic']
  },
  teacher: {
    id: 'teacher',
    label: 'Teacher',
    defaultPath: '/teacher/dashboard',
    inherits: ['parent'],
    scopes: ['core:dashboard', 'classrooms:manage', 'assignments:manage', 'messages:educator']
  },
  school_admin: {
    id: 'school_admin',
    label: 'School Admin',
    defaultPath: '/admin',
    inherits: ['teacher'],
    scopes: ['core:dashboard', 'org:manage', 'users:manage', 'reporting:view', 'safety:review']
  },
  district_admin: {
    id: 'district_admin',
    label: 'District Admin',
    defaultPath: '/admin',
    inherits: ['school_admin'],
    scopes: ['district:manage', 'reporting:district']
  },
  system_admin: {
    id: 'system_admin',
    label: 'System Admin',
    defaultPath: '/admin',
    inherits: ['district_admin'],
    scopes: ['system:manage', 'feature-flags:manage']
  },
  partner: {
    id: 'partner',
    label: 'Partner',
    defaultPath: '/partners',
    scopes: ['core:dashboard', 'partner:portal', 'partner:resources', 'partner:submissions']
  }
};

const FALLBACK_ROLE: AppRole = 'parent';

export function normalizeRole(role?: string | null): AppRole {
  if (!role) return FALLBACK_ROLE;

  const normalized = role.toLowerCase();
  if (normalized in ROLE_ALIASES) return ROLE_ALIASES[normalized];
  if (normalized in ROLE_DEFINITIONS) return normalized as AppRole;

  return FALLBACK_ROLE;
}

export function getRoleDefinition(role?: string | null): RoleDefinition {
  const normalizedRole = normalizeRole(role);
  return ROLE_DEFINITIONS[normalizedRole] || ROLE_DEFINITIONS[FALLBACK_ROLE];
}

function collectScopes(roleId: AppRole, visited: Set<AppRole> = new Set()): string[] {
  if (visited.has(roleId)) return [];
  visited.add(roleId);

  const definition = ROLE_DEFINITIONS[roleId];
  if (!definition) return [];

  const inheritedScopes = (definition.inherits || []).flatMap((inheritedRole) =>
    collectScopes(inheritedRole, visited)
  );

  return [...new Set([...definition.scopes, ...inheritedScopes])];
}

export function getEffectiveScopes(role?: string | null): string[] {
  const normalizedRole = normalizeRole(role);
  return collectScopes(normalizedRole);
}

export type AccessCheck = {
  allowedRoles?: string[];
  requiredScopes?: string[];
};

export function roleSatisfies(userRole: AppRole, allowedRole: string): boolean {
  const normalizedAllowed = normalizeRole(allowedRole);
  if (userRole === normalizedAllowed) return true;

  const definition = ROLE_DEFINITIONS[userRole];
  if (!definition?.inherits) return false;

  return definition.inherits.some((inherited) => roleSatisfies(inherited, normalizedAllowed));
}

export function canAccess({ role, allowedRoles, requiredScopes }: AccessCheck & { role?: string | null }): boolean {
  const normalizedRole = normalizeRole(role);

  const roleAllowed =
    !allowedRoles ||
    allowedRoles.length === 0 ||
    allowedRoles.some((allowedRole) => roleSatisfies(normalizedRole, allowedRole));

  if (!roleAllowed) return false;

  const scopes = getEffectiveScopes(normalizedRole);
  if (requiredScopes && requiredScopes.length > 0) {
    return requiredScopes.every((scope) => scopes.includes(scope));
  }

  return true;
}

export function getDefaultPathForRole(role?: string | null): string {
  const definition = getRoleDefinition(role);
  return definition.defaultPath || ROLE_DEFINITIONS[FALLBACK_ROLE].defaultPath;
}
