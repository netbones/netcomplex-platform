import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('homepage loads and shows login', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page).toHaveTitle(/Soralia Village|Netcomplex|Sign In|Login/);
    expect(errors).toEqual([]);
  });

  test('login page renders form elements', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /sign in|login/i })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('unknown route shows 404', async ({ page }) => {
    const response = await page.goto('/this-path-does-not-exist-12345', {
      waitUntil: 'networkidle',
    });
    expect(response?.status()).toBe(404);
  });
});
