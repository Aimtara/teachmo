/* eslint-env node */
import { query } from '../db.js';

function encryptSecret(secret) {
  // In a real environment, use KMS. For MVP, we pass through.
  return secret;
}

function normalizeConfig(config = {}) {
  return {
    type: config.type || 'oneroster',
    baseUrl: (config.baseUrl || '').trim(),
    clientId: (config.clientId || '').trim(),
    clientSecret: config.clientSecret || '',
  };
}

export async function recordSisConnection(config = {}, organizationId) {
  const normalized = normalizeConfig(config);

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
}

export async function createSisJob({ schoolId, organizationId, triggeredBy = 'manual' }) {
  const result = await query(
    `INSERT INTO public.sis_import_jobs
     (organization_id, school_id, status, triggered_by, summary, created_at)
     VALUES ($1, $2, 'processing', $3, '{}'::jsonb, NOW())
     RETURNING id, status, triggered_by, created_at`,
    [organizationId, schoolId, triggeredBy],
  );

  return result.rows[0];
}

export async function updateSisJobStatus(jobId, status, summary = {}) {
  const result = await query(
    `UPDATE public.sis_import_jobs
     SET status = $2,
         summary = $3,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [jobId, status, JSON.stringify(summary)],
  );
  return result.rows[0];
}
