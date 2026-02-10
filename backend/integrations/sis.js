/* eslint-env node */
import { query } from '../db.js';
import { createId, integrationStore, nowIso } from './store.js';

const MASK_REPLACEMENT = '••••';

function maskSecret(secret) {
  if (!secret) return '';
  const value = String(secret);
  if (value.length <= 4) return MASK_REPLACEMENT;
  return `${MASK_REPLACEMENT}${value.slice(-4)}`;
}

function normalizeConfig(config = {}) {
  return {
    type: config.type || 'oneroster',
    baseUrl: (config.baseUrl || '').trim(),
    clientId: (config.clientId || '').trim(),
    clientSecret: config.clientSecret || '',
    schoolId: config.schoolId || null,
    organizationId: config.organizationId || null,
  };
}

async function safeDbQuery(text, params = []) {
  try {
    return await query(text, params);
  } catch (error) {
    if (process.env.NODE_ENV === 'test') return null;
    throw error;
  }
}

export function validateSisConfig(config = {}) {
  const normalized = normalizeConfig(config);
  const missing = [];

  if (!normalized.type) missing.push('type');
  if (!normalized.baseUrl) missing.push('baseUrl');
  if (!normalized.clientId) missing.push('clientId');
  if (!normalized.clientSecret) missing.push('clientSecret');

  if (missing.length) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    error.status = 400;
    throw error;
  }

  return normalized;
}

