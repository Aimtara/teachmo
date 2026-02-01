import { hasuraRequest } from './lib/hasura.js';
import { parse } from 'csv-parse/sync';

const allowedRoles = new Set(['school_admin', 'district_admin', 'admin', 'system_admin']);

// Error reporting limits
const MAX_ERRORS_IN_METADATA = 50;  // Maximum errors stored in job metadata
const MAX_WARNINGS_IN_RESPONSE = 5;  // Maximum warnings returned in API response

function parseCsv(text) {
  if (!text) return [];
  try {
    // Use proper RFC4180 CSV parser to handle quoted commas, newlines, etc.
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    return records;
  } catch (error) {
    console.error('CSV parsing error:', error);
    return [];
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

export default async function sisRosterImport(req, res) {
  let jobId = null;

  try {
    if (req.method && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const role = String(req.headers['x-hasura-role'] ?? '');
    const organizationId = req.headers['x-hasura-organization-id'];
    const userId = req.headers['x-hasura-user-id'];

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

    // Create import job
    jobId = await createImportJob(userId, organizationId, rosterType, {
      file_name: fileName,
      file_size: fileSize,
    });

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
      return res.status(200).json({ ok: true, inserted: 0, jobId });
    }

    // --- Validation Logic ---
    const validObjects = [];
    let skippedCount = 0;
    const errors = [];

    // Determine configuration based on roster type
    let idKeys = [];
    let tableName = '';
    let idFieldName = '';

    if (rosterType === 'students') {
      idKeys = ['sourcedId', 'id', 'student_id'];
      tableName = 'sis_roster_students';
      idFieldName = 'student ID';
    } else if (rosterType === 'teachers') {
      idKeys = ['sourcedId', 'id', 'teacher_id'];
      tableName = 'sis_roster_teachers';
      idFieldName = 'teacher ID';
    } else if (rosterType === 'classes') {
      idKeys = ['sourcedId', 'id', 'class_id'];
      tableName = 'sis_roster_classes';
      idFieldName = 'class ID';
    } else if (rosterType === 'enrollments') {
      tableName = 'sis_roster_enrollments';
      idFieldName = 'class ID or student ID';
    } else {
      // Unknown roster type - return error without updating job
      return res.status(400).json({ error: `Unknown roster type: ${rosterType}` });
    }

    // Filter and map records
    rawRecords.forEach((record, idx) => {
      if (rosterType === 'enrollments') {
        // Enrollments require both class and student IDs
        const classId = resolveExternalId(record, ['classSourcedId', 'class_id', 'class_sourced_id']);
        const studentId = resolveExternalId(record, ['userSourcedId', 'student_id', 'user_sourced_id']);
        
        if (!classId || !studentId) {
          skippedCount++;
          errors.push(`Row ${idx + 2}: Missing ${idFieldName}`);
          return;
        }

        validObjects.push({
          class_external_id: classId,
          student_external_id: studentId,
          organization_id: organizationId,
        });
      } else if (rosterType === 'classes') {
        // Classes require class ID; teacher ID may be required by database
        const extId = resolveExternalId(record, idKeys);
        const teacherId = resolveExternalId(record, ['teacherSourcedId', 'teacher_id', 'teacher_sourced_id']);
        
        if (!extId) {
          skippedCount++;
          errors.push(`Row ${idx + 2}: Missing ${idFieldName}`);
          return;
        }
        
        // Teacher ID validation: skip if missing
        if (!teacherId) {
          skippedCount++;
          errors.push(`Row ${idx + 2}: Missing teacher ID`);
          return;
        }

        validObjects.push({
          external_id: extId,
          name: record.name || record.title || '',
          teacher_external_id: teacherId,
          organization_id: organizationId,
        });
      } else {
        // Students and teachers
        const extId = resolveExternalId(record, idKeys);
        
        if (!extId) {
          skippedCount++;
          errors.push(`Row ${idx + 2}: Missing ${idFieldName}`);
          return;
        }

        const obj = {
          external_id: extId,
          organization_id: organizationId,
        };

        if (rosterType === 'students') {
          obj.first_name = record.first_name || record.givenName || '';
          obj.last_name = record.last_name || record.familyName || '';
          obj.grade = record.grade || null;
        } else if (rosterType === 'teachers') {
          obj.first_name = record.first_name || record.givenName || '';
          obj.last_name = record.last_name || record.familyName || '';
          obj.email = record.email || null;
        }

        validObjects.push(obj);
      }
    });

    // Perform insert if we have valid objects
    let insertedCount = 0;
    if (validObjects.length > 0) {
      try {
        const insertQuery = `
          mutation InsertRoster($objects: [${tableName}_insert_input!]!) {
            insert_${tableName}(objects: $objects, on_conflict: {
              constraint: ${tableName}_organization_id_external_id_key,
              update_columns: []
            }) {
              affected_rows
            }
          }
        `;
        
        const insertResult = await hasuraRequest({
          query: insertQuery,
          variables: { objects: validObjects },
        });
        
        insertedCount = insertResult[`insert_${tableName}`]?.affected_rows || 0;
      } catch (insertError) {
        errors.push(`Batch error: ${insertError.message}`);
        console.error('Batch insert error:', insertError);
      }
    }

    // Update job with final status
    const finalStatus = errors.length > 0 || skippedCount > 0 ? 'completed_with_errors' : 'completed';
    try {
      await updateImportJob(jobId, {
        status: finalStatus,
        finished_at: new Date().toISOString(),
        metadata: {
          file_name: fileName,
          file_size: fileSize,
          record_count: rawRecords.length,
          inserted_count: insertedCount,
          skipped_count: skippedCount,
          errors: errors.slice(0, MAX_ERRORS_IN_METADATA),
        },
      });
    } catch (updateError) {
      console.error('Failed to update SIS import job metadata', {
        jobId,
        error: updateError.message,
      });
    }

    return res.status(200).json({
      ok: true,
      inserted: insertedCount,
      skipped: skippedCount,
      jobId,
      warnings: errors.slice(0, MAX_WARNINGS_IN_RESPONSE),
    });

  } catch (err) {
    console.error('SIS Import Fatal Error:', err);
    
    // Try to mark job as failed if we have a jobId
    if (jobId) {
      try {
        await updateImportJob(jobId, {
          status: 'failed',
          finished_at: new Date().toISOString(),
          metadata: {
            error: err.message,
          },
        });
      } catch (updateError) {
        console.error('Failed to update job on error', updateError);
      }
    }
    
    return res.status(500).json({ error: 'Internal importer error' });
  }
}
