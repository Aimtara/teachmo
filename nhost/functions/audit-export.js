import { hasuraRequest } from './lib/hasura.js';

const allowedRoles = new Set(['school_admin', 'district_admin', 'admin', 'system_admin']);

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default async function auditExport(req, res) {
  if (req.method && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const role = String(req.headers['x-hasura-role'] ?? '');
  const actorId = String(req.headers['x-hasura-user-id'] ?? '');
  const organizationIdHeader = req.headers['x-hasura-organization-id']
    ? String(req.headers['x-hasura-organization-id'])
    : null;
  const schoolIdHeader = req.headers['x-hasura-school-id'] ? String(req.headers['x-hasura-school-id']) : null;

  if (!actorId || !allowedRoles.has(role)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { search, organizationId, schoolId, limit = 500, offset = 0 } = req.body ?? {};
  const effectiveOrganizationId = organizationId ?? organizationIdHeader;
  const effectiveSchoolId = schoolId ?? schoolIdHeader;

  if (!effectiveOrganizationId && !effectiveSchoolId) {
    return res.status(400).json({ error: 'Missing tenant scope' });
  }

  const where = effectiveSchoolId
    ? { school_id: { _eq: effectiveSchoolId } }
    : { organization_id: { _eq: effectiveOrganizationId } };

  if (search) {
    where._or = [
      { action: { _ilike: `%${search}%` } },
      { entity_type: { _ilike: `%${search}%` } },
    ];
  }

  const query = `query AuditExport($where: audit_log_bool_exp!, $limit: Int!, $offset: Int!) {
    audit_log(where: $where, order_by: { created_at: desc }, limit: $limit, offset: $offset) {
      created_at
      actor_id
      action
      entity_type
      entity_id
      organization_id
      school_id
      metadata
    }
  }`;

  const data = await hasuraRequest({
    query,
    variables: {
      where,
      limit,
      offset,
    },
  });

  const rows = data?.audit_log ?? [];
  const headers = [
    'created_at',
    'actor_id',
    'action',
    'entity_type',
    'entity_id',
    'organization_id',
    'school_id',
    'metadata'
  ];

  const csv = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = header === 'metadata' ? JSON.stringify(row[header] ?? {}) : row[header];
          return escapeCsv(value);
        })
        .join(',')
    )
  ].join('\n');

  res.setHeader('content-type', 'text/csv');
  res.setHeader('content-disposition', 'attachment; filename="audit-logs.csv"');
  return res.status(200).send(csv);
}
