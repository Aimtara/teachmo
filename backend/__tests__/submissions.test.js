import request from 'supertest';
import express from 'express';
import submissionsRouter from '../routes/submissions.js';
import { query } from '../db.js';

jest.mock('../db.js', () => ({
  query: jest.fn(),
}));

jest.mock('../middleware/auth.js', () => ({
  requireAuth: (req, _res, next) => {
    req.auth = { userId: 'partner-123' };
    next();
  },
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
      rows: [{ id: 'sub-1', status: 'pending_content_review', safety_flags: '[]' }],
    });

    const res = await request(app)
      .post('/api/submissions/partners/submissions')
      .send({
        type: 'event',
        title: 'STEM Night',
        description: 'Open house',
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending_content_review');
    expect(res.body.accepted).toBe(true);
    expect(res.body.flags).toEqual([]);
  });

  test('supports legacy submission path and body fields', async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 'sub-legacy', status: 'pending_content_review', safety_flags: '[]' }],
    });

    const res = await request(app)
      .post('/api/submissions')
      .send({
        type: 'event',
        programName: 'Family Science Night',
        details: 'Open gym event',
      });

    expect(res.status).toBe(201);
    expect(res.body.accepted).toBe(true);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO public.partner_submissions'),
      expect.arrayContaining(['partner-123', 'event', 'Family Science Night']),
    );
  });

  test('flags unsafe payloads', async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 'sub-2', status: 'flagged_for_safety', safety_flags: JSON.stringify(['Tone: High-pressure sales language']) }],
    });

    const res = await request(app)
      .post('/api/submissions/partners/submissions')
      .send({
        type: 'event',
        title: 'Act now',
        description: 'buy immediately',
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('flagged_for_safety');
    expect(res.body.accepted).toBe(false);
    expect(res.body.flags).toContain('Tone: High-pressure sales language');
  });
});
