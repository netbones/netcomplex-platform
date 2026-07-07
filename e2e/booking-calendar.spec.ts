import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'admin@soralia.co.za';
const TEST_PASSWORD = 'password123';

async function login(page: Awaited<ReturnType<typeof test>>['page']) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/email|e-mail/i).fill(TEST_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /sign in|login|submit/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

async function navigateToBookings(page: Awaited<ReturnType<typeof test>>['page']) {
  await page.goto('/bookings', { waitUntil: 'domcontentloaded' });
  const heading = page.getByRole('heading', { name: /bookings/i });
  await expect(heading).toBeVisible({ timeout: 10_000 });
}

test.describe('Booking calendar integration', () => {
  test('tab navigation works between list, calendar, and new booking', async ({ page }) => {
    await login(page);
    await navigateToBookings(page);

    const tabs = page.locator('button[class*="border-b-2"]');
    await expect(tabs).toHaveCount(3);

    await tabs.filter({ hasText: 'My Bookings' }).click();
    await expect(page.getByText(/no bookings yet|facility/i)).toBeVisible({ timeout: 5_000 });

    await tabs.filter({ hasText: 'Calendar' }).click();
    const monthHeading = page.getByRole('heading', { name: /20\d{2}/ });
    await expect(monthHeading).toBeVisible({ timeout: 5_000 });

    await tabs.filter({ hasText: 'New Booking' }).click();
    const formHeading = page.getByRole('heading', { name: /book a facility/i });
    await expect(formHeading).toBeVisible({ timeout: 5_000 });
  });

  test('calendar date picker shows month grid and selects date', async ({ page }) => {
    await login(page);
    await navigateToBookings(page);

    const tabs = page.locator('button[class*="border-b-2"]');
    await tabs.filter({ hasText: 'New Booking' }).click();

    const facilitySelect = page.getByRole('combobox');
    await expect(facilitySelect).toBeVisible();
    await facilitySelect.selectOption({ index: 1 });

    const calendarGrid = page.locator('.grid-cols-7');
    await expect(calendarGrid).toBeVisible({ timeout: 5_000 });

    const todayCell = page.locator('button.bg-soralia-primary\\/10').first();
    await expect(todayCell).toBeVisible();

    const dayButtons = calendarGrid
      .locator('button')
      .filter({ has: page.locator('text=/^\\d{1,2}$/') });
    const availableCount = await dayButtons.count();
    expect(availableCount).toBeGreaterThan(0);
  });

  test('time slots appear after selecting date', async ({ page }) => {
    await login(page);
    await navigateToBookings(page);

    const tabs = page.locator('button[class*="border-b-2"]');
    await tabs.filter({ hasText: 'New Booking' }).click();

    await page.getByRole('combobox').selectOption({ index: 1 });

    const dayButtons = page.locator('.grid-cols-7 button');
    const availableBtn = dayButtons.filter({ hasNot: page.locator('[disabled]') }).first();
    if (await availableBtn.isVisible()) {
      await availableBtn.click();
    }

    const slotGrid = page.locator('text=Available time slots');
    await expect(slotGrid).toBeVisible({ timeout: 10_000 });

    const slotButtons = page.locator('button:has-text(/^\\d{2}:\\d{2}$/)');
    await expect(slotButtons.first()).toBeVisible({ timeout: 5_000 });
  });

  test('submit a facility booking end-to-end', async ({ page }) => {
    await login(page);
    await navigateToBookings(page);

    const tabs = page.locator('button[class*="border-b-2"]');
    await tabs.filter({ hasText: 'New Booking' }).click();

    await page.getByRole('combobox').selectOption({ index: 1 });

    const dayButtons = page.locator('.grid-cols-7 button');
    const availableBtn = dayButtons.filter({ hasNot: page.locator('[disabled]') }).first();
    await availableBtn.click();

    const slotButton = page.locator('button:has-text(/^\\d{2}:\\d{2}$/)').first();
    await slotButton.click();
    await expect(page.getByText(/selected:/i)).toBeVisible();

    await page.getByPlaceholder(/what's this booking for/i).fill('Playwright E2E test booking');
    await page.getByRole('button', { name: /book facility/i }).click();

    await expect(page.getByText(/no bookings yet|facility/i)).toBeVisible({ timeout: 10_000 });
  });

  test('conflict detection shows error on double-booking', async ({ page }) => {
    await login(page);
    await navigateToBookings(page);

    const tabs = page.locator('button[class*="border-b-2"]');
    await tabs.filter({ hasText: 'New Booking' }).click();

    await page.getByRole('combobox').selectOption({ index: 1 });

    const dayButtons = page.locator('.grid-cols-7 button');
    const availableBtn = dayButtons.filter({ hasNot: page.locator('[disabled]') }).first();
    await availableBtn.click();

    const slotButton = page.locator('button:has-text(/^\\d{2}:\\d{2}$/)').first();
    await slotButton.click();

    await page.getByPlaceholder(/what's this booking for/i).fill('Conflict test');
    await page.getByRole('button', { name: /book facility/i }).click();

    await page
      .getByText(/no bookings yet|facility/i)
      .waitFor({ state: 'visible', timeout: 10_000 });

    await tabs.filter({ hasText: 'New Booking' }).click();
    await page.getByRole('combobox').selectOption({ index: 1 });

    const nextAvailable = page
      .locator('.grid-cols-7 button')
      .filter({ hasNot: page.locator('[disabled]') })
      .first();
    await nextAvailable.click();

    const sameSlot = page.locator('button:has-text(/^\\d{2}:\\d{2}$/)').first();
    await sameSlot.click();

    await page.getByPlaceholder(/what's this booking for/i).fill('Should conflict');
    await page.getByRole('button', { name: /book facility/i }).click();

    const conflictError = page.getByText(/no longer available/i);
    await expect(conflictError).toBeVisible({ timeout: 10_000 });
  });

  test('availability API returns booked slots', async ({ page, request }) => {
    await login(page);

    const response = await request.get('/api/bookings/availability?facility=POOL&date=2026-07-10');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('facility', 'POOL');
    expect(body.data).toHaveProperty('date', '2026-07-10');
    expect(body.data).toHaveProperty('bookedSlots');
    expect(Array.isArray(body.data.bookedSlots)).toBe(true);
  });

  test('availability API rejects unauthenticated requests', async ({ request }) => {
    const response = await request.get('/api/bookings/availability?facility=POOL&date=2026-07-10');
    expect(response.status()).toBe(401);
  });

  test('availability API validates missing params', async ({ page, request }) => {
    await login(page);

    const noFacility = await request.get('/api/bookings/availability?date=2026-07-10');
    expect(noFacility.status()).toBe(400);

    const noDate = await request.get('/api/bookings/availability?facility=POOL');
    expect(noDate.status()).toBe(400);
  });

  test('calendar tab shows bookings with dot indicators', async ({ page }) => {
    await login(page);
    await navigateToBookings(page);

    const tabs = page.locator('button[class*="border-b-2"]');
    await tabs.filter({ hasText: 'Calendar' }).click();

    const calendarGrid = page.locator('.grid-cols-7');
    await expect(calendarGrid).toBeVisible({ timeout: 5_000 });

    const dots = page.locator('.w-1.h-1.rounded-full.bg-soralia-primary');
    const bookedCount = await dots.count();

    if (bookedCount > 0) {
      const firstDateWithBooking = page
        .locator('button:has(.w-1.h-1.rounded-full.bg-soralia-primary)')
        .first();
      await firstDateWithBooking.click();
      await expect(page.getByText(/no bookings for this date/i)).not.toBeVisible({
        timeout: 5_000,
      });
    }
  });

  test('empty date shows no bookings message', async ({ page }) => {
    await login(page);
    await navigateToBookings(page);

    const tabs = page.locator('button[class*="border-b-2"]');
    await tabs.filter({ hasText: 'Calendar' }).click();

    const dayButtons = page.locator('.grid-cols-7 button');
    const noDotBtn = dayButtons
      .filter({ hasNot: page.locator('.w-1.h-1') })
      .filter({ hasNot: page.locator('[disabled]') })
      .last();

    if (await noDotBtn.isVisible()) {
      await noDotBtn.click();
      await expect(page.getByText(/no bookings for this date/i)).toBeVisible({ timeout: 5_000 });
    }
  });

  test('empty state shows make your first booking link', async ({ page }) => {
    await login(page);
    await navigateToBookings(page);

    const tabs = page.locator('button[class*="border-b-2"]');
    await tabs.filter({ hasText: 'My Bookings' }).click();

    const emptyState = page.getByText(/make your first booking/i);
    const noBookings = page.getByText(/no bookings yet/i);

    const hasBookings = await page
      .getByRole('cell')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (!hasBookings) {
      await expect(noBookings.or(emptyState).first()).toBeVisible({ timeout: 5_000 });
    }
  });
});
