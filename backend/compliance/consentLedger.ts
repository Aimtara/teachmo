/* eslint-env node */

import { randomUUID } from 'crypto';

export const CONSENT_SCOPES = [
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
] as const;

export const CONSENT_STATUSES = ['granted', 'revoked', 'expired', 'denied'] as const;

export type ConsentScope = (typeof CONSENT_SCOPES)[number];
export type ConsentStatus = (typeof CONSENT_STATUSES)[number];

export interface ConsentLedgerRecord extends Record<string, unknown> {
  consent_id?: string;
  consentId?: string;
  actor_id?: string;
  actorId?: string;
  actor_role?: string;
  child_id?: string | null;
  childId?: string | null;
  student_id?: string | null;
  studentId?: string | null;
  school_id?: string | null;
  schoolId?: string | null;
  tenant_id?: string | null;
  tenantId?: string | null;
  organization_id?: string | null;
  organizationId?: string | null;
  consent_scope?: string;
  consentScope?: string;
  consent_status?: ConsentStatus | string;
  consentStatus?: ConsentStatus | string;
  source?: string;
  evidence_ref?: string | null;
  granted_at?: string | null;
  grantedAt?: string | null;
  revoked_at?: string | null;
  revokedAt?: string | null;
  expires_at?: string | null;
  expiresAt?: string | null;
  created_at?: string;
  createdAt?: string;
}

interface ConsentContext extends Record<string, unknown> {
  actorId?: string;
  childId?: string;
  studentId?: string;
  schoolId?: string;
  tenantId?: string;
  organizationId?: string;
  ledger?: ConsentLedgerRecord[];
  consentLedger?: ConsentLedgerRecord[];
  records?: ConsentLedgerRecord[];
  at?: string | Date;
}

export class ConsentRequiredError extends Error {
  scope: string;
  metadata: Record<string, unknown>;
  statusCode: number;

  constructor(scope: unknown, metadata: Record<string, unknown> = {}) {
    super(`valid consent required for ${scope}`);
    this.name = 'ConsentRequiredError';
    this.scope = String(scope);
    this.metadata = metadata;
    this.statusCode = 403;
  }
}

function normalizeScope(scope: unknown): string {
  return String(scope || '').trim().toLowerCase();
}

function nowIso(): string {
  return new Date().toISOString();
}

function same(left: unknown, right: unknown): boolean {
  if (left === undefined || left === null || right === undefined || right === null) return true;
  return String(left) === String(right);
}

function isCurrentGrant(record: ConsentLedgerRecord | undefined, scope: unknown, context: ConsentContext = {}, at = new Date()): boolean {
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

export function hasValidConsent(actorId: unknown, scope: unknown, context: ConsentContext = {}): boolean {
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
  return isCurrentGrant(matches[0]?.record, scope, { ...context, actorId: actorId === undefined || actorId === null ? context.actorId : String(actorId) }, at);
}

export function requireConsent(actorId: unknown, scope: unknown, context: ConsentContext = {}): true {
  if (!(CONSENT_SCOPES as readonly string[]).includes(normalizeScope(scope))) {
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
}: {
  consentId?: string;
  actorId?: string;
  actorRole?: string;
  childId?: string | null;
  studentId?: string | null;
  schoolId?: string | null;
  tenantId?: string | null;
  organizationId?: string | null;
  consentScope?: string;
  consentStatus?: ConsentStatus;
  consentVersion?: string;
  noticeVersion?: string;
  source?: string;
  evidenceRef?: string | null;
  expiresAt?: string | null;
  grantedAt?: string;
  ledger?: ConsentLedgerRecord[];
} = {}): Readonly<ConsentLedgerRecord> {
  const normalizedScope = normalizeScope(consentScope);
  if (!(CONSENT_SCOPES as readonly string[]).includes(normalizedScope)) throw new Error(`Unknown consent scope: ${consentScope}`);
  if (!(CONSENT_STATUSES as readonly string[]).includes(String(consentStatus))) throw new Error(`Unknown consent status: ${consentStatus}`);
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

export function revokeConsent({ consentId, actorId, consentScope, childId = null, studentId = childId, ledger, source, evidenceRef }: { consentId?: string; actorId?: string; consentScope?: string; childId?: string | null; studentId?: string | null; ledger?: ConsentLedgerRecord[]; source?: string; evidenceRef?: string | null } = {}): Readonly<ConsentLedgerRecord> {
  const existing = (ledger || []).find((record: ConsentLedgerRecord) => {
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

export function getConsentHistory(actorId: string, childId: string | null = null, ledger: ConsentLedgerRecord[] = []): ConsentLedgerRecord[] {
  return ledger
    .filter((record) => record.actor_id === actorId && (childId ? record.child_id === childId || record.student_id === childId : true))
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
}
