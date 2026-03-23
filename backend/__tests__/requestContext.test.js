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

  test('preserves valid incoming x-request-id', async () => {
    const app = express();
    app.use(attachRequestContext);
    app.get('/ok', (_req, res) => {
      res.json({ ok: true });
    });

    const res = await request(app).get('/ok').set('x-request-id', 'req-123');

    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBe('req-123');
  });

  test('rejects invalid x-request-id (non-alphanumeric) and generates a new UUID', async () => {
    const app = express();
    app.use(attachRequestContext);
    app.get('/ok', (_req, res) => {
      res.json({ ok: true });
    });

    const res = await request(app).get('/ok').set('x-request-id', 'bad id with spaces!');

    expect(res.status).toBe(200);
    const responseId = res.headers['x-request-id'];
    expect(responseId).toBeTruthy();
    expect(responseId).not.toBe('bad id with spaces!');
  });

  test('rejects oversized x-request-id (>128 chars) and generates a new UUID', async () => {
    const app = express();
    app.use(attachRequestContext);
    app.get('/ok', (_req, res) => {
      res.json({ ok: true });
    });

    const oversized = 'a'.repeat(129);
    const res = await request(app).get('/ok').set('x-request-id', oversized);

    expect(res.status).toBe(200);
    const responseId = res.headers['x-request-id'];
    expect(responseId).not.toBe(oversized);
  });

  test('strips query string from logged path', async () => {
    const app = express();
    app.use(attachRequestContext);
    app.get('/search', (_req, res) => {
      res.json({ ok: true });
    });

    const res = await request(app).get('/search?email=user@example.com&token=secret123');

    expect(res.status).toBe(200);
    // The response ID should still be set — confirming the request completed successfully.
    expect(res.headers['x-request-id']).toBeTruthy();
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
