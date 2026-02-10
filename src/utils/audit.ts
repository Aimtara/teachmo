import { nhost } from '@/utils/nhost';
import { createLogger } from '@/utils/logger';

const logger = createLogger('audit');

/**
 * logAuditEvent
 * Writes an audit log entry capturing before and after states for sensitive actions.
 *
 * Note: actor_id is set server-side via Hasura insert permissions using X-Hasura-User-Id.
 * Do not send actor_id from the client to avoid permission mismatches.
 *
 * @param action The action performed (e.g., updateUser)
 * @param entityType The entity type (e.g., 'user', 'organization')
 * @param entityId The ID of the entity
 * @param before The previous state of the entity
 * @param after The new state of the entity
 */
export async function logAuditEvent({
  action,
  entityType,
  entityId,
  before,
  after,
}: {
  action: string;
  entityType: string;
  entityId: string;
  before: Record<string, any> | null;
  after: Record<string, any> | null;
}) {
  try {
    const changes =
      before && after
        ? Object.fromEntries(
            Object.keys({ ...before, ...after }).flatMap((key) =>
              before[key] !== after[key] ? [[key, { before: before[key] ?? null, after: after[key] ?? null }]] : []
            )
          )
        : null;
    await nhost.graphql.request(
      `
      mutation InsertAuditLog($object: audit_log_insert_input!) {
        insert_audit_log_one(object: $object) {
          id
        }
      }
    `,
      {
        object: {
          action,
          entity_type: entityType,
          entity_id: entityId,
          metadata: changes ? { change_details: changes } : {},
          before_snapshot: before,
          after_snapshot: after,
        },
      }
    );
  } catch (err) {
    logger.error('Failed to record audit log', err);
  }
}
