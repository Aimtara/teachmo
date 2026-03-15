/* eslint-env jest */
import express from 'express';
import request from 'supertest';
import notificationsRouter from '../routes/notifications.js';
import { query } from '../db.js';

jest.mock('../db.js', () => ({ query: jest.fn() }));
jest.mock('../middleware/auth.js', () => ({
  requireAuth: (req, _res, next) => {
    req.auth = { userId: 'user-1' };
    next();
  },
}));
jest.mock('../middleware/tenant.js', () => ({
  requireTenant: (req, _res, next) => {
    req.tenant = { organizationId: 'org-1', schoolId: null };
    next();
  },
}));
jest.mock('../middleware/permissions.js', () => ({
  requirePermission: () => (_req, _res, next) => next(),
}));
jest.mock('../jobs/notificationQueue.js', () => ({
  enqueueMessage: jest.fn(),
}));
jest.mock('../security/audit.js', () => ({
  auditEvent: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../utils/campaignLimits.js', () => ({
  checkCampaignLimits: jest.fn().mockResolvedValue({ allowed: true }),
}));

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', notificationsRouter);
  return app;
}

describe('notifications date validation', () => {
  const app = buildApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /notifications/announcements rejects invalid send_at', async () => {
    const res = await request(app)
      .post('/api/notifications/announcements')
      .send({
        channel: 'email',
        body: 'Test message',
        segment: { roles: ['parent'] },
        send_at: 'not-a-date',
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'invalid send_at' });
    expect(query).not.toHaveBeenCalled();
  });

  test('GET /notifications/metrics rejects invalid start date', async () => {
    const res = await request(app)
      .get('/api/notifications/metrics?start=bogus');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'invalid start' });
    expect(query).not.toHaveBeenCalled();
  });

  test('GET /notifications/metrics rejects invalid end date', async () => {
    const res = await request(app)
      .get('/api/notifications/metrics?end=nope');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'invalid end' });
    expect(query).not.toHaveBeenCalled();
  });
});
