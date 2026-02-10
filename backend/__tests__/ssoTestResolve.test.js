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

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(attachAuthContext);
  app.use('/api/sso', ssoRouter);
  return app;
}

describe('SSO /test/resolve endpoint security', () => {
  beforeEach(() => {
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

    // The endpoint accepts multiple status codes because without mocking the SSO provider:
    // - 400: Invalid request (e.g., missing SSO configuration for the organization)
    // - 200: Success (if SSO configuration exists)
    // - 500: Internal error (e.g., database connection issues)
    // The security test verifies admin authentication passes (NOT 401/403).
    expect([400, 200, 500]).toContain(response.status);
  });
});
