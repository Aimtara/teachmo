import request from 'supertest';
import express from 'express';
import opsRouter from '../routes/ops.js';
import { query } from '../db.js';

jest.mock('../db.js', () => ({
  query: jest.fn(),
}));

function makeApp(auth = { userId: 'admin-user', role: 'system_admin' }) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.auth = auth;
    next();
  });
  app.use('/api/ops', opsRouter);
  return app;
}

describe('Ops router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects requests without auth', async () => {
    const app = makeApp(null);
    const res = await request(app).get('/api/ops/families');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('lists families when admin auth is provided', async () => {
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

    const app = makeApp();
    const res = await request(app).get('/api/ops/families');

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

    const app = makeApp();
    const res = await request(app).get('/api/ops/families/fam_1/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('daily');
    expect(res.body).toHaveProperty('hourly');
    expect(res.body.daily).not.toBeNull();
    expect(Array.isArray(res.body.hourly)).toBe(true);
    expect(res.body.hourly).toHaveLength(1);
  });
});
