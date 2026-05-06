import request from 'supertest';
import express from 'express';

jest.mock('../db.js', () => ({
  query: jest.fn(),
}));

jest.mock('../middleware/auth.js', () => ({
  requireAuth: (req, _res, next) => {
    req.auth = {
      userId: req.get('x-test-user-id') || 'guardian-00000000-0000-4000-8000-000000000001',
      role: req.get('x-test-role') || 'guardian',
      scopes: [],
    };
    next();
  },
}));

jest.mock('../middleware/tenant.js', () => ({
  requireTenant: (req, _res, next) => {
    req.tenant = {
      organizationId: req.get('x-test-org-id') || '00000000-0000-4000-8000-000000000001',
      schoolId: req.get('x-test-school-id') || '00000000-0000-4000-8000-000000000002',
    };
    next();
  },
}));

import { query as mockQuery } from '../db.js';
import privacyRouter from '../routes/privacy.js';

const app = express();
app.use(express.json());
app.use('/api/privacy', privacyRouter);

describe('privacy route controls', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/privacy/consents records scoped consent and audit event', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/privacy/consents')
      .send({
        studentId: '00000000-0000-4000-8000-000000000010',
        consentScope: 'ai_assistance',
        consentVersion: 'ai-v1',
        noticeVersion: 'notice-v1',
        source: 'privacy_center',
        evidenceRef: 'notice-click',
      });

    expect(res.status).toBe(201);
    expect(res.body.consent.consent_scope).toBe('ai_assistance');
    expect(mockQuery.mock.calls[0][0]).toContain('insert into public.consent_ledger');
    expect(mockQuery.mock.calls[1][0]).toContain('insert into public.audit_log');
    expect(JSON.stringify(mockQuery.mock.calls)).not.toContain('alice@example.com');
  });

  test('DELETE /api/privacy/consents/:scope preserves revocation history and audits', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            consent_id: '00000000-0000-4000-8000-000000000020',
            actor_id: 'guardian-00000000-0000-4000-8000-000000000001',
            actor_role: 'guardian',
            child_id: null,
            student_id: '00000000-0000-4000-8000-000000000010',
            school_id: '00000000-0000-4000-8000-000000000002',
            tenant_id: '00000000-0000-4000-8000-000000000001',
            organization_id: '00000000-0000-4000-8000-000000000001',
            consent_scope: 'messaging',
            consent_status: 'granted',
            consent_version: 'msg-v1',
            notice_version: 'notice-v1',
            source: 'privacy_center',
            granted_at: '2026-05-06T00:00:00.000Z',
            revoked_at: null,
            expires_at: null,
            evidence_ref: 'notice-click',
            created_at: '2026-05-06T00:00:00.000Z',
            updated_at: '2026-05-06T00:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete('/api/privacy/consents/messaging')
      .send({ studentId: '00000000-0000-4000-8000-000000000010', source: 'privacy_center' });

    expect(res.status).toBe(200);
    expect(res.body.consent.consent_status).toBe('revoked');
    expect(mockQuery.mock.calls[1][0]).toContain('insert into public.consent_ledger');
    expect(mockQuery.mock.calls[2][0]).toContain('insert into public.audit_log');
  });

  test('guardian cannot school-verify a relationship; school admin can', async () => {
    const denied = await request(app).post('/api/privacy/relationships/rel-1/verify').send();
    expect(denied.status).toBe(403);
    expect(mockQuery).not.toHaveBeenCalled();

    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'rel-1',
          organization_id: '00000000-0000-4000-8000-000000000001',
          school_id: '00000000-0000-4000-8000-000000000002',
          guardian_id: 'guardian-00000000-0000-4000-8000-000000000001',
          student_id: '00000000-0000-4000-8000-000000000010',
          state: 'school_verified',
        },
      ],
    }).mockResolvedValueOnce({ rows: [] });

    const verified = await request(app)
      .post('/api/privacy/relationships/rel-1/verify')
      .set('x-test-role', 'school_admin')
      .set('x-test-user-id', 'admin-00000000-0000-4000-8000-000000000001')
      .send();

    expect(verified.status).toBe(200);
    expect(verified.body.relationship.state).toBe('school_verified');
    expect(mockQuery.mock.calls[1][0]).toContain('insert into public.audit_log');
  });

  test('student lifecycle export fails closed without verified relationship', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/privacy/data-exports')
      .send({ subjectType: 'student', subjectId: '00000000-0000-4000-8000-000000000010' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('subject_access_denied');
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  test('student lifecycle export succeeds with verified relationship and audit', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'rel-1' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'export-request-1',
            request_type: 'export',
            status: 'requested',
            requested_by: 'guardian-00000000-0000-4000-8000-000000000001',
            subject_id: '00000000-0000-4000-8000-000000000010',
            subject_type: 'student',
            scope: 'subject',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/privacy/data-exports')
      .send({ subjectType: 'student', subjectId: '00000000-0000-4000-8000-000000000010' });

    expect(res.status).toBe(201);
    expect(res.body.request.status).toBe('requested');
    expect(mockQuery.mock.calls[1][0]).toContain('insert into public.data_lifecycle_requests');
    expect(mockQuery.mock.calls[2][0]).toContain('insert into public.audit_log');
  });
});
