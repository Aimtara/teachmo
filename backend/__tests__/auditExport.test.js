import { buildAuditExportCsv, getAuditExportLimit } from '../functions/audit-export.js';
import { query } from '../db.js';

jest.mock('../db.js', () => ({
  query: jest.fn(),
}));

describe('buildAuditExportCsv', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns CSV with escaped values', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          created_at: '2026-03-23T00:00:00.000Z',
          actor_id: 'admin-1',
          action: '=SUM(1,2)',
          entity_type: 'user',
          entity_id: 'user-1',
          metadata: { reason: '"quoted"' },
          before_snapshot: { name: 'Old' },
          after_snapshot: { name: 'New' },
          contains_pii: true,
        },
      ],
    });

    const csv = await buildAuditExportCsv({
      organizationId: 'org-1',
      schoolId: null,
      limit: 10,
      offset: 0,
    });

    expect(csv).toContain("'=");
    expect(csv).toContain('reason');
    expect(csv).toContain('quoted');
  });

  test('clamps export limit to max', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await buildAuditExportCsv({
      organizationId: 'org-1',
      schoolId: 'school-1',
      limit: getAuditExportLimit() + 100,
      offset: 0,
    });

    const args = query.mock.calls[0][1];
    expect(args[args.length - 2]).toBe(getAuditExportLimit());
  });
});
