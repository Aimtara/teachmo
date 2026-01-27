import request from 'supertest';
import express from 'express';
import scimRouter from '../routes/scim.js';
import { attachAuthContext } from '../middleware/auth.js';
import { query } from '../db.js';

jest.mock('../db.js', () => ({
  query: jest.fn(),
}));

function buildToken(claims) {
  const payload = Buffer.from(JSON.stringify(claims))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `header.${payload}.signature`;
}

const userId = '11111111-1111-1111-1111-111111111111';
const orgA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const orgB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const userRow = {
  id: userId,
  email: 'scim-user@example.com',
  display_name: 'SCIM User',
  disabled: false,
  role: 'teacher',
  district_id: orgA,
  school_id: null,
  full_name: 'SCIM User',
};

function mockQueryForOrg() {
  query.mockImplementation(async (sql, params) => {
    if (sql.includes('from auth.users') && params?.[0] === userId) {
      if (params?.[1] === orgA) return { rows: [userRow] };
      return { rows: [] };
    }
    if (sql.includes('from public.scim_identities')) {
      return { rows: [{ external_id: 'external-1' }] };
    }
    if (sql.includes('from public.scim_group_members')) {
      return { rows: [] };
    }
    return { rows: [] };
  });
}

describe('SCIM tenant isolation', () => {
  let app;

  beforeAll(() => {
    process.env.ALLOW_INSECURE_JWT_DECODE = 'true';
    process.env.NODE_ENV = 'test';
    app = express();
    app.use(express.json());
    app.use(attachAuthContext);
    app.use('/scim/v2', scimRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('allows access for matching tenant', async () => {
    mockQueryForOrg();
    const token = buildToken({
      sub: 'admin-user',
      'https://hasura.io/jwt/claims': {
        'x-hasura-user-id': 'admin-user',
        'x-hasura-organization-id': orgA,
        'x-hasura-role': 'system_admin',
      },
    });

    const res = await request(app)
      .get(`/scim/v2/Users/${userId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(userId);
    expect(res.body.userName).toBe('scim-user@example.com');
  });

  test('denies access across tenants', async () => {
    mockQueryForOrg();
    const token = buildToken({
      sub: 'admin-user',
      'https://hasura.io/jwt/claims': {
        'x-hasura-user-id': 'admin-user',
        'x-hasura-organization-id': orgB,
        'x-hasura-role': 'system_admin',
      },
    });

    const res = await request(app)
      .get(`/scim/v2/Users/${userId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  test('allows deprovisioning for matching tenant', async () => {
    mockQueryForOrg();
    const token = buildToken({
      sub: 'admin-user',
      'https://hasura.io/jwt/claims': {
        'x-hasura-user-id': 'admin-user',
        'x-hasura-organization-id': orgA,
        'x-hasura-role': 'system_admin',
      },
    });

    const res = await request(app)
      .delete(`/scim/v2/Users/${userId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
  });

  test('denies deprovisioning across tenants', async () => {
    mockQueryForOrg();
    const token = buildToken({
      sub: 'admin-user',
      'https://hasura.io/jwt/claims': {
        'x-hasura-user-id': 'admin-user',
        'x-hasura-organization-id': orgB,
        'x-hasura-role': 'system_admin',
      },
    });

    const res = await request(app)
      .delete(`/scim/v2/Users/${userId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
