/**
 * SSO Test Resolve Endpoint Security Test
 * 
 * Tests that the /api/sso/test/resolve endpoint is properly protected
 * with admin authentication to prevent SSO configuration enumeration.
 * 
 * Security Context:
 * The /test/resolve endpoint exposes:
 * 1. Whether an organization has SSO enabled
 * 2. Organization ID resolution from email domains
 * 3. SSO provider enumeration
 *
 * This information enables:
 * - SSO configuration discovery
 * - Tenant enumeration
 * - Email domain to organization mapping
 *
 * Therefore, it must be protected with admin authentication.
 */

import request from 'supertest';
import express from 'express';
import { SignJWT } from 'jose';
import ssoRouter from '../routes/sso.js';
import { attachAuthContext } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';
import { query } from '../db.js';

jest.mock('../db.js', () => ({
  query: jest.fn(),
}));

function makeApp() {
  const app = express();
  app.use(express.json());

  // Apply global rate limiting before authentication to prevent abuse of auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(authLimiter);
  app.use(attachAuthContext);

  // Apply rate limiting to SSO routes to prevent abuse of sensitive resolution endpoint
  const ssoLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/sso', ssoLimiter, ssoRouter);
  return app;
}

describe('SSO /test/resolve endpoint security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.AUTH_MODE = 'mock';
    process.env.AUTH_MOCK_SECRET = 'test-secret-for-sso';
  });

  test('rejects unauthenticated requests', async () => {
    const app = makeApp();
    const response = await request(app)
      .post('/api/sso/test/resolve')
      .send({
        email: 'test@example.com',
        organizationId: 'test-org-123',
        provider: 'saml'
      });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });

  test('rejects authenticated non-admin users', async () => {
    const token = await new SignJWT({
      'https://hasura.io/jwt/claims': {
        'x-hasura-user-id': 'user_parent_123',
        'x-hasura-default-role': 'parent',
        'x-hasura-allowed-roles': ['parent'],
      },
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(new TextEncoder().encode(process.env.AUTH_MOCK_SECRET));

    const app = makeApp();
    const response = await request(app)
      .post('/api/sso/test/resolve')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'test@example.com',
        organizationId: 'test-org-123',
        provider: 'saml'
      });

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error');
  });

  test('allows authenticated admin users', async () => {
    // Mock loadSsoSettings query (returns enabled SSO configuration)
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'sso_config_1',
          provider: 'saml',
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          issuer: 'https://test-idp.example.com',
          metadata: {},
          is_enabled: true,
        },
      ],
    });

    const token = await new SignJWT({
      'https://hasura.io/jwt/claims': {
        'x-hasura-user-id': 'user_admin_123',
        'x-hasura-default-role': 'system_admin',
        'x-hasura-allowed-roles': ['system_admin'],
      },
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(new TextEncoder().encode(process.env.AUTH_MOCK_SECRET));

    const app = makeApp();
    const response = await request(app)
      .post('/api/sso/test/resolve')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'test@example.com',
        organizationId: 'test-org-123',
        provider: 'saml'
      });

    // Assert deterministic success response
    expect(response.status).toBe(200);
    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);

    // Verify response body shape
    expect(response.body).toHaveProperty('organizationId', 'test-org-123');
    expect(response.body).toHaveProperty('enabled', true);
  });
});
