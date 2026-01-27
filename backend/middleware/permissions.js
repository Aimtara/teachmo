/* eslint-env node */
import { resolveRoleScopes } from '../rbac.js';
import { evaluateEntityPermission, getTenantPolicy, resolvePolicyScopes } from '../utils/policyEngine.js';

async function loadTenantPolicy(req) {
  if (req.policy) return req.policy;
  const policy = await getTenantPolicy(req.tenant || {});
  req.policy = policy;
  return policy;
}

async function resolveScopes(req) {
  const fromAuth = Array.isArray(req.auth?.scopes) ? req.auth.scopes : [];
  const role = req.auth?.role;
  const fromRole = resolveRoleScopes(role);
  const policy = await loadTenantPolicy(req);
  return resolvePolicyScopes({
    authScopes: fromAuth,
    roleScopes: fromRole,
    policy,
    role,
  });
}

function enforceScopes(required, { any = false } = {}) {
  const requiredScopes = (required || []).map(String).filter(Boolean);
  return async (req, res, next) => {
    if (!requiredScopes.length) return next();
    try {
      const scopes = await resolveScopes(req);
      const hasAccess = any
        ? requiredScopes.some((scope) => scopes.includes(scope))
        : requiredScopes.every((scope) => scopes.includes(scope));
      if (!hasAccess) return res.status(403).json({ error: 'forbidden' });
      return next();
    } catch (error) {
      return res.status(500).json({ error: 'policy_error' });
    }
  };
}

export function requireScopes(scopes) {
  return enforceScopes(scopes, { any: false });
}

export function requireAnyScope(scopes) {
  return enforceScopes(scopes, { any: true });
}

export function requirePermission({ entityType, action, scope }) {
  return async (req, res, next) => {
    try {
      const policy = await loadTenantPolicy(req);
      const decision = evaluateEntityPermission({ policy, entityType, action });
      if (decision === false) return res.status(403).json({ error: 'forbidden' });
      if (decision === true) return next();
      if (scope) {
        const scopes = await resolveScopes(req);
        if (!scopes.includes(scope)) return res.status(403).json({ error: 'forbidden' });
      }
      return next();
    } catch (error) {
      return res.status(500).json({ error: 'policy_error' });
    }
  };
}
