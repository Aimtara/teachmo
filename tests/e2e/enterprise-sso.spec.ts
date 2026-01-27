import { test, expect } from '@playwright/test';
import { login } from './_auth';

test('admin sso settings loads', async ({ page }) => {
  test.skip(!process.env.TEST_EMAIL || !process.env.TEST_PASSWORD, 'missing test credentials');

  await login(page);
  await page.goto('/admin/sso');
  await expect(page.getByRole('heading', { name: /sso policy/i })).toBeVisible();
  await expect(page.getByText(/allowed providers/i)).toBeVisible();
});
