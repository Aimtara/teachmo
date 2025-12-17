import { writeAuditLog } from '@/domains/auditLog';

export type AuditAction =
  | 'messages:send'
  | 'messages:delete'
  | 'messages:moderate'
  | 'threads:create';

export async function logEvent(input: {
  actorId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, any>;
}) {
  // Avoid throwing hard if audit logging fails; we don’t want to block UX.
  try {
    await writeAuditLog(input);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Audit log write failed', e);
  }
}
