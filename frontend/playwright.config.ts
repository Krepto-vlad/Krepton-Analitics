import { defineConfig, devices } from '@playwright/test';

/**
 * Thin e2e smoke layer on top of the Jest/RTL unit + component tests.
 * Assumes the backend API (with a migrated + seeded Postgres) is already
 * running locally on E2E_API_URL — see e2e/README.md for the exact steps.
 * The frontend preview server is started/reused automatically below.
 */
const FRONTEND_PORT = 5173;
const FRONTEND_BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${FRONTEND_PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: FRONTEND_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run preview:build',
    url: FRONTEND_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
