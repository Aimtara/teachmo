/* eslint-env node */
import { createId, integrationStore, nowIso } from './store.js';

const MIN_SYNC_INTERVAL_MS = 30 * 1000;

function getTeacherSync(teacherId) {
  let record = integrationStore.googleSyncs.find((item) => item.teacherId === teacherId);
  if (!record) {
    record = {
      id: createId('g_sync'),
      teacherId,
      lastSyncAt: null,
      syncToken: null,
      failures: 0,
      createdAt: nowIso(),
    };
    integrationStore.googleSyncs.push(record);
  }
  return record;
}

function shouldRateLimit(record) {
  if (!record.lastSyncAt) return false;
  const elapsed = Date.now() - new Date(record.lastSyncAt).getTime();
  return elapsed < MIN_SYNC_INTERVAL_MS;
}

function nextSyncToken() {
  return createId('g_token');
}

export function syncCourses({ teacherId, fullSync = false }) {
  const record = getTeacherSync(teacherId);
  if (shouldRateLimit(record)) {
    const error = new Error('Rate limit exceeded. Try again shortly.');
    error.status = 429;
    throw error;
  }

  const previousToken = record.syncToken;
  const token = fullSync || !previousToken ? nextSyncToken() : previousToken;

  record.lastSyncAt = nowIso();
  record.syncToken = token;
  record.failures = 0;

  return {
    teacherId,
    fullSync: Boolean(fullSync),
    delta: Boolean(previousToken) && !fullSync,
    syncToken: token,
    totalSynced: fullSync || !previousToken ? 12 : 3,
  };
}

export function syncCourseWork({ teacherId, courseId }) {
  const record = getTeacherSync(teacherId);
  if (shouldRateLimit(record)) {
    const error = new Error('Rate limit exceeded. Try again shortly.');
    error.status = 429;
    throw error;
  }
  record.lastSyncAt = nowIso();

  return {
    teacherId,
    courseId,
    totalSynced: 6,
    updatedAt: nowIso(),
  };
}

export function syncGrades({ teacherId, courseId }) {
  const record = getTeacherSync(teacherId);
  if (shouldRateLimit(record)) {
    const error = new Error('Rate limit exceeded. Try again shortly.');
    error.status = 429;
    throw error;
  }
  record.lastSyncAt = nowIso();

  return {
    teacherId,
    courseId,
    totalSynced: 24,
    updatedAt: nowIso(),
  };
}
