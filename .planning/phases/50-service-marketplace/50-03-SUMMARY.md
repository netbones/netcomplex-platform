---
phase: 50-service-marketplace
plan: 03
subsystem: marketplace
tags: [service-bookings, calendar, datepicker, timeslot, bottom-sheet, booking-api]

# Dependency graph
requires:
  - phase: 50-01
    provides: ServiceBooking model + enums, booking-payment-status-enum
  - phase: 50-02
    provides: CheckoutSummary component, calculatePlatformFee, serviceBookingSchema
provides:
  - ServiceBooking CRUD API (GET/POST/PATCH) with auth + tenant isolation
  - Provider availability endpoint (GET /api/services/[id]/availability)
  - Custom DatePicker component (no external library per D-10)
  - TimeSlotGrid component with 30-min slot generation
  - BookingBottomSheet 3-step booking flow (date → time → confirm)
  - MarketplaceDetailPage with Book Now CTA
affects: [phase-50-04, marketplace-widget, booking-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Custom calendar built with Tailwind CSS grid (D-10: no external library)
    - Progressive bottom sheet with step indicator (D-14)
    - TDD RED-GREEN cycle for all 3 tasks
    - Drizzle query builder chain with LEFT JOIN for bookings listing
    - Server-side status transition validation (T-50-17)
    - apiConflict() for time-slot double-booking prevention (T-50-15)

key-files:
  created:
    - src/app/api/service-bookings/route.ts — GET/POST/PATCH ServiceBooking CRUD
    - src/app/api/services/[id]/availability/route.ts — GET provider availability
    - src/app/api/marketplace/__tests__/bookings.test.ts — 7 API tests
    - src/entities/marketplace/ui/DatePicker.tsx — Custom date picker
    - src/entities/marketplace/ui/TimeSlotGrid.tsx — Time slot selection grid
    - src/entities/marketplace/ui/BookingBottomSheet.tsx — 3-step booking sheet
    - src/entities/marketplace/__tests__/date-picker.test.tsx — 7 component tests
    - src/entities/marketplace/__tests__/time-slot-grid.test.tsx — 7 component tests
    - src/entities/marketplace/__tests__/bottom-sheet.test.tsx — 7 component tests
    - src/features/marketplace/ui/MarketplaceDetailPage.tsx — Detail page scaffold
  modified:
    - src/entities/marketplace/index.server.ts — re-export getProviderRecordForUser
    - src/entities/marketplace/index.ts — export UI components in public barrel

key-decisions:
  - 'Used TDD RED-GREEN cycle for all 3 tasks (6 commits: 3 test + 3 feat)'
  - 'getProviderRecordForUser re-exported from @entities/marketplace/server to comply with FSD no-restricted-imports'
  - 'BookingBottomSheet backdrop uses <button> instead of <div> for accessibility'
  - 'DatePicker test 3 adjusted for end-of-month edge case (no available dates in current month)'

patterns-established:
  - 'TDD RED-GREEN: Each task has test commit followed by feat commit'
  - 'API route pattern: auth → withTenant → Zod validate → Drizzle query → apiSuccess'
  - 'Drizzle LEFT JOIN pattern for bookings with listing + user display data'
  - 'Server-side status transition map (VALID_TRANSITIONS) per T-50-17'

requirements-completed:
  - 50-BOOK-01
  - 50-BOOK-02
  - 50-BOOK-03
  - 50-MOB-02

# Metrics
duration: 18min
completed: 2026-06-27
---

# Phase 50 Plan 03: Booking Calendar System Summary

**ServiceBooking CRUD API + custom calendar UI with 3-step bottom sheet booking flow — 28 tests passing across 4 test files**

## Performance

- **Duration:** 18 min
- **Started:** 2026-06-27T13:46:18Z
- **Completed:** 2026-06-27T14:04:42Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments

- ServiceBooking CRUD API: POST creates PENDING_CONFIRMATION bookings, GET filters by resident/provider role, PATCH validates status transitions
- Time-slot double-booking prevention with 409 CONFLICT response (T-50-15)
- Provider availability endpoint returns D-09 JSON contract: weekly schedule + booked slots for next 30 days
- Custom DatePicker with Tailwind CSS grid — no external calendar library (D-10)
- TimeSlotGrid generates 30-min slots from availability ranges with booked/free states
- BookingBottomSheet 3-step progressive flow: date → time → confirm with CheckoutSummary (D-14)
- All touch targets ≥ 44×44px (D-16), iOS safe-area-inset-bottom on bottom sheet
- No facility Booking table imported anywhere (Pitfall 3 avoided)

## Task Commits

Each task was committed atomically using TDD RED-GREEN:

1. **Task 1: ServiceBooking CRUD API + Availability Endpoint**
   - `ea37cfaf` (test: add failing tests)
   - `55659755` (feat: implement API routes)

2. **Task 2: DatePicker + TimeSlotGrid Components**
   - `605157e8` (test: add failing tests)
   - `ab083e15` (feat: implement components)

3. **Task 3: BookingBottomSheet + MarketplaceDetailPage**
   - `f4c211c4` (test: add failing tests)
   - `ea138bc1` (feat: implement components)

## Files Created/Modified

- `src/app/api/service-bookings/route.ts` — ServiceBooking CRUD (GET/POST/PATCH) with auth, tenant isolation, conflict detection
- `src/app/api/services/[id]/availability/route.ts` — Provider availability endpoint (D-09 JSON contract)
- `src/entities/marketplace/ui/DatePicker.tsx` — Custom date picker with month navigation, availability highlighting
- `src/entities/marketplace/ui/TimeSlotGrid.tsx` — Time slot grid with 30-min slot generation from availability
- `src/entities/marketplace/ui/BookingBottomSheet.tsx` — 3-step progressive bottom sheet (date → time → confirm)
- `src/features/marketplace/ui/MarketplaceDetailPage.tsx` — Detail page with listing info + Book Now CTA
- `src/entities/marketplace/index.ts` — Updated public barrel with UI component exports
- `src/entities/marketplace/index.server.ts` — Added getProviderRecordForUser re-export
- `src/app/api/marketplace/__tests__/bookings.test.ts` — 7 API tests (CRUD + auth + availability)
- `src/entities/marketplace/__tests__/date-picker.test.tsx` — 7 component tests
- `src/entities/marketplace/__tests__/time-slot-grid.test.tsx` — 7 component tests
- `src/entities/marketplace/__tests__/bottom-sheet.test.tsx` — 7 component tests

## Decisions Made

- TDD RED-GREEN cycle for all 3 tasks (6 atomic commits)
- Re-exported `getProviderRecordForUser` from `@entities/marketplace/server` to pass FSD `no-restricted-imports` lint rule
- Used `<button>` for backdrop instead of `<div>` with onClick for accessibility compliance
- DatePicker test 3 adjusted to be resilient to end-of-month edge cases (current month may have no remaining available dates)
- Availability endpoint uses `sql` template literals for date range filtering (30-day window)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] ESLint restricted-import fix for getProviderRecordForUser**

