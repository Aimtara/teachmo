/* eslint-env node */
import { query } from '../db.js';

const SENSITIVE_ENTITY_TYPES = new Set(['user', 'role', 'permission', 'pii']);

function buildChangeDetails(before, after) {
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object') return null;
  const changes = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    const beforeValue = before[key];
    const afterValue = after[key];
    if (beforeValue !== afterValue) {
      changes[key] = { before: beforeValue ?? null, after: afterValue ?? null };
    }
  }
  return Object.keys(changes).length ? changes : null;
}

export async function recordAuditLog({
  actorId,
  action,
  entityType,
  entityId,
  metadata,
  before,
  after,
  changes,
  containsPii,
  organizationId,
  schoolId,
}) {
  const shouldFlagPii =
    typeof containsPii === 'boolean' ? containsPii : SENSITIVE_ENTITY_TYPES.has(entityType);
  const payload = metadata ? { ...metadata } : {};
  const beforeSnapshot = before ?? null;
  const afterSnapshot = after ?? null;
  const diff = changes ?? buildChangeDetails(beforeSnapshot, afterSnapshot);

  if (diff) {
    payload.change_details = diff;
  }

  await query(
    `insert into public.audit_log
      (actor_id, action, entity_type, entity_id, metadata, before_snapshot, after_snapshot, contains_pii, organization_id, school_id)
     values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9, $10)`,
    [
      actorId,
      action,
      entityType,
      entityId,
      JSON.stringify(payload),
      beforeSnapshot ? JSON.stringify(beforeSnapshot) : null,
      afterSnapshot ? JSON.stringify(afterSnapshot) : null,
      shouldFlagPii,
      organizationId,
      schoolId ?? null,
    ]
  );
}
