/* eslint-env node */
import { query } from '../db.js';
import { createId, integrationStore, nowIso, clampString } from './store.js';

const MASK_REPLACEMENT = '••••';

function maskSecret(secret) {
  if (!secret) return '';
  const value = String(secret);
  if (value.length <= 4) return MASK_REPLACEMENT;
  return `${MASK_REPLACEMENT}${value.slice(-4)}`;
}

function encryptSecret(secret) {
  // In a real environment, use KMS. For MVP, we pass through.
  return secret;
}

function normalizeConfig(config = {}) {
  return {
    type: config.type || 'oneroster',
    baseUrl: clampString(config.baseUrl || ''),
    clientId: clampString(config.clientId || ''),
    clientSecret: config.clientSecret || '',
  };
}

export function validateSisConfig(config = {}) {
  const { type, baseUrl, clientId, clientSecret } = config;
  const missing = [];

  if (!type) missing.push('type');
  if (!baseUrl) missing.push('baseUrl');
  if (!clientId) missing.push('clientId');
  if (!clientSecret) missing.push('clientSecret');

  if (missing.length) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    error.status = 400;
    throw error;
  }

  return normalizeConfig(config);
}

export async function recordSisConnection(config = {}, organizationId) {
  const normalized = normalizeConfig(config);
  try {
    const result = await query(
      `INSERT INTO public.directory_sources
       (organization_id, type, base_url, client_id, client_secret_encrypted, status, last_tested_at)
       VALUES ($1, $2, $3, $4, $5, 'active', NOW())
       ON CONFLICT (organization_id, type)
       DO UPDATE SET base_url = $3, client_id = $4, client_secret_encrypted = $5, last_tested_at = NOW()
       RETURNING id, type, base_url, last_tested_at`,
      [
        organizationId,
        normalized.type,
        normalized.baseUrl,
        normalized.clientId,
        encryptSecret(normalized.clientSecret),
      ],
    );

    return result.rows[0];
  } catch {
    const connection = {
      id: createId('sis'),
      ...normalized,
      clientSecret: maskSecret(normalized.clientSecret),
      createdAt: nowIso(),
      lastTestedAt: nowIso(),
    };
    integrationStore.sisConnections.push(connection);
    return connection;
  }
}

export async function createSisJob({ schoolId, organizationId, triggeredBy = 'manual' }) {
  try {
    const result = await query(
      `INSERT INTO public.sis_import_jobs
       (organization_id, school_id, status, triggered_by, metadata, created_at)
       VALUES ($1, $2, 'processing', $3, '{}'::jsonb, NOW())
       RETURNING id, status, triggered_by, metadata, created_at`,
      [organizationId, schoolId, triggeredBy],
    );

    return result.rows[0];
  } catch {
    const job = {
      id: createId('sis_job'),
      school_id: schoolId,
      organization_id: organizationId,
      status: 'processing',
      triggered_by: triggeredBy,
      metadata: {},
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    integrationStore.sisJobs.push(job);
    return job;
  }
}

export async function findSisJob(jobId) {
  try {
    const result = await query(
      `SELECT id, organization_id, school_id, status, triggered_by, metadata, created_at, updated_at
       FROM public.sis_import_jobs
       WHERE id = $1
       LIMIT 1`,
      [jobId],
    );

    return result.rows[0] || null;
  } catch {
    return integrationStore.sisJobs.find((job) => job.id === jobId) || null;
  }
}

export async function importSisRoster(_job, roster = {}) {
  return {
    students: Array.isArray(roster.students) ? roster.students.length : 0,
    teachers: Array.isArray(roster.teachers) ? roster.teachers.length : 0,
    classes: Array.isArray(roster.classes) ? roster.classes.length : 0,
    enrollments: Array.isArray(roster.enrollments) ? roster.enrollments.length : 0,
  };
}

export async function updateSisJobStatus(jobId, status, summary = {}, error = null) {
  const metadata = {
    summary,
    ...(error ? { error } : {}),
  };

  try {
    const result = await query(
      `UPDATE public.sis_import_jobs
       SET status = $2,
           metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [jobId, status, JSON.stringify(metadata)],
    );
    return result.rows[0] || null;
  } catch {
    const job = integrationStore.sisJobs.find((item) => item.id === jobId);
    if (!job) return null;
    job.status = status;
    job.metadata = {
      ...(job.metadata || {}),
      ...metadata,
    };
    job.updated_at = nowIso();
    return job;
  }
}

export async function markSisJobComplete(job, summary = {}) {
  if (!job?.id) return null;
  return updateSisJobStatus(job.id, 'completed', summary);
}

export async function markSisJobFailed(job, message = 'SIS sync failed') {
  if (!job?.id) return null;
  return updateSisJobStatus(job.id, 'failed', {}, message);
}
