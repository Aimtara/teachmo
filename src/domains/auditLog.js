import { graphql } from '@/lib/graphql';
import { buildChangeDetails } from '@/utils/auditDiff';

/**
 * Append-only audit log.
 * Keep payload small; no sensitive message body.
 */
export async function writeAuditLog(input) {
  const mutation = `
    mutation InsertAuditLog($object: audit_log_insert_input!) {
      insert_audit_log_one(object: $object) {
        id
        created_at
      }
    }
  `;

  const changeDetails = input.changes ?? buildChangeDetails(input.before, input.after);
  const metadata = {
    ...(input.metadata ?? {}),
    ...(changeDetails ? { change_details: changeDetails } : {}),
  };

  // actor_id is set server-side via Hasura insert permissions using X-Hasura-User-Id.
  // Do not send actor_id from the client to avoid permission mismatches.
  const object = {
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    metadata,
    before_snapshot: input.before ?? null,
    after_snapshot: input.after ?? null,
    contains_pii: input.containsPii ?? null,
  };

  const data = await graphql(mutation, { object });
  return data?.insert_audit_log_one ?? null;
}

export async function listAuditLog({ entityType, entityId, limit = 80 } = {}) {
  const query = `query AuditLog($where: audit_log_bool_exp!, $limit: Int!) {
    audit_log(where: $where, order_by: { created_at: desc }, limit: $limit) {
      id
      created_at
      actor_id
      action
      entity_type
      entity_id
      metadata
    }
  }`;

  const where = {
    ...(entityType ? { entity_type: { _eq: entityType } } : {}),
    ...(entityId ? { entity_id: { _eq: entityId } } : {}),
  };

  return graphql(query, { where, limit });
}
