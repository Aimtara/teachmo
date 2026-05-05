import request from 'supertest';
import express from 'express';
import { SignJWT } from 'jose';
import commandCenterRouter from '../routes/commandCenter.js';
import { attachAuthContext } from '../middleware/auth.js';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(attachAuthContext);
  app.use('/api/command-center', commandCenterRouter);
  return app;
}

async function tokenFor(role) {
  return new SignJWT({
    'https://hasura.io/jwt/claims': {
      'x-hasura-user-id': `user_${role}`,
      'x-hasura-default-role': role,
      'x-hasura-allowed-roles': [role],
    },
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(new TextEncoder().encode(process.env.AUTH_MOCK_SECRET));
}

describe('Command Center API auth', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.AUTH_MODE = 'mock';
    process.env.AUTH_MOCK_SECRET = 'launch-gates-secret';
  });

  test('denies unauthenticated requests', async () => {
    const res = await request(makeApp()).get('/api/command-center/actions');
    expect(res.status).toBe(401);
  });

  test('denies non-admin requests', async () => {
    const res = await request(makeApp())
      .get('/api/command-center/actions')
      .set('Authorization', `Bearer ${await tokenFor('parent')}`);

    expect(res.status).toBe(403);
  });

  test('allows admin requests', async () => {
    const res = await request(makeApp())
      .get('/api/command-center/actions')
      .set('Authorization', `Bearer ${await tokenFor('system_admin')}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('actions');
  });
});
