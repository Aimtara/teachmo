/* eslint-env jest */
import request from 'supertest';
import app from '../app.js';

jest.mock('../middleware/auth.js', () => ({
  attachAuthContext: (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      req.auth = null;
      return next();
    }

    if (authHeader === 'Bearer valid_admin_token') {
      req.auth = {
        userId: 'admin-user',
        role: 'system_admin',
      };
      return next();
    }

    if (authHeader === 'Bearer valid_user_token') {
      req.auth = {
        userId: 'normal-user',
        role: 'user',
      };
      return next();
    }

    req.auth = null;
    return next();
  },
}));

describe('G0 Gate: Ops Route Authentication', () => {
  test('Returns 401 if no token provided', async () => {
    const res = await request(app).get('/api/ops/health');
    expect(res.statusCode).toBe(401);
  });

  test('Returns 403 if token lacks system_admin role', async () => {
    const res = await request(app)
      .get('/api/ops/health')
      .set('Authorization', 'Bearer valid_user_token');
    expect(res.statusCode).toBe(403);
  });

  test('Returns 200 if token has system_admin role', async () => {
    const res = await request(app)
      .get('/api/ops/health')
      .set('Authorization', 'Bearer valid_admin_token');
    expect(res.statusCode).toBe(200);
  });
});
