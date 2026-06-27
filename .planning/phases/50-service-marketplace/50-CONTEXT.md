# Phase 50: Service Marketplace - Context

**Gathered:** 2026-06-27
**Reviewed:** 2026-06-27 (REVIEW.md findings addressed — D-02 schema fix, D-12 converted to gate, D-09 JSON contract added, D-07 aligned with PlatformPageFlags pattern, D-08 source verified)
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase wires existing infrastructure — community service listings (`CommunityServiceListing`), provider platform (Phase 46), payment gateways (Paystack/PayPal), notification system, and the booking model — into an end-to-end marketplace transaction flow: service discovery → inquiry/booking → payment → notifications. It adds a calendar booking UI with provider-defined availability and mobile-optimized UX for the marketplace surface.

**BD sources (4):** `gtm`, `cp8`, `qx7`, `4vk`
**Dependencies:** None — independent of Community Merits, i18n, OTP, dWallet. Can execute in parallel with Phase 45, 46, and 47.
</domain>

<decisions>
## Implementation Decisions

### Notification System (gtm)

- **D-01:** Full lifecycle marketplace notification triggers — inquiry received (→ provider), inquiry response (→ resident), booking confirmed (→ both), payment received (→ provider), review posted (→ provider), listing approved/rejected (→ provider), booking cancelled (→ provider).
- **D-02:** Reuse existing `Notification` model. `NotificationType` is a severity classifier (`info`, `warning`, `success`, `error`) — do NOT overload it with event-type values. Instead, add a nullable `category` String column to Notification with values `MARKETPLACE`, `SYSTEM`, `COMMUNITY`, etc. Use `payload` JSON for event-specific data (listingId, bookingId, transactionId). The existing notification CRUD API at `src/app/api/notifications/route.ts` already accepts `payload`, so no route changes needed — only schema + trigger code.
- **D-03:** Dedicated marketplace email templates (branded, service imagery, booking details) — distinct from generic notification emails. Uses existing Resend delivery pipeline (`src/shared/api/email/resend.ts`).
- **D-04:** Per-inquiry real-time delivery — each inquiry fires an immediate notification. No batching/daily digest for MVP.

### Checkout & Payment Flow (cp8)

- **D-05:** Pay-at-booking for FIXED-price services — resident pays when booking, payment held in escrow, released to provider on completion. Booking progresses: PENDING_CONFIRMATION → CONFIRMED (on payment).
- **D-06:** Quote → approve → pay flow for HOURLY/QUOTE services — provider submits a quote via inquiry response with price, resident approves, then pays. Uses existing `CommunityServiceInquiry` system.
- **D-07:** Paystack primary gateway for launch (ZAR market via `src/server/payments/paystack.ts`). PayPal gated behind a DB-backed `PlatformPageFlags.marketplacePaypal` flag (follows the existing `PlatformPageFlags` + `Setting` table pattern — NOT env-var-only). The PayPal feature flag defaults to `false` and is only enableable when `PAYPAL_CLIENT_ID` env var is set (runtime guard).
- **D-08:** Reuse Phase 46 tier-based platform fees — source of truth is `SubscriptionTier.platformFeePercent` (default 8.00% in `prisma/schema.prisma:1741`). Confirm the column is seeded before Phase 50 execution. Apply to all marketplace transactions.

### Booking Calendar UX (qx7)

- **D-09:** Provider-defined availability — providers set weekly schedules per listing via the existing `CommunityServiceListing.availability` jsonb field. The facility-based `Booking` model is a different use case and not conflated. **Schema contract:** See specifics section below for the defined JSON shape.
- **D-10:** Custom date picker + time-slot grid built with existing Tailwind CSS and date validation from `bookingSchema`. No new calendar library dependency.
- **D-11:** Book-first-then-pay flow — resident selects available time-slot, booking created in PENDING_CONFIRMATION status, provider confirms, resident pays → status moves to CONFIRMED.
- **D-12:** Dedicated `ServiceBooking` model — new table separate from the facility `Booking` model. Fields: `id`, `tenantId`, `listingId` (→ CommunityServiceListing), `providerId` (→ ServiceProvider), `userId`, `date`, `startTime`, `endTime`, `price`, `paymentStatus` (PENDING/COMPLETED/REFUNDED), `status` (own enum: PENDING_CONFIRMATION → CONFIRMED → COMPLETED → CANCELLED), `createdAt`, `updatedAt`. Mirrors the `CommunityServiceInquiry` pattern already in the schema. The facility `Booking` model stays untouched — no nullable-field leakage, no query gating. Service bookings and facility bookings are distinct domain concepts with different lifecycles.

### Mobile Marketplace UX (4vk)

- **D-13:** Stacked cards with swipe actions on mobile listing pages — single-column card stack, horizontal swipe reveals quick actions (Inquire, Book, Save). Each card shows: image, title, rating, price, provider name, next available slot.
- **D-14:** Bottom sheet booking flow on mobile — tap "Book" opens progressive bottom sheet: date picker → time-slots → confirmation → payment. Full-screen detail page, compact booking overlay.
- **D-15:** Marketplace lives under the existing Services space — no new entry in MobileSpaceBar. ServicesLayer adds a marketplace sub-domain alongside maintenance and bookings.
- **D-16:** 44x44px minimum touch targets on all interactive elements, pull-to-refresh on service listings, iOS safe-area-inset-bottom support on bottom sheet and checkout buttons.

