import { test, expect } from '@playwright/test';
import { login } from './_auth';

test('teacher flow smoke: dashboard -> classes', async ({ page }) => {
  await login(page);
  await page.goto('/teacher/dashboard');
  await expect(page).toHaveTitle(/Teachmo/i);
  await page.goto('/teacher/classes');
  await page.keyboard.press('Tab');
  await expect(page.locator('body')).toContainText(/class|classes|teach/i);
});
