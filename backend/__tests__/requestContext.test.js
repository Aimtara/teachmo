import express from 'express';
import request from 'supertest';
import { attachRequestContext, globalErrorHandler } from '../middleware/requestContext.js';

describe('request context middleware', () => {
  test('adds x-request-id to each response when absent', async () => {
    const app = express();
    app.use(attachRequestContext);
    app.get('/ok', (_req, res) => {
      res.json({ ok: true });
    });

    const res = await request(app).get('/ok');

    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  test('preserves incoming x-request-id', async () => {
    const app = express();
    app.use(attachRequestContext);
    app.get('/ok', (_req, res) => {
      res.json({ ok: true });
    });

    const res = await request(app).get('/ok').set('x-request-id', 'req-123');

    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBe('req-123');
  });

  test('returns requestId in unhandled error responses', async () => {
    const app = express();
    app.use(attachRequestContext);
    app.get('/boom', () => {
      throw new Error('boom');
    });
    app.use(globalErrorHandler);

    const res = await request(app).get('/boom').set('x-request-id', 'req-fail');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('internal_server_error');
    expect(res.body.requestId).toBe('req-fail');
  });
});
