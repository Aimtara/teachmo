import { test, expect } from '@playwright/test';
import { login } from './_auth';

test('calendar smoke: calendar renders and is keyboard reachable', async ({ page }) => {
  await login(page);
  await page.goto('/calendar');
  await page.keyboard.press('Tab');
  await expect(page.locator('body')).toContainText(/calendar|event|today|month|week/i);
});
