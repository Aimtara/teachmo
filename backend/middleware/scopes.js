/* eslint-env node */
import { resolveRoleScopes } from '../rbac.js';

function getEffectiveScopes(req) {
  const roleScopes = resolveRoleScopes(req.auth?.role);
  const claimScopes = Array.isArray(req.auth?.scopes) ? req.auth.scopes : [];
  return new Set([...roleScopes, ...claimScopes]);
}

export function requireScopes(required, { any = false } = {}) {
  const needed = Array.isArray(required) ? required : [required];
  return (req, res, next) => {
    const scopeSet = getEffectiveScopes(req);
    if (!needed.length) return next();
    const hasMatch = any
      ? needed.some((scope) => scopeSet.has(scope))
      : needed.every((scope) => scopeSet.has(scope));
    if (!hasMatch) {
      return res.status(403).json({ error: 'missing_scope', required: needed });
    }
    return next();
  };
}

export function attachScopes(req, res, next) {
  req.scopes = Array.from(getEffectiveScopes(req));
  next();
}
