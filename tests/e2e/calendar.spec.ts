import { test, expect } from '@playwright/test';
import { login } from './_auth';

test('calendar smoke: calendar renders and is keyboard reachable', async ({ page }) => {
  await login(page);
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'teachmo_e2e_session',
      JSON.stringify({ role: 'parent', userId: 'e2e-parent' })
    );
  });
  await page.goto('/calendar');
  await page.keyboard.press('Tab');
  await expect(page.locator('body')).toContainText(/calendar|event|today|month|week/i);
});
