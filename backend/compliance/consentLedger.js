/* eslint-env node */

import { randomUUID } from 'crypto';

export const CONSENT_SCOPES = Object.freeze([
  'account_creation',
  'child_data_collection',
  'school_authorized_use',
  'ai_assistance',
  'ai_sensitive_recommendations',
  'messaging',
  'weekly_digest',
  'optional_analytics',
  'third_party_integrations',
  'media_or_community_display',
  'surveys_or_reflections',
]);

export const CONSENT_STATUSES = Object.freeze(['granted', 'revoked', 'expired', 'denied']);

export class ConsentRequiredError extends Error {
  constructor(scope, metadata = {}) {
    super(`valid consent required for ${scope}`);
    this.name = 'ConsentRequiredError';
    this.scope = scope;
    this.metadata = metadata;
    this.statusCode = 403;
  }
}

function normalizeScope(scope) {
  return String(scope || '').trim().toLowerCase();
}

function nowIso() {
  return new Date().toISOString();
}

function same(left, right) {
  if (left === undefined || left === null || right === undefined || right === null) return true;
  return String(left) === String(right);
}

function isCurrentGrant(record, scope, context = {}, at = new Date()) {
  if (!record) return false;
  if (normalizeScope(record.consent_scope || record.consentScope) !== normalizeScope(scope)) return false;
  if ((record.consent_status || record.consentStatus) !== 'granted') return false;
  if (!same(record.actor_id || record.actorId, context.actorId)) return false;
  if (!same(record.child_id || record.childId || record.student_id || record.studentId, context.childId || context.studentId)) return false;
  if (!same(record.school_id || record.schoolId, context.schoolId)) return false;
  if (!same(record.tenant_id || record.tenantId || record.organization_id || record.organizationId, context.tenantId || context.organizationId)) return false;
  const revokedAt = record.revoked_at || record.revokedAt;
  if (revokedAt) return false;
  const expiresAt = record.expires_at || record.expiresAt;
  if (expiresAt && new Date(expiresAt) <= at) return false;
  return true;
}

export function hasValidConsent(actorId, scope, context = {}) {
  const records = context.ledger || context.consentLedger || context.records || [];
  const at = context.at ? new Date(context.at) : new Date();
  const matches = records
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => {
      if (normalizeScope(record.consent_scope || record.consentScope) !== normalizeScope(scope)) return false;
      if (!same(record.actor_id || record.actorId, actorId || context.actorId)) return false;
      if (!same(record.child_id || record.childId || record.student_id || record.studentId, context.childId || context.studentId)) return false;
      if (!same(record.school_id || record.schoolId, context.schoolId)) return false;
      if (!same(record.tenant_id || record.tenantId || record.organization_id || record.organizationId, context.tenantId || context.organizationId)) return false;
      return true;
    })
    .sort((a, b) => {
      const byDate = String(b.record.created_at || b.record.createdAt || '').localeCompare(
        String(a.record.created_at || a.record.createdAt || ''),
      );
      return byDate || b.index - a.index;
    });
  return isCurrentGrant(matches[0]?.record, scope, { ...context, actorId: actorId || context.actorId }, at);
}

export function requireConsent(actorId, scope, context = {}) {
  if (!CONSENT_SCOPES.includes(normalizeScope(scope))) {
    throw new ConsentRequiredError(scope, { reason: 'unknown_consent_scope' });
  }
  if (!hasValidConsent(actorId, scope, context)) {
    throw new ConsentRequiredError(scope, { actorId, childId: context.childId || context.studentId });
  }
  return true;
}

export function recordConsent({
  consentId = randomUUID(),
  actorId,
  actorRole,
  childId = null,
  studentId = childId,
  schoolId = null,
  tenantId = null,
  organizationId = tenantId,
  consentScope,
  consentStatus = 'granted',
  consentVersion,
  noticeVersion,
  source,
  evidenceRef,
  expiresAt = null,
  grantedAt = nowIso(),
  ledger,
} = {}) {
  const normalizedScope = normalizeScope(consentScope);
  if (!CONSENT_SCOPES.includes(normalizedScope)) throw new Error(`Unknown consent scope: ${consentScope}`);
  if (!CONSENT_STATUSES.includes(consentStatus)) throw new Error(`Unknown consent status: ${consentStatus}`);
  if (!actorId || !actorRole || !consentVersion || !noticeVersion || !source) {
    throw new Error('actorId, actorRole, consentVersion, noticeVersion, and source are required');
  }

  const timestamp = nowIso();
  const record = Object.freeze({
    consent_id: consentId,
    actor_id: actorId,
    actor_role: actorRole,
    child_id: childId,
    student_id: studentId,
    school_id: schoolId,
    tenant_id: tenantId,
    organization_id: organizationId,
    consent_scope: normalizedScope,
    consent_status: consentStatus,
    consent_version: consentVersion,
    notice_version: noticeVersion,
    source,
    granted_at: consentStatus === 'granted' ? grantedAt : null,
    revoked_at: consentStatus === 'revoked' ? timestamp : null,
    expires_at: expiresAt,
    evidence_ref: evidenceRef || null,
    created_at: timestamp,
    updated_at: timestamp,
  });

  if (Array.isArray(ledger)) ledger.push(record);
  return record;
}

export function revokeConsent({ consentId, actorId, consentScope, childId = null, studentId = childId, ledger, source, evidenceRef } = {}) {
  const existing = (ledger || []).find((record) => {
    if (consentId && record.consent_id !== consentId) return false;
    if (actorId && record.actor_id !== actorId) return false;
    if (consentScope && normalizeScope(record.consent_scope) !== normalizeScope(consentScope)) return false;
    if (studentId && record.student_id !== studentId && record.child_id !== studentId) return false;
    return record.consent_status === 'granted' && !record.revoked_at;
  });
  if (!existing) throw new ConsentRequiredError(consentScope || 'unknown', { reason: 'active_consent_not_found' });

  const revoked = Object.freeze({
    ...existing,
    consent_id: randomUUID(),
    consent_status: 'revoked',
    source: source || existing.source,
    evidence_ref: evidenceRef || existing.evidence_ref || null,
    granted_at: existing.granted_at,
    revoked_at: nowIso(),
    created_at: nowIso(),
    updated_at: nowIso(),
  });
  if (Array.isArray(ledger)) ledger.push(revoked);
  return revoked;
}

export function getConsentHistory(actorId, childId = null, ledger = []) {
  return ledger
    .filter((record) => record.actor_id === actorId && (childId ? record.child_id === childId || record.student_id === childId : true))
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
}
