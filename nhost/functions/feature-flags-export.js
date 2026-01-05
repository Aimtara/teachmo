import { hasuraRequest } from './lib/hasura.js';

const allowedRoles = new Set(['system_admin', 'admin', 'district_admin', 'school_admin']);

function toCsv(rows) {
  if (!rows.length) return 'key,description,enabled,scope\n';
  const headers = ['key', 'description', 'enabled', 'scope'];
  const lines = [headers.join(',')];

  rows.forEach((row) => {
    const scope = row.school_id ? 'School' : 'Organization';
    const values = [
      row.key,
      row.description ?? '',
      row.enabled ? 'true' : 'false',
      scope
    ].map((value) => `"${String(value).replace(/"/g, '""')}"`);
    lines.push(values.join(','));
  });

  return lines.join('\n') + '\n';
}

export default async function featureFlagsExport(req, res) {
  if (req.method && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const role = String(req.headers['x-hasura-role'] ?? '');
  const organizationId = req.headers['x-hasura-organization-id']
    ? String(req.headers['x-hasura-organization-id'])
    : null;
  const schoolIdHeader = req.headers['x-hasura-school-id'] ? String(req.headers['x-hasura-school-id']) : null;

  if (!allowedRoles.has(role)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (!organizationId) {
    return res.status(400).json({ error: 'Missing organization scope' });
  }

  const { schoolId } = req.body ?? {};
  const effectiveSchoolId = schoolId ? String(schoolId) : schoolIdHeader;

  const query = `query FeatureFlagsExport($where: feature_flags_bool_exp!) {
    feature_flags(where: $where, order_by: { key: asc }) {
      key
      description
      enabled
      school_id
    }
  }`;

  const where = effectiveSchoolId
    ? { organization_id: { _eq: organizationId }, _or: [{ school_id: { _eq: effectiveSchoolId } }, { school_id: { _is_null: true } }] }
    : { organization_id: { _eq: organizationId } };

  const data = await hasuraRequest({ query, variables: { where } });
  const csv = toCsv(data?.feature_flags ?? []);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=feature-flags.csv');
  return res.status(200).send(csv);
}
