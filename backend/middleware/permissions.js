/* eslint-env node */
import { resolveRoleScopes } from '../rbac.js';
import { evaluateEntityPermission, getTenantPolicy, resolvePolicyScopes } from '../utils/policyEngine.js';
import { auditEvent } from '../security/audit.js';

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

export function requirePermission(actionOrConfig, entityType) {
  const config =
    typeof actionOrConfig === 'object' && actionOrConfig !== null
      ? actionOrConfig
      : { action: actionOrConfig, entityType };

  return async (req, res, next) => {
    try {
      const policy = await loadTenantPolicy(req);
      const action = config?.action;
      const resolvedEntityType = config?.entityType || 'feature';
      const decision = evaluateEntityPermission({
        policy,
        entityType: resolvedEntityType,
        action,
      });

      const scopes = await resolveScopes(req);
      req.permissions = {
        allowed: decision !== false,
        scopes,
      };

      if (decision === false) {
        await auditEvent(req, {
          eventType: 'access_denied_policy',
          severity: 'warn',
          meta: { action, entityType: resolvedEntityType, role: req.auth?.role },
        });
        return res.status(403).json({ error: 'forbidden' });
      }

      if (config?.scope && !scopes.includes(config.scope)) {
        return res.status(403).json({ error: 'forbidden' });
      }

      return next();
    } catch (error) {
      console.error('Policy enforcement failed:', error);
      return res.status(500).json({ error: 'policy_error' });
    }
  };
}

export function requireRole(allowedRoles) {
  return (req, res, next) => {
    const userRole = req.auth?.role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    return next();
  };
}
