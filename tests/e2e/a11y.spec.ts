import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('login page has no detectable a11y violations', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
