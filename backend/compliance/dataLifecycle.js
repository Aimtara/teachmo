/* eslint-env node */

import { randomUUID } from 'crypto';
import { canAccessStudentData, AccessDeniedError } from './accessControl.js';
import { classifyEntity, DATA_CLASSIFICATION_REGISTRY } from './dataClassification.ts';
import { auditEvent } from './auditEvents.ts';
import { redactPII } from './redaction.ts';

const DEFAULT_LIFECYCLE = Object.freeze({
  retentionClass: 'unclassified',
  exportBehavior: 'manual_review_required',
  deletionBehavior: 'manual_review_required',
  anonymizationBehavior: 'minimize_direct_identifiers',
  backupHandlingNote: 'Backups expire through tenant backup retention; do not mutate immutable backups in place.',
});

export const DATA_LIFECYCLE_POLICIES = Object.freeze({
  account_record: {
    retentionClass: 'account_record',
    exportBehavior: 'include account/profile data for authorized subject or scoped admin',
    deletionBehavior: 'delete or disable account data unless school/legal retention applies',
    anonymizationBehavior: 'replace direct identifiers with tombstone subject id',
    backupHandlingNote: DEFAULT_LIFECYCLE.backupHandlingNote,
  },
  guardian_record: {
    retentionClass: 'guardian_record',
    exportBehavior: 'include guardian profile and relationship records',
    deletionBehavior: 'delete revocable guardian PI; preserve audit as minimized metadata',
    anonymizationBehavior: 'hash guardian id and remove contact fields',
    backupHandlingNote: DEFAULT_LIFECYCLE.backupHandlingNote,
  },
  relationship_record: {
    retentionClass: 'relationship_record',
    exportBehavior: 'include relationship state history and verification evidence references',
    deletionBehavior: 'revoke relationship; retain minimized audit trail',
    anonymizationBehavior: 'replace actor/student ids with scoped pseudonyms in reports',
    backupHandlingNote: DEFAULT_LIFECYCLE.backupHandlingNote,
  },
  education_record: {
    retentionClass: 'education_record',
    exportBehavior: 'include where authorized by guardian, eligible student, or school official role',
    deletionBehavior: 'honor school record retention, legal hold, and contract terms before deletion',
    anonymizationBehavior: 'remove direct student identifiers while preserving aggregate educational evidence',
    backupHandlingNote: DEFAULT_LIFECYCLE.backupHandlingNote,
  },
  roster_record: {
    retentionClass: 'roster_record',
    exportBehavior: 'include roster mappings for authorized school/district admins',
    deletionBehavior: 'delete stale imports after review; preserve import audit summary',
    anonymizationBehavior: 'hash external ids and remove names/contact details',
    backupHandlingNote: DEFAULT_LIFECYCLE.backupHandlingNote,
  },
  message_record: {
    retentionClass: 'message_record',
    exportBehavior: 'include messages only for authorized participants and tenant-scoped admins',
    deletionBehavior: 'soft-delete participant view; retain safety/audit metadata as required',
    anonymizationBehavior: 'remove message body and direct identifiers',
    backupHandlingNote: DEFAULT_LIFECYCLE.backupHandlingNote,
  },
  digest_record: {
    retentionClass: 'digest_record',
    exportBehavior: 'include generated digest metadata and safe content where authorized',
    deletionBehavior: 'delete generated digest content when consent/preference is revoked unless retained by school',
    anonymizationBehavior: 'remove direct identifiers and child-specific free text',
    backupHandlingNote: DEFAULT_LIFECYCLE.backupHandlingNote,
  },
  ai_interaction: {
    retentionClass: 'ai_interaction',
    exportBehavior: 'include redacted prompt/output traces where authorized and safe',
    deletionBehavior: 'delete or redact prompt/output content; preserve governance/audit metadata',
    anonymizationBehavior: 'redact prompts, outputs, model traces, and student identifiers',
    backupHandlingNote: DEFAULT_LIFECYCLE.backupHandlingNote,
  },
  audit_record: {
    retentionClass: 'audit_record',
    exportBehavior: 'include minimized audit summary when appropriate',
    deletionBehavior: 'immutable; never delete to satisfy subject deletion, minimize PII instead',
    anonymizationBehavior: 'redact metadata and preserve action/timestamp/tenant integrity',
    backupHandlingNote: DEFAULT_LIFECYCLE.backupHandlingNote,
  },
  consent_record: {
    retentionClass: 'consent_record',
    exportBehavior: 'include full consent history and evidence references',
    deletionBehavior: 'preserve history of grants/revocations as compliance evidence',
    anonymizationBehavior: 'minimize actor/student identifiers after account deletion',
    backupHandlingNote: DEFAULT_LIFECYCLE.backupHandlingNote,
  },
  tenant_record: {
    retentionClass: 'tenant_record',
    exportBehavior: 'tenant admin export only',
    deletionBehavior: 'contract-governed deletion after offboarding',
    anonymizationBehavior: 'remove private school/admin contact fields from public evidence',
    backupHandlingNote: DEFAULT_LIFECYCLE.backupHandlingNote,
  },
  community_content: {
    retentionClass: 'community_content',
    exportBehavior: 'include only when consent and relationship/tenant scope allow',
    deletionBehavior: 'delete on consent revocation or moderation/safety requirement',
    anonymizationBehavior: 'remove student names, media, and school identifiers',
    backupHandlingNote: DEFAULT_LIFECYCLE.backupHandlingNote,
  },
  compliance_evidence: {
    retentionClass: 'compliance_evidence',
    exportBehavior: 'include control evidence, not raw child/student data',
    deletionBehavior: 'retain according to procurement/security evidence policy',
    anonymizationBehavior: 'store aggregate control status only',
    backupHandlingNote: DEFAULT_LIFECYCLE.backupHandlingNote,
  },
});