### the agent's Discretion

- Exact email template design for marketplace notifications
- Whether to implement escrow/hold-release payment flow or simpler direct-payment
- Calendar date-picker component architecture (shared component vs. inline)
- Pull-to-refresh implementation approach
- Swipe action gesture library choice (custom CSS transforms vs. library)
- D-12 booking model gate: resolved to Option B (dedicated ServiceBooking model)
  </decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Marketplace Domain

- `src/db/schema/community-service-listings.ts` — `CommunityServiceListing` model (the marketplace listing)
- `src/db/schema/community-service-inquiries.ts` — `CommunityServiceInquiry` model (inquiry system)
- `src/db/schema/community-service-reviews.ts` — Reviews model
- `src/entities/service/model/types.ts` — ServiceCategory, AdditionalService types
- `src/entities/service/model/constants.ts` — SERVICE_MARKETPLACE_CATEGORIES, default categories

### Notifications

- `src/db/schema/notifications.ts` — Notification model + notification-type-enum
- `src/app/api/notifications/route.ts` — Full notification CRUD (374 lines, patterns to follow)
- `src/shared/api/email/resend.ts` — Resend email delivery pipeline

### Payments

- `src/server/payments/paystack.ts` — PaystackService (initialize, verify, refund, webhook)
- `src/server/payments/paypal.ts` — PayPalService (create/capture order, refund, webhook)
- `src/db/schema/payment-transactions.ts` — PaymentTransaction model
- `src/db/schema/provider-subscriptions.ts` — ProviderSubscription model
- `prisma/schema.prisma:1732-1741` — `SubscriptionTier` model with `platformFeePercent` (default 8.00%)
- `.planning/phases/46.1-platform-saas-billing-foundation/46.1-CONTEXT.md` — Billing foundation decisions

### Booking

- `src/db/schema/bookings.ts` — Facility Booking model (untouched — ServiceBooking is a separate table)
- `src/db/schema/community-service-inquiries.ts` — CommunityServiceInquiry model (ServiceBooking mirrors this pattern)
- `src/entities/booking/schema.ts` — bookingSchema Zod validation
- `src/entities/booking/services/index.ts` — getTenantFacilities, createBooking, buildBookingConditions
- `src/entities/booking/model/constants.ts` — PRESET_FACILITIES, FACILITY_LABELS

### Provider Platform

- `.planning/phases/46-provider-platform/46-CONTEXT.md` — Provider registration, verification, billing decisions
- `src/shared/api/provider-platform.ts` — requireProviderAccess, getProviderRecordForUser
- `src/db/schema/service-providers.ts` — ServiceProvider model
- `src/db/schema/provider-verifications.ts` — Verification status workflow

### Feature Flags & Access Control

- `src/shared/lib/types/platform-page-flags.ts` — PlatformPageFlags interface (shared by both gate systems)
- `src/entities/tenant/api/flags/platform-flags.ts` — DB-backed flag system + getPlatformPageFlagsImpl
- `src/shared/lib/settings/defaults.ts` — DEFAULT_PAGE_FLAGS
- `src/app/api/access/route.ts` — Phase 110 canonical access endpoint (5-layer pipeline)
- `src/shared/lib/hooks/usePageAccess.ts` — usePageAccess() + useVisibleSpaces() client hooks
- `src/entities/access/resolver.ts` — resolvePageAccess() pure function
- `src/entities/tenant/api/gate/gate.ts` — canAccess() server-side gate (Phase 41)
- `src/entities/tenant/api/gate/mappings.ts` — FEATURE_TO_MODULE/FLAG/REGISTRY maps
- `src/shared/lib/nav/index.ts` — NAV_REGISTRY, ADMIN_NAV_REGISTRY
- `src/features/provider-registration/ui/RegistrationForm.tsx` — React Hook Form + Zod pattern

### Service UI (existing components to reuse)

- `src/entities/service/ui/ServiceCard.tsx` — Full service card (image, rating, pricing, badges)
- `src/entities/service/ui/PricingDisplay.tsx` — FREE/FIXED/HOURLY/QUOTE display
- `src/entities/service/ui/ReviewStars.tsx` — Star rating component
- `src/widgets/service/ui/ServicesGrid.tsx` — Responsive grid layout (to be enhanced for mobile)
- `src/widgets/service/ui/MyServicesManager.tsx` — Provider listing management (822 lines)
  </canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- **PaystackService / PayPalService** (`src/server/payments/`) — Fully implemented with webhook handlers. Checkout can call `paystack.initializePayment()` directly.
