import request from 'supertest';
import express from 'express';
import dataRightsRouter from '../routes/dataRights.js';
import { injectUserContext } from '../middleware/authz.js';
import { dataSubjectRequests } from '../models.js';

describe('Data Rights API', () => {
  const app = express();
  app.use(express.json());
  app.use(injectUserContext);
  app.use('/api/data-rights', dataRightsRouter);

  beforeEach(() => {
    dataSubjectRequests.splice(0, dataSubjectRequests.length);
  });

  test('allows a parent to export their family data', async () => {
    const res = await request(app)
      .get('/api/data-rights/export')
      .set('x-user-role', 'parent')
      .set('x-family-id', 'family-1')
      .set('x-user-id', 'parent-1');

    expect(res.status).toBe(200);
    expect(res.body.data.family.id).toBe('family-1');
    expect(res.body.data.students.length).toBeGreaterThan(0);
  });

  test('blocks export when requester is not a parent', async () => {
    const res = await request(app)
      .get('/api/data-rights/export')
      .set('x-user-role', 'teacher')
      .set('x-class-ids', 'math-101');

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  test('queues a deletion/erasure request for a parent', async () => {
    const res = await request(app)
      .post('/api/data-rights/delete')
      .set('x-user-role', 'parent')
      .set('x-family-id', 'family-1')
      .set('x-user-id', 'parent-1');

    expect(res.status).toBe(202);
    expect(res.body.request).toMatchObject({ familyId: 'family-1', status: 'pending-review' });
    expect(dataSubjectRequests.length).toBe(1);
  });
});
