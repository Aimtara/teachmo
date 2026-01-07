/* eslint-env node */
import { query } from '../db.js';

const DEFAULT_RETENTION = {
  auditLogDays: 365,
  dsarExportDays: 30,
  analyticsDays: 180,
  notificationDays: 90,
  aiInteractionDays: 180,
};

export function normalizeRetention(settings = {}) {
  const retention = settings?.retention ?? {};
  const auditLogDays = Number(retention.audit_log_days ?? retention.auditLogDays ?? DEFAULT_RETENTION.auditLogDays);
  const dsarExportDays = Number(retention.dsar_export_days ?? retention.dsarExportDays ?? DEFAULT_RETENTION.dsarExportDays);
  const analyticsDays = Number(retention.analytics_days ?? retention.analyticsDays ?? DEFAULT_RETENTION.analyticsDays);
  const notificationDays = Number(retention.notification_days ?? retention.notificationDays ?? DEFAULT_RETENTION.notificationDays);
  const aiInteractionDays = Number(retention.ai_interaction_days ?? retention.aiInteractionDays ?? DEFAULT_RETENTION.aiInteractionDays);

  return {
    auditLogDays: Number.isFinite(auditLogDays) && auditLogDays > 0 ? auditLogDays : DEFAULT_RETENTION.auditLogDays,
    dsarExportDays: Number.isFinite(dsarExportDays) && dsarExportDays > 0 ? dsarExportDays : DEFAULT_RETENTION.dsarExportDays,
    analyticsDays: Number.isFinite(analyticsDays) && analyticsDays > 0 ? analyticsDays : DEFAULT_RETENTION.analyticsDays,
    notificationDays: Number.isFinite(notificationDays) && notificationDays > 0 ? notificationDays : DEFAULT_RETENTION.notificationDays,
    aiInteractionDays: Number.isFinite(aiInteractionDays) && aiInteractionDays > 0 ? aiInteractionDays : DEFAULT_RETENTION.aiInteractionDays,
  };
}

export async function fetchTenantSettings({ organizationId, schoolId }) {
  const result = await query(
    `select settings
     from public.tenant_settings
     where district_id = $1
       and (school_id is null or school_id = $2)
     order by school_id desc nulls last
     limit 1`,
    [organizationId, schoolId ?? null]
  );
  return result.rows?.[0]?.settings ?? {};
}

export async function getRetentionPolicy({ organizationId, schoolId }) {
  const settings = await fetchTenantSettings({ organizationId, schoolId });
  return normalizeRetention(settings);
}

export { DEFAULT_RETENTION };
