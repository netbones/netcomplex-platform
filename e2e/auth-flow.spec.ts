import { test, expect } from '@playwright/test';

test.describe('Auth flow', () => {
  test('login page renders and redirects to dashboard after authentication', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', m => {
      if (m.type() === 'error') consoleErrors.push(m.text());
    });
    page.on('pageerror', e => pageErrors.push(e.message));

    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    const heading = page.getByRole('heading', { name: /sign in|login|welcome/i });
    await expect(heading).toBeVisible({ timeout: 15_000 });

    const emailInput = page.getByLabel(/email|e-mail/i);
    const passwordInput = page.getByLabel(/password/i);
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    await emailInput.fill('admin@soralia.co.za');
    await passwordInput.fill('password123');
    await page.getByRole('button', { name: /sign in|login|submit/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    const allErrors = [...consoleErrors, ...pageErrors];
    expect(allErrors.filter(e => /invalid hook call/i.test(e))).toEqual([]);
  });

  test('login page redirects authenticated users away from /login', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    const emailInput = page.getByLabel(/email|e-mail/i);
    const passwordInput = page.getByLabel(/password/i);

    await emailInput.fill('admin@soralia.co.za');
    await passwordInput.fill('password123');
    await page.getByRole('button', { name: /sign in|login|submit/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test('protected route redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });
});
