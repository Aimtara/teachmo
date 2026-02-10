import request from 'supertest';
import express from 'express';
import submissionsRouter from '../routes/submissions.js';
import { query } from '../db.js';

jest.mock('../db.js', () => ({
  query: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use('/api/submissions', submissionsRouter);

describe('submissions routes', () => {
  beforeEach(() => {
    query.mockReset();
  });

  test('accepts new registration-style submission payload', async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 'sub-1', type: 'event', title: 'STEM Night', description: 'Open house', status: 'pending', reason: null }],
    });

    const res = await request(app)
      .post('/api/submissions')
      .send({
        districtId: '11111111-1111-4111-8111-111111111111',
        type: 'event',
        programName: 'STEM Night',
        details: 'Open house',
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('STEM Night');
    expect(res.body.accepted).toBe(true);
  });

  test('flags unsafe payloads', async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 'sub-2', type: 'event', title: 'Act now', description: 'buy immediately', status: 'flagged_safety', reason: 'Tone' }],
    });

    const res = await request(app)
      .post('/api/submissions')
      .send({
        districtId: '11111111-1111-4111-8111-111111111111',
        title: 'Act now',
        description: 'buy immediately',
      });

    expect(res.status).toBe(201);
    expect(res.body.accepted).toBe(false);
    expect(res.body.flags.length).toBeGreaterThan(0);
  });
});
