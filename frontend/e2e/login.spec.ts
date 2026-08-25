import { test, expect } from '@playwright/test';

/**
 * Requires the backend API + a migrated Postgres to be running and reachable
 * at VITE_API_URL, with the demo account seeded via `npm run seed:demo`
 * (backend). See e2e/README.md for the full local setup.
 */
const DEMO_EMAIL = process.env.E2E_DEMO_EMAIL ?? 'demo@krepton.local';
const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD ?? 'DemoPassw0rd!';

test.describe('Authentication', () => {
  test('redirects an unauthenticated visitor from a protected route to sign-in', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('logs in with valid credentials and reaches the dashboard with seeded holdings', async ({
    page,
  }) => {
    await page.goto('/login');

    await page.getByLabel('Email', { exact: true }).fill(DEMO_EMAIL);
    await page.getByLabel('Password', { exact: true }).fill(DEMO_PASSWORD);
    // Scoped to <form> — "Sign In" also appears as a login/register mode tab above the form.
    await page.locator('form').getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
    // Seeded demo portfolio holds AAPL — proves the session cookie and the
    // portfolio fetch both worked end to end, not just the redirect.
    await expect(page.getByText('AAPL').first()).toBeVisible({ timeout: 15_000 });
  });
});
