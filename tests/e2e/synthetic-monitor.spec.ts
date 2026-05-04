import { expect, test } from '@playwright/test';
import { setMockSession } from './_mockSession';

test.describe('@synthetic-monitor critical path monitoring', () => {
  test('public landing and login are reachable', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Teachmo/i);
    await expect(page.locator('body')).toContainText(/teachmo|learning|famil/i);

    await page.goto('/login');
    await expect(page.locator('body')).toContainText(/log in|sign in|email/i);
  });

  test('synthetic parent can reach AI and messaging-adjacent critical routes', async ({ page }) => {
    await setMockSession(page, 'parent', 'synthetic_parent');

    await page.goto('/discover');
    await expect(page.locator('body')).toContainText(/discover|activities|learning|recommend/i);

    await page.goto('/ai-assistant');
    await expect(page.locator('body')).toContainText(/ai|assistant|ask|help|disabled/i);
  });

  test('synthetic admin can reach SIS and analytics monitoring surfaces', async ({ page }) => {
    await setMockSession(page, 'system_admin', 'synthetic_admin');

    await page.goto('/admin/integration-health');
    await expect(page.locator('body')).toContainText(/integration|sync|health|sis/i);

    await page.goto('/admin/analytics');
    await expect(page.locator('body')).toContainText(/analytics|dashboard|adoption|delivery|sync/i);
  });
});
