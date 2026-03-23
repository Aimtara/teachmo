import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { requireTenant } from '../../../backend/middleware/tenant.js';
import { requireScopes } from '../../../backend/middleware/permissions.js';
import { query } from '../../../backend/db.js';
import { resetPolicyCache } from '../../../backend/utils/policyEngine.js';

jest.mock('../../../backend/db.js', () => ({
  query: jest.fn()
}));

const orgA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const orgB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const mockedQuery = query as jest.MockedFunction<typeof query>;

type AuthContext = {
  userId: string | null;
  role: string | null;
  organizationId: string | null;
  schoolId: string | null;
  scopes: string[];
};

type RequestWithAuth = Request & {
  auth: AuthContext;
};

function mockPolicyQuery() {
  mockedQuery.mockImplementation(async (sql: string, params?: unknown[]) => {
    if (sql.includes('from public.tenant_settings')) {
      if (params?.[0] === orgA) {
        return {
          rows: [
            {
              settings: {
                permissions: {
                  allow: ['analytics:read'],
                  deny: ['users:manage']
                }
              }
            }
          ]
        };
      }
      if (params?.[0] === orgB) {
        return {
          rows: [
            {
              settings: {
                permissions: {
                  allow: [],
                  deny: []
                }
              }
            }
          ]
        };
      }
    }

    return { rows: [] };
  });
}

describe('policy engine permissions', () => {
  let app: ReturnType<typeof express>;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    app = express();
    app.use(express.json());
    app.use((req: Request, _res: Response, next: NextFunction) => {
      const requestWithAuth = req as RequestWithAuth;
      requestWithAuth.auth = {
        userId: String(req.headers['x-test-user-id'] ?? '') || null,
        role: String(req.headers['x-test-role'] ?? '') || null,
        organizationId: String(req.headers['x-test-org-id'] ?? '') || null,
        schoolId: String(req.headers['x-test-school-id'] ?? '') || null,
        scopes: []
      };
      next();
    });

    app.get('/secure', requireTenant, requireScopes(['analytics:read']), (_req, res) => {
      res.json({ ok: true });
    });

    app.get('/manage-users', requireTenant, requireScopes(['users:manage']), (_req, res) => {
      res.json({ ok: true });
    });
  });

  afterEach(() => {
    resetPolicyCache();
    jest.clearAllMocks();
  });

  test('allows tenant-scoped policy grants', async () => {
    mockPolicyQuery();
    const res = await request(app)
      .get('/secure')
      .set('x-test-user-id', 'user-1')
      .set('x-test-org-id', orgA)
      .set('x-test-role', 'parent');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('denies access when policy is tenant-specific', async () => {
    mockPolicyQuery();
    const res = await request(app)
      .get('/secure')
      .set('x-test-user-id', 'user-1')
      .set('x-test-org-id', orgB)
      .set('x-test-role', 'parent');

    expect(res.status).toBe(403);
  });

  test('denies access when tenant policy explicitly removes scope', async () => {
    mockPolicyQuery();
    const res = await request(app)
      .get('/manage-users')
      .set('x-test-user-id', 'admin-1')
      .set('x-test-org-id', orgA)
      .set('x-test-role', 'system_admin');

    expect(res.status).toBe(403);
  });
});
