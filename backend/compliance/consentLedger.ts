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

export type ConsentScope = (typeof CONSENT_SCOPES)[number];
export type ConsentStatus = (typeof CONSENT_STATUSES)[number];

export interface ConsentRecord extends Record<string, unknown> {
  consent_id: string;
  actor_id: string;
  actor_role: string;
  child_id: string | null;
  student_id: string | null;
  school_id: string | null;
  tenant_id: string | null;
  organization_id: string | null;
  consent_scope: string;
  consent_status: string;
  consent_version: string;
  notice_version: string;
  source: string;
  granted_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
  evidence_ref: string | null;
  created_at: string;
  updated_at: string;
}

interface ConsentContext extends Record<string, unknown> {
  actorId?: string | null;
  childId?: string | null;
  studentId?: string | null;
  schoolId?: string | null;
  tenantId?: string | null;
  organizationId?: string | null;
  ledger?: ConsentRecord[];
  consentLedger?: ConsentRecord[];
  records?: ConsentRecord[];
  at?: string | Date;
}

interface RecordConsentInput {
  consentId?: string;
  actorId?: string;
  actorRole?: string;
  childId?: string | null;
  studentId?: string | null;
  schoolId?: string | null;
  tenantId?: string | null;
  organizationId?: string | null;
  consentScope?: string;
  consentStatus?: string;
  consentVersion?: string;
  noticeVersion?: string;
  source?: string;
  evidenceRef?: string | null;
  expiresAt?: string | null;
  grantedAt?: string;
  ledger?: ConsentRecord[];
}

interface RevokeConsentInput {
  consentId?: string;
  actorId?: string;
  consentScope?: string;
  childId?: string | null;
  studentId?: string | null;
  ledger?: ConsentRecord[];
  source?: string;
  evidenceRef?: string | null;
}

export class ConsentRequiredError extends Error {
  scope: string;
  metadata: Record<string, unknown>;
  statusCode: number;

  constructor(scope: string, metadata: Record<string, unknown> = {}) {
    super(`valid consent required for ${scope}`);
    this.name = 'ConsentRequiredError';
    this.scope = scope;
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

function read(record: ConsentRecord | Record<string, unknown>, snake: string, camel: string): unknown {
  return record[snake] ?? record[camel];
}

function isCurrentGrant(record: ConsentRecord | undefined, scope: string, context: ConsentContext = {}, at = new Date()): boolean {
  if (!record) return false;
  if (normalizeScope(read(record, 'consent_scope', 'consentScope')) !== normalizeScope(scope)) return false;
  if (read(record, 'consent_status', 'consentStatus') !== 'granted') return false;
  if (!same(read(record, 'actor_id', 'actorId'), context.actorId)) return false;
  if (!same(read(record, 'child_id', 'childId') || read(record, 'student_id', 'studentId'), context.childId || context.studentId)) return false;
  if (!same(read(record, 'school_id', 'schoolId'), context.schoolId)) return false;
  if (!same(read(record, 'tenant_id', 'tenantId') || read(record, 'organization_id', 'organizationId'), context.tenantId || context.organizationId)) return false;
  const revokedAt = read(record, 'revoked_at', 'revokedAt');
  if (revokedAt) return false;
  const expiresAt = read(record, 'expires_at', 'expiresAt');
  if (expiresAt && new Date(String(expiresAt)) <= at) return false;
  return true;
}

export function hasValidConsent(actorId: string | null | undefined, scope: string, context: ConsentContext = {}): boolean {
  const records = context.ledger || context.consentLedger || context.records || [];
  const at = context.at ? new Date(context.at) : new Date();
  const matches = records
    .map((record: ConsentRecord, index: number) => ({ record, index }))
    .filter(({ record }) => {
      if (normalizeScope(read(record, 'consent_scope', 'consentScope')) !== normalizeScope(scope)) return false;
      if (!same(read(record, 'actor_id', 'actorId'), actorId || context.actorId)) return false;
      if (!same(read(record, 'child_id', 'childId') || read(record, 'student_id', 'studentId'), context.childId || context.studentId)) return false;
      if (!same(read(record, 'school_id', 'schoolId'), context.schoolId)) return false;
      if (!same(read(record, 'tenant_id', 'tenantId') || read(record, 'organization_id', 'organizationId'), context.tenantId || context.organizationId)) return false;
      return true;
    })
    .sort((a, b) => {
      const byDate = String(read(b.record, 'created_at', 'createdAt') || '').localeCompare(
        String(read(a.record, 'created_at', 'createdAt') || ''),
      );
      return byDate || b.index - a.index;
    });
  return isCurrentGrant(matches[0]?.record, scope, { ...context, actorId: actorId || context.actorId }, at);
}

export function requireConsent(actorId: string | null | undefined, scope: string, context: ConsentContext = {}): true {
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
}: RecordConsentInput = {}): Readonly<ConsentRecord> {
  const normalizedScope = normalizeScope(consentScope);
  if (!CONSENT_SCOPES.includes(normalizedScope)) throw new Error(`Unknown consent scope: ${consentScope}`);
  if (!CONSENT_STATUSES.includes(consentStatus as ConsentStatus)) throw new Error(`Unknown consent status: ${consentStatus}`);
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

export function revokeConsent({
  consentId,
  actorId,
  consentScope,
  childId = null,
  studentId = childId,
  ledger,
  source,
  evidenceRef
}: RevokeConsentInput = {}): Readonly<ConsentRecord> {
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

export function getConsentHistory(actorId: string, childId: string | null = null, ledger: ConsentRecord[] = []): ConsentRecord[] {
  return ledger
    .filter((record) => record.actor_id === actorId && (childId ? record.child_id === childId || record.student_id === childId : true))
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
}
