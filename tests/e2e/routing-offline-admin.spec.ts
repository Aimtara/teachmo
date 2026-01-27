import { test, expect } from '@playwright/test';
import { loginWithCredentials } from './_auth';

test.describe('role-based routing', () => {
  test('non-admin users are redirected from admin routes', async ({ page }) => {
    const email = process.env.TEST_PARENT_EMAIL;
    const password = process.env.TEST_PARENT_PASSWORD;
    test.skip(!email || !password, 'Missing parent credentials');

    await loginWithCredentials(page, { email, password });
    await page.goto('/admin');
    await expect(page).toHaveURL(/unauthorized|login|sign-in/i);
  });

  test('admin users can access admin tools', async ({ page }) => {
    const email = process.env.TEST_ADMIN_EMAIL;
    const password = process.env.TEST_ADMIN_PASSWORD;
    test.skip(!email || !password, 'Missing admin credentials');

    await loginWithCredentials(page, { email, password });
    await page.goto('/admin/workflows');
    await expect(page.locator('body')).toContainText(/workflow|automation|admin/i);
  });
});

test('offline caching keeps core assets available', async ({ page, context }) => {
  await page.goto('/');
  const hasServiceWorker = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return { supported: false, caches: [] };
    const registration = await navigator.serviceWorker.ready;
    const cacheKeys = 'caches' in window ? await caches.keys() : [];
    return { supported: true, scope: registration.scope, caches: cacheKeys };
  });

  expect(hasServiceWorker.supported).toBe(true);
  expect(hasServiceWorker.caches.length).toBeGreaterThan(0);

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('body')).toBeVisible();
  await context.setOffline(false);
});
