import { expect, test } from '@playwright/test';
import { setMockSession } from './_mockSession';

test.describe('@enterprise-ui command center', () => {
  test('renders command-center shell, command palette, and high-contrast preferences', async ({ page }) => {
    await setMockSession(page, { role: 'system_admin', userId: 'enterprise_ui_smoke' });
    await page.goto('/admin/command-center');

    await expect(page.getByRole('heading', { name: /enterprise command center/i })).toBeVisible();
    await expect(page.getByRole('navigation', { name: /breadcrumb/i })).toContainText('Command Center');
    await expect(page.getByRole('table', { name: /command center actions/i })).toBeVisible();

    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
    await expect(page.getByRole('dialog', { name: /global command palette/i })).toBeVisible();
    await page.getByRole('button', { name: /switch to high contrast/i }).click();
    await expect(page.locator('html')).toHaveAttribute('data-enterprise-theme', 'highContrast');

    await page.getByLabel(/role context/i).selectOption('district_admin');
    await expect(page.getByText(/district adoption/i)).toBeVisible();
  });
});
