import { test, expect } from '@playwright/test';

test('keyboard navigation reaches transparency link', async ({ page }) => {
  await page.goto('/ai/transparency');
  const contactLink = page.getByRole('link', { name: /contact the ai governance team/i });
  await expect(contactLink).toBeVisible();
  for (let i = 0; i < 5; i += 1) {
    await page.keyboard.press('Tab');
    if (await contactLink.evaluate((node) => node === document.activeElement)) {
      break;
    }
  }
  await expect(contactLink).toBeFocused();
});
