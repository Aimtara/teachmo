import request from 'supertest';
import express from 'express';
import opsRouter from '../routes/ops.js';
import { query } from '../db.js';
import { attachAuthContext } from '../middleware/auth.js';

jest.mock('../db.js', () => ({
  query: jest.fn(),
}));

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(attachAuthContext);
  app.use('/api/ops', opsRouter);
  return app;
}

describe('Ops router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.AUTH_MODE = 'mock';
    process.env.AUTH_MOCK_SECRET = 'launch-gates-secret';
  });

  test('rejects requests without bearer token', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/ops/families');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('rejects non-system-admin role', async () => {
    const { SignJWT } = await import('jose');
    const token = await new SignJWT({
      'https://hasura.io/jwt/claims': {
        'x-hasura-user-id': 'user_1',
        'x-hasura-default-role': 'parent',
        'x-hasura-allowed-roles': ['parent'],
      },
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(new TextEncoder().encode(process.env.AUTH_MOCK_SECRET));

    const app = makeApp();
    const res = await request(app)
      .get('/api/ops/families')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  test('lists families when system_admin', async () => {
    // tableExists('families')
    query.mockResolvedValueOnce({ rows: [{ reg: 'families' }] });
    // families query
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'fam_1',
          name: 'Test Family',
          status: 'active',
          created_at: null,
          updated_at: null,
        },
      ],
    });

    const { SignJWT } = await import('jose');
    const token = await new SignJWT({
      'https://hasura.io/jwt/claims': {
        'x-hasura-user-id': 'user_admin',
        'x-hasura-default-role': 'system_admin',
        'x-hasura-allowed-roles': ['system_admin'],
      },
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(new TextEncoder().encode(process.env.AUTH_MOCK_SECRET));

    const app = makeApp();
    const res = await request(app)
      .get('/api/ops/families')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('families');
    expect(res.body.families[0]).toMatchObject({ id: 'fam_1', name: 'Test Family' });
  });

  test('returns health snapshot shape', async () => {
    query
      // tableExists('orchestrator_daily_snapshots')
      .mockResolvedValueOnce({ rows: [{ reg: 'orchestrator_daily_snapshots' }] })
      // daily query
      .mockResolvedValueOnce({ rows: [{ day: '2026-01-24', ingests: 1 }] })
      // tableExists('orchestrator_hourly_snapshots')
      .mockResolvedValueOnce({ rows: [{ reg: 'orchestrator_hourly_snapshots' }] })
      // hourly query
      .mockResolvedValueOnce({ rows: [{ hour: '2026-01-24T00:00:00Z', ingests: 1 }] });

    const { SignJWT } = await import('jose');
    const token = await new SignJWT({
      'https://hasura.io/jwt/claims': {
        'x-hasura-user-id': 'user_admin',
        'x-hasura-default-role': 'system_admin',
        'x-hasura-allowed-roles': ['system_admin'],
      },
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(new TextEncoder().encode(process.env.AUTH_MOCK_SECRET));

    const app = makeApp();
    const res = await request(app)
      .get('/api/ops/families/fam_1/health')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('daily');
    expect(res.body).toHaveProperty('hourly');
    expect(res.body.daily).not.toBeNull();
    expect(Array.isArray(res.body.hourly)).toBe(true);
    expect(res.body.hourly).toHaveLength(1);
  });
});
