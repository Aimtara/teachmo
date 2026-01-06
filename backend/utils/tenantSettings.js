/* eslint-env node */
import { query } from '../db.js';

const DEFAULT_RETENTION = {
  auditLogDays: 365,
  dsarExportDays: 30,
};

export function normalizeRetention(settings = {}) {
  const retention = settings?.retention ?? {};
  const auditLogDays = Number(retention.audit_log_days ?? retention.auditLogDays ?? DEFAULT_RETENTION.auditLogDays);
  const dsarExportDays = Number(retention.dsar_export_days ?? retention.dsarExportDays ?? DEFAULT_RETENTION.dsarExportDays);

  return {
    auditLogDays: Number.isFinite(auditLogDays) && auditLogDays > 0 ? auditLogDays : DEFAULT_RETENTION.auditLogDays,
    dsarExportDays: Number.isFinite(dsarExportDays) && dsarExportDays > 0 ? dsarExportDays : DEFAULT_RETENTION.dsarExportDays,
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
