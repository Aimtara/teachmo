import fs from 'fs';
import path from 'path';
import {
  assertClassifiedEntities,
  classifyEntity,
  isAISensitive,
  isPPRASensitive,
  isStudentSensitive,
  requiresAudit,
  requiresConsent,
  requiresDeletion,
  requiresExport,
} from '../compliance/dataClassification.ts';
import {
  AccessDeniedError,
  canAccessStudentData,
  requireStudentScope,
  requireVerifiedGuardianRelationship,
} from '../compliance/accessControl.ts';
import {
  ConsentRequiredError,
  getConsentHistory,
  hasValidConsent,
  recordConsent,
  requireConsent,
  revokeConsent,
} from '../compliance/consentLedger.ts';
import { auditEvent, buildAuditEvent } from '../compliance/auditEvents.ts';
import {
  anonymizeSubjectData,
  generateDataExport,
  getRetentionPolicy,
  processDataDeletion,
  requestDataDeletion,
  requestDataExport,
} from '../compliance/dataLifecycle.ts';
import { classifyAIUseCase, recordAITrace, requireHumanReview, blockFinalDecisionAI } from '../compliance/aiGovernance.ts';
import { redactPII, redactPrompt, safeAnalytics, safeLog } from '../compliance/redaction.ts';
import {
  assertMessagingAllowed,
  buildRosterImportPreview,
  classifyPPRAPrompt,
  createDirectoryRequest,
  createIncident,
  parseRosterCsv,
  queueMessageDelivery,
  retryMessageDelivery,
  transitionDirectoryRequest,
  updateIncident,
} from '../compliance/pilotScaffolds.ts';
import {
  GAP_BACKLOG,
  assertGapBacklogComplete,
  getCriticalRemediationPlan,
  getOpenGaps,
} from '../compliance/remediationBacklog.ts';
import {
  assertRoutePolicyCoverage,
  getRoutePolicy,
} from '../compliance/routePolicyManifest.ts';

const actor = {
  id: 'guardian-1',
  role: 'guardian',
  organizationId: 'org-1',
  schoolId: 'school-1',
};

const student = {
  id: 'student-1',
  organizationId: 'org-1',
  schoolId: 'school-1',
  classIds: ['class-1'],
};

const verifiedRelationship = {
  guardianId: 'guardian-1',
  studentId: 'student-1',
  organizationId: 'org-1',
  schoolId: 'school-1',
  state: 'school_verified',
};

describe('P0 data classification registry', () => {
  test('classifies core sensitive Teachmo objects', () => {
    const core = [
      'user',
      'student',
      'guardian',
      'school',
      'tenant',
      'roster',
      'message',
      'weekly_digest',
      'assignment',
      'ai_interaction',
      'ai_prompt',
      'ai_output',
      'ai_recommendation',
      'audit_log',
      'admin_action',
      'consent_ledger',
    ];

    expect(assertClassifiedEntities(core)).toBe(true);
    expect(isStudentSensitive('student')).toBe(true);
    expect(isAISensitive('ai_interaction')).toBe(true);
    expect(requiresAudit('message.sent')).toBe(true);
    expect(requiresConsent('ai_recommendation')).toBe(true);
    expect(requiresExport('roster')).toBe(true);
    expect(requiresDeletion('message')).toBe(true);
  });

  test('flags PPRA-sensitive prompts', () => {
    expect(isPPRASensitive('Ask students about family relationships and mental health')).toBe(true);
    expect(classifyEntity('unknown_new_table').classified).toBe(false);
  });
});

