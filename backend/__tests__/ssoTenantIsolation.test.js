import request from 'supertest';
import express from 'express';
import tenantsRouter from '../routes/tenants.js';
import { attachAuthContext } from '../middleware/auth.js';
import { issueSsoJwt } from '../utils/ssoJwt.js';
import { query } from '../db.js';

jest.mock('../db.js', () => ({
  query: jest.fn(),
}));

const orgA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const orgB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

describe('SSO tenant isolation', () => {
  let app;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.SSO_JWT_SECRET = 'test-sso-secret';
    process.env.SSO_JWT_ISSUER = 'teachmo-sso';
    process.env.SSO_JWT_AUDIENCE = 'teachmo-api';
    process.env.ALLOW_TENANT_HEADERS = 'true';

    app = express();
    app.use(express.json());
    app.use(attachAuthContext);
    app.use('/api/tenants', tenantsRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('blocks tenant mismatch after SSO login', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const token = await issueSsoJwt({
      userId: 'user-1',
      role: 'school_admin',
      organizationId: orgA,
      schoolId: null,
      provider: 'saml',
      email: 'user@example.com',
    });

    const res = await request(app)
      .get('/api/tenants/settings')
      .set('Authorization', `Bearer ${token}`)
      .set('x-teachmo-org-id', orgB);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('tenant mismatch (org)');
  });
});
