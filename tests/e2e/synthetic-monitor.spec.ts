import { expect, request, type Page, test } from '@playwright/test';
import { loginWithCredentials } from './_auth';
import { setMockSession } from './_mockSession';

const realLoginRequired = process.env.SYNTHETIC_REAL_LOGIN === 'true' || process.env.SYNTHETIC_REQUIRED === 'true';
const syntheticApiUrl = process.env.SYNTHETIC_API_URL || process.env.SYNTHETIC_API_BASE_URL;

function credentialsFor(prefix: string) {
  return {
    email: process.env[`SYNTHETIC_${prefix}_EMAIL`],
    password: process.env[`SYNTHETIC_${prefix}_PASSWORD`],
  };
}

async function establishSyntheticSession(page: Page, role: string, userId: string, prefix: string) {
  const credentials = credentialsFor(prefix);
  if (credentials.email && credentials.password) {
    await loginWithCredentials(page, credentials, { requireSuccess: realLoginRequired });
    return 'real-login';
  }

  if (realLoginRequired) {
    throw new Error(`Synthetic ${prefix.toLowerCase()} credentials are required for scheduled/protected monitoring.`);
  }

  await setMockSession(page, role, userId);
  return 'mock-session';
}

test.describe('@synthetic-monitor critical path monitoring', () => {
  test('public landing and login are reachable', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Teachmo/i);
    await expect(page.locator('body')).toContainText(/teachmo|learning|famil/i);

    await page.goto('/login');
    await expect(page.locator('body')).toContainText(/log in|sign in|email/i);
  });

  test('synthetic parent can reach AI and messaging-adjacent critical routes', async ({ page }) => {
    await establishSyntheticSession(page, 'parent', 'synthetic_parent', 'PARENT');

    await page.goto('/discover');
    await expect(page.locator('body')).toContainText(/discover|activities|learning|recommend/i);

    await page.goto('/ai-assistant');
    await expect(page.locator('body')).toContainText(/ai|assistant|ask|help|disabled/i);
  });

  test('synthetic teacher can reach dashboard and assignment surfaces', async ({ page }) => {
    await establishSyntheticSession(page, 'teacher', 'synthetic_teacher', 'TEACHER');

    await page.goto('/teacher');
    await expect(page.locator('body')).toContainText(/teacher|dashboard|class|assignment|student/i);

    await page.goto('/teacher/assignments');
    await expect(page.locator('body')).toContainText(/assignment|class|student|course|create/i);
  });

  test('synthetic admin can reach SIS and analytics monitoring surfaces', async ({ page }) => {
    await establishSyntheticSession(page, 'system_admin', 'synthetic_admin', 'ADMIN');

    await page.goto('/admin/integration-health');
    await expect(page.locator('body')).toContainText(/integration|sync|health|sis/i);

    await page.goto('/admin/analytics');
    await expect(page.locator('body')).toContainText(/analytics|dashboard|adoption|delivery|sync/i);
  });

  test('backend health endpoint is reachable when configured', async () => {
    test.skip(!syntheticApiUrl, 'SYNTHETIC_API_URL is not configured for this synthetic run.');

    const api = await request.newContext({ baseURL: syntheticApiUrl });
    const response = await api.get('/api/healthz');
    expect(response.status(), `health endpoint status for ${syntheticApiUrl}`).toBeLessThan(500);
    await api.dispose();
  });
});