- **Found during:** Task 1 (GREEN commit)
- **Issue:** Import from `@shared/api/provider-platform` blocked by `no-restricted-imports` ESLint rule
- **Fix:** Re-exported from `@entities/marketplace/server` barrel, imported from there
- **Files modified:** `src/entities/marketplace/index.server.ts`, `src/app/api/service-bookings/route.ts`
- **Committed in:** `55659755`

**2. [Rule 3 - Blocking] FSD deep-import fix for BookingBottomSheet in MarketplaceDetailPage**

- **Found during:** Task 3 (GREEN commit)
- **Issue:** Import from `@entities/marketplace/ui/BookingBottomSheet` blocked by `no-restricted-imports`
- **Fix:** Added exports to public barrel `@entities/marketplace/index.ts`, imported from there
- **Files modified:** `src/entities/marketplace/index.ts`, `src/features/marketplace/ui/MarketplaceDetailPage.tsx`
- **Committed in:** `ea138bc1`

**3. [Rule 1 - Bug] DatePicker test flakiness on end-of-month dates**

- **Found during:** Task 2 (GREEN phase)
- **Issue:** Test expected available date highlights but current month had no remaining available dates
- **Fix:** Adjusted test to navigate to next month before asserting, made assertion resilient
- **Files modified:** `src/entities/marketplace/__tests__/date-picker.test.tsx`
- **Committed in:** `ab083e15`

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 bug)
**Impact on plan:** All fixes necessary for correctness and ESLint compliance. No scope creep.

## Issues Encountered

- Drizzle LEFT JOIN query chain mocking in vitest required custom fluent API mock (`makeChain` function) to handle method chaining properly
- Custom Tailwind arbitrary value classes (`bg-soralia-primary/10`) required careful className matching in tests

## Next Phase Readiness

- Service booking calendar system complete and tested
- Ready for Plan 50-04 (Marketplace listings grid, notifications, swipe cards, payment checkout)
- All 28 tests pass across 4 test files
- No new external dependencies added (D-10: no calendar library)

---

_Phase: 50-service-marketplace_
_Completed: 2026-06-27_
