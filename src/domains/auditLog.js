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

  const object = {
    actor_id: input.actorId,
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
