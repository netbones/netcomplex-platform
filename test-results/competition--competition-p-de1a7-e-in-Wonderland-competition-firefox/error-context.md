# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: competition.spec.ts >> /competition page >> renders the seeded Aloe in Wonderland competition
- Location: e2e/competition.spec.ts:17:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Aloe in Wonderland', exact: true }).or(getByText('Unable to load competitions'))
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for getByRole('heading', { name: 'Aloe in Wonderland', exact: true }).or(getByText('Unable to load competitions'))

```

```yaml
- banner:
  - img
  - link "Soralia Village Logo Loading...":
    - /url: /
    - img "Soralia Village Logo"
    - heading "Loading..." [level=1]
    - paragraph
  - navigation
  - combobox "Select language":
    - option "EN" [selected]
    - option "AF"
    - option "XH"
    - option "ZU"
  - text: English
- main
- contentinfo:
  - paragraph: Loading...
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | /**
  4  |  * Regression test for: "Unable to load competitions. Please try again later."
  5  |  * shown on /competition despite the tRPC endpoint returning valid data.
  6  |  *
  7  |  * Root cause: duplicate React instances in the production bundle —
  8  |  * @radix-ui/* resolves `react` to next/dist/compiled/react/index.js
  9  |  * while @trpc/react-query resolves it to the userland react@19.2.4 copy.
  10 |  * useQuery in CompetitionContent then throws "Invalid hook call" which
  11 |  * surfaces as the error UI at src/app/competition/page.tsx:208–222.
  12 |  *
  13 |  * This test asserts the page renders the seeded competition data
  14 |  * (Aloe in Wonderland) and does NOT render the error fallback.
  15 |  */
  16 | test.describe('/competition page', () => {
  17 |   test('renders the seeded Aloe in Wonderland competition', async ({ page }) => {
  18 |     const consoleErrors: string[] = [];
  19 |     const pageErrors: string[] = [];
  20 |     const networkRequests: string[] = [];
  21 |     page.on('console', m => {
  22 |       if (m.type() === 'error') consoleErrors.push(m.text());
  23 |       if (m.text().includes('[COMPETITION_PAGE]')) consoleErrors.push(`[LOG] ${m.text()}`);
  24 |     });
  25 |     page.on('pageerror', e => pageErrors.push(e.message));
  26 |     page.on('request', req => {
  27 |       if (req.url().includes('trpc')) networkRequests.push(`${req.method()} ${req.url()}`);
  28 |     });
  29 |     page.on('response', res => {
  30 |       if (res.url().includes('trpc')) networkRequests.push(`[RESP] ${res.status()} ${res.url()}`);
  31 |     });
  32 | 
  33 |     await page.goto('/competition', { waitUntil: 'domcontentloaded' });
  34 | 
  35 |     // Wait for either the seeded title or the error fallback to appear.
  36 |     const title = page.getByRole('heading', { name: 'Aloe in Wonderland', exact: true });
  37 |     const errorText = page.getByText('Unable to load competitions', { exact: false });
> 38 |     await expect(title.or(errorText)).toBeVisible({ timeout: 30_000 });
     |                                       ^ Error: expect(locator).toBeVisible() failed
  39 | 
  40 |     // Log browser errors for diagnosis regardless of outcome
  41 |     const allErrors = [...consoleErrors, ...pageErrors];
  42 |     const fs = await import('fs');
  43 |     fs.writeFileSync('/tmp/playwright-browser-errors.json', JSON.stringify({ consoleErrors, pageErrors, networkRequests }, null, 2));
  44 | 
  45 |     await expect(title).toBeVisible();
  46 |     await expect(errorText).toHaveCount(0);
  47 | 
  48 |     // No "Invalid hook call" must surface — that's the smoking gun for
  49 |     // the duplicate-React bundle issue this regression guards against.
  50 |     const hookCallErrors = allErrors.filter(e => /Invalid hook call/i.test(e));
  51 |     expect(hookCallErrors, `unexpected hook-call errors:\n${hookCallErrors.join('\n')}`).toEqual([]);
  52 |   });
  53 | });
  54 | 
```