/* eslint-env node */
import { query } from '../db.js';
import { auditEvent } from '../security/audit.js';
import { maybeFlagAnomalyFromAudit } from '../security/anomaly.js';

async function hasMembership(familyId, userId) {
  const res = await query(
    `SELECT role FROM family_memberships WHERE family_id = $1 AND user_id = $2 LIMIT 1`,
    [familyId, userId]
  );
  if (res.rowCount === 1) return { ok: true, role: res.rows[0].role };
  return { ok: false, role: null };
}

export function authorizeFamilyParam(paramName = 'familyId') {
  return async (req, res, next) => {
    const familyId = req.params?.[paramName];
    if (!familyId) return res.status(400).json({ error: 'missing_familyId_param' });

    if (req.auth?.isService) {
      req.familyAccess = { familyId, role: 'service' };
      return next();
    }

    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'missing_auth_context' });

    const allowSelf = String(process.env.AUTH_ALLOW_SELF_FAMILY ?? 'false').toLowerCase() === 'true';
    if (allowSelf && familyId === userId) {
      req.familyAccess = { familyId, role: 'owner_dev_fallback' };
      return next();
    }

    const m = await hasMembership(familyId, userId);
    if (!m.ok) {
      await auditEvent(req, {
        eventType: 'forbidden_family',
        severity: 'warn',
        userId,
        familyId,
        statusCode: 403
      });

      await maybeFlagAnomalyFromAudit({ familyId, eventType: 'forbidden_family', windowMinutes: 10 });

      return res.status(403).json({ error: 'forbidden_family' });
    }

    req.familyAccess = { familyId, role: m.role };
    return next();
  };
}

export function authorizeFamilyBody(bodyKey = 'familyId') {
  return async (req, res, next) => {
    const familyId = req.body?.[bodyKey];
    if (!familyId) return res.status(400).json({ error: `missing_${bodyKey}_in_body` });

    if (req.auth?.isService) {
      req.familyAccess = { familyId, role: 'service' };
      return next();
    }

    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'missing_auth_context' });

    const allowSelf = String(process.env.AUTH_ALLOW_SELF_FAMILY ?? 'false').toLowerCase() === 'true';
    if (allowSelf && familyId === userId) {
      req.familyAccess = { familyId, role: 'owner_dev_fallback' };
      return next();
    }

    const m = await hasMembership(familyId, userId);
    if (!m.ok) {
      await auditEvent(req, {
        eventType: 'forbidden_family',
        severity: 'warn',
        userId,
        familyId,
        statusCode: 403
      });

      await maybeFlagAnomalyFromAudit({ familyId, eventType: 'forbidden_family', windowMinutes: 10 });

      return res.status(403).json({ error: 'forbidden_family' });
    }

    req.familyAccess = { familyId, role: m.role };
    return next();
  };
}
