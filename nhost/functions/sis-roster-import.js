import { hasuraRequest } from './lib/hasura.js';
import { parse } from 'csv-parse/sync';

const allowedRoles = new Set(['school_admin', 'district_admin', 'admin', 'system_admin']);

// Whitelist of valid SIS roster table names to prevent GraphQL injection
const ALLOWED_TABLES = new Set([
  'sis_roster_students',
  'sis_roster_teachers',
  'sis_roster_classes',
  'sis_roster_enrollments'
]);

function parseCsv(text) {
  if (!text) return [];
  try {
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    return records.map((r, idx) => ({ ...r, __lineNumber: idx + 2 }));
  } catch (err) {
    const preview = text.length > 200 ? `${text.substring(0, 200)}...` : text;
    console.error('CSV parsing failed:', {
      error: err.message,
      preview,
      textLength: text.length,
    });

    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim());
    return lines
      .slice(1)
      .map((line, idx) => ({ line, originalLineNumber: idx + 2 }))
      .filter(({ line }) => line)
      .map(({ line, originalLineNumber }) => {
        const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
        const record = headers.reduce((acc, header, index) => {
          acc[header] = values[index] ?? '';
          return acc;
        }, {});
        record.__lineNumber = originalLineNumber;
        return record;
      });
  }
}

function resolveExternalId(record, keys) {
  for (const key of keys) {
    if (record[key] && record[key] !== '') return record[key];
  }
  return null;
}

async function createImportJob(userId, organizationId, rosterType, metadata = {}) {
  const query = `
    mutation CreateImportJob($object: sis_import_jobs_insert_input!) {
      insert_sis_import_jobs_one(object: $object) {
        id
      }
    }
  `;
  const result = await hasuraRequest({
    query,
    variables: {
      object: {
        user_id: userId,
        organization_id: organizationId,
        roster_type: rosterType,
        status: 'processing',
        metadata,
      },
    },
  });
  return result.insert_sis_import_jobs_one.id;
}

async function updateImportJob(jobId, changes) {
  const query = `
    mutation UpdateJob($id: uuid!, $changes: sis_import_jobs_set_input!) {
      update_sis_import_jobs_by_pk(pk_columns: { id: $id }, _set: $changes) {
        id
      }
    }
  `;
  await hasuraRequest({
    query,
    variables: { id: jobId, changes },
  });
}

function getRosterConfig(rosterType) {
  switch (rosterType) {
    case 'students':
      return {
        tableName: 'sis_roster_students',
        idKeys: ['sourcedId', 'id', 'student_id', 'external_id'],
        idFieldName: 'student ID',
      };
    case 'teachers':
      return {
        tableName: 'sis_roster_teachers',
        idKeys: ['sourcedId', 'id', 'teacher_id', 'external_id'],
        idFieldName: 'teacher ID',
      };
    case 'classes':
      return {
        tableName: 'sis_roster_classes',
        idKeys: ['sourcedId', 'id', 'class_id', 'external_id'],
        idFieldName: 'class ID',
      };
    case 'enrollments':
      return {
        tableName: 'sis_roster_enrollments',
        idKeys: [],
        idFieldName: 'class ID or student ID',
      };
    default:
      return null;
  }
}

