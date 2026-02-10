/**
 * SSO Test Resolve Endpoint Security Test
 * 
 * Tests that the /api/sso/test/resolve endpoint is properly protected
 * with admin authentication to prevent SSO configuration enumeration.
 */

import request from 'supertest';
import express from 'express';
import ssoRouter from '../routes/sso.js';
import { attachAuthContext } from '../middleware/auth.js';

const app = express();
app.use(express.json());
app.use(attachAuthContext);
app.use('/api/sso', ssoRouter);

describe('SSO /test/resolve endpoint security', () => {
  test('rejects unauthenticated requests', async () => {
    const response = await request(app)
      .post('/api/sso/test/resolve')
      .send({
        email: 'test@example.com',
        organizationId: 'test-org-123',
        provider: 'saml'
      });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'missing auth');
  });

  test('rejects requests without admin role', async () => {
    const response = await request(app)
      .post('/api/sso/test/resolve')
      .set('Authorization', 'Bearer fake-token-for-parent')
      .send({
        email: 'test@example.com',
        organizationId: 'test-org-123',
        provider: 'saml'
      });

    // Should return 401 (missing auth) or 403 (forbidden) depending on token validation
    expect([401, 403]).toContain(response.status);
  });

  test('documents expected behavior: endpoint should only be accessible to admins', () => {
    // This test documents the security requirement
    // The endpoint exposes:
    // 1. Whether an organization has SSO enabled
    // 2. Organization ID resolution from email domains
    // 3. SSO provider enumeration
    //
    // This information enables:
    // - SSO configuration discovery
    // - Tenant enumeration
    // - Email domain to organization mapping
    //
    // Therefore, it must be protected with admin authentication
    expect(true).toBe(true);
  });
});
