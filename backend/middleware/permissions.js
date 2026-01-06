/* eslint-env node */
import { resolveRoleScopes } from '../rbac.js';

function resolveScopes(req) {
  const fromAuth = Array.isArray(req.auth?.scopes) ? req.auth.scopes : [];
  const fromRole = resolveRoleScopes(req.auth?.role);
  return Array.from(new Set([...fromAuth, ...fromRole]));
}

function enforceScopes(required, { any = false } = {}) {
  const requiredScopes = (required || []).map(String).filter(Boolean);
  return (req, res, next) => {
    if (!requiredScopes.length) return next();
    const scopes = resolveScopes(req);
    const hasAccess = any
      ? requiredScopes.some((scope) => scopes.includes(scope))
      : requiredScopes.every((scope) => scopes.includes(scope));
    if (!hasAccess) return res.status(403).json({ error: 'forbidden' });
    return next();
  };
}

export function requireScopes(scopes) {
  return enforceScopes(scopes, { any: false });
}

export function requireAnyScope(scopes) {
  return enforceScopes(scopes, { any: true });
}