export default async function sisRosterImport(req, res) {
  let jobId = null;

  try {
    if (req.method && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const role = String(req.headers['x-hasura-role'] ?? '');
    const userId = String(req.headers['x-hasura-user-id'] ?? '');
    const organizationId = req.headers['x-hasura-organization-id']
      ? String(req.headers['x-hasura-organization-id'])
      : null;
    const schoolId = req.headers['x-hasura-school-id']
      ? String(req.headers['x-hasura-school-id'])
      : null;

    if (!allowedRoles.has(role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    if (!organizationId) {
      return res.status(400).json({ error: 'Missing organization scope' });
    }

    const {
      csvText,
      records,
      rosterType = 'students',
      fileName,
      fileSize,
    } = req.body ?? {};

    const rawRecords = Array.isArray(records) ? records : parseCsv(String(csvText ?? ''));

    jobId = await createImportJob(userId, organizationId, rosterType, {
      file_name: fileName,
      file_size: fileSize,
    });

    const config = getRosterConfig(rosterType);
    if (!config) {
      return res.status(400).json({ error: `Unknown roster type: ${rosterType}` });
    }

    const { tableName, idKeys, idFieldName } = config;

    if (!ALLOWED_TABLES.has(tableName)) {
      return res.status(400).json({ error: `Unknown roster type: ${rosterType}` });
    }

    if (!rawRecords.length) {
      await updateImportJob(jobId, {
        status: 'completed',
        finished_at: new Date().toISOString(),
        metadata: {
          file_name: fileName,
          file_size: fileSize,
          record_count: 0,
          inserted_count: 0,
          skipped_count: 0,
          errors: [],
        },
      });
      return res.status(200).json({ ok: true, inserted: 0, skipped: 0, jobId, warnings: [] });
    }

    const validObjects = [];
    let skippedCount = 0;
    const errors = [];

    rawRecords.forEach((record, idx) => {
      const lineNumber = record.__lineNumber ?? idx + 2;

      if (rosterType === 'enrollments') {
        const classId = resolveExternalId(record, ['classSourcedId', 'class_id', 'class_sourced_id', 'classExternalId']);
        const studentId = resolveExternalId(record, ['userSourcedId', 'student_id', 'user_sourced_id', 'studentExternalId']);

        if (!classId || !studentId) {
          skippedCount += 1;
          errors.push(`Row ${lineNumber}: Missing ${idFieldName}`);
          return;
        }

        const { __lineNumber, ...cleanRecord } = record;
        validObjects.push({
          job_id: jobId,
          organization_id: organizationId,
          school_id: schoolId,
          class_external_id: classId,
          student_external_id: studentId,
          data: cleanRecord,
        });
        return;
      }

      const extId = resolveExternalId(record, idKeys);
      if (!extId) {
        skippedCount += 1;
        errors.push(`Row ${lineNumber}: Missing ${idFieldName}`);
        return;
      }

      if (rosterType === 'classes') {
        const teacherId = resolveExternalId(record, [
          'teacherSourcedId',
          'teacher_id',
          'teacher_sourced_id',
          'teacherExternalId',
        ]);
        if (!teacherId) {
          skippedCount += 1;
          errors.push(`Row ${lineNumber}: Missing teacher ID`);
          return;
        }
        const { __lineNumber, ...cleanRecord } = record;
        validObjects.push({
          job_id: jobId,
          organization_id: organizationId,
          school_id: schoolId,
          external_id: extId,
          name: record.name || record.title || record.className || 'Untitled Class',
          teacher_external_id: teacherId,
          data: cleanRecord,
        });
        return;
      }

      const { __lineNumber, ...cleanRecord } = record;
      validObjects.push({
        job_id: jobId,
        organization_id: organizationId,
        school_id: schoolId,
        external_id: extId,
        first_name: record.first_name || record.givenName || record.firstName || null,
        last_name: record.last_name || record.familyName || record.lastName || null,
        grade: rosterType === 'students'
          ? (record.grade || record.grade_level || record.gradeLevel || null)
          : null,
        email: rosterType === 'teachers'
          ? (record.email || record.emailAddress || null)
          : null,
        data: cleanRecord,
      });
    });

    let inserted = 0;
    if (validObjects.length) {
      try {
        const mutation = `
          mutation InsertRoster($objects: [${tableName}_insert_input!]!) {
            insert_${tableName}(objects: $objects) {
              affected_rows
            }
          }
        `;
        const result = await hasuraRequest({
          query: mutation,
          variables: { objects: validObjects },
        });
        const responseKey = `insert_${tableName}`;
        inserted = result?.[responseKey]?.affected_rows ?? 0;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Batch error: ${message}`);
      }
    }

    const finishedAt = new Date().toISOString();
    const status = errors.length || skippedCount ? 'completed_with_errors' : 'completed';
    const metadata = {
      file_name: fileName,
      file_size: fileSize,
      record_count: rawRecords.length,
      inserted_count: inserted,
      skipped_count: skippedCount,
      errors: errors.slice(0, 50),
    };

    try {
      await updateImportJob(jobId, {
        status,
        finished_at: finishedAt,
        metadata,
      });
    } catch (err) {
      console.error('Failed to update SIS import job metadata', {
        jobId,
        error: err instanceof Error ? err.message : err,
      });
      return res.status(500).json({ error: 'Failed to update SIS import job metadata' });
    }

    return res.status(200).json({
      ok: true,
      inserted,
      skipped: skippedCount,
      jobId,
      warnings: errors.slice(0, 5),
    });
  } catch (err) {
    if (jobId) {
      try {
        await updateImportJob(jobId, {
          status: 'failed',
          finished_at: new Date().toISOString(),
          metadata: {
            errors: [err instanceof Error ? err.message : 'Unknown error'],
          },
        });
      } catch (updateError) {
        console.error('Failed to update SIS import job metadata after error', {
          jobId,
          error: updateError instanceof Error ? updateError.message : updateError,
        });
      }
    }

    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
