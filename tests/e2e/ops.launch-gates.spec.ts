import { test, expect } from '@playwright/test';
import * as jose from 'jose';

test.describe('G3 Gate: Ops Operational Readiness', { tag: '@launch-gates' }, () => {
  test('System Admin can access Ops Dashboard (Smoke)', async ({ page }) => {
    const secret = new TextEncoder().encode(process.env.AUTH_MOCK_SECRET || 'launch-gates-secret');
    const token = await new jose.SignJWT({
      'https://hasura.io/jwt/claims': {
        'x-hasura-allowed-roles': ['system_admin'],
        'x-hasura-default-role': 'system_admin',
        'x-hasura-user-id': 'admin-smoke-test'
      },
      sub: 'admin-smoke-test',
      role: 'system_admin'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret);

    const mockUser = {
      id: 'admin-smoke-test',
      displayName: 'Admin Smoke',
      email: 'admin@teachmo.local',
      role: 'system_admin',
      metadata: { preferred_active_role: 'system_admin' }
    };

    await page.addInitScript(({ user, token: jwt }) => {
      window.localStorage.setItem('e2e_mock_user', JSON.stringify(user));
      window.localStorage.setItem('e2e_mock_token', jwt);
    }, { user: mockUser, token });

    await page.goto('/ops/orchestrator');

    await expect(page).not.toHaveURL(/login/);
    await expect(page.getByText(/Ops Orchestrator|Families|System Health/i).first()).toBeVisible();
  });

  test('Regular User is denied access', async ({ page }) => {
    const mockUser = {
      id: 'parent-user',
      role: 'parent',
      metadata: { preferred_active_role: 'parent' }
    };

    await page.addInitScript(({ user }) => {
      window.localStorage.setItem('e2e_mock_user', JSON.stringify(user));
    }, { user: mockUser });

    await page.goto('/ops/orchestrator');

    await expect(page).toHaveURL(/dashboard|login/);
  });
});
