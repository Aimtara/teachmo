/* eslint-env node */
import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireAnyScope } from '../middleware/permissions.js';
import { recordAuditLog } from '../utils/audit.js';
import { getRetentionPolicy } from '../utils/tenantSettings.js';
import { createLogger } from '../utils/logger.js';

const router = Router();
const logger = createLogger('routes.compliance');

async function safeQuery(res, sql, params = []) {
  try {
    return await query(sql, params);
  } catch (error) {
    logger.error('Database error', error);
    res.status(500).json({ error: 'db_error', detail: error.message });
    return null;
  }
}

async function deleteUserRecords(res, { userId, organizationId, schoolId }) {
  const steps = [
    {
      key: 'notification_queue',
      sql: `delete from public.notification_queue where recipient_id = $1`,
      params: [userId],
    },
    {
      key: 'notification_deliveries',
      sql: `delete from public.notification_deliveries where recipient_id = $1`,
      params: [userId],
    },
    {
      key: 'notification_events',
      sql: `delete from public.notification_events where recipient_id = $1`,
      params: [userId],
    },
    {
      key: 'notification_dead_letters',
      sql: `delete from public.notification_dead_letters where recipient_id = $1`,
      params: [userId],
    },
    {
      key: 'notification_preferences',
      sql: `delete from public.notification_preferences where user_id = $1`,
      params: [userId],
    },
    {
      key: 'notification_priorities',
      sql: `delete from public.notification_priorities where user_id = $1`,
      params: [userId],
    },
    {
      key: 'analytics_events',
      sql: `delete from public.analytics_events where actor_id = $1 and organization_id = $2`,
      params: [userId, organizationId],
    },
    {
      key: 'ai_interactions',
      sql: `delete from public.ai_interactions where actor_id = $1 and organization_id = $2`,
      params: [userId, organizationId],
    },
    {
      key: 'ai_review_actions',
      sql: `delete from public.ai_review_actions where actor_id = $1`,
      params: [userId],
    },
    {
      key: 'partner_commission_events',
      sql: `delete from public.partner_commission_events where partner_user_id = $1 and district_id = $2`,
      params: [userId, organizationId],
    },
    {
      key: 'partner_revenue_events',
      sql: `delete from public.partner_revenue_events where partner_user_id = $1 and district_id = $2`,
      params: [userId, organizationId],
    },
    {
      key: 'partner_fraud_signals',
      sql: `delete from public.partner_fraud_signals where partner_user_id = $1 and district_id = $2`,
      params: [userId, organizationId],
    },
    {
      key: 'partner_action_audits',
      sql: `delete from public.partner_action_audits where partner_user_id = $1 and district_id = $2`,
      params: [userId, organizationId],
    },
    {
      key: 'partner_action_audits_actor',
      sql: `delete from public.partner_action_audits where actor_id = $1 and district_id = $2`,
      params: [userId, organizationId],
    },
  ];

  const summary = {};

  for (const step of steps) {
    const result = await safeQuery(res, step.sql, step.params);
    if (!result) return null;
    summary[step.key] = result.rowCount || 0;
  }

  return summary;
}

router.use(requireAuth);
router.use(requireTenant);
router.use(requireAdmin);
router.use(requireAnyScope(['users:manage', 'tenant:manage', 'safety:review']));

router.get('/retention-policy', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const policy = await getRetentionPolicy({ organizationId, schoolId });
  res.json(policy);
});

router.get('/dsar-exports', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const result = await safeQuery(
    res,
    `select id, subject_user_id, status, created_at, expires_at
     from public.dsar_exports
     where organization_id = $1
       and school_id is not distinct from $2
     order by created_at desc
     limit 50`,
    [organizationId, schoolId ?? null]
  );
  if (!result) return;
  res.json(result.rows || []);
});

