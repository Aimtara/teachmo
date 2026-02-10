/* eslint-env node */
import { query } from '../db.js';

const MASK_REPLACEMENT = '••••';

function maskSecret(secret) {
  if (!secret) return '';
  const value = String(secret);
  if (value.length <= 4) return MASK_REPLACEMENT;
  return `${MASK_REPLACEMENT}${value.slice(-4)}`;
}

function encryptSecret(secret) {
  // TODO: Replace with KMS/Vault-backed encryption in Phase 3.
  return secret;
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

export function validateSisConfig(config = {}) {
  const normalized = normalizeConfig(config);
  const missing = [];

  if (!normalized.type) missing.push('type');
  if (!normalized.baseUrl) missing.push('baseUrl');
  if (!normalized.clientId) missing.push('clientId');
  if (!normalized.clientSecret) missing.push('clientSecret');
  // schoolId and organizationId are optional for validation to remain
  // compatible with existing clients that only send base credentials.

  if (missing.length) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    error.status = 400;
    throw error;
  }

  return normalized;
}

export async function recordSisConnection(config = {}) {
  const normalized = normalizeConfig(config);

  // Store only masked secret in config. Full secret storage requires KMS/Vault
  // implementation in Phase 3. For now, avoid persisting raw credentials.
  const result = await query(
    `INSERT INTO public.directory_sources
      (district_id, school_id, name, source_type, config, is_enabled, last_run_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, true, NOW())
     RETURNING id, district_id, school_id, name, source_type, created_at, updated_at`,
    [
      normalized.organizationId,
      normalized.schoolId,
      `${normalized.type.toUpperCase()} SIS`,
      normalized.type,
      JSON.stringify({
        baseUrl: normalized.baseUrl,
        clientId: normalized.clientId,
        clientSecretMasked: maskSecret(normalized.clientSecret),
        // Note: Do not persist clientSecret until encryption is implemented
      }),
    ],
  );

  return result.rows[0] || null;
}

export async function createSisJob({ schoolId, organizationId, triggeredBy = 'manual', source = 'oneroster' }) {
  const orgId = organizationId || null;
  if (!orgId) {
    const error = new Error('organizationId is required');
    error.status = 400;
    throw error;
  }

  const result = await query(
    `INSERT INTO public.sis_import_jobs
      (organization_id, school_id, roster_type, source, status, metadata, started_at)
     VALUES ($1, $2, 'full', $3, 'processing', $4::jsonb, NOW())
     RETURNING id, organization_id, school_id, status, source, created_at, updated_at`,
    [orgId, schoolId || null, source, JSON.stringify({ triggeredBy })],
  );

  return result.rows[0] || null;
}

export async function findSisJob(jobId) {
  const result = await query(
    `SELECT id, organization_id, school_id, status, source, metadata, created_at, updated_at, started_at, finished_at, error
     FROM public.sis_import_jobs
     WHERE id = $1`,
    [jobId],
  );
  return result.rows[0] || null;
}

export async function markSisJobComplete(job, summary = {}) {
  if (!job || !job.id) return null;

  const result = await query(
    `UPDATE public.sis_import_jobs
     SET status = 'completed',
         metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
         finished_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, organization_id, school_id, status, source, metadata, created_at, updated_at, started_at, finished_at, error`,
    [job.id, JSON.stringify({ summary })],
  );

  return result.rows[0] || null;
}
