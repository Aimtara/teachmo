import { test, expect } from '@playwright/test';
import { login } from './_auth';

test('admin flow smoke: admin dashboard loads', async ({ page }) => {
  await login(page);
  await page.goto('/admin');
  await expect(page.locator('body')).toContainText(/admin|dashboard|system/i);
});