function isAdmin(actor = {}) {
  return ['system_admin', 'district_admin', 'school_admin', 'admin'].includes(String(actor.role || '').toLowerCase());
}

function authorizedForSubject(actor, subject, context = {}) {
  if (actor?.id && (actor.id === subject?.id || actor.id === subject?.userId)) return true;
  if (isAdmin(actor) && (actor.organizationId || actor.districtId) === (subject.organizationId || subject.districtId || context.organizationId)) return true;
  if (subject.studentId || subject.childId || subject.type === 'student') {
    return canAccessStudentData(actor, { ...subject, id: subject.studentId || subject.childId || subject.id }, context).allowed;
  }
  return false;
}

export function getRetentionPolicy(entityName) {
  const classification = classifyEntity(entityName);
  return DATA_LIFECYCLE_POLICIES[classification.retentionClass] || {
    ...DEFAULT_LIFECYCLE,
    retentionClass: classification.retentionClass || DEFAULT_LIFECYCLE.retentionClass,
  };
}

export function requestDataExport(actor, subject, scope = 'subject', context = {}) {
  if (!authorizedForSubject(actor, subject, context)) throw new AccessDeniedError('data_export_not_authorized', { scope });
  const request = Object.freeze({
    request_id: randomUUID(),
    type: 'data_export',
    status: 'requested',
    scope,
    actor_id: actor.id || actor.userId,
    subject_id: subject.id || subject.userId || subject.studentId || subject.childId,
    organization_id: context.organizationId || actor.organizationId || actor.districtId || subject.organizationId || null,
    school_id: context.schoolId || subject.schoolId || null,
    created_at: new Date().toISOString(),
  });
  return request;
}

export function generateDataExport(requestId, context = {}) {
  const source = context.data || {};
  return Object.freeze({
    request_id: requestId,
    generated_at: new Date().toISOString(),
    account: redactPII(source.account || {}),
    guardianRelationships: redactPII(source.guardianRelationships || []),
    studentProfile: redactPII(source.studentProfile || {}),
    schoolRoster: redactPII(source.schoolRoster || []),
    messages: redactPII(source.messages || []),
    assignments: redactPII(source.assignments || []),
    aiInteractions: redactPII(source.aiInteractions || []),
    consentHistory: redactPII(source.consentHistory || []),
    auditSummary: redactPII(source.auditSummary || []),
  });
}

export function requestDataDeletion(actor, subject, scope = 'subject', context = {}) {
  if (!authorizedForSubject(actor, subject, context)) throw new AccessDeniedError('data_deletion_not_authorized', { scope });
  return Object.freeze({
    request_id: randomUUID(),
    type: 'data_deletion',
    status: 'requested',
    scope,
    actor_id: actor.id || actor.userId,
    subject_id: subject.id || subject.userId || subject.studentId || subject.childId,
    legal_hold: Boolean(context.legalHold),
    contract_retention: Boolean(context.contractRetention),
    created_at: new Date().toISOString(),
  });
}

export async function processDataDeletion(request, context = {}) {
  const blocked = request.legal_hold || request.contract_retention;
  const result = Object.freeze({
    request_id: request.request_id || request.id,
    status: blocked ? 'blocked_retention_required' : 'completed',
    auditPreserved: true,
    anonymizedSubject: !blocked,
    backupHandlingNote: DEFAULT_LIFECYCLE.backupHandlingNote,
    completed_at: blocked ? null : new Date().toISOString(),
  });
  if (context.actor) {
    await auditEvent('data_deletion.completed', context.actor, { type: 'subject', id: request.subject_id }, context, result);
  }
  return result;
}

export function anonymizeSubjectData(subjectId, data = {}) {
  return {
    subject_id: subjectId,
    anonymized_at: new Date().toISOString(),
    data: redactPII({
      ...data,
      email: '[REDACTED]',
      full_name: '[REDACTED]',
      display_name: '[REDACTED]',
    }),
  };
}

export function lifecycleCoverage() {
  return Object.entries(DATA_CLASSIFICATION_REGISTRY.entities)
    .filter(([, entry]) => !entry.aliasOf)
    .map(([name]) => ({ name, policy: getRetentionPolicy(name) }));
}