describe('P0 relationship, RBAC, and tenant access', () => {
  test('unverified guardian cannot access student data', () => {
    const decision = canAccessStudentData(actor, student, {
      relationship: { ...verifiedRelationship, state: 'unverified' },
    });
    expect(decision).toMatchObject({ allowed: false, reason: 'verified_guardian_relationship_required' });
  });

  test('verified guardian can access appropriate child data', () => {
    expect(canAccessStudentData(actor, student, { relationship: verifiedRelationship })).toMatchObject({
      allowed: true,
      reason: 'verified_guardian_relationship',
    });
    expect(requireVerifiedGuardianRelationship('guardian-1', 'student-1', { relationships: [verifiedRelationship], tenantId: 'org-1' })).toBe(
      verifiedRelationship,
    );
  });

  test('revoked relationship immediately loses access', () => {
    expect(
      canAccessStudentData(actor, student, {
        relationship: { ...verifiedRelationship, state: 'revoked' },
      }).allowed,
    ).toBe(false);
  });

  test('teacher cannot access student outside assigned class or school', () => {
    const teacher = { id: 'teacher-1', role: 'teacher', organizationId: 'org-1', schoolId: 'school-1', classIds: ['class-2'] };
    expect(canAccessStudentData(teacher, student).reason).toBe('teacher_class_scope_required');
    expect(canAccessStudentData({ ...teacher, schoolId: 'school-2', classIds: ['class-1'] }, student).reason).toBe(
      'teacher_school_scope_required',
    );
  });

  test('school admin and cross-tenant guardian fail closed outside scope', () => {
    expect(
      canAccessStudentData({ id: 'admin-1', role: 'school_admin', organizationId: 'org-1', schoolId: 'school-2' }, student).allowed,
    ).toBe(false);
    expect(canAccessStudentData({ ...actor, organizationId: 'org-2' }, student, { relationship: verifiedRelationship }).reason).toBe(
      'tenant_scope_required',
    );
    expect(() => requireStudentScope({ ...actor, organizationId: 'org-2' }, student, { relationship: verifiedRelationship })).toThrow(
      AccessDeniedError,
    );
  });
});

describe('P0 consent ledger', () => {
  test('granting, revoking, versioning, and separate scopes are enforced', () => {
    const ledger = [];
    recordConsent({
      actorId: 'guardian-1',
      actorRole: 'guardian',
      childId: 'student-1',
      tenantId: 'org-1',
      consentScope: 'messaging',
      consentVersion: 'messaging-v1',
      noticeVersion: 'notice-v1',
      source: 'privacy_center',
      evidenceRef: 'evidence-1',
      ledger,
    });

    expect(hasValidConsent('guardian-1', 'messaging', { ledger, childId: 'student-1', tenantId: 'org-1' })).toBe(true);
    expect(() => requireConsent('guardian-1', 'ai_assistance', { ledger, childId: 'student-1', tenantId: 'org-1' })).toThrow(
      ConsentRequiredError,
    );

    revokeConsent({ actorId: 'guardian-1', consentScope: 'messaging', childId: 'student-1', ledger, source: 'privacy_center' });
    expect(hasValidConsent('guardian-1', 'messaging', { ledger, childId: 'student-1', tenantId: 'org-1' })).toBe(false);
    expect(getConsentHistory('guardian-1', 'student-1', ledger)).toHaveLength(2);
  });
});

describe('P0 PII redaction, audit, and analytics hygiene', () => {
  test('redacts names, emails, phones, IDs, free-text concerns, and prompts', () => {
    const redacted = redactPII({
      student_name: 'Alice Learner',
      email: 'alice@example.com',
      phone: '555-123-4567',
      note: 'student_id: SIS-12345 has anxiety concerns',
    });

    expect(JSON.stringify(redacted)).not.toContain('Alice');
    expect(JSON.stringify(redacted)).not.toContain('alice@example.com');
    expect(JSON.stringify(redacted)).not.toContain('555-123-4567');
    expect(JSON.stringify(redacted)).not.toContain('SIS-12345');
    expect(redactPrompt('Student Alice needs an IEP intervention')).toBe('[redacted-prompt]');
  });

  test('safe logs and analytics do not include raw child/student PII', () => {
    const logger = { info: jest.fn() };
    safeLog('student.viewed', { child_name: 'Alice', email: 'alice@example.com' }, { logger });
    safeAnalytics('weekly_digest_opened', { studentName: 'Alice', phone: '555-123-4567' });

    expect(JSON.stringify(logger.info.mock.calls)).not.toContain('Alice');
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain('alice@example.com');
  });

  test('audit events are tenant-scoped and PII-minimized', async () => {
    const queryFn = jest.fn();
    const event = await auditEvent(
      'student.viewed',
      { id: 'admin-1', role: 'school_admin', organizationId: 'org-1', schoolId: 'school-1' },
      { type: 'student', id: 'student-1', organizationId: 'org-1', schoolId: 'school-1' },
      { organizationId: 'org-1', schoolId: 'school-1', queryFn },
      { email: 'alice@example.com', reason: 'support' },
    );

    expect(event.organization_id).toBe('org-1');
    expect(event.metadata.email).toBe('[REDACTED]');
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(() => buildAuditEvent('student.viewed', { id: 'admin-1' }, { type: 'student', id: 'student-1' }, {})).toThrow(
      /organization_id/,
    );
  });
});

