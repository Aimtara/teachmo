import { Page } from '@playwright/test';

/**
 * Best-effort login helper.
 * Expects TEST_EMAIL and TEST_PASSWORD in env.
 */
export async function login(page: Page) {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  if (!email || !password) return;
  await loginWithCredentials(page, { email, password });
}

export async function loginWithCredentials(
  page: Page,
  { email, password }: { email: string; password: string }
) {
  if (!email || !password) return;

  const candidates = ['/login', '/auth/login', '/sign-in'];
  for (const path of candidates) {
    await page.goto(path);
    const hasEmail = await page
      .locator('input[type="email"], input[name="email"]')
      .first()
      .count();
    if (hasEmail) break;
  }

  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passInput = page
    .locator('input[type="password"], input[name="password"]')
    .first();
  if ((await emailInput.count()) === 0 || (await passInput.count()) === 0) return;

  await emailInput.fill(email);
  await passInput.fill(password);

  const submit = page
    .getByRole('button', { name: /sign in|log in|login|continue/i })
    .first();
  if ((await submit.count()) > 0) await submit.click();
  await page.waitForTimeout(1500);
}
