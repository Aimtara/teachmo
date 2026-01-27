/* eslint-env node */
import { query } from '../db.js';
import { DEFAULT_RETENTION, normalizeRetention } from '../utils/tenantSettings.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('retention-purge');

function tenantKey(organizationId, schoolId) {
  return `${organizationId || 'unknown'}::${schoolId || 'none'}`;
}

async function loadRetentionPolicies() {
  const settingsResult = await query(
    `select district_id, school_id, settings
     from public.tenant_settings`
  );
  const policies = new Map();
  for (const row of settingsResult.rows || []) {
    policies.set(
      tenantKey(row.district_id, row.school_id),
      normalizeRetention(row.settings || {})
    );
  }
  return policies;
}

async function loadTenantTargets() {
  const targets = new Map();
  const auditTenants = await query(
    `select distinct organization_id, school_id
     from public.audit_log`
  );
  const dsarTenants = await query(
    `select distinct organization_id, school_id
     from public.dsar_exports`
  );

  for (const row of [...(auditTenants.rows || []), ...(dsarTenants.rows || [])]) {
    targets.set(tenantKey(row.organization_id, row.school_id), {
      organizationId: row.organization_id,
      schoolId: row.school_id,
    });
  }
  return targets;
}

export async function runRetentionPurge() {
  const policies = await loadRetentionPolicies();
  const targets = await loadTenantTargets();

  if (!targets.size) return { purged: 0 };

  let purged = 0;

  for (const { organizationId, schoolId } of targets.values()) {
    const policy = policies.get(tenantKey(organizationId, schoolId)) || DEFAULT_RETENTION;

    const auditResult = await query(
      `delete from public.audit_log
       where organization_id = $1
         and school_id is not distinct from $2
         and created_at < now() - ($3::int * interval '1 day')`,
      [organizationId, schoolId ?? null, policy.auditLogDays]
    );
    purged += auditResult.rowCount || 0;

    const dsarResult = await query(
      `delete from public.dsar_exports
       where organization_id = $1
         and school_id is not distinct from $2
         and created_at < now() - ($3::int * interval '1 day')`,
      [organizationId, schoolId ?? null, policy.dsarExportDays]
    );
    purged += dsarResult.rowCount || 0;

    const analyticsResult = await query(
      `delete from public.analytics_events
       where organization_id = $1
         and school_id is not distinct from $2
         and event_ts < now() - ($3::int * interval '1 day')`,
      [organizationId, schoolId ?? null, policy.analyticsDays]
    );
    purged += analyticsResult.rowCount || 0;

    const aiResult = await query(
      `delete from public.ai_interactions
       where organization_id = $1
         and school_id is not distinct from $2
         and created_at < now() - ($3::int * interval '1 day')`,
      [organizationId, schoolId ?? null, policy.aiInteractionDays]
    );
    purged += aiResult.rowCount || 0;

    const notificationEventResult = await query(
      `delete from public.notification_events
       where message_id in (
        select id from public.notification_messages
        where organization_id = $1
          and school_id is not distinct from $2
          and created_at < now() - ($3::int * interval '1 day')
       )`,
      [organizationId, schoolId ?? null, policy.notificationDays]
    );
    purged += notificationEventResult.rowCount || 0;

    const notificationDeliveryResult = await query(
      `delete from public.notification_deliveries
       where message_id in (
        select id from public.notification_messages
        where organization_id = $1
          and school_id is not distinct from $2
          and created_at < now() - ($3::int * interval '1 day')
       )`,
      [organizationId, schoolId ?? null, policy.notificationDays]
    );
    purged += notificationDeliveryResult.rowCount || 0;

    const notificationQueueResult = await query(
      `delete from public.notification_queue
       where message_id in (
        select id from public.notification_messages
        where organization_id = $1
          and school_id is not distinct from $2
          and created_at < now() - ($3::int * interval '1 day')
       )`,
      [organizationId, schoolId ?? null, policy.notificationDays]
    );
    purged += notificationQueueResult.rowCount || 0;

    const notificationDeadLetterResult = await query(
      `delete from public.notification_dead_letters
       where message_id in (
        select id from public.notification_messages
        where organization_id = $1
          and school_id is not distinct from $2
          and created_at < now() - ($3::int * interval '1 day')
       )`,
      [organizationId, schoolId ?? null, policy.notificationDays]
    );
    purged += notificationDeadLetterResult.rowCount || 0;

    const notificationMessageResult = await query(
      `delete from public.notification_messages
       where organization_id = $1
         and school_id is not distinct from $2
         and created_at < now() - ($3::int * interval '1 day')`,
      [organizationId, schoolId ?? null, policy.notificationDays]
    );
    purged += notificationMessageResult.rowCount || 0;
  }

  return { purged };
}

export function startRetentionPurgeScheduler() {
  const enabled = String(process.env.RETENTION_PURGE_ENABLED || 'true').toLowerCase() !== 'false';
  if (!enabled) return null;

  const intervalMinutes = Number(process.env.RETENTION_PURGE_INTERVAL_MINUTES || 1440);
  const intervalMs = Number.isFinite(intervalMinutes) && intervalMinutes > 0
    ? intervalMinutes * 60 * 1000
    : 24 * 60 * 60 * 1000;

  const timer = setInterval(() => {
    runRetentionPurge().catch((error) => {
      logger.error('Retention purge failed', error);
    });
  }, intervalMs);

  return timer;
}