describe('P0 data lifecycle workflows', () => {
  test('authorized export/deletion works and unauthorized requests fail closed', async () => {
    const exportRequest = requestDataExport(actor, { ...student, type: 'student' }, 'subject', { relationship: verifiedRelationship });
    expect(exportRequest.status).toBe('requested');
    expect(() => requestDataExport({ ...actor, organizationId: 'org-2' }, { ...student, type: 'student' }, 'subject')).toThrow(
      AccessDeniedError,
    );

    const deletionRequest = requestDataDeletion(actor, { ...student, type: 'student' }, 'subject', { relationship: verifiedRelationship });
    const result = await processDataDeletion(deletionRequest);
    expect(result.auditPreserved).toBe(true);
    expect(result.status).toBe('completed');
  });

  test('exports and anonymization minimize sensitive data', () => {
    const exported = generateDataExport('request-1', {
      data: {
        account: { email: 'alice@example.com', display_name: 'Alice' },
        aiInteractions: [{ prompt: 'Student Alice has anxiety' }],
      },
    });
    expect(JSON.stringify(exported)).not.toContain('alice@example.com');
    expect(getRetentionPolicy('audit_log').deletionBehavior).toMatch(/never delete/i);
    expect(anonymizeSubjectData('student-1', { email: 'alice@example.com' }).data.email).toBe('[REDACTED]');
  });
});

describe('P0 AI governance guardrails', () => {
  test('high-stakes output requires human review and final decisions are blocked', () => {
    const classification = classifyAIUseCase('Recommend an intervention and risk score for this student', { childId: 'student-1' });
    expect(classification.policyClass).toBe('high_stakes');
    expect(requireHumanReview('Recommend discipline for this student').required).toBe(true);
    expect(() => blockFinalDecisionAI({ text: 'This is the final decision: assign discipline.' })).toThrow(/ai_final_decision_blocked/);
  });

  test('AI trace requires consent, redacts prompt/output, and emits audits', async () => {
    const ledger = [];
    recordConsent({
      actorId: 'guardian-1',
      actorRole: 'guardian',
      childId: 'student-1',
      tenantId: 'org-1',
      consentScope: 'ai_assistance',
      consentVersion: 'ai-v1',
      noticeVersion: 'notice-v1',
      source: 'privacy_center',
      ledger,
    });
    const queryFn = jest.fn();
    const trace = await recordAITrace({
      actor,
      input: { childId: 'student-1', prompt: 'Student Alice alice@example.com needs help' },
      output: { text: 'Intervention recommendation needs human review' },
      context: { organizationId: 'org-1', schoolId: 'school-1', ledger, queryFn, childId: 'student-1' },
    });

    expect(trace.advisory_label).toMatch(/advisory/i);
    expect(trace.prompt).toBe('[redacted-prompt]');
    expect(queryFn).toHaveBeenCalledTimes(2);
    await expect(
      recordAITrace({ actor, input: { childId: 'student-1', prompt: 'help' }, output: { text: 'help' }, context: { organizationId: 'org-1' } }),
    ).rejects.toThrow(ConsentRequiredError);
  });
});

