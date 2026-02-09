/* eslint-env node */
import { query } from '../db.js';

const MAX_EXPORT_LIMIT = 5000;

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/^[=+\-@]/.test(str)) {
    return `'${str.replace(/"/g, '""')}"`;
  }
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function buildAuditExportCsv({
  organizationId,
  schoolId,
  search,
  limit = 500,
  offset = 0,
}) {
  const effectiveLimit = Math.min(Math.max(Number(limit) || 500, 1), MAX_EXPORT_LIMIT);

  let where = 'organization_id = $1 and school_id is not distinct from $2';
  const params = [organizationId, schoolId ?? null];

  if (search) {
    params.push(`%${search}%`);
    params.push(`%${search}%`);
    where += ` and (action ilike $${params.length - 1} or entity_type ilike $${params.length})`;
  }

  params.push(effectiveLimit);
  params.push(Number(offset) || 0);

  const result = await query(
    `select created_at, actor_id, action, entity_type, entity_id, metadata, before_snapshot, after_snapshot, contains_pii
     from public.audit_log
     where ${where}
     order by created_at desc
     limit $${params.length - 1} offset $${params.length}`,
    params
  );

  const headers = [
    'created_at',
    'actor_id',
    'action',
    'entity_type',
    'entity_id',
    'metadata',
    'before_snapshot',
    'after_snapshot',
    'contains_pii',
  ];

  const rows = result.rows || [];
  return [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          let value = row[header];
          if (['metadata', 'before_snapshot', 'after_snapshot'].includes(header)) {
            value = value ? JSON.stringify(value) : '';
          }
          return escapeCsv(value);
        })
        .join(',')
    ),
  ].join('\n');
}

export function getAuditExportLimit() {
  return MAX_EXPORT_LIMIT;
}
