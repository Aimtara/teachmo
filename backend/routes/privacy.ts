/* eslint-env node */
import crypto from 'crypto';
import { Router } from 'express';
import type { Response } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { recordAuditLog } from '../utils/audit.js';
import { CONSENT_SCOPES, recordConsent } from '../compliance/consentLedger.ts';
import type { ApiError, TenantScopedRequest } from '../types/http.ts';

const router = Router();

router.use(requireAuth);
router.use(requireTenant);

const ADMIN_ROLES = new Set(['system_admin', 'district_admin', 'school_admin', 'admin']);
const VERIFIED_RELATIONSHIP_STATES = ['school_verified', 'guardian_confirmed'];

type PrivacyRequest = TenantScopedRequest;

interface AuditPrivacyParams {
  action: string;
  entityType: string;
  entityId?: unknown;
  metadata?: Record<string, unknown>;
  before?: unknown;
  after?: unknown;
}

function isAdmin(req: PrivacyRequest): boolean {
  return ADMIN_ROLES.has(String(req.auth?.role || '').toLowerCase());
}

function actorId(req: PrivacyRequest): string | undefined {
  return req.auth?.userId;
}

function actorRole(req: PrivacyRequest): string {
  return req.auth?.role || 'unknown';
}

function tenant(req: PrivacyRequest) {
  return {
    organizationId: req.tenant?.organizationId,
    schoolId: req.tenant?.schoolId ?? null,
  };
}

function handleError(res: Response, error: unknown): void {
  const apiError = error as ApiError;
  if (apiError?.statusCode) {
    res.status(apiError.statusCode).json({ error: apiError.reason || apiError.message });
    return;
  }
  if (/Unknown consent scope/.test(apiError?.message || '')) {
    res.status(400).json({ error: 'invalid_consent_scope' });
    return;
  }
  res.status(500).json({ error: 'privacy_api_error' });
}

async function auditPrivacyAction(
  req: PrivacyRequest,
  { action, entityType, entityId, metadata = {}, before = null, after = null }: AuditPrivacyParams
): Promise<void> {
  const { organizationId, schoolId } = tenant(req);
  await recordAuditLog({
    actorId: actorId(req),
    action,
    entityType,
    entityId,
    metadata,
    before,
    after,
    changes: null,
    containsPii: false,
    organizationId,
    schoolId,
  });
}

async function requireSubjectAccess(
  req: PrivacyRequest,
  { subjectId, subjectType }: { subjectId: unknown; subjectType: unknown }
): Promise<true> {
  if (!subjectId) {
    const error = new Error('subjectId required') as ApiError;
    error.statusCode = 400;
    error.reason = 'subjectId_required';
    throw error;
  }
  if (isAdmin(req) || String(subjectId) === String(actorId(req))) return true;

  if (subjectType === 'student' || subjectType === 'child') {
    const { organizationId, schoolId } = tenant(req);
    const result = await query(
      `select id
       from public.guardian_student_relationships
       where organization_id = $1
         and school_id is not distinct from $2
         and guardian_id = $3
         and student_id = $4
         and state = ANY($5::text[])
       limit 1`,
      [organizationId, schoolId, actorId(req), subjectId, VERIFIED_RELATIONSHIP_STATES],
    );
    if (result.rows?.[0]) return true;
  }

  const error = new Error('subject access denied') as ApiError;
  error.statusCode = 403;
  error.reason = 'subject_access_denied';
  throw error;
}

router.get('/consents/history', async (req, res) => {
  const { organizationId, schoolId } = tenant(req);
  const childId = req.query.childId || req.query.studentId || null;
  const result = await query(
    `select consent_id, actor_id, actor_role, child_id, student_id, school_id, tenant_id, organization_id,
            consent_scope, consent_status, consent_version, notice_version, source,
            granted_at, revoked_at, expires_at, evidence_ref, created_at, updated_at
     from public.consent_ledger
     where actor_id = $1
       and organization_id = $2
       and school_id is not distinct from $3
       and ($4::uuid is null or student_id = $4 or child_id = $4)
     order by created_at desc`,
    [actorId(req), organizationId, schoolId, childId],
  );
  await auditPrivacyAction(req, {
    action: 'consent.history_viewed',
    entityType: 'consent_ledger',
    entityId: actorId(req),
    metadata: { childIdPresent: Boolean(childId), resultCount: result.rows?.length || 0 },
  });
  res.json({ consents: result.rows || [] });
});

