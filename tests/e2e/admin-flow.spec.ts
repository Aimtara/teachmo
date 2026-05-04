import { test, expect } from '@playwright/test';
import { SignJWT } from 'jose';
import { login } from './_auth';

const E2E_SESSION_KEY = 'teachmo_e2e_session';

async function mintMockToken() {
  return new SignJWT({
    'https://hasura.io/jwt/claims': {
      'x-hasura-user-id': 'user_admin',
      'x-hasura-default-role': 'system_admin',
      'x-hasura-allowed-roles': ['system_admin'],
    },
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(new TextEncoder().encode(process.env.AUTH_MOCK_SECRET || 'launch-gates-secret'));
}

test('admin flow smoke: admin dashboard loads', async ({ page }) => {
  const token = await mintMockToken();
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, JSON.stringify(value)),
    [E2E_SESSION_KEY, { role: 'system_admin', accessToken: token, userId: 'user_admin' }] as any
  );
  await login(page);
  await page.goto('/admin');
  await expect(page.locator('body')).toContainText(/admin|dashboard|system/i);
});
