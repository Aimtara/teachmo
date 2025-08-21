import { defineConfig, devices } from '@playwright/test';

// Playwright configuration for end‑to‑end tests.
//
// This configuration runs tests in Chromium, Firefox and WebKit against
// a local development server at http://localhost:3000. Adjust the
// baseURL if your app is served elsewhere.

export default defineConfig({
  testDir: './e2e',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});