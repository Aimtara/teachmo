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

function shouldUseFallbackStore() {
  // Fallback to in-memory store when:
  // - DB is explicitly disabled via env var, OR
  // - We're in test environment (NODE_ENV=test)
  // Otherwise, throw errors to make production failures visible
  return process.env.DISABLE_DB === 'true' || process.env.NODE_ENV === 'test';
}

function normalizeConfig(config = {}) {
  return {
    type: config.type || 'oneroster',
    baseUrl: clampString((config.baseUrl || '').trim()),
    clientId: clampString((config.clientId || '').trim()),
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

export async function recordSisConnection(config = {}, schoolId) {
  const normalized = normalizeConfig(config);
  const dbConfig = {
    type: normalized.type,
    baseUrl: normalized.baseUrl,
    clientId: normalized.clientId,
    clientSecretEncrypted: encryptSecret(normalized.clientSecret),
  };

  try {
    const result = await query(
      `INSERT INTO public.directory_sources
       (school_id, name, source_type, config, is_enabled, last_run_at)
       VALUES ($1, $2, $3, $4::jsonb, true, NOW())
       ON CONFLICT (school_id, source_type, name)
       DO UPDATE SET config = $4::jsonb, is_enabled = true, last_run_at = NOW()
       RETURNING id, source_type AS type, config->>'baseUrl' AS base_url, last_run_at AS last_tested_at`,
      [
        schoolId,
        `${normalized.type} SIS`,
        normalized.type,
        JSON.stringify(dbConfig),
      ],
    );

    return result.rows[0];
  } catch (err) {
    if (shouldUseFallbackStore()) {
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
    throw err;
  }
}

export async function createSisJob({ schoolId, organizationId, source, rosterType }) {
  // Validate required fields
  if (!source) {
    throw new Error('source is required for SIS import job');
  }
  if (!rosterType) {
    throw new Error('rosterType is required for SIS import job');
  }

  try {
    const result = await query(
      `INSERT INTO public.sis_import_jobs
       (organization_id, school_id, roster_type, source, status, metadata, created_at)
       VALUES ($1, $2, $3, $4, 'pending', '{}'::jsonb, NOW())
       RETURNING id, organization_id, school_id, roster_type, source, status, metadata, created_at`,
      [organizationId, schoolId, rosterType, source],
    );

    return result.rows[0];
  } catch (err) {
    if (shouldUseFallbackStore()) {
      const job = {
        id: createId('sis_job'),
        school_id: schoolId,
        organization_id: organizationId,
        roster_type: rosterType,
        source,
        status: 'pending',
        metadata: {},
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      integrationStore.sisJobs.push(job);
      return job;
    }
    throw err;
  }
}

export async function findSisJob(jobId) {
  try {
    const result = await query(
      `SELECT id, organization_id, school_id, roster_type, source, status, metadata, error, created_at, updated_at, started_at, finished_at
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

  // Derive a plain-text error message for the dedicated `error` column.
  // Keep structured details in `metadata.error`.
  const errorText = error
    ? clampString(
        typeof error === 'string'
          ? error
          : (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
              ? error.message
              : String(error)),
      )
    : null;

  try {
    const result = await query(
      `UPDATE public.sis_import_jobs
       SET status = $2,
           metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
           error = $4,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [jobId, status, JSON.stringify(metadata), errorText],
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
    job.error = errorText;
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
