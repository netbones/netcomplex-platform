---
status: pending
issue: soralia-village-qx7
title: M5+ Post-launch — Booking Calendar Integration
sources:
  - src/app/api/bookings/route.ts
  - src/app/api/bookings/availability/route.ts
  - src/entities/booking/ui/BookingDatePicker.tsx
  - src/entities/booking/ui/BookingTimeSlots.tsx
  - src/entities/booking/ui/BookingCalendar.tsx
  - src/features/booking/ui/BookingForm.tsx
  - src/page-modules/booking/ui/BookingsPage.tsx
  - e2e/booking-calendar.spec.ts
started: 2026-07-07T00:00:00Z
updated: 2026-07-07T00:00:00Z
---

## Tests

### 1. Booking date picker calendar

expected: After selecting a facility in the booking form, a calendar month grid appears. All future dates are clickable (not greyed out). Past dates are greyed out and disabled. Today is highlighted with the primary brand color. Clicking a future date selects it.

result: pending

---

### 2. Time slot grid with availability

expected: After selecting a facility AND date, a grid of 30-minute time slots appears (06:00–22:00). Slots that already have non-cancelled bookings for this facility+date are greyed out with strikethrough text ("line-through") and are not clickable. Free slots have the primary brand border and are clickable.

result: pending

---

### 3. Time slot selection and booking submission

expected: Clicking a free time slot highlights it with the primary brand color. The selected time range (e.g. "09:00 – 09:30") appears below the grid. Filling in the purpose textarea and clicking "Book Facility" submits the form. On success, redirects to the "My Bookings" tab with the new booking visible.

result: pending

---

### 4. Conflict detection returns 409

expected: If two users try to book the same facility, date, and overlapping time slot, the second request returns HTTP 409 with message "This time slot is no longer available. Please choose another time." The error is displayed in a red alert box above the form.

result: pending

---

### 5. Availability endpoint returns booked slots

expected: GET `/api/bookings/availability?facility=POOL&date=2026-07-10` returns `{ facility, date, bookedSlots: [{ startTime, endTime }] }` for authenticated users. Non-authenticated requests return 401. Missing `facility` or `date` params return 400.

result: pending

---

### 6. Calendar overview tab shows bookings

expected: The bookings page has three tabs: "My Bookings", "Calendar", "New Booking". Clicking "Calendar" shows a month grid with dot indicators on dates that have bookings (1-3 dots shown individually, 4+ shown as a count number). Clicking a date with bookings shows a list of cards below with facility badge, status badge, time, and purpose.

result: pending

---

### 7. Tab navigation between list/calendar/new booking

expected: Clicking "My Bookings" shows the table of existing bookings. Clicking "New Booking" shows the booking form. Clicking "Calendar" shows the calendar overview. The active tab has the primary brand underline.

result: pending

---

### 8. Empty state — no bookings on date

expected: Clicking a date on the calendar that has no bookings shows the message "No bookings for this date." in gray text centered below the calendar.

result: pending

---

### 9. Empty state — user has no bookings

expected: When a user has no bookings, the "My Bookings" tab shows "No bookings yet." with a "Make your first booking" link that switches to the "New Booking" tab.

result: pending

---

## Summary

total: 9
passed: 0
issues: 0
pending: 9
skipped: 0
blocked: 0

## Playwright Coverage

| UAT Test                 | E2E Test                                                 | Location                   |
| ------------------------ | -------------------------------------------------------- | -------------------------- |
| 1. Date picker calendar  | `calendar date picker shows month grid and selects date` | `booking-calendar.spec.ts` |
| 2. Time slot grid        | `time slots show availability after selecting date`      | `booking-calendar.spec.ts` |
| 3. Booking submission    | `submit a facility booking end-to-end`                   | `booking-calendar.spec.ts` |
| 4. Conflict detection    | `conflict detection shows error on double-booking`       | `booking-calendar.spec.ts` |
| 5. Availability endpoint | `availability API returns booked slots`                  | `booking-calendar.spec.ts` |
| 6. Calendar overview     | `calendar tab shows bookings with dot indicators`        | `booking-calendar.spec.ts` |
| 7. Tab navigation        | `tab navigation works between list/calendar/new`         | `booking-calendar.spec.ts` |
| 8. Empty calendar date   | `empty date shows no bookings message`                   | `booking-calendar.spec.ts` |
| 9. Empty bookings list   | `empty state shows make your first booking link`         | `booking-calendar.spec.ts` |
