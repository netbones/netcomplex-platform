import { test, expect } from '@playwright/test';

/**
 * Regression test for: "Unable to load competitions. Please try again later."
 * shown on /competition despite the tRPC endpoint returning valid data.
 *
 * Root cause: duplicate React instances in the production bundle —
 * @radix-ui/* resolves `react` to next/dist/compiled/react/index.js
 * while @trpc/react-query resolves it to the userland react@19.2.4 copy.
 * useQuery in CompetitionContent then throws "Invalid hook call" which
 * surfaces as the error UI at src/app/competition/page.tsx:208–222.
 *
 * This test asserts the page renders the seeded competition data
 * (Aloe in Wonderland) and does NOT render the error fallback.
 */
test.describe('/competition page', () => {
  test('renders the seeded Aloe in Wonderland competition', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const networkRequests: string[] = [];
    page.on('console', m => {
      if (m.type() === 'error') consoleErrors.push(m.text());
      if (m.text().includes('[COMPETITION_PAGE]')) consoleErrors.push(`[LOG] ${m.text()}`);
    });
    page.on('pageerror', e => pageErrors.push(e.message));
    page.on('request', req => {
      if (req.url().includes('trpc')) networkRequests.push(`${req.method()} ${req.url()}`);
    });
    page.on('response', res => {
      if (res.url().includes('trpc')) networkRequests.push(`[RESP] ${res.status()} ${res.url()}`);
    });

    await page.goto('/competition', { waitUntil: 'domcontentloaded' });

    // Wait for either the seeded title or the error fallback to appear.
    const title = page.getByRole('heading', { name: 'Aloe in Wonderland', exact: true });
    const errorText = page.getByText('Unable to load competitions', { exact: false });
    await expect(title.or(errorText)).toBeVisible({ timeout: 30_000 });

    // Log browser errors for diagnosis regardless of outcome
    const allErrors = [...consoleErrors, ...pageErrors];
    const fs = await import('fs');
    fs.writeFileSync('/tmp/playwright-browser-errors.json', JSON.stringify({ consoleErrors, pageErrors, networkRequests }, null, 2));

    await expect(title).toBeVisible();
    await expect(errorText).toHaveCount(0);

    // No "Invalid hook call" must surface — that's the smoking gun for
    // the duplicate-React bundle issue this regression guards against.
    const hookCallErrors = allErrors.filter(e => /Invalid hook call/i.test(e));
    expect(hookCallErrors, `unexpected hook-call errors:\n${hookCallErrors.join('\n')}`).toEqual([]);
  });
});
