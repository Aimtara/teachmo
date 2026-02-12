import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

const query = jest.fn();

await jest.unstable_mockModule('../db.js', () => ({
  query,
}));

await jest.unstable_mockModule('../middleware/auth.js', () => ({
  requireAuth: (req, _res, next) => {
    req.auth = { userId: 'admin-user', role: 'system_admin', scopes: ['users:manage'] };
    next();
  },
  requireAdmin: (_req, _res, next) => next(),
}));

await jest.unstable_mockModule('../middleware/tenant.js', () => ({
  requireTenant: (req, _res, next) => {
    req.tenant = { organizationId: 'org-1', schoolId: null };
    next();
  },
}));

await jest.unstable_mockModule('../middleware/permissions.js', () => ({
  requireAnyScope: () => (_req, _res, next) => next(),
}));

const { default: complianceRouter } = await import('../routes/compliance.js');
const { runRetentionPurge } = await import('../jobs/retentionPurge.js');

const app = express();
app.use(express.json());
app.use('/api/admin', complianceRouter);

describe('Compliance endpoints', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/admin/dsar-exports builds export payload with PII and audit history', async () => {
    query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'user-1',
            email: 'student@example.com',
            display_name: 'Student One',
            disabled: false,
            created_at: '2024-01-01T00:00:00.000Z',
            full_name: 'Student One',
            role: 'student',
            district_id: 'org-1',
            school_id: null,
            profile_created_at: '2024-01-01T00:00:00.000Z',
            profile_updated_at: '2024-01-02T00:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ external_id: 'scim-1', created_at: '2024-01-03T00:00:00.000Z' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'audit-1',
            actor_id: 'admin-user',
            action: 'user.update',
            entity_type: 'user',
            entity_id: 'user-1',
            metadata: { source: 'admin' },
            before_snapshot: { email: 'old@example.com' },
            after_snapshot: { email: 'student@example.com' },
            contains_pii: true,
            created_at: '2024-01-04T00:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ settings: { retention: { dsar_export_days: 15 } } }] })
      .mockResolvedValueOnce({ rows: [{ id: 'export-1', created_at: '2024-02-01T00:00:00.000Z', expires_at: '2024-02-16T00:00:00.000Z' }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/admin/dsar-exports')
      .send({ userId: 'user-1', reason: 'DSAR request' });

    expect(res.status).toBe(200);
    expect(res.body.downloadUrl).toContain('/api/admin/dsar-exports/export-1/download');

    const insertCall = query.mock.calls.find((call) =>
      String(call[0]).includes('insert into public.dsar_exports')
    );
    expect(insertCall).toBeTruthy();
    const exportPayload = JSON.parse(insertCall[1][4]);
    expect(exportPayload.subject.email).toBe('student@example.com');
    expect(exportPayload.auditLog).toHaveLength(1);
    expect(exportPayload.auditLog[0].action).toBe('user.update');
  });

  test('POST /api/admin/users/:id/hard-delete returns 404 when user is missing', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/admin/users/missing-user/hard-delete')
      .send({ reason: 'Cleanup' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'user_not_found' });
  });
});

describe('Retention purge job', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('runRetentionPurge deletes records using tenant retention policies', async () => {
    query
      .mockResolvedValueOnce({
        rows: [
          { district_id: 'org-1', school_id: null, settings: { retention: { audit_log_days: 10, dsar_export_days: 5 } } },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ organization_id: 'org-1', school_id: null }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowCount: 3 })
      .mockResolvedValueOnce({ rowCount: 2 })
      .mockResolvedValue({ rowCount: 0 });

    const result = await runRetentionPurge();

    expect(result.purged).toBe(5);
    const deleteAuditCall = query.mock.calls.find((call) =>
      String(call[0]).includes('delete from public.audit_log')
    );
    expect(deleteAuditCall[1][2]).toBe(10);
  });
});
