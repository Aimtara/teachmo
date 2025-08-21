import request from 'supertest';
import express from 'express';
import assignmentsRouter from '../routes/assignments.js';

const app = express();
app.use(express.json());
app.use('/api/assignments', assignmentsRouter);

describe('Assignments API', () => {
  test('GET /api/assignments returns status 200 and an array', async () => {
    const res = await request(app).get('/api/assignments');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
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
    const res = await request(app).post('/api/assignments').send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject(payload);
    expect(res.body).toHaveProperty('id');
  });
});

