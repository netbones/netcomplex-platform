---
phase: 50-service-marketplace
plan: 01
subsystem: database
tags: [prisma, drizzle, postgres, notifications, marketplace, feature-flags]

# Dependency graph
requires: []
provides:
  - ServiceBooking Prisma model with ServiceBookingStatus and BookingPaymentStatus enums
  - Notification.category column for MARKETPLACE filtering
  - 8 marketplace notification trigger functions (fire-and-forget)
  - 3 marketplace email templates (Soralia-branded HTML)
  - marketplacePaypal DB-backed feature flag (default false)
  - service-marketplace widget registration in Services space
affects: [50-02-checkout, 50-03-booking, 50-04-marketplace-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'D-12: ServiceBooking model mirrors CommunityServiceInquiry pattern with dedicated table'
    - 'D-02: Notification.category for domain filtering (MARKETPLACE, SYSTEM, COMMUNITY)'
    - 'Feature flag registration: 3-touch pattern (PlatformPageFlags + DEFAULT_PAGE_FLAGS + SETTINGS_KEYS)'
    - 'Notification triggers: createMarketplaceNotification() base helper with try/catch + fire-and-forget Supabase broadcast'

key-files:
  created:
    - src/db/schema/service-bookings.ts
    - src/db/schema/service-booking-status-enum.ts
    - src/db/schema/booking-payment-status-enum.ts
    - src/db/schema/service-bookings-relations.ts
    - src/db/__tests__/schema.test.ts
    - src/entities/marketplace/api/notification-triggers.ts
    - src/shared/api/email/marketplace-templates.ts
    - src/entities/marketplace/__tests__/notification-triggers.test.ts
    - src/entities/marketplace/__tests__/email-templates.test.ts
    - src/features/marketplace/ui/MarketplaceWidget.tsx
    - src/features/marketplace/index.ts
  modified:
    - prisma/schema.prisma
    - src/db/schema/notifications.ts
    - src/db/index.ts
    - src/shared/lib/types/platform-page-flags.ts
    - src/shared/lib/settings/defaults.ts
    - src/entities/tenant/api/settings.ts
    - src/entities/tenant/api/flags/platform-flags.ts
    - src/widgets/dashboard/model/spaces.ts
    - src/widgets/dashboard/ui/ServicesLayer.tsx
    - src/widgets/dashboard/ui/ServicesSubLauncher.tsx
    - src/widgets/dashboard/model/widgets.ts

key-decisions:
  - 'price and platformFee on ServiceBooking are nullable (not .notNull()) — price set at checkout, platformFee calculated server-side'
  - 'prisma-generator-drizzle auto-regenerates Drizzle schema files on prisma db push — manual formatting overwritten'
  - 'MarketplaceWidget initially renders a placeholder — full UI built in Plan 50-04'

patterns-established:
  - 'ServiceBooking Drizzle model: mirrors CommunityServiceInquiry pattern (text PK, timestamps, status enum, tenant isolation)'
  - 'Notification triggers: createMarketplaceNotification() helper inserts DB record with category=MARKETPLACE, broadcasts via Supabase realtime (non-blocking)'
  - 'Email templates: HTML functions returning branded Soralia Village emails, gracefully degrade on missing optional fields'
  - 'Feature flags: 3-touch registration (interface + defaults + settings keys + switch cases + mapFlagToSettingKey)'

requirements-completed:
  - 50-NOTIFY-01
  - 50-NOTIFY-02
  - 50-NOTIFY-03
  - 50-DB-01

# Metrics
duration: 20 min
completed: 2026-06-27
---

# Phase 50 Plan 01: Schema Foundation & Notification Subsystem Summary

**ServiceBooking model, notification category, marketplacePaypal flag, 8 lifecycle notification triggers, 3 branded email templates, and ServicesLayer integration**

## Performance

- **Duration:** 20 min
- **Started:** 2026-06-27T12:56:31Z
- **Completed:** 2026-06-27T13:16:55Z
- **Tasks:** 3
- **Files modified:** 27 (13 created, 14 modified)

## Accomplishments

- ServiceBooking table created in PostgreSQL with 15 columns (D-12), separate from facility Booking table
- Notification.category column added with nullable text type for MARKETPLACE/SYSTEM/COMMUNITY filtering (D-02)
- 8 marketplace notification trigger functions created — all fire-and-forget, category=MARKETPLACE, Supabase realtime broadcast
- 3 marketplace email templates (booking confirmation, inquiry received, payment received) — Soralia-branded HTML
- marketplacePaypal DB-backed feature flag registered with default false (D-07)
- marketplace sub-domain integrated into ServicesLayer domain grid with placeholder widget

## Task Commits

Each task was committed atomically:

1. **Task 1 (tdd RED): ServiceBooking schema tests** — `0ff1f752` (test)
2. **Task 1 (tdd GREEN): ServiceBooking schema + notification category + feature flag** — `863c9a2d` (feat)
3. **Task 2 (tdd RED): Notification triggers + email templates tests** — `1ab3d4a9` (test)
4. **Task 2 (tdd GREEN): Notification triggers + email templates implementation** — `fe048bf3` (feat)
5. **Task 3: ServicesLayer integration + widget registration** — `8f7b4be1` (feat)

_Note: Tasks 1 and 2 followed TDD RED -> GREEN cycle. No REFACTOR commits needed — all code followed existing patterns._

## Files Created/Modified

### Created (13)

- `src/db/schema/service-bookings.ts` — ServiceBooking Drizzle model (15 columns, mirrors CommunityServiceInquiry pattern)
- `src/db/schema/service-booking-status-enum.ts` — pgEnum with 4 statuses (PENDING_CONFIRMATION, CONFIRMED, COMPLETED, CANCELLED)
- `src/db/schema/booking-payment-status-enum.ts` — pgEnum with 3 statuses (PENDING, COMPLETED, REFUNDED)
- `src/db/schema/service-bookings-relations.ts` — Drizzle relations (listing, provider, user)
- `src/db/__tests__/schema.test.ts` — 13 schema verification tests
- `src/entities/marketplace/api/notification-triggers.ts` — 8 trigger functions + createMarketplaceNotification() base helper (220 lines)
- `src/shared/api/email/marketplace-templates.ts` — 3 HTML email template functions (195 lines)
- `src/entities/marketplace/__tests__/notification-triggers.test.ts` — 9 smoke tests for trigger functions
- `src/entities/marketplace/__tests__/email-templates.test.ts` — 13 tests for template rendering
- `src/features/marketplace/ui/MarketplaceWidget.tsx` — Placeholder widget component
- `src/features/marketplace/index.ts` — Barrel export

### Modified (14)

- `prisma/schema.prisma` — Added ServiceBooking model, ServiceBookingStatus/BookingPaymentStatus enums, Notification.category, opposite relations
- `src/db/schema/notifications.ts` — Added category column
- `src/db/index.ts` — Added service-bookings barrel export
- `src/shared/lib/types/platform-page-flags.ts` — Added marketplacePaypal: boolean
- `src/shared/lib/settings/defaults.ts` — Added marketplacePaypal: false
- `src/entities/tenant/api/settings.ts` — Added PAGE_MARKETPLACE_PAYPAL_ENABLED key
- `src/entities/tenant/api/flags/platform-flags.ts` — Added marketplacePaypal switch cases + mapFlagToSettingKey entry
- `src/widgets/dashboard/model/spaces.ts` — Added marketplace to SERVICES_DOMAINS and SERVICES_DOMAIN_WIDGET_MAP
- `src/widgets/dashboard/ui/ServicesLayer.tsx` — Added marketplace DOMAIN_FALLBACKS
- `src/widgets/dashboard/ui/ServicesSubLauncher.tsx` — Added marketplace domain definition
- `src/widgets/dashboard/model/widgets.ts` — Registered service-marketplace widget
- `src/entities/access/resolver.test.ts` — Fixed: added marketplacePaypal to test fixture
- `src/entities/tenant/__tests__/navigation-config.test.ts` — Fixed: added marketplacePaypal to test fixture
- `src/entities/tenant/api/gate/gate.test.ts` — Fixed: added marketplacePaypal to test fixtures (2 locations)

## Decisions Made

- **price/platformFee nullable:** Per plan instruction, ServiceBooking.price and platformFee are nullable (no .notNull()) — price is set at checkout and platformFee is calculated server-side from SubscriptionTier
- **prisma-generator-drizzle auto-formatting:** The generator minifies all Drizzle schema files on `prisma db push`. Manual formatting is overwritten — the generated format is canonical
- **MarketplaceWidget placeholder:** Initially renders a "coming soon" placeholder. Full listing grid and booking UI deferred to Plan 50-04

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Fixed pre-existing test fixtures missing marketplacePaypal**

- **Found during:** Task 3 verification
- **Issue:** Adding marketplacePaypal to PlatformPageFlags interface broke 3 pre-existing test files that construct PlatformPageFlags objects without the new field
- **Fix:** Added `marketplacePaypal: false` to test fixtures in resolver.test.ts, navigation-config.test.ts, and gate.test.ts (4 locations total)
- **Files modified:** src/entities/access/resolver.test.ts, src/entities/tenant/**tests**/navigation-config.test.ts, src/entities/tenant/api/gate/gate.test.ts
- **Verification:** TypeScript compilation succeeds, no marketplacePaypal missing property errors
- **Committed in:** 8f7b4be1

**2. [Rule 2 - Missing Critical] Added opposite relation fields for Prisma validation**

- **Found during:** Task 1 schema validation
- **Issue:** Prisma schema validation required opposite relation fields on user, ServiceProvider, and CommunityServiceListing models for ServiceBooking relations
- **Fix:** Added `serviceBooking ServiceBooking[]` with named relations to all three parent models
- **Files modified:** prisma/schema.prisma
- **Verification:** `npx prisma validate` passes
- **Committed in:** 863c9a2d

**3. [Rule 3 - Blocking] prisma-generator-drizzle overwrote manual Drizzle schema formatting**

- **Found during:** Task 1 DB push
- **Issue:** After `prisma db push`, the generator minified service-bookings.ts and notifications.ts, overwriting manual formatting and initially making price/platformFee .notNull()
- **Fix:** Re-wrote files with correct nullable constraints; accepted generator's formatting as canonical
- **Files modified:** src/db/schema/service-bookings.ts, src/db/schema/notifications.ts
- **Verification:** All 13 schema tests pass
- **Committed in:** 863c9a2d

---

**Total deviations:** 3 auto-fixed (2 missing critical, 1 blocking)
**Impact on plan:** All auto-fixes necessary for correctness. No scope creep.

## Issues Encountered

- ESLint `no-restricted-imports` blocked deep imports from `@entities/tenant/api/` in schema test — resolved by using `@entities/tenant/server` public API path for SETTINGS_KEYS and removing direct mapFlagToSettingKey dependency

## User Setup Required

**External services require manual configuration.** See [50-USER-SETUP.md](./50-USER-SETUP.md) for:

- PAYSTACK_SECRET_KEY (Plan 50-02 checkout)
- RESEND_API_KEY verification (already configured)

## Next Phase Readiness

- ServiceBooking table exists in database — ready for Plan 50-02 checkout API routes
- Notification triggers and email templates are complete — ready for lifecycle integration in 50-02/50-03
- marketplacePaypal flag is registered — ready for PayPal payment gateway in 50-02
- ServicesLayer shows marketplace sub-domain — ready for full listing UI in 50-04
- All 35 tests pass (13 schema + 9 triggers + 13 templates)

---

_Phase: 50-service-marketplace_
_Completed: 2026-06-27_
