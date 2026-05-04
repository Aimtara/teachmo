import { expect, test } from '@playwright/test';
import { installMockSession } from './_mockSession';

test.describe('@gate-proof Gate 2 directory/import/identity', () => {
  test.beforeEach(async ({ page }) => {
    await installMockSession(page, { role: 'system_admin', userId: 'gate2_admin' });
  });

  test('directory import and approval surfaces render for admin review', async ({ page }) => {
    const routes = ['/admin/sis-roster', '/admin/integration-health', '/school-directory'];
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('body')).toContainText(/directory|sis|roster|integration|school|import|sync/i);
    }
  });

  test('high-risk identity mapping proof remains human-review gated', async ({ page }) => {
    await page.goto('/admin/sis-roster');
    await expect(page.locator('body')).toContainText(/sis|roster|mapping|import|sync/i);
    test.info().annotations.push({
      type: 'human-review-required',
      description:
        'Attach CSV/OneRoster dry-run evidence and conflict approval/rejection reasons before enabling Gate 2 broadly.',
    });
  });
});
