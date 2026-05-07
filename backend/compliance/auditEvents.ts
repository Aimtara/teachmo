/* eslint-env node */

import { randomUUID } from 'crypto';
import { requiresAudit } from './dataClassification.ts';
import { redactPII } from './redaction.ts';

export const AUDIT_EVENT_CATEGORIES = Object.freeze([
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
]);

type AuditActor = Record<string, unknown>;
type AuditTarget = Record<string, unknown>;
type QueryFn = (sql: string, params: readonly unknown[]) => Promise<unknown>;

interface AuditContext extends Record<string, unknown> {
  tenantId?: string | null;
  organizationId?: string | null;
  schoolId?: string | null;
  requireTenant?: boolean;
  queryFn?: QueryFn;
}

interface BuiltAuditEvent {
  audit_id: string;
  action: string;
  actor_id: unknown;
  actor_role: unknown;
  target_type: unknown;
  target_id: unknown;
  organization_id: unknown;
  school_id: unknown;
  required: boolean;
  metadata: unknown;
  created_at: string;
}

function field(value: Record<string, unknown>, key: string): unknown {
  return value[key];
}

function idOf(value: Record<string, unknown> | null | undefined): unknown {
  if (!value) return null;
  return value.id || value.userId || value.actorId || value.entityId || value.studentId || value.childId || null;
}

export function buildAuditEvent(
  action: string,
  actor: AuditActor = {},
  target: AuditTarget = {},
  context: AuditContext = {},
  metadata: Record<string, unknown> = {}
): Readonly<BuiltAuditEvent> {
  if (!action) throw new Error('audit action is required');
  const tenantId = context.tenantId || context.organizationId || actor.organizationId || actor.districtId || target.organizationId || null;
  const targetType = field(target, 'type') || field(target, 'entityType');
  const event = {
    audit_id: randomUUID(),
    action,
    actor_id: idOf(actor),
    actor_role: actor.role || null,
    target_type: targetType || null,
    target_id: idOf(target),
    organization_id: tenantId,
    school_id: context.schoolId || actor.schoolId || target.schoolId || null,
    required: requiresAudit(action) || requiresAudit(targetType),
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
  actor: AuditActor,
  target: AuditTarget,
  context: AuditContext = {},
  metadata: Record<string, unknown> = {}
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
