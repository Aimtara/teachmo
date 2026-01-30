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
    // Use RFC 4180-compliant CSV parser that properly handles:
    // - Commas inside quoted fields (e.g., "Smith, John")
    // - Newlines inside quoted fields
    // - Escaped quotes inside quoted fields (e.g., "He said ""hello""")
    const records = parse(text, {
      columns: true, // First row is headers, returns array of objects
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true, // More lenient with quotes for real-world CSVs
      relax_column_count: true // Handle rows with varying column counts
    });
    
    return records;
  } catch (err) {
    // Log detailed error information to help diagnose parsing issues
    const preview = text.length > 200 ? text.substring(0, 200) + '...' : text;
    console.error('CSV parsing failed:', {
      error: err.message,
      preview,
      textLength: text.length
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
    .filter(Boolean)
    .map((line) => {
      // Handle potential CSV quoting issues simply for MVP, or use a library in Phase 2
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      return headers.reduce((acc, header, idx) => {
        acc[header] = values[idx] ?? '';
        return acc;
      }, {});
      record.__lineNumber = originalLineNumber; // Attach original line number to each record
      return record;
    });
    return [];
  }
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
          errors.push(`Row ${record.__lineNumber ?? idx + 2}: Missing student ID`);
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
          errors.push(`Row ${record.__lineNumber ?? idx + 2}: Missing teacher ID for class ${extId}`);
          return;
        }
        const { __lineNumber, ...cleanRecord } = record;
        validObjects.push({
          job_id: jobId,
          organization_id: organizationId,
          school_id: effectiveSchoolId,
          external_id: extId,
          name: record.name || record.title || record.className || `Class ${extId}`,
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
      } catch (e) {
        console.error(
          'Failed to mark SIS roster import job as failed for unknown roster type',
          { jobId, rosterType, error: e }
        );
              ) {
                id
              }
            }
          `,
          variables: { job_id: jobId }
        });
      } catch (e) {
        // If updating the job fails, continue returning the 400 response.

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
          errors.push(`Row ${record.__lineNumber ?? idx + 2}: Missing student ID`);
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
    // because it has been validated against the ALLOWED_TABLES whitelist above.
    // The table can only be one of: sis_roster_students, sis_roster_teachers,
    // sis_roster_classes, or sis_roster_enrollments.
    const insertRoster = `mutation InsertRoster($objects: [${table}_insert_input!]!) {
      insert_${table}(
        objects: $objects,
        on_conflict: {
          constraint: ${table}_external_id_key,
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
      return res.status(400).json({ error: `Unknown roster type: ${rosterType}` });
    }

    // Determine which columns should be updated on conflict.
    // For tables with normalized columns, update them to stay in sync with the latest CSV.
    let updateColumns = '[data]';
    if (table === 'sis_roster_students') {
      updateColumns = '[first_name, last_name, grade, data]';
    } else if (table === 'sis_roster_teachers') {
      updateColumns = '[first_name, last_name, email, data]';
    } else if (table === 'sis_roster_classes') {
      updateColumns = '[name, teacher_external_id, data]';
    }

    const insertRoster = `mutation InsertRoster($objects: [${table}_insert_input!]!) {
      insert_${table}(
        objects: $objects,
        on_conflict: { constraint: ${table}_pkey, update_columns: ${updateColumns} }
    // Whitelist validation: Ensure the table name is one of the allowed SIS roster tables.
    // This guards against potential GraphQL injection if the logic above is modified.
    if (!table || !ALLOWED_TABLES.has(table)) {
      return res.status(500).json({ error: 'Invalid table name for roster import' });
    }

    // SAFETY: The `table` variable is guaranteed to be safe for use in this GraphQL mutation
    // because it has been validated against the ALLOWED_TABLES whitelist defined at the top
    // of this file (see whitelist validation in lines 215-217 above). The table can only be one
    // of: sis_roster_students, sis_roster_teachers, sis_roster_classes, or sis_roster_enrollments.
    const insertRoster = `mutation InsertRoster($objects: [${table}_insert_input!]!) {
      insert_${table}(
        objects: $objects
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
  } catch (err) {
    console.error('SIS Import Fatal Error:', err);
    return res.status(500).json({ error: 'Internal importer error' });
  }
}

async function createImportJob(orgId, schoolId, type, source, fileName, fileSize, count) {
  try {
    const insertJob = `mutation InsertSisJob($object: sis_import_jobs_insert_input!) {
      insert_sis_import_jobs_one(object: $object) { id }
    }`;
  const insertJob = `mutation InsertSisJob($object: sis_import_jobs_insert_input!) {
    insert_sis_import_jobs_one(object: $object) { id }
  }`;
  try {
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
  } catch (err) {
    console.error('Failed to create SIS import job', { orgId, type, error: err.message });
    console.error('Failed to create SIS import job', { orgId, schoolId, type, error: err });
    return null;
  }
  });
  return res?.insert_sis_import_jobs_one?.id;
}

async function updateImportJob(id, changes) {
  const updateJob = `mutation UpdateJob($id: uuid!, $changes: sis_import_jobs_set_input!) {
    update_sis_import_jobs_by_pk(pk_columns: { id: $id }, _set: $changes) { id }
  }`;
  try {
    await hasuraRequest({
      query: updateJob,
      variables: { id, changes }
    });
  } catch (err) {
    console.error('Failed to update SIS import job', { id, error: err });
    throw err; // Re-throw to allow caller to handle
  }
  await hasuraRequest({
    query: updateJob,
    variables: { id, changes }
  });
}