export async function recordSisConnection(config = {}) {
  const normalized = normalizeConfig(config);
  const configPayload = {
    baseUrl: normalized.baseUrl,
    clientId: normalized.clientId,
    clientSecretMasked: maskSecret(normalized.clientSecret),
  };

  const result = await safeDbQuery(
    `INSERT INTO public.directory_sources
      (district_id, school_id, name, source_type, config, is_enabled, last_run_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, true, NOW())
     RETURNING id, district_id, school_id, name, source_type, created_at, updated_at`,
    [
      normalized.organizationId,
      normalized.schoolId,
      `${normalized.type.toUpperCase()} SIS`,
      normalized.type,
      JSON.stringify(configPayload),
    ],
  );

  if (result?.rows?.[0]) return result.rows[0];

  const connection = {
    id: createId('sis_conn'),
    district_id: normalized.organizationId,
    school_id: normalized.schoolId,
    name: `${normalized.type.toUpperCase()} SIS`,
    source_type: normalized.type,
    config: configPayload,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  integrationStore.sisConnections.push(connection);
  return connection;
}

export async function createSisJob({ schoolId, organizationId, triggeredBy = 'manual', source = 'oneroster' }) {
  const orgId = organizationId || null;
  if (!orgId) {
    const error = new Error('organizationId is required');
    error.status = 400;
    throw error;
  }

  const result = await safeDbQuery(
    `INSERT INTO public.sis_import_jobs
      (organization_id, school_id, roster_type, source, status, metadata, started_at)
     VALUES ($1, $2, 'full', $3, 'processing', $4::jsonb, NOW())
     RETURNING id, organization_id, school_id, status, source, metadata, created_at, updated_at, started_at, finished_at, error`,
    [orgId, schoolId || null, source, JSON.stringify({ triggeredBy })],
  );

  if (result?.rows?.[0]) return result.rows[0];

  const job = {
    id: createId('sis_job'),
    organization_id: orgId,
    school_id: schoolId || null,
    status: 'processing',
    source,
    metadata: { triggeredBy },
    created_at: nowIso(),
    updated_at: nowIso(),
    started_at: nowIso(),
    finished_at: null,
    error: null,
  };
  integrationStore.sisJobs.push(job);
  return job;
}

export async function findSisJob(jobId) {
  const result = await safeDbQuery(
    `SELECT id, organization_id, school_id, status, source, metadata, created_at, updated_at, started_at, finished_at, error
     FROM public.sis_import_jobs
     WHERE id = $1`,
    [jobId],
  );
  if (result?.rows?.[0]) return result.rows[0];
  return integrationStore.sisJobs.find((job) => job.id === jobId) || null;
}

async function insertRosterRow(sql, params) {
  await safeDbQuery(sql, params);
}

export async function importSisRoster(job, payload = {}) {
  const students = Array.isArray(payload.students) ? payload.students : [];
  const teachers = Array.isArray(payload.teachers) ? payload.teachers : [];
  const classes = Array.isArray(payload.classes) ? payload.classes : [];
  const enrollments = Array.isArray(payload.enrollments) ? payload.enrollments : [];

  for (const student of students) {
    const externalId = String(student.externalId || student.id || '').trim();
    if (!externalId) continue;
    await insertRosterRow(
      `INSERT INTO public.sis_roster_students
        (job_id, organization_id, school_id, external_id, first_name, last_name, grade, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
      [job.id, job.organization_id, job.school_id, externalId, student.firstName || null, student.lastName || null, student.grade || null, JSON.stringify(student)],
    );
  }

  for (const teacher of teachers) {
    const externalId = String(teacher.externalId || teacher.id || '').trim();
    if (!externalId) continue;
    await insertRosterRow(
      `INSERT INTO public.sis_roster_teachers
        (job_id, organization_id, school_id, external_id, first_name, last_name, email, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
      [job.id, job.organization_id, job.school_id, externalId, teacher.firstName || null, teacher.lastName || null, teacher.email || null, JSON.stringify(teacher)],
    );
  }

  for (const klass of classes) {
    const externalId = String(klass.externalId || klass.id || '').trim();
    if (!externalId) continue;
    await insertRosterRow(
      `INSERT INTO public.sis_roster_classes
        (job_id, organization_id, school_id, external_id, name, teacher_external_id, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [job.id, job.organization_id, job.school_id, externalId, klass.name || klass.className || null, klass.teacherExternalId || null, JSON.stringify(klass)],
    );
  }

  for (const enrollment of enrollments) {
    const classExternalId = String(enrollment.classExternalId || '').trim();
    const studentExternalId = String(enrollment.studentExternalId || '').trim();
    if (!classExternalId || !studentExternalId) continue;
    await insertRosterRow(
      `INSERT INTO public.sis_roster_enrollments
        (job_id, organization_id, school_id, class_external_id, student_external_id, data)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [job.id, job.organization_id, job.school_id, classExternalId, studentExternalId, JSON.stringify(enrollment)],
    );
  }

  return {
    students: students.length,
    teachers: teachers.length,
    classes: classes.length,
    enrollments: enrollments.length,
  };
}

export async function markSisJobComplete(job, summary = {}) {
  if (!job || !job.id) return null;

  const result = await safeDbQuery(
    `UPDATE public.sis_import_jobs
     SET status = 'completed',
         metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
         finished_at = NOW(),
         updated_at = NOW(),
         error = null
     WHERE id = $1
     RETURNING id, organization_id, school_id, status, source, metadata, created_at, updated_at, started_at, finished_at, error`,
    [job.id, JSON.stringify({ summary })],
  );

  if (result?.rows?.[0]) return result.rows[0];

  const inMemory = integrationStore.sisJobs.find((entry) => entry.id === job.id);
  if (!inMemory) return null;
  inMemory.status = 'completed';
  inMemory.metadata = { ...(inMemory.metadata || {}), summary };
  inMemory.finished_at = nowIso();
  inMemory.updated_at = nowIso();
  inMemory.error = null;
  return inMemory;
}

export async function markSisJobFailed(job, errorMessage = 'SIS import failed') {
  if (!job || !job.id) return null;

  const result = await safeDbQuery(
    `UPDATE public.sis_import_jobs
     SET status = 'failed', error = $2, finished_at = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING id, organization_id, school_id, status, source, metadata, created_at, updated_at, started_at, finished_at, error`,
    [job.id, errorMessage],
  );

  if (result?.rows?.[0]) return result.rows[0];

  const inMemory = integrationStore.sisJobs.find((entry) => entry.id === job.id);
  if (!inMemory) return null;
  inMemory.status = 'failed';
  inMemory.error = errorMessage;
  inMemory.finished_at = nowIso();
  inMemory.updated_at = nowIso();
  return inMemory;
}
