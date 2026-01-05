import { hasuraRequest } from './lib/hasura.js';

const allowedRoles = new Set(['school_admin', 'district_admin', 'admin', 'system_admin']);

function parseCsv(text) {
  if (!text) return [];
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const values = line.split(',').map((v) => v.trim());
      return headers.reduce((acc, header, idx) => {
        acc[header] = values[idx] ?? '';
        return acc;
      }, {});
    });
}

function buildFullName(record) {
  const first = record.first_name || record.givenName || record.firstName || '';
  const last = record.last_name || record.familyName || record.lastName || '';
  const name = record.name || record.full_name || `${first} ${last}`.trim();
  return name || null;
}

function resolveExternalId(record, keys) {
  for (const key of keys) {
    if (record[key]) return record[key];
  }
  return null;
}

export default async function sisRosterImport(req, res) {
  if (req.method && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const role = String(req.headers['x-hasura-role'] ?? '');
  const actorId = String(req.headers['x-hasura-user-id'] ?? '');
  const organizationId = req.headers['x-hasura-organization-id']
    ? String(req.headers['x-hasura-organization-id'])
    : null;
  const schoolIdHeader = req.headers['x-hasura-school-id'] ? String(req.headers['x-hasura-school-id']) : null;

  if (!actorId || !allowedRoles.has(role)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (!organizationId) {
    return res.status(400).json({ error: 'Missing organization scope' });
  }

  const {
    csvText,
    records,
    rosterType = 'students',
    source = 'csv',
    schoolId,
    fileName,
    fileSize
  } = req.body ?? {};
  const rosterRecords = Array.isArray(records) ? records : parseCsv(String(csvText ?? ''));
  const effectiveSchoolId = schoolId ? String(schoolId) : schoolIdHeader;

  if (!rosterRecords.length) {
    return res.status(200).json({ ok: true, inserted: 0 });
  }

  const insertJob = `mutation InsertSisJob($object: sis_import_jobs_insert_input!) {
    insert_sis_import_jobs_one(object: $object) { id }
  }`;

  const jobData = await hasuraRequest({
    query: insertJob,
    variables: {
      object: {
        organization_id: organizationId,
        school_id: effectiveSchoolId,
        roster_type: rosterType,
        source,
        status: 'processing',
        metadata: {
          file_name: fileName,
          file_size: fileSize,
          record_count: rosterRecords.length
        }
      }
    }
  });

  const jobId = jobData?.insert_sis_import_jobs_one?.id;
  if (!jobId) {
    return res.status(500).json({ error: 'Failed to create import job' });
  }

  const normalizedType = String(rosterType).toLowerCase();
  let table = null;
  let objects = [];

  if (normalizedType === 'students') {
    table = 'sis_roster_students';
    objects = rosterRecords.map((record) => ({
      job_id: jobId,
      organization_id: organizationId,
      school_id: effectiveSchoolId,
      external_id: resolveExternalId(record, ['sourcedId', 'id', 'student_id', 'external_id']) || 'unknown',
      first_name: record.first_name || record.givenName || record.firstName || null,
      last_name: record.last_name || record.familyName || record.lastName || null,
      grade: record.grade || record.grade_level || record.gradeLevel || null,
      data: record
    }));
  } else if (normalizedType === 'teachers') {
    table = 'sis_roster_teachers';
    objects = rosterRecords.map((record) => ({
      job_id: jobId,
      organization_id: organizationId,
      school_id: effectiveSchoolId,
      external_id: resolveExternalId(record, ['sourcedId', 'id', 'teacher_id', 'external_id']) || 'unknown',
      first_name: record.first_name || record.givenName || record.firstName || null,
      last_name: record.last_name || record.familyName || record.lastName || null,
      email: record.email || record.emailAddress || null,
      data: record
    }));
  } else if (normalizedType === 'classes') {
    table = 'sis_roster_classes';
    objects = rosterRecords.map((record) => ({
      job_id: jobId,
      organization_id: organizationId,
      school_id: effectiveSchoolId,
      external_id: resolveExternalId(record, ['sourcedId', 'id', 'class_id', 'external_id']) || 'unknown',
      name: record.name || record.title || record.className || null,
      teacher_external_id: resolveExternalId(record, ['teacherSourcedId', 'teacher_id', 'teacherExternalId']),
      data: record
    }));
  } else if (normalizedType === 'enrollments') {
    table = 'sis_roster_enrollments';
    objects = rosterRecords.map((record) => ({
      job_id: jobId,
      organization_id: organizationId,
      school_id: effectiveSchoolId,
      class_external_id: resolveExternalId(record, ['classSourcedId', 'class_id', 'classExternalId']) || 'unknown',
      student_external_id: resolveExternalId(record, ['userSourcedId', 'student_id', 'studentExternalId']) || 'unknown',
      data: record
    }));
  } else {
    table = 'sis_roster_users';
    objects = rosterRecords.map((record) => ({
      job_id: jobId,
      organization_id: organizationId,
      school_id: effectiveSchoolId,
      external_id: resolveExternalId(record, ['sourcedId', 'id', 'user_id', 'external_id']) || 'unknown',
      email: record.email || record.emailAddress || null,
      full_name: buildFullName(record),
      role: record.role || record.userRole || null,
      data: record
    }));
  }

  const insertRoster = `mutation InsertRoster($objects: [${table}_insert_input!]!) {
    insert_${table}(objects: $objects) { affected_rows }
  }`;

  const chunked = [];
  const chunkSize = 500;
  for (let i = 0; i < objects.length; i += chunkSize) {
    chunked.push(objects.slice(i, i + chunkSize));
  }

  let inserted = 0;
  for (const chunk of chunked) {
    const result = await hasuraRequest({
      query: insertRoster,
      variables: { objects: chunk }
    });
    inserted += result?.[`insert_${table}`]?.affected_rows ?? 0;
  }

  const updateJob = `mutation UpdateJob($id: uuid!, $changes: sis_import_jobs_set_input!) {
    update_sis_import_jobs_by_pk(pk_columns: { id: $id }, _set: $changes) { id }
  }`;

  await hasuraRequest({
    query: updateJob,
    variables: {
      id: jobId,
      changes: {
        status: 'completed',
        metadata: {
          file_name: fileName,
          file_size: fileSize,
          record_count: rosterRecords.length,
          inserted_count: inserted
        },
        finished_at: new Date().toISOString()
      }
    }
  });

  return res.status(200).json({ ok: true, inserted, jobId });
}
