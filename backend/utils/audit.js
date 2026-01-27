/* eslint-env node */
import { query } from '../db.js';

const SENSITIVE_ENTITY_TYPES = new Set(['user', 'role', 'permission', 'pii']);

export async function recordAuditLog({
  actorId,
  action,
  entityType,
  entityId,
  metadata,
  before,
  after,
  containsPii,
  organizationId,
  schoolId,
}) {
  const shouldFlagPii =
    typeof containsPii === 'boolean' ? containsPii : SENSITIVE_ENTITY_TYPES.has(entityType);
  const payload = metadata || {};
  const beforeSnapshot = before ?? null;
  const afterSnapshot = after ?? null;

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
