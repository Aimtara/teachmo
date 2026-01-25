import request from 'supertest';
import express from 'express';
import opsRouter from '../routes/ops.js';
import { query } from '../db.js';

jest.mock('../db.js', () => ({
  query: jest.fn(),
}));

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/ops', opsRouter);
  return app;
}

describe('Ops router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPS_ADMIN_KEY = 'test-key';
  });

  test('rejects requests without ops admin key', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/ops/families');
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  test('lists families when key is provided', async () => {
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
    const res = await request(app)
      .get('/api/ops/families')
      .set('x-ops-admin-key', 'test-key');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('families');
    expect(res.body.families[0]).toMatchObject({ id: 'fam_1', name: 'Test Family' });
  });

  test('returns health snapshot shape', async () => {
    // daily snapshots table exists?
    query
      // daily query
      .mockResolvedValueOnce({ rows: [{ day: '2026-01-24', ingests: 1 }] })
      // hourly query
      .mockResolvedValueOnce({ rows: [{ hour: '2026-01-24T00:00:00Z', ingests: 1 }] });

    const app = makeApp();
    const res = await request(app)
      .get('/api/ops/families/fam_1/health')
      .set('x-ops-admin-key', 'test-key');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('daily');
    expect(res.body).toHaveProperty('hourly');
    expect(Array.isArray(res.body.hourly)).toBe(true);
  });
});
