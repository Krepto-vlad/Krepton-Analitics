import { test, expect } from '@playwright/test';

const DEMO_EMAIL = process.env.E2E_DEMO_EMAIL ?? 'demo@krepton.local';
const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD ?? 'DemoPassw0rd!';

test.describe('Beginner tutorial', () => {
  test('opens after sign-in and can be skipped without returning on reload', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill(DEMO_EMAIL);
    await page.getByLabel('Password', { exact: true }).fill(DEMO_PASSWORD);
    await page.locator('form').getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });

    const dialog = page.getByRole('dialog', { name: 'Beginner tutorial' });
    if (!(await dialog.isVisible())) {
      await page.goto('/profile');
      await page.getByRole('button', { name: 'Replay beginner tutorial' }).click();
    }

    await expect(dialog).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Take a quick tour?' })).toBeVisible();
    await page.getByRole('button', { name: 'Skip' }).click();
    await expect(dialog).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole('dialog', { name: 'Beginner tutorial' })).toHaveCount(0);
  });
});
