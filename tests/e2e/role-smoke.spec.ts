import { expect, test } from '@playwright/test';
import { setMockSession } from './_mockSession';

const roleRoutes = [
  {
    role: 'parent',
    userId: 'user_parent_role_smoke',
    routes: ['/parent/dashboard', '/discover', '/messages', '/today'],
    expected: /parent|dashboard|discover|message|today|teachmo/i,
  },
  {
    role: 'teacher',
    userId: 'user_teacher_role_smoke',
    routes: ['/teacher/dashboard', '/teacher-classes', '/teacher-assignments', '/teacher-messages', '/calendar'],
    expected: /teacher|class|assignment|message|calendar|teachmo/i,
  },
  {
    role: 'partner',
    userId: 'user_partner_role_smoke',
    routes: ['/partner', '/partners/submissions', '/partners/training', '/partners/offers'],
    expected: /partner|submission|training|offer|teachmo/i,
  },
  {
    role: 'district_admin',
    userId: 'user_admin_role_smoke',
    routes: ['/admin', '/admin/sis-roster', '/admin/integration-health', '/admin/analytics'],
    expected: /admin|dashboard|directory|integration|analytics|teachmo/i,
  },
  {
    role: 'system_admin',
    userId: 'user_ops_role_smoke',
    routes: ['/ops/orchestrator', '/internal/command-center', '/internal/execution-board'],
    expected: /ops|orchestrator|command|execution|teachmo/i,
  },
];

test.describe('@role-smoke role route access', () => {
  for (const roleCase of roleRoutes) {
    test(`${roleCase.role} smoke routes render`, async ({ page }) => {
      await setMockSession(page, {
        role: roleCase.role,
        userId: roleCase.userId,
      });

      for (const route of roleCase.routes) {
        await page.goto(route);
        await expect(page).toHaveTitle(/Teachmo/i);
        await expect(page.locator('body')).toContainText(roleCase.expected);
      }
    });
  }
});
