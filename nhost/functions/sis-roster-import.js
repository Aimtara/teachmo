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
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      return headers.reduce((acc, header, idx) => {
        acc[header] = values[idx] ?? '';
        return acc;
      }, {});
    });
}

function resolveExternalId(record, keys) {
  for (const key of keys) {
    if (record[key] && record[key] !== '') return record[key];
  }
  return null;
}

export default async function sisRosterImport(req, res) {
  try {
    if (req.method && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const role = String(req.headers['x-hasura-role'] ?? '');
    const actorId = String(req.headers['x-hasura-user-id'] ?? '');
    const organizationId = req.headers['x-hasura-organization-id']
      ? String(req.headers['x-hasura-organization-id'])
      : null;
    const schoolIdHeader = req.headers['x-hasura-school-id']
      ? String(req.headers['x-hasura-school-id'])
      : null;

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
    const rawRecords = Array.isArray(records) ? records : parseCsv(String(csvText ?? ''));
    const effectiveSchoolId = schoolId ? String(schoolId) : schoolIdHeader;

    if (!rawRecords.length) {
      return res.status(200).json({ ok: true, inserted: 0, skipped: 0 });
    }

    const validObjects = [];
    let skippedCount = 0;
    const errors = [];

    const jobId = await createImportJob(
      organizationId,
      effectiveSchoolId,
      rosterType,
      source,
      fileName,
      fileSize,
      rawRecords.length
    );
    if (!jobId) {
      return res.status(500).json({ error: 'Failed to create import job' });
    }

    const normalizedType = String(rosterType).toLowerCase();
    let table = null;

    if (normalizedType === 'students') {
      table = 'sis_roster_students';
      rawRecords.forEach((record, idx) => {
        const extId = resolveExternalId(record, ['sourcedId', 'id', 'student_id', 'external_id']);
        if (!extId) {
          skippedCount += 1;
          errors.push(`Row ${idx + 2}: Missing student ID`);
          return;
        }
        validObjects.push({
          job_id: jobId,
          organization_id: organizationId,
          school_id: effectiveSchoolId,
          external_id: extId,
          first_name: record.first_name || record.givenName || record.firstName || null,
          last_name: record.last_name || record.familyName || record.lastName || null,
          grade: record.grade || record.grade_level || record.gradeLevel || null,
          data: record
        });
      });
    } else if (normalizedType === 'teachers') {
      table = 'sis_roster_teachers';
      rawRecords.forEach((record, idx) => {
        const extId = resolveExternalId(record, ['sourcedId', 'id', 'teacher_id', 'external_id']);
        if (!extId) {
          skippedCount += 1;
          errors.push(`Row ${idx + 2}: Missing teacher ID`);
          return;
        }
        validObjects.push({
          job_id: jobId,
          organization_id: organizationId,
          school_id: effectiveSchoolId,
          external_id: extId,
          first_name: record.first_name || record.givenName || record.firstName || null,
          last_name: record.last_name || record.familyName || record.lastName || null,
          email: record.email || record.emailAddress || null,
          data: record
        });
      });
    } else if (normalizedType === 'classes') {
      table = 'sis_roster_classes';
      rawRecords.forEach((record, idx) => {
        const extId = resolveExternalId(record, ['sourcedId', 'id', 'class_id', 'external_id']);
        if (!extId) {
          skippedCount += 1;
          errors.push(`Row ${idx + 2}: Missing class ID`);
          return;
        }
        validObjects.push({
          job_id: jobId,
          organization_id: organizationId,
          school_id: effectiveSchoolId,
          external_id: extId,
          name: record.name || record.title || record.className || 'Untitled Class',
          teacher_external_id: resolveExternalId(record, [
            'teacherSourcedId',
            'teacher_id',
            'teacherExternalId'
          ]),
          data: record
        });
      });
    } else if (normalizedType === 'enrollments') {
      table = 'sis_roster_enrollments';
      rawRecords.forEach((record, idx) => {
        const classId = resolveExternalId(record, ['classSourcedId', 'class_id', 'classExternalId']);
        const studentId = resolveExternalId(record, ['userSourcedId', 'student_id', 'studentExternalId']);
        if (!classId || !studentId) {
          skippedCount += 1;
          errors.push(`Row ${idx + 2}: Missing class ID or student ID`);
          return;
        }
        validObjects.push({
          job_id: jobId,
          organization_id: organizationId,
          school_id: effectiveSchoolId,
          class_external_id: classId,
          student_external_id: studentId,
          data: record
        });
      });
    } else {
      return res.status(400).json({ error: `Unknown roster type: ${rosterType}` });
    }

    // Determine which columns should be updated on conflict.
    // Default to updating only the JSONB "data" field to preserve existing behavior.
    // For tables where we have explicit normalized columns in this file, include them
    // so they stay in sync with the latest CSV on re-import.
    let updateColumns = '[data]';
    if (table === 'sis_roster_classes') {
      // For classes, "name" and "teacher_external_id" are normalized, non-key fields
      // that should be updated when the source roster changes.
      updateColumns = '[name, teacher_external_id, data]';
    }

    const insertRoster = `mutation InsertRoster($objects: [${table}_insert_input!]!) {
      insert_${table}(
        objects: $objects,
        on_conflict: { constraint: ${table}_pkey, update_columns: ${updateColumns} }
      ) { affected_rows }
    }`;

    const chunked = [];
    const chunkSize = 500;
    for (let i = 0; i < validObjects.length; i += chunkSize) {
      chunked.push(validObjects.slice(i, i + chunkSize));
    }

    let inserted = 0;
    for (const chunk of chunked) {
      try {
        const result = await hasuraRequest({
          query: insertRoster,
          variables: { objects: chunk }
        });
        inserted += result?.[`insert_${table}`]?.affected_rows ?? 0;
      } catch (err) {
        console.error(`Batch import failed for ${table}`, err);
        errors.push(`Batch error: ${err.message}`);
      }
    }

    try {
      await updateImportJob(jobId, {
        status: errors.length > 0 ? 'completed_with_errors' : 'completed',
        metadata: {
          file_name: fileName,
          file_size: fileSize,
          record_count: rawRecords.length,
          inserted_count: inserted,
          skipped_count: skippedCount,
          errors: errors.slice(0, 50)
        },
        finished_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to update SIS import job metadata', { jobId, error: err });
    }

    return res.status(200).json({
      ok: true,
      inserted,
      skipped: skippedCount,
      jobId,
      warnings: errors.length > 0 ? errors.slice(0, 5) : []
    });
  } catch (err) {
    console.error('SIS Import Fatal Error:', err);
    return res.status(500).json({ error: 'Internal importer error' });
  }
}

async function createImportJob(orgId, schoolId, type, source, fileName, fileSize, count) {
  const insertJob = `mutation InsertSisJob($object: sis_import_jobs_insert_input!) {
    insert_sis_import_jobs_one(object: $object) { id }
  }`;
  const res = await hasuraRequest({
    query: insertJob,
    variables: {
      object: {
        organization_id: orgId,
        school_id: schoolId,
        roster_type: type,
        source,
        status: 'processing',
        metadata: { file_name: fileName, file_size: fileSize, record_count: count }
      }
    }
  });
  return res?.insert_sis_import_jobs_one?.id;
}

async function updateImportJob(id, changes) {
  const updateJob = `mutation UpdateJob($id: uuid!, $changes: sis_import_jobs_set_input!) {
    update_sis_import_jobs_by_pk(pk_columns: { id: $id }, _set: $changes) { id }
  }`;
  await hasuraRequest({
    query: updateJob,
    variables: { id, changes }
  });
}
