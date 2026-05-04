import { defineConfig } from '@playwright/test';

const shouldStartServer = process.env.PLAYWRIGHT_WEB_SERVER === 'true' || !process.env.CI;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: shouldStartServer
    ? {
        command:
          'VITE_FEATURE_CALENDAR=true VITE_FEATURE_TEACHER_CLASSES=true VITE_FEATURE_TEACHER_ASSIGNMENTS=true VITE_FEATURE_TEACHER_MESSAGES=true VITE_FEATURE_OFFICE_HOURS=true npm run dev -- --host 127.0.0.1 --port 5173',
        url: 'http://127.0.0.1:5173',
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
});
