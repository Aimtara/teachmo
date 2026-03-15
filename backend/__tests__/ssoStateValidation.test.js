import request from 'supertest';
import express from 'express';
import ssoRouter from '../routes/sso.js';

jest.mock('../db.js', () => ({
  query: jest.fn(),
}));

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/sso', ssoRouter);
  return app;
}

describe('SSO state validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  test('rejects callback requests with malformed state', async () => {
    const app = makeApp();
    const res = await request(app)
      .get('/api/sso/saml/callback?state=not-a-valid-state-token');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'invalid_sso_state' });
  });

  test('rejects callback requests with malformed RelayState', async () => {
    const app = makeApp();
    const res = await request(app)
      .get('/api/sso/saml/callback?RelayState=not-a-valid-relay-state');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'invalid_sso_state' });
  });

  test('requires organization context when callback has no valid state', async () => {
    const app = makeApp();
    const res = await request(app)
      .get('/api/sso/saml/callback');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'organization_required' });
  });
});