- **Notification CRUD API** (`src/app/api/notifications/route.ts`) — Supports POST with email delivery + Supabase realtime broadcast + idempotency keys. Marketplace triggers reuse this pipeline exactly.
- **Booking validation** (`src/entities/booking/schema.ts`) — Zod schema with date/time validation. Calendar picker can reuse `date >= today` and `startTime < endTime` refines.
- **ServiceCard** (`src/entities/service/ui/ServiceCard.tsx`) — Already has image, badges, rating, pricing, provider info. Mobile enhancement adds swipe actions.
- **MobileSpaceBar** (`src/widgets/dashboard/ui/MobileSpaceBar.tsx`) — Bottom nav pattern with safe-area-inset. New marketplace widgets use existing Services space icon.
- **Resend email** (`src/shared/api/email/resend.ts`) — Email delivery already wired. Marketplace templates follow the same pattern.

### Established Patterns

- **Widget registration:** `registry.register({ component: lazy(...), ... })` in `widgets.ts`
- **API routes:** `withTenant() → session check → Drizzle query → apiSuccess/Error`
- **Forms:** `useForm + zodResolver` pattern (see RegistrationForm, DisputeForm)
- **FSD entity layout:** `src/entities/marketplace/` with `model/`, `ui/`, `api/`, `schema.ts`
- **Feature flag registration:**
  - new flag key → `PlatformPageFlags` interface (`src/shared/lib/types/platform-page-flags.ts`)
  - defaults → `DEFAULT_PAGE_FLAGS` (`src/shared/lib/settings/defaults.ts`)
  - DB mapping → `SETTINGS_KEYS` + switch/case in `getPlatformPageFlagsImpl()` (`src/entities/tenant/api/flags/platform-flags.ts`)
  - Phase 110 `/api/access` automatically picks up new flags via `resolvePageAccess()`
- **Client-side access:** `usePageAccess()` returns `{ spaces, pages, features }` — marketplace nav should use this
- **Server-side gating:** `canAccess(ctx, 'services')` resolves through role → tier → module → flag → registry

### Integration Points

- **Services space** (`SPACES.services`) — Add marketplace widget IDs to widgetIds array
- **Access control** — Services space already gated by `flags.services` via Phase 110 `resolvePageAccess()`
- **Feature flags** — Add `marketplacePaypal` to `PlatformPageFlags` + registration pipeline (DB-backed)
- **Navigation** — Add marketplace items to `SERVICES_DOMAINS` (in `spaces.ts`)
- **Notification model** — Add `category` String column to Notification; use `payload` for event data
- **Booking model** — Gate resolved: dedicated ServiceBooking table (separate from facility Booking)
  </code_context>

<specifics>
## Specific Ideas

- Marketplace email templates should include the service listing image, provider name, booking date/time, and action link back to the listing
- The bottom sheet booking flow should show 3 steps maximum: pick date → pick time → confirm & pay
- Swipe actions on cards: swipe right = "Inquire", swipe left = "Book" (both with icon + color: blue for inquire, green for book)
- Calendar date picker should grey out dates with no availability and highlight dates with available slots in soralia-primary (#4F46E5)
- **Availability JSON contract** (for `CommunityServiceListing.availability`):
  ```json
  {
    "monday": [{ "start": "09:00", "end": "17:00" }],
    "tuesday": [{ "start": "09:00", "end": "17:00" }],
    "wednesday": [{ "start": "09:00", "end": "17:00" }],
    "thursday": [{ "start": "09:00", "end": "17:00" }],
    "friday": [{ "start": "09:00", "end": "17:00" }],
    "saturday": [],
    "sunday": []
  }
  ```
  Days are lowercase. Each day is an array of time ranges. Multiple ranges per day are supported (e.g., `[{start: "09:00", end: "12:00"}, {start: "14:00", end: "17:00"}]`). Empty array = unavailable that day. Time format is 24h "HH:MM".
- PayPal feature flag should default to `false` in `DEFAULT_PAGE_FLAGS` — admin UI shows a runtime guard warning if `PAYPAL_CLIENT_ID` env var is not set
- Platform fees should appear as a line item on the checkout summary (not hidden)
  </specifics>

<deferred>
## Deferred Ideas

- **Instant book for FIXED-price services with defined availability** — currently all bookings go through PENDING_CONFIRMATION. Instant booking (skip provider confirmation) could be added later as a provider setting.
- **Multi-currency support beyond ZAR** — Paystack handles ZAR; PayPal handles international. Full multi-currency exchange rates and display deferred.
- **Provider analytics dashboard** — Phase 46 covers provider registration/verification; marketplace-specific analytics (booking volume, revenue, rating trends) deferred.
- **Automated dunning (failed payment retry)** — Payment failure handling deferred. MVP shows error to user with manual retry.
- **Escrow/hold-release payment model** — Current decision is pay-at-booking; true escrow with hold period and dispute resolution is a separate phase.
- **Marketplace dedicated space in MobileSpaceBar** — Deferred until marketplace adoption metrics justify top-level navigation.
- **Daily digest for inquiries** — Deferred. Per-inquiry real-time is the default; digest can be added as a notification preference later.
  </deferred>

---

_Phase: 50-service-marketplace_
_Context gathered: 2026-06-27_
