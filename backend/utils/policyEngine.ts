import { query } from '../db.js';

const CACHE_TTL_MS = 5 * 60 * 1000;

type ScopeList = string[];

type RolePolicy = {
  allow: ScopeList;
  deny: ScopeList;
};

type EntityPolicy = Record<string, Record<string, 'allow' | 'deny'>>;

type TenantPolicy = {
  allow: ScopeList;
  deny: ScopeList;
  roles: Record<string, RolePolicy>;
  entities: EntityPolicy;
};

type CachedPolicy = {
  policy: TenantPolicy;
  expiresAt: number;
};

const policyCache = new Map<string, CachedPolicy>();

function cacheKey(organizationId?: string | null, schoolId?: string | null): string {
  return `${organizationId || 'unknown'}::${schoolId || 'none'}`;
}

function normalizeScopeList(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list.map((scope) => String(scope)).filter(Boolean);
}

function normalizeRolePolicy(rolePolicy: { allow?: unknown; deny?: unknown } = {}): RolePolicy {
  return {
    allow: normalizeScopeList(rolePolicy.allow),
    deny: normalizeScopeList(rolePolicy.deny)
  };
}

function normalizeEntityPolicy(entityPolicy: Record<string, unknown> = {}): EntityPolicy {
  const normalized: EntityPolicy = {};
  for (const [entityType, actions] of Object.entries(entityPolicy)) {
    normalized[entityType] = {};
    if (actions && typeof actions === 'object') {
      for (const [action, decision] of Object.entries(actions as Record<string, unknown>)) {
        const normalizedDecision = String(decision || '').toLowerCase();
        if (['allow', 'deny'].includes(normalizedDecision)) {
          normalized[entityType][action] = normalizedDecision as 'allow' | 'deny';
        }
      }
    }
  }
  return normalized;
}

function normalizePolicy(settings: Record<string, unknown> = {}): TenantPolicy {
  return {
    allow: normalizeScopeList(settings.allow),
    deny: normalizeScopeList(settings.deny),
    roles: Object.fromEntries(
      Object.entries((settings.roles as Record<string, { allow?: unknown; deny?: unknown }>) || {}).map(
        ([role, policy]) => [role, normalizeRolePolicy(policy)]
      )
    ),
    entities: normalizeEntityPolicy((settings.entities as Record<string, unknown>) || {})
  };
}

export async function getTenantPolicy({
  organizationId,
  schoolId
}: {
  organizationId?: string | null;
  schoolId?: string | null;
} = {}): Promise<TenantPolicy> {
  if (!organizationId) return normalizePolicy();

  const key = cacheKey(organizationId, schoolId);
  const cached = policyCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.policy;
  }

  const result = await query(
    `select settings
     from public.tenant_settings
     where organization_id = $1
       and (school_id is null or school_id = $2)
     order by school_id desc nulls last
     limit 1`,
    [organizationId, schoolId ?? null]
  );

  const settings = (result.rows?.[0]?.settings as Record<string, unknown> | undefined) ?? {};
  const policy = normalizePolicy((settings.permissions as Record<string, unknown>) || {});
  policyCache.set(key, { policy, expiresAt: Date.now() + CACHE_TTL_MS });

  return policy;
}

export function resolvePolicyScopes({
  authScopes = [],
  roleScopes = [],
  policy,
  role
}: {
  authScopes?: string[];
  roleScopes?: string[];
  policy: TenantPolicy;
  role: string;
}): string[] {
  const scoped = new Set([...authScopes, ...roleScopes]);
  const allow = policy?.allow || [];
  const deny = policy?.deny || [];
  const rolePolicy = policy?.roles?.[role] || { allow: [], deny: [] };

  for (const scope of [...allow, ...rolePolicy.allow]) {
    scoped.add(scope);
  }

  for (const scope of [...deny, ...rolePolicy.deny]) {
    scoped.delete(scope);
  }

  return Array.from(scoped);
}

export function evaluateEntityPermission({
  policy,
  entityType,
  action
}: {
  policy: TenantPolicy;
  entityType?: string | null;
  action?: string | null;
}): boolean | null {
  if (!policy?.entities || !entityType || !action) return null;
  const entityRules = policy.entities[entityType] || {};
  const decision = entityRules[action];
  if (!decision) return null;
  return decision === 'allow';
}

export function resetPolicyCache(): void {
  policyCache.clear();
}

export { normalizePolicy };
