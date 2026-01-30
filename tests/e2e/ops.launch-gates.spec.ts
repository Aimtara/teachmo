import { test, expect } from '@playwright/test';
import { SignJWT } from 'jose';

const E2E_SESSION_KEY = 'teachmo_e2e_session';

async function mintMockToken({
  role,
  userId,
  secret,
}: {
  role: string;
  userId: string;
  secret: string;
}) {
  return new SignJWT({
    'https://hasura.io/jwt/claims': {
      'x-hasura-user-id': userId,
      'x-hasura-default-role': role,
      'x-hasura-allowed-roles': [role],
    },
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(new TextEncoder().encode(secret));
}

async function setE2ESession(page, session: { role: string; accessToken: string; userId: string }) {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    [E2E_SESSION_KEY, session] as any
  );
}

test.describe('@launch-gates ops auth smoke', () => {
  test('system_admin can access Ops Orchestrator', async ({ page, baseURL }) => {
    const secret = process.env.AUTH_MOCK_SECRET || 'launch-gates-secret';
    const token = await mintMockToken({
      role: 'system_admin',
      userId: 'user_admin',
      secret,
    });

    await setE2ESession(page, { role: 'system_admin', accessToken: token, userId: 'user_admin' });

    await page.goto(`${baseURL}/ops/orchestrator`);
    await expect(page.getByRole('heading', { name: /Ops Orchestrator Timeline/i })).toBeVisible();
  });

  test('non-admin is blocked from Ops Orchestrator', async ({ page, baseURL }) => {
    const secret = process.env.AUTH_MOCK_SECRET || 'launch-gates-secret';
    const token = await mintMockToken({
      role: 'parent',
      userId: 'user_parent',
      secret,
    });

    await setE2ESession(page, { role: 'parent', accessToken: token, userId: 'user_parent' });

    await page.goto(`${baseURL}/ops/orchestrator`);

    await expect(page).toHaveURL(/unauthorized|login|sign-in/i);
  });
});
