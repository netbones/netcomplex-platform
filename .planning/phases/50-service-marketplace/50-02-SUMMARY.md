---
phase: 50-service-marketplace
plan: 02
subsystem: payments
tags: [paystack, paypal, checkout, webhook, platform-fee, marketplace]

# Dependency graph
requires:
  - phase: 50-01
    provides: ServiceBooking model, marketplace entity slice, notification triggers
provides:
  - POST /api/marketplace/checkout for Paystack payment initialization with platform fee
  - POST /api/marketplace/webhook for Paystack charge.success/charge.failed handling
  - calculatePlatformFee() reading from SubscriptionTier.platformFeePercent
  - CheckoutSummary component with visible platform fee line item
affects: [50-03, 50-04, 50-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server-side platform fee calculation from SubscriptionTier (never hardcoded)
    - PayPal runtime guard via PlatformPageFlags.marketplacePaypal + env var
    - Webhook HMAC-SHA512 signature verification + idempotency handling
    - Notification fire-and-forget in webhook handler

key-files:
  created:
    - src/entities/marketplace/schema.ts (Zod schemas)
    - src/entities/marketplace/api/checkout.ts (checkout logic)
    - src/entities/marketplace/ui/CheckoutSummary.tsx (checkout UI)
    - src/entities/marketplace/index.ts (client-safe barrel)
    - src/entities/marketplace/index.server.ts (server barrel)
    - src/app/api/marketplace/checkout/route.ts (API route)
    - src/app/api/marketplace/webhook/route.ts (webhook handler)
    - src/app/api/marketplace/__tests__/checkout.test.ts (API tests)
    - src/entities/marketplace/__tests__/checkout-summary.test.tsx (UI tests)
  modified:
    - src/shared/api/db.ts (add serviceBookings)
    - src/shared/api/server/index.ts (add serviceBookings to barrel)
    - tsconfig.json (add @entities/marketplace/server alias)
    - vitest.config.ts (add @entities/marketplace/server vitest alias)

key-decisions:
  - 'Platform fee percent read from SubscriptionTier.platformFeePercent via Drizzle JOIN — never hardcoded per D-08'
  - 'PayPal gated by both flags.marketplacePaypal (DB-backed) AND process.env.PAYPAL_CLIENT_ID runtime guard per D-07 + Pitfall 2'
  - 'Webhook uses HMAC-SHA512 signature verification via PaystackService.verifyWebhookSignature'
  - 'Fully mocked vitest tests for both API routes and UI component — all gateways mocked, no live API calls'

patterns-established:
  - 'Platform fee calculation: JOIN ProviderSubscription → SubscriptionTier, return 0 if no active sub'
  - 'Checkout flow: auth → validate → tenant isolate → fetch booking → verify ownership → init payment → return URL'
  - 'Webhook flow: verify signature → parse event → extract bookingId → fetch booking → idempotency check → update → notify'

requirements-completed:
  - 50-PAY-01
  - 50-PAY-02
  - 50-PAY-03

# Metrics
duration: 22min
completed: 2026-06-27
---

# Phase 50 Plan 02: Payment Processing Summary

**Checkout API with Paystack initialization, platform fee from SubscriptionTier, PayPal runtime gate, webhook verification, and CheckoutSummary component**

## Performance

- **Duration:** 22 min
- **Started:** 2026-06-27T13:20:00Z
- **Completed:** 2026-06-27T13:42:10Z
- **Tasks:** 3
- **Files modified:** 13 (9 created, 4 modified)

## Accomplishments

- POST /api/marketplace/checkout initializes Paystack payments for FIXED-price services with platform fee calculated server-side
- PayPal checkout gated behind DB-backed marketplacePaypal flag AND PAYPAL_CLIENT_ID env var runtime guard
- Platform fee read from SubscriptionTier.platformFeePercent via Drizzle JOIN — never hardcoded (D-08)
- Webhook handler verifies Paystack HMAC-SHA512 signature, updates booking status idempotently
- CheckoutSummary component displays platform fee as visible line item per D-08 requirements
- All 3 threat mitigations (T-50-07 through T-50-13) implemented per STRIDE register

## Task Commits

Each task was committed atomically:

1. **Task 1: Checkout API Route + Platform Fee + PayPal Gate** - `fea29b11` (feat)
2. **Task 2: Payment Webhook Handler + Booking Status Update** - `7a390ba8` (feat)
3. **Task 3: Checkout Summary Component with Platform Fee Display** - `9e24ef34` (feat)

## Files Created/Modified

- `src/entities/marketplace/schema.ts` - Zod validation schemas (checkoutRequestSchema, serviceBookingSchema)
- `src/entities/marketplace/api/checkout.ts` - Server-side checkout logic (calculatePlatformFee, initializeCheckout, createPaymentTransaction)
- `src/entities/marketplace/ui/CheckoutSummary.tsx` - Client component with price breakdown and platform fee display
- `src/entities/marketplace/index.ts` - Client-safe public API barrel
- `src/entities/marketplace/index.server.ts` - Server-only barrel (checkout, notifications)
- `src/app/api/marketplace/checkout/route.ts` - POST endpoint for payment initialization
- `src/app/api/marketplace/webhook/route.ts` - POST endpoint for Paystack webhook events
- `src/app/api/marketplace/__tests__/checkout.test.ts` - 12 tests (7 checkout + 5 webhook)
- `src/entities/marketplace/__tests__/checkout-summary.test.tsx` - 10 component tests
- `src/shared/api/db.ts` - Added serviceBookings import and export
- `src/shared/api/server/index.ts` - Added serviceBookings to @api/server barrel
- `tsconfig.json` - Added @entities/marketplace/server path alias
- `vitest.config.ts` - Added @entities/marketplace/server vitest alias

## Decisions Made

- Platform fee percentage read from SubscriptionTier.platformFeePercent via Drizzle JOIN — never hardcoded (D-08)
- PayPal gated by both flags.marketplacePaypal (DB-backed) AND process.env.PAYPAL_CLIENT_ID runtime guard (D-07 + Pitfall 2)
- Webhook uses HMAC-SHA512 signature verification via PaystackService.verifyWebhookSignature
- All tests use fully mocked gateways — no live Paystack/PayPal API calls in test suite
- Notification triggers are fire-and-forget in webhook handler — never block the response

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- FSD import restrictions required creating entity server barrels (@entities/marketplace/server)
- Vitest hoisted mock pattern needed for PaystackService in webhook tests
- Drizzle pgEnum TypeScript inference doesn't include 'FAILED' in generated types (pre-existing, worked around with same pattern used elsewhere in codebase)

## User Setup Required

**External services require manual configuration.** See [50-USER-SETUP.md](./50-USER-SETUP.md) for:

- Environment variables to add (PAYSTACK_SECRET_KEY, NEXT_PUBLIC_APP_URL)
- Paystack Dashboard webhook URL configuration
- PayPal optional configuration (gated behind marketplacePaypal flag)

## Next Phase Readiness

- Checkout API and webhook handler ready for integration with 50-03 (Booking Calendar)
- Platform fee calculation reusable across all marketplace transaction flows
- CheckoutSummary component ready for integration into BookingBottomSheet flow (50-04)

---

_Phase: 50-service-marketplace_
_Completed: 2026-06-27_
