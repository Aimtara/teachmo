import { expect, test } from '@playwright/test';
import { installMockSession } from './_mockSession';

test.describe('@gate-proofs Gate 3 messaging, digests, office hours, assignments', () => {
  test('teacher can reach messaging, office-hours calendar, and assignments surfaces', async ({ page }) => {
    await installMockSession(page, { role: 'teacher', userId: 'gate3_teacher' });

    await page.goto('/teacher-messages');
    await expect(page.locator('body')).toContainText(/message|conversation|inbox|request/i);

    await page.goto('/calendar');
    await expect(page.locator('body')).toContainText(/calendar|office|schedule|event/i);

    await page.goto('/teacher-assignments');
    await expect(page.locator('body')).toContainText(/assignment|class|sync|teach/i);
  });

  test('parent can reach messaging and digest/today surfaces', async ({ page }) => {
    await installMockSession(page, { role: 'parent', userId: 'gate3_parent' });

    await page.goto('/messages');
    await expect(page.locator('body')).toContainText(/message|conversation|inbox|community/i);

    await page.goto('/today');
    await expect(page.locator('body')).toContainText(/today|brief|recommend|learning|load/i);
  });
});
