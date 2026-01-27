/* eslint-env node */
import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireAnyScope } from '../middleware/permissions.js';
import { recordAuditLog } from '../utils/audit.js';
import { createLogger } from '../utils/logger.js';

const router = Router();
const logger = createLogger('routes.impersonation');

async function safeQuery(res, sql, params = []) {
  try {
    return await query(sql, params);
  } catch (error) {
    logger.error('Database error', error);
    res.status(500).json({ error: 'db_error', detail: error.message });
    return null;
  }
}

router.use(requireAuth);
router.use(requireTenant);
router.use(requireAdmin);
router.use(requireAnyScope(['users:manage', 'tenant:manage']));

router.post('/impersonations', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const adminUserId = req.auth?.userId;
  const { userId, reason } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const target = await safeQuery(
    res,
    `select user_id
     from public.user_profiles
     where user_id = $1
       and district_id = $2
       and (school_id is null or school_id = $3)
     limit 1`,
    [userId, organizationId, schoolId ?? null]
  );
  if (!target) return;
  if (!target.rows?.[0]) return res.status(404).json({ error: 'user_not_found' });

  const created = await safeQuery(
    res,
    `insert into public.impersonation_sessions (admin_user_id, target_user_id, organization_id, school_id, reason)
     values ($1, $2, $3, $4, $5)
     returning id, created_at, expires_at`,
    [adminUserId, userId, organizationId, schoolId ?? null, reason ?? null]
  );
  if (!created) return;

  await recordAuditLog({
    actorId: adminUserId,
    action: 'impersonation.start',
    entityType: 'user',
    entityId: userId,
    metadata: { reason, impersonationId: created.rows?.[0]?.id, organizationId, schoolId },
    organizationId,
    schoolId,
  });

  res.json({
    token: created.rows?.[0]?.id,
    expiresAt: created.rows?.[0]?.expires_at,
  });
});

router.delete('/impersonations/:id', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const adminUserId = req.auth?.userId;
  const sessionId = req.params.id;

  const ended = await safeQuery(
    res,
    `update public.impersonation_sessions
     set revoked_at = now()
     where id = $1
       and organization_id = $2
       and school_id is not distinct from $3
     returning id, target_user_id`,
    [sessionId, organizationId, schoolId ?? null]
  );
  if (!ended) return;
  if (!ended.rows?.[0]) return res.status(404).json({ error: 'session_not_found' });

  await recordAuditLog({
    actorId: adminUserId,
    action: 'impersonation.end',
    entityType: 'user',
    entityId: ended.rows?.[0]?.target_user_id,
    metadata: { impersonationId: sessionId, organizationId, schoolId },
    organizationId,
    schoolId,
  });

  res.json({ status: 'revoked' });
});

export default router;
