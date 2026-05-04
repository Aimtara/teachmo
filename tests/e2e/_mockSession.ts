import { Page } from '@playwright/test';
import { SignJWT } from 'jose';

const E2E_SESSION_KEY = 'teachmo_e2e_session';

const ROLE_SCOPES: Record<string, string[]> = {
  parent: ['content:read', 'core:dashboard'],
  teacher: ['content:read', 'core:dashboard', 'classrooms:manage'],
  partner: ['content:read', 'core:dashboard'],
  school_admin: ['org:manage', 'directory:manage', 'reporting:view', 'safety:review', 'tenant:manage'],
  district_admin: ['org:manage', 'directory:manage', 'reporting:view', 'safety:review', 'tenant:manage'],
  system_admin: ['system:manage', 'org:manage', 'directory:manage', 'reporting:view', 'safety:review', 'tenant:manage', 'users:manage'],
};

export async function mintMockToken({
  role,
  userId = `e2e_${role}`,
  secret = process.env.AUTH_MOCK_SECRET || 'launch-gates-secret',
}: {
  role: string;
  userId?: string;
  secret?: string;
}) {
  const scopes = ROLE_SCOPES[role] ?? ['content:read', 'core:dashboard'];
  return new SignJWT({
    sub: userId,
    scope: scopes.join(' '),
    scopes,
    'https://hasura.io/jwt/claims': {
      'x-hasura-user-id': userId,
      'x-hasura-default-role': role,
      'x-hasura-allowed-roles': [role],
    },
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(new TextEncoder().encode(secret));
}

export async function setMockSession(
  page: Page,
  roleOrOptions: string | { role: string; userId?: string },
  explicitUserId?: string,
) {
  const role = typeof roleOrOptions === 'string' ? roleOrOptions : roleOrOptions.role;
  const userId = explicitUserId ?? (typeof roleOrOptions === 'string' ? `e2e_${role}` : roleOrOptions.userId ?? `e2e_${role}`);
  const accessToken = await mintMockToken({ role, userId });
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    [E2E_SESSION_KEY, { role, accessToken, userId }] as [
      string,
      { role: string; accessToken: string; userId: string },
    ],
  );
}

export async function installMockSession(
  page: Page,
  options: { role: string; userId?: string },
) {
  await setMockSession(page, options);
}

export async function visitAndExpectBody(page: Page, path: string, pattern: RegExp) {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.locator('body').waitFor({ state: 'visible' });
  await page.getByText(pattern).first().waitFor({ timeout: 15_000 });
}
