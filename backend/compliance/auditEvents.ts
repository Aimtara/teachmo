/* eslint-env node */

import { randomUUID } from 'crypto';
import { requiresAudit } from './dataClassification.js';
import { redactPII } from './redaction.js';

export const AUDIT_EVENT_CATEGORIES = [
  'auth.security_sensitive',
  'relationship.created',
  'relationship.verified',
  'relationship.revoked',
  'relationship.disputed',
  'relationship.access_denied',
  'consent.granted',
  'consent.revoked',
  'student.viewed',
  'student.exported',
  'student.deleted',
  'roster.imported',
  'roster.modified',
  'message.sent',
  'message.read',
  'message.deleted',
  'ai.prompt_submitted',
  'ai.output_generated',
  'ai.recommendation_reviewed',
  'ai.recommendation_overridden',
  'admin.student_data_accessed',
  'tenant.role_changed',
  'integration.enabled',
  'data_export.created',
  'data_export.completed',
  'data_deletion.created',
  'data_deletion.completed',
  'incident.created',
  'incident.updated',
  'feature_flag.updated',
] as const;

export type AuditEventCategory = (typeof AUDIT_EVENT_CATEGORIES)[number];

interface AuditSubject {
  id?: string | null;
  userId?: string | null;
  actorId?: string | null;
  entityId?: string | null;
  studentId?: string | null;
  childId?: string | null;
  organizationId?: string | null;
  districtId?: string | null;
  schoolId?: string | null;
  role?: string | null;
  type?: string | null;
  entityType?: string | null;
}

interface AuditContext extends Record<string, unknown> {
  tenantId?: string | null;
  organizationId?: string | null;
  schoolId?: string | null;
  requireTenant?: boolean;
  queryFn?: (_sql: string, _params: readonly unknown[]) => Promise<unknown>;
}

export interface BuiltAuditEvent {
  audit_id: string;
  action: string;
  actor_id: string | null;
  actor_role: string | null;
  target_type: string | null;
  target_id: string | null;
  organization_id: string | null;
  school_id: string | null;
  required: boolean;
  metadata: ReturnType<typeof redactPII>;
  created_at: string;
}

function idOf(value: AuditSubject | null | undefined): string | null {
  if (!value) return null;
  return value.id || value.userId || value.actorId || value.entityId || value.studentId || value.childId || null;
}

export function buildAuditEvent(
  action: string,
  actor: AuditSubject = {},
  target: AuditSubject = {},
  context: AuditContext = {},
  metadata: unknown = {},
): Readonly<BuiltAuditEvent> {
  if (!action) throw new Error('audit action is required');
  const tenantId = context.tenantId || context.organizationId || actor.organizationId || actor.districtId || target.organizationId || null;
  const event = {
    audit_id: randomUUID(),
    action,
    actor_id: idOf(actor),
    actor_role: actor.role || null,
    target_type: target.type || target.entityType || null,
    target_id: idOf(target),
    organization_id: tenantId,
    school_id: context.schoolId || actor.schoolId || target.schoolId || null,
    required: requiresAudit(action) || requiresAudit(target.type || target.entityType),
    metadata: redactPII(metadata),
    created_at: new Date().toISOString(),
  };

  if (!event.organization_id && context.requireTenant !== false) {
    throw new Error('tenant-scoped audit event requires organization_id');
  }
  return Object.freeze(event);
}

export async function auditEvent(
  action: string,
  actor: AuditSubject,
  target: AuditSubject,
  context: AuditContext = {},
  metadata: unknown = {},
): Promise<Readonly<BuiltAuditEvent>> {
  const event = buildAuditEvent(action, actor, target, context, metadata);
  if (typeof context.queryFn === 'function') {
    await context.queryFn(
      `insert into public.audit_log
        (actor_id, action, entity_type, entity_id, metadata, contains_pii, organization_id, school_id)
       values ($1, $2, $3, $4, $5::jsonb, false, $6, $7)`,
      [
        event.actor_id,
        event.action,
        event.target_type,
        event.target_id,
        JSON.stringify(event.metadata),
        event.organization_id,
        event.school_id,
      ],
    );
  }
  return event;
}
