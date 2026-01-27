/* eslint-env node */
import { query } from '../db.js';

const CACHE_TTL_MS = 5 * 60 * 1000;
const policyCache = new Map();

function cacheKey(organizationId, schoolId) {
  return `${organizationId || 'unknown'}::${schoolId || 'none'}`;
}

function normalizeScopeList(list) {
  if (!Array.isArray(list)) return [];
  return list.map((scope) => String(scope)).filter(Boolean);
}

function normalizeRolePolicy(rolePolicy = {}) {
  return {
    allow: normalizeScopeList(rolePolicy.allow),
    deny: normalizeScopeList(rolePolicy.deny),
  };
}

function normalizeEntityPolicy(entityPolicy = {}) {
  const normalized = {};
  for (const [entityType, actions] of Object.entries(entityPolicy)) {
    normalized[entityType] = {};
    if (actions && typeof actions === 'object') {
      for (const [action, decision] of Object.entries(actions)) {
        const normalizedDecision = String(decision || '').toLowerCase();
        if (['allow', 'deny'].includes(normalizedDecision)) {
          normalized[entityType][action] = normalizedDecision;
        }
      }
    }
  }
  return normalized;
}

function normalizePolicy(settings = {}) {
  return {
    allow: normalizeScopeList(settings.allow),
    deny: normalizeScopeList(settings.deny),
    roles: Object.fromEntries(
      Object.entries(settings.roles || {}).map(([role, policy]) => [role, normalizeRolePolicy(policy)])
    ),
    entities: normalizeEntityPolicy(settings.entities || {}),
  };
}

export async function getTenantPolicy({ organizationId, schoolId } = {}) {
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

  const settings = result.rows?.[0]?.settings ?? {};
  const policy = normalizePolicy(settings.permissions || {});
  policyCache.set(key, { policy, expiresAt: Date.now() + CACHE_TTL_MS });

  return policy;
}

export function resolvePolicyScopes({ authScopes = [], roleScopes = [], policy, role }) {
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

export function evaluateEntityPermission({ policy, entityType, action }) {
  if (!policy?.entities || !entityType || !action) return null;
  const entityRules = policy.entities[entityType] || {};
  const decision = entityRules[action];
  if (!decision) return null;
  return decision === 'allow';
}

export function resetPolicyCache() {
  policyCache.clear();
}

export { normalizePolicy };
