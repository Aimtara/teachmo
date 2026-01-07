import { writeAuditLog } from '@/domains/auditLog';
import { createLogger } from '@/utils/logger';

const logger = createLogger('audit-log');

export type AuditAction =
  | 'messages:send'
  | 'messages:delete'
  | 'messages:moderate'
  | 'threads:create'
  | 'threads:invite'
  | 'invites:create'
  | 'invites:send'
  | 'invites:resend'
  | 'invites:revoke'
  | 'invites:accept'
  | 'users:lookup_email';

export async function logEvent(input: {
  actorId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  // Avoid throwing hard if audit logging fails; we don’t want to block UX.
  try {
    await writeAuditLog(input);
  } catch (e) {
    logger.warn('Audit log write failed', e);
  }
}
