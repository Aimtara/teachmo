import crypto from 'crypto';
import { hasuraRequest } from './lib/hasura.js';

const allowedRoles = new Set(['school_admin', 'district_admin', 'admin', 'system_admin']);

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).filter(Boolean).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    return headers.reduce((acc, header, idx) => {
      acc[header] = values[idx] ?? '';
      return acc;
    }, {});
  });
}

function sha256(value) {
  return crypto.createHash('sha256').update(value ?? '').digest('hex');
}

export default async function sisRosterImport(req, res) {
  if (req.method && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const role = String(req.headers['x-hasura-role'] ?? '');
  const actorId = String(req.headers['x-hasura-user-id'] ?? '');
  const districtId = req.headers['x-hasura-district-id'] ? String(req.headers['x-hasura-district-id']) : null;
  const schoolIdHeader = req.headers['x-hasura-school-id'] ? String(req.headers['x-hasura-school-id']) : null;

  if (!actorId || !allowedRoles.has(role)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { csvText, records, rosterType = 'users', source = 'csv', schoolId } = req.body ?? {};
  const rosterRecords = Array.isArray(records) ? records : parseCsv(String(csvText ?? ''));
  const effectiveSchoolId = schoolId ? String(schoolId) : schoolIdHeader;

  if (!districtId) {
    return res.status(400).json({ error: 'Missing district scope' });
  }

  if (!rosterRecords.length) {
    return res.status(200).json({ ok: true, inserted: 0 });
  }

  const objects = rosterRecords.slice(0, 500).map((record) => ({
    district_id: districtId,
    school_id: effectiveSchoolId,
    roster_type: rosterType,
    source,
    external_id: record.sourcedId || record.id || null,
    status: 'active',
    data: record,
    checksum: sha256(JSON.stringify(record)),
  }));

  const mutation = `mutation InsertSisRoster($objects: [sis_rosters_insert_input!]!) {
    insert_sis_rosters(objects: $objects) { affected_rows }
  }`;

  const result = await hasuraRequest({
    query: mutation,
    variables: { objects },
  });

  return res.status(200).json({
    ok: true,
    inserted: result?.insert_sis_rosters?.affected_rows ?? 0,
  });
}
