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
    // Use proper RFC4180 CSV parser to handle quoted commas, newlines, etc.
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    
    // Attach line numbers for error reporting (1-based + header row)
    return records.map((r, idx) => ({...r, __lineNumber: idx + 2}));
  } catch (err) {
    // Log detailed error information to help diagnose parsing issues
    const preview = text.length > 200 ? text.substring(0, 200) + '...' : text;
    console.error('CSV parsing failed:', {
      error: err.message,
      preview,
      textLength: text.length
    });
    
    // Fallback: simple split parsing for basic CSVs
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim());
    return lines
      .slice(1)
      .map((line, idx) => ({ line, originalLineNumber: idx + 2 })) // Track original line number (1-based + header)
      .filter(({ line }) => line) // Filter out empty lines but preserve line numbers
      .map(({ line, originalLineNumber }) => {
        const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
        const record = headers.reduce((acc, header, idx) => {
          acc[header] = values[idx] ?? '';
          return acc;
        }, {});
        record.__lineNumber = originalLineNumber; // Attach original line number to each record
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

export default async function sisRosterImport(req, res) {
  let jobId = null;

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

    const validObjects = [];
    let skippedCount = 0;
    const errors = [];

    // Determine configuration based on roster type
    let idKeys = [];
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
          skippedCount += 1;
          errors.push(`Row ${record.__lineNumber ?? idx + 2}: Missing ${idFieldName}`);
          return;
        }
        const { __lineNumber, ...cleanRecord } = record;
        validObjects.push({
          job_id: jobId,
          organization_id: organizationId,
          school_id: effectiveSchoolId,
          external_id: extId,
          first_name: record.first_name || record.givenName || record.firstName || null,
          last_name: record.last_name || record.familyName || record.lastName || null,
          grade: record.grade || record.grade_level || record.gradeLevel || null,
          data: cleanRecord
        });
      });
    } else if (normalizedType === 'teachers') {
      table = 'sis_roster_teachers';
      rawRecords.forEach((record, idx) => {
        const extId = resolveExternalId(record, ['sourcedId', 'id', 'teacher_id', 'external_id']);
        if (!extId) {
          skippedCount += 1;
          errors.push(`Row ${record.__lineNumber ?? idx + 2}: Missing teacher ID`);
          return;
        }
        const { __lineNumber, ...cleanRecord } = record;
        validObjects.push({
          job_id: jobId,
          organization_id: organizationId,
          school_id: effectiveSchoolId,
          external_id: extId,
          first_name: record.first_name || record.givenName || record.firstName || null,
          last_name: record.last_name || record.familyName || record.lastName || null,
          email: record.email || record.emailAddress || null,
          data: cleanRecord
        });
      });
    } else if (normalizedType === 'classes') {
      table = 'sis_roster_classes';
      rawRecords.forEach((record, idx) => {
        const extId = resolveExternalId(record, ['sourcedId', 'id', 'class_id', 'external_id']);
        if (!extId) {
          skippedCount += 1;
          errors.push(`Row ${record.__lineNumber ?? idx + 2}: Missing class ID`);
          return;
        }
        const teacherId = resolveExternalId(record, [
          'teacherSourcedId',
          'teacher_id',
          'teacherExternalId'
        ]);
        if (!teacherId) {
          skippedCount += 1;
          errors.push(
            `Row ${record.__lineNumber ?? idx + 2}: Missing teacher ID for class ${extId}. ` +
              'Classes now require a teacher_id in the CSV; records without a teacher will be skipped.'
          );
          return;
        }
        const { __lineNumber, ...cleanRecord } = record;
        validObjects.push({
          job_id: jobId,
          organization_id: organizationId,
          school_id: effectiveSchoolId,
          external_id: extId,
          name: record.name || record.title || record.className || 'Untitled Class',
          teacher_external_id: teacherId,
          data: cleanRecord
        });
      });
    } else if (normalizedType === 'enrollments') {
      table = 'sis_roster_enrollments';
      rawRecords.forEach((record, idx) => {
        const classId = resolveExternalId(record, ['classSourcedId', 'class_id', 'classExternalId']);
        const studentId = resolveExternalId(record, ['userSourcedId', 'student_id', 'studentExternalId']);
        if (!classId || !studentId) {
          skippedCount += 1;
          errors.push(`Row ${record.__lineNumber ?? idx + 2}: Missing class ID or student ID`);
          return;
        }
        const { __lineNumber, ...cleanRecord } = record;
        validObjects.push({
          job_id: jobId,
          organization_id: organizationId,
          school_id: effectiveSchoolId,
          class_external_id: classId,
          student_external_id: studentId,
          data: cleanRecord
        });
      });
    } else {
      // Unknown roster type: mark the job as failed so it doesn't remain stuck in "processing".
      try {
        await hasuraRequest({
          query: `
            mutation MarkRosterImportJobFailed($job_id: uuid!) {
              update_sis_roster_import_jobs_by_pk(
                pk_columns: { id: $job_id },
                _set: { status: "failed" }
              ) {
                id
              }
            }
          `,
          variables: { job_id: jobId }
        });
      } catch (e) {
        // If updating the job fails, log the error but continue returning the 400 response.
        console.error('Failed to mark SIS roster import job as failed for unknown roster type', {
          jobId,
          rosterType,
          error: e instanceof Error ? e.message : e
        });
      }
      return res.status(400).json({ error: `Unknown roster type: ${rosterType}` });
    }

    // Whitelist validation: Ensure the table name is one of the allowed SIS roster tables.
    // This guards against potential GraphQL injection if the logic above is modified.
    if (!table || !ALLOWED_TABLES.has(table)) {
      return res.status(500).json({ error: 'Invalid table name for roster import' });
    }

    // SAFETY: The `table` variable is guaranteed to be safe for use in this GraphQL mutation
    // because it has been validated against the ALLOWED_TABLES whitelist in the check above.
    // The table can only be one of: sis_roster_students, sis_roster_teachers,
    // sis_roster_classes, or sis_roster_enrollments.
    const insertRoster = `mutation InsertRoster($objects: [${table}_insert_input!]!) {
      insert_${table}(
        objects: $objects,
        on_conflict: {
          constraint: ${table}_pkey,
          update_columns: [data]
        }
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

    // Store up to 50 errors in metadata for auditing and diagnostics.
    // If there are more errors, log the total count to help identify systemic issues.
    const maxStoredErrors = 50;
    const storedErrors = errors.slice(0, maxStoredErrors);
    if (errors.length > maxStoredErrors) {
      console.warn(`SIS import exceeded error limit: ${errors.length} total errors, only ${maxStoredErrors} stored`, {
        jobId,
        totalErrors: errors.length
      });
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
          errors: storedErrors,
          total_errors: errors.length
        },
        finished_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to update SIS import job metadata', { 
        jobId, 
        error: err.message || String(err),
        stack: err.stack 
      });
      return res.status(500).json({
        error: 'Import completed but failed to update job metadata',
        jobId,
        inserted,
        skipped: skippedCount,
        details: 'Job record may be in incorrect state. Contact system administrator.'
      });
    }

    // Return the same error list in the response for consistency.
    // Include total error count so API consumers know if errors were truncated.
    return res.status(200).json({
      ok: true,
      inserted,
      skipped: skippedCount,
      jobId,
      warnings: storedErrors,
      totalErrors: errors.length
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
