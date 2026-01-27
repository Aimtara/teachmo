import { test, expect } from '@playwright/test';

const tenantAToken = process.env.E2E_TENANT_A_TOKEN;
const tenantBToken = process.env.E2E_TENANT_B_TOKEN;
const scimUserId = process.env.E2E_SCIM_USER_ID;

test('SCIM API blocks cross-tenant access', async ({ request }) => {
  test.skip(!tenantAToken || !tenantBToken || !scimUserId, 'Missing tenant tokens or user id.');

  const okResponse = await request.get(`/scim/v2/Users/${scimUserId}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  expect(okResponse.status()).toBe(200);

  const deniedResponse = await request.get(`/scim/v2/Users/${scimUserId}`, {
    headers: { Authorization: `Bearer ${tenantBToken}` },
  });
  expect(deniedResponse.status()).toBeGreaterThanOrEqual(400);
});
