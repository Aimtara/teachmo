/* eslint-env node */
import { createId, integrationStore, nowIso, clampString } from './store.js';

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
    baseUrl: clampString(config.baseUrl || ''),
    clientId: clampString(config.clientId || ''),
    clientSecret: maskSecret(config.clientSecret || ''),
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

export function recordSisConnection(config = {}) {
  const normalized = normalizeConfig(config);
  const connection = {
    id: createId('sis'),
    ...normalized,
    createdAt: nowIso(),
    lastTestedAt: nowIso(),
  };
  integrationStore.sisConnections.push(connection);
  return connection;
}

export function createSisJob({ schoolId, triggeredBy = 'manual' }) {
  const job = {
    id: createId('sis_job'),
    schoolId,
    status: 'processing',
    triggeredBy,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    summary: {
      enrollments: 0,
      users: 0,
      classes: 0,
    },
  };

  integrationStore.sisJobs.push(job);
  return job;
}

export function findSisJob(jobId) {
  return integrationStore.sisJobs.find((job) => job.id === jobId) || null;
}

export function markSisJobComplete(job, summary = {}) {
  if (!job) return null;
  job.status = 'completed';
  job.summary = {
    ...job.summary,
    ...summary,
  };
  job.updatedAt = nowIso();
  return job;
}
