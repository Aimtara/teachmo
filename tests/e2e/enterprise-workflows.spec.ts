import { expect, test } from '@playwright/test';
import { setMockSession } from './_mockSession';

test.describe('@enterprise-ui workflow interactions', () => {
  test('parent schedules a calendar request into agenda view', async ({ page }) => {
    await setMockSession(page, { role: 'parent', userId: 'enterprise_parent_workflows' });

    await page.goto('/calendar');
    await expect(page.getByRole('heading', { name: /adaptive scheduling board/i })).toBeVisible();

    await page.getByRole('button', { name: /schedule avery family office hours/i }).click();

    await expect(page.getByText(/current view:\s*agenda/i)).toBeVisible();
    await expect(page.getByLabel(/agenda list/i)).toContainText(/avery family office hours/i);
  });

  test('parent sends a message and approves a request', async ({ page }) => {
    await setMockSession(page, { role: 'parent', userId: 'enterprise_parent_messages' });

    await page.goto('/messages');
    await expect(page.getByRole('heading', { name: /rich family and classroom chat/i })).toBeVisible();

    const composer = page.getByLabel(/rich composer/i);
    await composer.fill('Thanks, I will send the link today.');
    await page.getByRole('button', { name: /^send$/i }).click();

    await expect(page.getByText('Thanks, I will send the link today.')).toBeVisible();
    await page.getByRole('button', { name: /^approve$/i }).first().click();
    await expect(page.getByText(/^Approved$/)).toBeVisible();
  });

  test('partner can switch CMS workspace tabs', async ({ page }) => {
    await setMockSession(page, { role: 'partner', userId: 'enterprise_partner_workflows' });

    await page.goto('/partners');
    await expect(page.getByRole('heading', { name: /partner workspace/i })).toBeVisible();

    await page.getByRole('tab', { name: /asset library/i }).click();
    await expect(page.getByRole('heading', { name: /asset readiness/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /asset library/i })).toBeVisible();

    await page.getByRole('tab', { name: /^analytics$/i }).click();
    await expect(page.getByRole('heading', { name: /performance snapshot/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /partner analytics/i })).toBeVisible();

    await page.getByRole('tab', { name: /compliance/i }).click();
    await expect(page.getByRole('heading', { name: /compliance queue/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /compliance tracker/i })).toBeVisible();
  });

  test('district admin can retry data health dead-letter items', async ({ page }) => {
    await setMockSession(page, { role: 'district_admin', userId: 'enterprise_admin_data_health' });

    await page.goto('/admin/integration-health');
    await expect(page.getByRole('heading', { name: /roster sync operations hub/i })).toBeVisible();

    await page.getByRole('button', { name: /^retry$/i }).first().click();
    await expect(page.getByText(/retry queued now/i)).toBeVisible();
  });

  test('system admin can switch AI governance rollout mode', async ({ page }) => {
    await setMockSession(page, { role: 'system_admin', userId: 'enterprise_ai_governance' });

    await page.goto('/admin/ai-governance');
    await expect(page.getByRole('heading', { name: /trust console/i })).toBeVisible();

    await page.getByRole('button', { name: /^verify$/i }).click();
    await expect(page.getByText(/current mode:\s*verify/i)).toBeVisible();
  });
});
