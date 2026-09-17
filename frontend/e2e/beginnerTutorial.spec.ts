import { test, expect } from '@playwright/test';

const DEMO_EMAIL = process.env.E2E_DEMO_EMAIL ?? 'demo@krepton.local';
const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD ?? 'DemoPassw0rd!';
const BEGINNER_TUTORIAL_INVITE_TITLE = 'Take a quick tour?';
const BEGINNER_TUTORIAL_SKIP_LABEL = 'Skip';

test.describe('Beginner tutorial', () => {
  test('opens after sign-in and can be skipped without returning on reload', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill(DEMO_EMAIL);
    await page.getByLabel('Password', { exact: true }).fill(DEMO_PASSWORD);
    await page.locator('form').getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });

    const inviteTitle = page.getByRole('heading', { name: BEGINNER_TUTORIAL_INVITE_TITLE });
    await expect(inviteTitle).toBeVisible();
    await page.getByRole('button', { name: BEGINNER_TUTORIAL_SKIP_LABEL }).click();
    await expect(inviteTitle).toHaveCount(0);

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
    await expect(page.getByText('AAPL').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: BEGINNER_TUTORIAL_INVITE_TITLE })).toHaveCount(
      0
    );
  });
});
