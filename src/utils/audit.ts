import { nhost } from '@/utils/nhost';
import { createLogger } from '@/utils/logger';

const logger = createLogger('audit');

/**
 * logAuditEvent
 * Writes an audit log entry capturing before and after states for sensitive actions.
 *
 * @param actorId ID of the user performing the action
 * @param action The action performed (e.g., updateUser)
 * @param entityType The entity type (e.g., 'user', 'organization')
 * @param entityId The ID of the entity
 * @param before The previous state of the entity
 * @param after The new state of the entity
 */
export async function logAuditEvent({
  actorId,
  action,
  entityType,
  entityId,
  before,
  after,
}: {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  before: Record<string, any> | null;
  after: Record<string, any> | null;
}) {
  try {
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
          actor_id: actorId,
          action,
          entity_type: entityType,
          entity_id: entityId,
          before_state: before,
          after_state: after,
        },
      }
    );
  } catch (err) {
    logger.error('Failed to record audit log', err);
  }
}