describe('P1 pilot readiness scaffolds', () => {
  test('roster import maps identities deterministically and flags duplicates/ambiguous rows', () => {
    const records = parseRosterCsv(
      'student_external_id,student_name,guardian_email,class_name\ns1,Alice,guardian@example.com,Math\ns1,Alice,guardian@example.com,Math\n,Bob,,ELA',
    );
    const preview = buildRosterImportPreview(records, {
      organizationId: 'org-1',
      schoolId: 'school-1',
      actor: { role: 'school_admin' },
    });
    expect(preview[0].student_key).toBe(preview[1].student_key);
    expect(preview[1].status).toBe('duplicate');
    expect(preview[2].status).toBe('needs_review');
  });

  test('directory, messaging/digest, PPRA, and incident scaffolds fail closed and audit', async () => {
    const request = createDirectoryRequest({ id: 'guardian-1' }, { id: 'school-1', organizationId: 'org-1', name: 'Private School Name' });
    expect(request.private_data_revealed).toBe(false);
    expect(() => transitionDirectoryRequest(request, 'approved', { role: 'guardian' })).toThrow(AccessDeniedError);

    const ledger = [];
    recordConsent({
      actorId: 'guardian-1',
      actorRole: 'guardian',
      childId: 'student-1',
      tenantId: 'org-1',
      consentScope: 'messaging',
      consentVersion: 'msg-v1',
      noticeVersion: 'notice-v1',
      source: 'privacy_center',
      ledger,
    });
    expect(assertMessagingAllowed({ actor, student, relationship: verifiedRelationship, consentLedger: ledger })).toBe(true);
    expect(() => assertMessagingAllowed({ actor, student, relationship: verifiedRelationship, consentLedger: ledger, preferences: { messagingOptOut: true } })).toThrow(
      AccessDeniedError,
    );
    expect(retryMessageDelivery(queueMessageDelivery({ body: 'Student Alice alice@example.com' })).attempts).toBe(1);
    expect(classifyPPRAPrompt('How is your family relationship and mental health?', { approved: false }).status).toBe(
      'blocked_pending_review',
    );

    const incident = createIncident({
      severity: 'high',
      category: 'privacy',
      affectedTenantIds: ['org-1'],
      affectedDataClasses: ['child_pi'],
      affectedSubjectCount: 2,
      owner: 'security',
      notes: 'alice@example.com affected',
    });
    const queryFn = jest.fn();
    const updated = await updateIncident(incident, 'triage', { id: 'admin-1', role: 'system_admin', organizationId: 'org-1' }, {
      organizationId: 'org-1',
      queryFn,
    });
    expect(updated.status).toBe('triage');
    expect(JSON.stringify(incident)).not.toContain('alice@example.com');
    expect(queryFn).toHaveBeenCalledTimes(1);
  });
});

describe('Risky feature gates', () => {
  test('risky student-data features are disabled by default with owners and gates', () => {
    const registry = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'config/feature_flags.json'), 'utf8'));
    const risky = [
      'COMMUNITY',
      'GAMIFICATION',
      'LEADERBOARDS',
      'RANKINGS',
      'CHALLENGES',
      'PARTNER_PORTAL',
      'ASSIGNMENT_SYNC',
      'OFFICE_HOURS',
      'AI_SENSITIVE_RECOMMENDATIONS',
      'ADMIN_ANALYTICS_SENSITIVE',
      'SAFESPACE_EMERGENCY_NOTIFIER',
      'LTI_DEEP_INTEGRATIONS',
    ];

    for (const key of risky) {
      const flag = registry.flags.find((entry) => entry.key === key);
      expect(flag).toBeTruthy();
      expect(flag.defaultEnabled).toBe(false);
      expect(flag.owner).toBeTruthy();
      expect(flag.reason).toBeTruthy();
      expect(flag.requiredGates.length).toBeGreaterThan(0);
      expect(flag.environmentOverrides).toEqual({});
    }
  });
});

describe('Remaining gap remediation backlog', () => {
  test('tracks open gaps with owners, solutions, evidence, and acceptance criteria', () => {
    expect(assertGapBacklogComplete()).toBe(true);
    expect(GAP_BACKLOG.length).toBeGreaterThanOrEqual(10);

    const p0Plan = getCriticalRemediationPlan();
    expect(p0Plan.map((gap) => gap.id)).toEqual(
      expect.arrayContaining(['GAP-001', 'GAP-002', 'GAP-003', 'GAP-004', 'GAP-005', 'GAP-007', 'GAP-010']),
    );
    p0Plan.forEach((gap) => {
      expect(gap.recommendation).toBeTruthy();
      expect(gap.implementationSteps.length).toBeGreaterThan(0);
      expect(gap.acceptanceCriteria.length).toBeGreaterThan(0);
    });
    expect(getOpenGaps({ priority: 'P1' }).some((gap) => gap.id === 'GAP-012')).toBe(true);
  });
});

describe('Route policy manifest', () => {
  test('sensitive routes declare classification, authorization, consent, and audit controls', () => {
    expect(assertRoutePolicyCoverage()).toBe(true);
    expect(getRoutePolicy('privacy.consents.create').requiredControls).toEqual(
      expect.arrayContaining(['auth', 'tenant', 'consent_scope_validation', 'audit']),
    );
    expect(getRoutePolicy('privacy.exports.request').requiredControls).toEqual(
      expect.arrayContaining(['auth', 'tenant', 'subject_or_admin', 'audit']),
    );
    expect(getRoutePolicy('ai.completion').requiredControls).toEqual(
      expect.arrayContaining(['auth', 'tenant', 'feature_flag', 'ai_governance', 'audit']),
    );
  });
});