router.post('/consents', async (req, res) => {
  try {
    const { organizationId, schoolId } = tenant(req);
    const record = recordConsent({
      actorId: actorId(req),
      actorRole: actorRole(req),
      childId: req.body?.childId || req.body?.studentId || null,
      studentId: req.body?.studentId || req.body?.childId || null,
      schoolId,
      tenantId: organizationId,
      organizationId,
      consentScope: req.body?.consentScope,
      consentVersion: req.body?.consentVersion,
      noticeVersion: req.body?.noticeVersion,
      source: req.body?.source,
      evidenceRef: req.body?.evidenceRef,
      expiresAt: req.body?.expiresAt || null,
    });

    await query(
      `insert into public.consent_ledger
        (consent_id, actor_id, actor_role, child_id, student_id, school_id, tenant_id, organization_id,
         consent_scope, consent_status, consent_version, notice_version, source, granted_at, revoked_at,
         expires_at, evidence_ref, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
      [
        record.consent_id,
        record.actor_id,
        record.actor_role,
        record.child_id,
        record.student_id,
        record.school_id,
        record.tenant_id,
        record.organization_id,
        record.consent_scope,
        record.consent_status,
        record.consent_version,
        record.notice_version,
        record.source,
        record.granted_at,
        record.revoked_at,
        record.expires_at,
        record.evidence_ref,
        record.created_at,
        record.updated_at,
      ],
    );

    await auditPrivacyAction(req, {
      action: 'consent.granted',
      entityType: 'consent_ledger',
      entityId: record.consent_id,
      metadata: { consentScope: record.consent_scope, consentVersion: record.consent_version, noticeVersion: record.notice_version },
      after: { consent_scope: record.consent_scope, consent_status: record.consent_status },
    });

    res.status(201).json({ consent: record });
  } catch (error) {
    handleError(res, error);
  }
});

router.delete('/consents/:scope', async (req, res) => {
  try {
    const { organizationId, schoolId } = tenant(req);
    const scope = String(req.params.scope || '').trim().toLowerCase();
    if (!CONSENT_SCOPES.includes(scope)) return res.status(400).json({ error: 'invalid_consent_scope' });
    const studentId = req.body?.studentId || req.body?.childId || null;

    const existing = await query(
      `select *
       from public.consent_ledger
       where actor_id = $1
         and organization_id = $2
         and school_id is not distinct from $3
         and consent_scope = $4
         and consent_status = 'granted'
         and revoked_at is null
         and ($5::uuid is null or student_id = $5 or child_id = $5)
       order by created_at desc
       limit 1`,
      [actorId(req), organizationId, schoolId, scope, studentId],
    );
    const active = existing.rows?.[0];
    if (!active) return res.status(404).json({ error: 'active_consent_not_found' });

    const revoked = {
      ...active,
      consent_id: crypto.randomUUID(),
      consent_status: 'revoked',
      revoked_at: new Date().toISOString(),
      source: req.body?.source || active.source,
      evidence_ref: req.body?.evidenceRef || active.evidence_ref,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await query(
      `insert into public.consent_ledger
        (consent_id, actor_id, actor_role, child_id, student_id, school_id, tenant_id, organization_id,
         consent_scope, consent_status, consent_version, notice_version, source, granted_at, revoked_at,
         expires_at, evidence_ref, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
      [
        revoked.consent_id,
        revoked.actor_id,
        revoked.actor_role,
        revoked.child_id,
        revoked.student_id,
        revoked.school_id,
        revoked.tenant_id,
        revoked.organization_id,
        revoked.consent_scope,
        revoked.consent_status,
        revoked.consent_version,
        revoked.notice_version,
        revoked.source,
        revoked.granted_at,
        revoked.revoked_at,
        revoked.expires_at,
        revoked.evidence_ref,
        revoked.created_at,
        revoked.updated_at,
      ],
    );

    await auditPrivacyAction(req, {
      action: 'consent.revoked',
      entityType: 'consent_ledger',
      entityId: revoked.consent_id,
      metadata: { consentScope: scope },
      before: { consent_scope: scope, consent_status: 'granted' },
      after: { consent_scope: scope, consent_status: 'revoked' },
    });

    res.json({ consent: revoked });
  } catch (error) {
    handleError(res, error);
  }
});

router.get('/relationships', async (req, res) => {
  const { organizationId, schoolId } = tenant(req);
  const studentId = req.query.studentId || null;
  const params = [organizationId, schoolId, studentId];
  const ownerFilter = isAdmin(req) ? '' : 'and guardian_id = $4';
  if (!isAdmin(req)) params.push(actorId(req));
  const result = await query(
    `select id, organization_id, school_id, guardian_id, student_id, state, evidence_ref, created_at, updated_at
     from public.guardian_student_relationships
     where organization_id = $1
       and school_id is not distinct from $2
       and ($3::uuid is null or student_id = $3)
       ${ownerFilter}
     order by updated_at desc
     limit 100`,
    params,
  );
  res.json({ relationships: result.rows || [] });
});

router.post('/relationships', async (req, res) => {
  try {
    const { organizationId, schoolId } = tenant(req);
    const studentId = req.body?.studentId;
    if (!studentId) return res.status(400).json({ error: 'studentId_required' });
    const requestedState = isAdmin(req) && req.body?.state === 'school_verified' ? 'school_verified' : 'invited';
    const result = await query(
      `insert into public.guardian_student_relationships
        (organization_id, school_id, guardian_id, student_id, state, evidence_ref, created_by, updated_by)
       values ($1,$2,$3,$4,$5,$6,$7,$7)
       returning id, organization_id, school_id, guardian_id, student_id, state, evidence_ref, created_at, updated_at`,
      [organizationId, req.body?.schoolId || schoolId, req.body?.guardianId || actorId(req), studentId, requestedState, req.body?.evidenceRef || null, actorId(req)],
    );
    const relationship = result.rows?.[0];
    await auditPrivacyAction(req, {
      action: 'relationship.created',
      entityType: 'guardian_relationship',
      entityId: relationship?.id,
      metadata: { state: requestedState },
      after: { state: requestedState },
    });
    res.status(201).json({ relationship });
  } catch (error) {
    handleError(res, error);
  }
});

async function transitionRelationship(req: PrivacyRequest, res: Response, state: string, action: string): Promise<void> {
  try {
    const { organizationId, schoolId } = tenant(req);
    if (state === 'school_verified' && !isAdmin(req)) {
      res.status(403).json({ error: 'school_admin_role_required' });
      return;
    }
    const ownerFilter = isAdmin(req) ? '' : 'and guardian_id = $6';
    const params = [state, actorId(req), req.params.id, organizationId, schoolId];
    if (!isAdmin(req)) params.push(actorId(req));
    const result = await query(
      `update public.guardian_student_relationships
       set state = $1, updated_by = $2, updated_at = now()
       where id = $3
         and organization_id = $4
         and school_id is not distinct from $5
         ${ownerFilter}
       returning id, organization_id, school_id, guardian_id, student_id, state, evidence_ref, created_at, updated_at`,
      params,
    );
    const relationship = result.rows?.[0];
    if (!relationship) {
      res.status(404).json({ error: 'relationship_not_found' });
      return;
    }
    await auditPrivacyAction(req, {
      action,
      entityType: 'guardian_relationship',
      entityId: relationship.id,
      metadata: { state },
      after: { state },
    });
    res.json({ relationship });
  } catch (error) {
    handleError(res, error);
  }
}

router.post('/relationships/:id/verify', (req, res) => transitionRelationship(req, res, 'school_verified', 'relationship.verified'));
router.post('/relationships/:id/revoke', (req, res) => transitionRelationship(req, res, 'revoked', 'relationship.revoked'));
router.post('/relationships/:id/dispute', (req, res) => transitionRelationship(req, res, 'disputed', 'relationship.disputed'));

router.post('/data-exports', async (req, res) => {
  try {
    const { organizationId, schoolId } = tenant(req);
    const subjectId = req.body?.subjectId || actorId(req);
    const subjectType = req.body?.subjectType || 'user';
    await requireSubjectAccess(req, { subjectId, subjectType });
    const result = await query(
      `insert into public.data_lifecycle_requests
        (organization_id, school_id, request_type, status, requested_by, subject_id, subject_type, scope, backup_handling_note)
       values ($1,$2,'export','requested',$3,$4,$5,$6,$7)
       returning id, request_type, status, requested_by, subject_id, subject_type, scope, created_at`,
      [
        organizationId,
        schoolId,
        actorId(req),
        subjectId,
        subjectType,
        req.body?.scope || 'subject',
        'Backups expire through tenant backup retention; immutable backups are not mutated in place.',
      ],
    );
    const lifecycleRequest = result.rows?.[0];
    await auditPrivacyAction(req, {
      action: 'data_export.created',
      entityType: subjectType,
      entityId: subjectId,
      metadata: { lifecycleRequestId: lifecycleRequest?.id, scope: lifecycleRequest?.scope },
    });
    res.status(201).json({ request: lifecycleRequest });
  } catch (error) {
    handleError(res, error);
  }
});

router.post('/data-deletions', async (req, res) => {
  try {
    const { organizationId, schoolId } = tenant(req);
    const subjectId = req.body?.subjectId || actorId(req);
    const subjectType = req.body?.subjectType || 'user';
    await requireSubjectAccess(req, { subjectId, subjectType });
    const result = await query(
      `insert into public.data_lifecycle_requests
        (organization_id, school_id, request_type, status, requested_by, subject_id, subject_type, scope,
         legal_hold, contract_retention, backup_handling_note)
       values ($1,$2,'deletion','requested',$3,$4,$5,$6,$7,$8,$9)
       returning id, request_type, status, requested_by, subject_id, subject_type, scope, legal_hold, contract_retention, created_at`,
      [
        organizationId,
        schoolId,
        actorId(req),
        subjectId,
        subjectType,
        req.body?.scope || 'subject',
        Boolean(req.body?.legalHold),
        Boolean(req.body?.contractRetention),
        'Backups expire through tenant backup retention; immutable backups are not mutated in place.',
      ],
    );
    const lifecycleRequest = result.rows?.[0];
    await auditPrivacyAction(req, {
      action: 'data_deletion.created',
      entityType: subjectType,
      entityId: subjectId,
      metadata: {
        lifecycleRequestId: lifecycleRequest?.id,
        scope: lifecycleRequest?.scope,
        legalHold: lifecycleRequest?.legal_hold,
        contractRetention: lifecycleRequest?.contract_retention,
      },
    });
    res.status(201).json({ request: lifecycleRequest });
  } catch (error) {
    handleError(res, error);
  }
});

export default router;
