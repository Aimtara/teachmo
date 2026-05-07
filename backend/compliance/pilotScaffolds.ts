/* eslint-env node */

import { randomUUID, createHash } from 'crypto';
import { AccessDeniedError, canAccessStudentData } from './accessControl.ts';
import { requireConsent } from './consentLedger.ts';
import type { ConsentRecord } from './consentLedger.ts';
import { auditEvent } from './auditEvents.ts';
import { redactPII } from './redaction.ts';
import { isPPRASensitive } from './dataClassification.ts';

type GenericRecord = Record<string, unknown>;

interface RosterPreviewOptions {
  organizationId?: string;
  schoolId?: string;
  actor?: GenericRecord;
}

interface DirectoryContext extends GenericRecord {
  organizationId?: string;
}

interface MessagingAllowedParams {
  actor: GenericRecord;
  student: GenericRecord;
  relationship?: GenericRecord;
  consentLedger?: ConsentRecord[];
  preferences?: GenericRecord;
  context?: GenericRecord;
}

interface IncidentInput {
  severity?: string;
  category?: string;
  affectedTenantIds?: unknown[];
  affectedSubjectCount?: number;
  affectedDataClasses?: unknown[];
  owner?: string;
  notes?: unknown;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : value == null ? null : String(value);
}

function stableId(parts: readonly unknown[]): string {
  return createHash('sha256')
    .update(parts.filter(Boolean).map((part) => String(part).trim().toLowerCase()).join('|'))
    .digest('hex')
    .slice(0, 24);
}

export function parseRosterCsv(csvText: unknown): GenericRecord[] {
  const [headerLine, ...rows] = String(csvText || '').trim().split(/\r?\n/);
  if (!headerLine) return [];
  const headers = headerLine.split(',').map((header) => header.trim());
  return rows
    .filter(Boolean)
    .map((row) => {
      const values = row.split(',').map((value) => value.trim());
      return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
    });
}

export function buildRosterImportPreview(records: GenericRecord[], { organizationId, schoolId, actor }: RosterPreviewOptions = {}) {
  if (!organizationId || !schoolId) throw new Error('organizationId and schoolId are required');
  if (!['school_admin', 'district_admin', 'system_admin'].includes(String(actor?.role || '').toLowerCase())) {
    throw new AccessDeniedError('roster_import_admin_required');
  }
  const seen = new Map();
  return records.map((record) => {
    const studentKey = stableId([organizationId, schoolId, record.student_external_id || record.student_email || record.student_name]);
    const guardianKey = stableId([organizationId, schoolId, record.guardian_email || record.guardian_name]);
    const duplicate = seen.has(studentKey);
    seen.set(studentKey, record);
    const ambiguous = !record.student_external_id && (!record.student_name || !record.guardian_email);
    return {
      import_row_id: randomUUID(),
      organization_id: organizationId,
      school_id: schoolId,
      student_key: studentKey,
      guardian_key: guardianKey,
      class_key: stableId([organizationId, schoolId, record.class_name]),
      status: duplicate ? 'duplicate' : ambiguous ? 'needs_review' : 'ready',
      redacted_preview: redactPII(record),
    };
  });
}

export function createDirectoryRequest(actor: GenericRecord, school: GenericRecord | null | undefined, context: DirectoryContext = {}) {
  if (!actor?.id) throw new AccessDeniedError('missing_actor');
  const request = Object.freeze({
    request_id: randomUUID(),
    actor_id: actor.id,
    school_id: school?.id || null,
    organization_id: context.organizationId || school?.organizationId || null,
    state: 'requested',
    public_school_label: school?.publicName || school?.name || 'School',
    private_data_revealed: false,
    created_at: new Date().toISOString(),
  });
  return request;
}

export function transitionDirectoryRequest(request: GenericRecord, nextState: string, actor: GenericRecord) {
  const allowed = ['requested', 'pending_school_review', 'approved', 'denied', 'expired', 'revoked'];
  if (!allowed.includes(nextState)) throw new Error(`unknown directory request state: ${nextState}`);
  if (['approved', 'denied', 'revoked'].includes(nextState) && !['school_admin', 'district_admin', 'system_admin'].includes(String(actor?.role))) {
    throw new AccessDeniedError('directory_request_admin_required');
  }
  return Object.freeze({ ...request, state: nextState, updated_at: new Date().toISOString() });
}

export function assertMessagingAllowed({
  actor,
  student,
  relationship,
  consentLedger = [],
  preferences = {},
  context = {}
}: MessagingAllowedParams): true {
  const decision = canAccessStudentData(actor, student, { ...context, relationship });
  if (!decision.allowed) throw new AccessDeniedError(decision.reason);
  requireConsent(stringOrNull(actor.id || actor.userId), 'messaging', {
    ...context,
    ledger: consentLedger,
    childId: stringOrNull(student.id || student.studentId || student.childId),
  });
  if (preferences.messagingOptOut === true) throw new AccessDeniedError('messaging_opt_out');
  return true;
}

export function queueMessageDelivery(message: GenericRecord, { deliveryId = randomUUID(), attempts = 0 } = {}) {
  return Object.freeze({
    delivery_id: deliveryId,
    message_id: message.id || randomUUID(),
    status: 'queued',
    attempts,
    next_attempt_at: new Date().toISOString(),
    redacted_payload: redactPII(message),
  });
}

export function retryMessageDelivery(delivery: GenericRecord & { attempts: number }) {
  return Object.freeze({
    ...delivery,
    status: delivery.attempts >= 3 ? 'failed' : 'queued',
    attempts: delivery.attempts + 1,
    updated_at: new Date().toISOString(),
  });
}

export function classifyPPRAPrompt(
  prompt: unknown,
  { approved = false, noticeProvided = false, consentValid = false } = {}
) {
  const sensitive = isPPRASensitive(prompt);
  return Object.freeze({
    sensitive,
    status: sensitive && !(approved && noticeProvided && consentValid) ? 'blocked_pending_review' : 'allowed',
    requiresApproval: sensitive,
    redactedPrompt: sensitive ? '[redacted-ppra-prompt]' : String(prompt || ''),
  });
}

export function createIncident({
  severity,
  category,
  affectedTenantIds = [],
  affectedSubjectCount = 0,
  affectedDataClasses = [],
  owner,
  notes
}: IncidentInput = {}) {
  if (!severity || !category || !owner) throw new Error('severity, category, and owner are required');
  return Object.freeze({
    incident_id: randomUUID(),
    severity,
    category,
    affected_tenant_ids: affectedTenantIds,
    affected_subject_count: affectedSubjectCount,
    affected_data_classes: affectedDataClasses,
    discovered_at: new Date().toISOString(),
    contained_at: null,
    resolved_at: null,
    status: 'created',
    owner,
    notes: redactPII(notes || ''),
  });
}

export async function updateIncident(incident: GenericRecord, status: string, actor: GenericRecord, context: GenericRecord = {}) {
  const allowed = ['triage', 'contain', 'investigate', 'notify_required', 'resolved'];
  if (!allowed.includes(status)) throw new Error(`unknown incident status: ${status}`);
  const updated = Object.freeze({
    ...incident,
    status,
    contained_at: status === 'contain' ? new Date().toISOString() : incident.contained_at,
    resolved_at: status === 'resolved' ? new Date().toISOString() : incident.resolved_at,
  });
  await auditEvent('incident.updated', actor, { type: 'incident', id: incident.incident_id }, context, {
    status,
    affectedDataClasses: incident.affected_data_classes,
  });
  return updated;
}
