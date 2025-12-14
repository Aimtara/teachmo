import request from 'supertest';
import express from 'express';
import assignmentsRouter from '../routes/assignments.js';
import { query } from '../db.js';

jest.mock('../db.js', () => ({
  query: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use('/api/assignments', assignmentsRouter);

describe('Assignments API', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/assignments returns status 200 and rows from the database', async () => {
    const rows = [
      { id: 1, title: 'Assignment 1', description: 'First assignment' },
      { id: 2, title: 'Assignment 2', description: 'Second assignment' },
    ];

    query.mockResolvedValue({ rows });

    const res = await request(app).get('/api/assignments');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(rows);
  });

  test('GET /api/assignments returns 500 and error message on database failure', async () => {
    query.mockRejectedValue(new Error('Database failure'));

    const res = await request(app).get('/api/assignments');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to fetch assignments' });
  });

  test('POST /api/assignments without a title returns status 400 with an error message', async () => {
    const res = await request(app)
      .post('/api/assignments')
      .send({ description: 'Missing title' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/assignments with valid data returns status 201 and echoes the created assignment', async () => {
    const payload = { title: 'New Assignment', description: 'Test assignment' };
    const createdAssignment = { ...payload, id: 99 };

    query.mockResolvedValue({ rows: [createdAssignment] });

    const res = await request(app).post('/api/assignments').send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toEqual(createdAssignment);
  });

  test('POST /api/assignments returns 500 and error message when database insert fails', async () => {
    const payload = { title: 'New Assignment', description: 'Test assignment' };
    query.mockRejectedValue(new Error('Insert failed'));

    const res = await request(app).post('/api/assignments').send(payload);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to create assignment' });
  });
});

