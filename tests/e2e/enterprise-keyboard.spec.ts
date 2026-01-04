import { test, expect } from '@playwright/test';

test('keyboard navigation reaches transparency link', async ({ page }) => {
  await page.goto('/ai/transparency');
  await page.keyboard.press('Tab');
  const contactLink = page.getByRole('link', { name: /contact the ai governance team/i });
  await expect(contactLink).toBeVisible();
  await expect(contactLink).toBeFocused();
});
