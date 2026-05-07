import { defineConfig } from '@playwright/test';

const shouldStartServer = process.env.PLAYWRIGHT_WEB_SERVER === 'true' || !process.env.CI;
const e2ePort = Number(process.env.PLAYWRIGHT_PORT) || 5174;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${e2ePort}`,
    trace: 'on-first-retry',
  },
  webServer: shouldStartServer
    ? {
        command:
          `VITE_E2E_BYPASS_AUTH=true VITE_DISABLE_DEV_ROUTE_BYPASS=true VITE_ENABLE_INTERNAL_ROUTES=true VITE_FEATURE_CALENDAR=true VITE_FEATURE_TEACHER_CLASSES=true VITE_FEATURE_TEACHER_ASSIGNMENTS=true VITE_FEATURE_TEACHER_MESSAGES=true VITE_FEATURE_OFFICE_HOURS=true VITE_FEATURE_MESSAGING=true VITE_FEATURE_SCHOOL_DIRECTORY=true VITE_FEATURE_ENTERPRISE_SIS_ROSTER=true VITE_FEATURE_ENTERPRISE_AI_GOVERNANCE=true npm run dev -- --host 127.0.0.1 --port ${e2ePort}`,
        url: `http://127.0.0.1:${e2ePort}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
