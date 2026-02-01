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
      // daily query (no tableExists check in getFamilyHealth)
      .mockResolvedValueOnce({
        rows: [{
          day: '2026-01-24',
          signals: 10,
          ingests: 1,
          suppressed: 0,
          duplicates: 0,
          actions_created: 5,
          actions_completed: 3,
          forbidden_family: 0,
          auth_invalid_token: 0,
          auth_missing_token: 0,
          updated_at: '2026-01-24T12:00:00Z'
        }],
        rowCount: 1
      })
      // hourly query (called from getHourlySeries)
      .mockResolvedValueOnce({
        rows: [{
          hour: '2026-01-24T00:00:00Z',
          signals: 5,
          ingests: 1,
          suppressed: 0,
          duplicates: 0,
          actions_created: 2,
          actions_completed: 1
        }]
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
      .get('/api/ops/families/fam_1/health?hourly=true')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('daily');
    expect(res.body).toHaveProperty('hourly');
    expect(res.body.daily).not.toBeNull();
    expect(Array.isArray(res.body.hourly)).toBe(true);
    expect(res.body.hourly).toHaveLength(1);
  });
});