router.post('/dsar-exports', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const actorId = req.auth?.userId;
  const { userId, reason } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const userResult = await safeQuery(
    res,
    `select u.id, u.email, u.display_name, u.disabled, u.created_at,
            p.full_name, p.role, p.district_id, p.school_id, p.created_at as profile_created_at, p.updated_at as profile_updated_at
     from auth.users u
     join public.user_profiles p on p.user_id = u.id
     where u.id = $1
       and p.district_id = $2
       and (p.school_id is null or p.school_id = $3)
     limit 1`,
    [userId, organizationId, schoolId ?? null]
  );
  if (!userResult) return;
  const user = userResult.rows?.[0];
  if (!user) return res.status(404).json({ error: 'user_not_found' });

  const identitiesResult = await safeQuery(
    res,
    `select external_id, created_at, updated_at
     from public.scim_identities
     where user_id = $1
       and organization_id = $2
       and school_id is not distinct from $3`,
    [userId, organizationId, schoolId ?? null]
  );
  if (!identitiesResult) return;

  const auditResult = await safeQuery(
    res,
    `select id, actor_id, action, entity_type, entity_id, metadata, before_snapshot, after_snapshot, contains_pii, created_at
     from public.audit_log
     where entity_type = 'user'
       and entity_id = $1
       and organization_id = $2
       and school_id is not distinct from $3
     order by created_at desc
     limit 500`,
    [userId, organizationId, schoolId ?? null]
  );
  if (!auditResult) return;

  const exportPayload = {
    generatedAt: new Date().toISOString(),
    tenant: { organizationId, schoolId },
    subject: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      fullName: user.full_name,
      role: user.role,
      disabled: user.disabled,
      createdAt: user.created_at,
      profileCreatedAt: user.profile_created_at,
      profileUpdatedAt: user.profile_updated_at,
    },
    identities: identitiesResult.rows || [],
    auditLog: auditResult.rows || [],
  };

  const policy = await getRetentionPolicy({ organizationId, schoolId });
  const createdResult = await safeQuery(
    res,
    `insert into public.dsar_exports
      (organization_id, school_id, requested_by, subject_user_id, status, export_data, expires_at)
     values ($1, $2, $3, $4, 'ready', $5::jsonb, now() + ($6::int * interval '1 day'))
     returning id, created_at, expires_at`,
    [
      organizationId,
      schoolId ?? null,
      actorId,
      userId,
      JSON.stringify(exportPayload),
      policy.dsarExportDays,
    ]
  );
  if (!createdResult) return;

  await recordAuditLog({
    actorId,
    action: 'dsar.export',
    entityType: 'user',
    entityId: userId,
    metadata: { reason, exportId: createdResult.rows?.[0]?.id },
    before: exportPayload.subject,
    after: exportPayload.subject,
    containsPii: true,
    organizationId,
    schoolId,
  });

  const created = createdResult.rows?.[0];
  res.json({
    id: created?.id,
    status: 'ready',
    createdAt: created?.created_at,
    expiresAt: created?.expires_at,
    downloadUrl: `/api/admin/dsar-exports/${created?.id}/download`,
  });
});

router.get('/dsar-exports/:id/download', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const exportId = req.params.id;

  const result = await safeQuery(
    res,
    `select id, export_data, subject_user_id
     from public.dsar_exports
     where id = $1
       and organization_id = $2
       and school_id is not distinct from $3
     limit 1`,
    [exportId, organizationId, schoolId ?? null]
  );
  if (!result) return;
  const row = result.rows?.[0];
  if (!row) return res.status(404).json({ error: 'export_not_found' });

  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="dsar-export-${row.subject_user_id}.json"`
  );
  res.send(row.export_data);
});

router.post('/users/:id/hard-delete', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const actorId = req.auth?.userId;
  const userId = req.params.id;
  const { reason } = req.body || {};

  const userResult = await safeQuery(
    res,
    `select u.id, u.email, u.display_name, u.disabled,
            p.full_name, p.role, p.district_id, p.school_id
     from auth.users u
     join public.user_profiles p on p.user_id = u.id
     where u.id = $1
       and p.district_id = $2
       and (p.school_id is null or p.school_id = $3)
     limit 1`,
    [userId, organizationId, schoolId ?? null]
  );
  if (!userResult) return;
  const user = userResult.rows?.[0];
  if (!user) return res.status(404).json({ error: 'user_not_found' });

  const deletionSummary = await deleteUserRecords(res, { userId, organizationId, schoolId });
  if (!deletionSummary) return;

  await safeQuery(
    res,
    `delete from public.scim_group_members
     where user_id = $1`,
    [userId]
  );
  await safeQuery(
    res,
    `delete from public.scim_identities
     where user_id = $1
       and organization_id = $2
       and school_id is not distinct from $3`,
    [userId, organizationId, schoolId ?? null]
  );
  await safeQuery(
    res,
    `delete from public.user_profiles
     where user_id = $1`,
    [userId]
  );
  await safeQuery(
    res,
    `delete from auth.users
     where id = $1`,
    [userId]
  );

  await recordAuditLog({
    actorId,
    action: 'user.hard_delete',
    entityType: 'user',
    entityId: userId,
    metadata: { reason, deletionSummary },
    before: user,
    after: null,
    containsPii: true,
    organizationId,
    schoolId,
  });

  res.json({ status: 'deleted', userId, deletionSummary });
});

export default router;
