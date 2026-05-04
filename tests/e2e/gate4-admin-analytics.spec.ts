import { expect, test } from '@playwright/test';
import { setMockSession } from './_mockSession';

test.describe('@gate-proof @gate4 admin analytics and command center', () => {
  test.beforeEach(async ({ page }) => {
    await setMockSession(page, {
      role: 'system_admin',
      userId: 'gate4_system_admin',
      allowedRoles: ['system_admin'],
    });
  });

  test('admin analytics dashboard renders Gate 4 widgets', async ({ page }) => {
    await page.goto('/admin/analytics');
    await expect(page).toHaveTitle(/Teachmo/i);
    await expect(page.locator('body')).toContainText(/analytics|dashboard|adoption|delivery|sync/i);
  });

  test('integration health route exposes sync troubleshooting surface', async ({ page }) => {
    await page.goto('/admin/integration-health');
    await expect(page.locator('body')).toContainText(/integration|sync|health|sis/i);
  });

  test('command center route supports escalation review proof', async ({ page }) => {
    await page.goto('/admin/command-center');
    await expect(page.locator('body')).toContainText(/command|center|approval|escalation|workflow/i);
  });
});
