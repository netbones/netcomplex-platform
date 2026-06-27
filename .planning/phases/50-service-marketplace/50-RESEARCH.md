# Phase 50: Service Marketplace - Research

**Researched:** 2026-06-27
**Domain:** Multi-feature marketplace: notification triggers, payment checkout, booking calendar, mobile UX
**Confidence:** HIGH

## Summary

Phase 50 wires four existing infrastructure systems (community service listings, provider platform, payment gateways, and notification API) into an end-to-end marketplace transaction flow: service discovery → inquiry/booking → payment → notifications. The phase is additive — it introduces a dedicated `ServiceBooking` model, notification trigger functions, a checkout flow using existing PaystackService/PayPalService, and mobile-optimized UI with swipe gestures and bottom sheets.

**Primary recommendation:** All four sub-features reuse existing infrastructure heavily. Paystack `initializePayment()`, the notification CRUD API, and `ServiceCard` all exist. The primary new code is: (1) a `ServiceBooking` Drizzle model + Prisma migration, (2) notification trigger functions for 7 lifecycle events, (3) a checkout API route calling `PaystackService.initializePayment()`, and (4) mobile UI enhancements (swipe cards, bottom sheet, date picker, time-slot grid). No new external dependencies are required for the core flow.

## Architectural Responsibility Map

| Capability                                  | Primary Tier     | Secondary Tier   | Rationale                                                                                         |
| ------------------------------------------- | ---------------- | ---------------- | ------------------------------------------------------------------------------------------------- |
| Notification trigger dispatch               | API / Backend    | —                | Server-side triggers fire on inquiry/booking/payment lifecycle events; email delivery via Resend  |
| Payment initialization                      | API / Backend    | Browser / Client | Server calls Paystack/PayPal API; client redirects to payment URL                                 |
| Payment webhook handling                    | API / Backend    | —                | Paystack and PayPal call back to server; server verifies signature and updates booking status     |
| Booking calendar date/time selection        | Browser / Client | —                | Custom date picker and time-slot grid rendered client-side; availability data fetched from server |
| ServiceBooking CRUD                         | API / Backend    | —                | Server-authoritative; tenant-scoped Drizzle queries                                               |
| Mobile swipe gestures                       | Browser / Client | —                | Client-side touch handling via react-swipeable or custom CSS transforms                           |
| Bottom sheet booking flow                   | Browser / Client | —                | Progressive disclosure UI rendered client-side                                                    |
| Feature flag resolution (marketplacePaypal) | API / Backend    | Browser / Client | Server resolves flag via PlatformPageFlags; client reads from /api/access                         |

## Standard Stack

### Core (all already in project)

| Library         | Version   | Purpose                                                  | Why Standard                                                    |
| --------------- | --------- | -------------------------------------------------------- | --------------------------------------------------------------- |
| Drizzle ORM     | (project) | ServiceBooking model, marketplace queries                | Already in project; mirrors CommunityServiceInquiry pattern     |
| PaystackService | (project) | Payment initialization, verification, webhooks           | Fully implemented in `src/server/payments/paystack.ts`          |
| Resend          | (project) | Marketplace email delivery                               | Already wired via `src/shared/api/email/resend.ts`              |
| Zod             | (project) | Booking form validation                                  | Already used in `bookingSchema`; reusable date/time refinements |
| Tailwind CSS    | (project) | Date picker, time-slot grid, bottom sheet, mobile layout | Project standard; no new CSS framework needed                   |
| Vitest          | (project) | Unit/integration tests                                   | Project standard; existing test infrastructure                  |

### Supporting (for mobile UX — agent discretion items)

| Library                                    | Version | Purpose                                  | When to Use                                                                                           |
| ------------------------------------------ | ------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `react-swipeable` [VERIFIED: npm registry] | 7.0.2   | Swipe gesture detection on service cards | If swipe actions are implemented via a library (alternatively, custom CSS `transform` + touch events) |

### Alternatives Considered

| Instead of      | Could Use                                    | Tradeoff                                                                                                          |
| --------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| react-swipeable | Custom CSS transforms + touch event handlers | Library handles edge cases (multi-touch, scroll cancellation, velocity thresholds); custom is lighter but brittle |
| react-swipeable | @use-gesture/react                           | More powerful but heavier; overkill for simple left/right swipe on cards                                          |

**Installation:**

```bash
pnpm add react-swipeable   # Only if adopting the library approach for swipe gestures
```

**Version verification:** `react-swipeable@7.0.2` confirmed on npm registry (853k weekly downloads, MIT, FormidableLabs). `resend` already installed in project. `PaystackService` is a project-internal class, not an external package.

## Package Legitimacy Audit

| Package         | Registry | Age    | Downloads | Source Repo                               | Verdict              | Disposition                                     |
| --------------- | -------- | ------ | --------- | ----------------------------------------- | -------------------- | ----------------------------------------------- |
| react-swipeable | npm      | 8+ yrs | 853k/wk   | github.com/FormidableLabs/react-swipeable | OK                   | Approved (optional — agent discretion)          |
| resend          | npm      | 3+ yrs | 7M/wk     | github.com/resend/resend-node             | SUS (recent publish) | Already installed — project dependency, not new |

**Packages removed due to SLOP verdict:** None
**Packages flagged as suspicious SUS:** resend flagged due to very recent publish date (2026-06-26), but it has 7M weekly downloads and is already a project dependency. No action needed.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Full lifecycle marketplace notification triggers — inquiry received, inquiry response, booking confirmed, payment received, review posted, listing approved/rejected, booking cancelled.
- **D-02:** Reuse existing `Notification` model. `NotificationType` is a severity classifier — do NOT overload it with event-type values. Add nullable `category` String column with values `MARKETPLACE`, `SYSTEM`, `COMMUNITY`. Use `payload` JSON for event-specific data.
- **D-03:** Dedicated marketplace email templates — branded, service imagery, booking details. Uses existing Resend delivery pipeline.
- **D-04:** Per-inquiry real-time delivery — each inquiry fires an immediate notification. No batching/daily digest for MVP.
- **D-05:** Pay-at-booking for FIXED-price services — resident pays when booking, payment held, released on completion. Booking progresses: PENDING_CONFIRMATION → CONFIRMED (on payment).
- **D-06:** Quote → approve → pay flow for HOURLY/QUOTE services — provider submits quote via inquiry response with price, resident approves, then pays.
- **D-07:** Paystack primary gateway for launch (ZAR market). PayPal gated behind DB-backed `PlatformPageFlags.marketplacePaypal` flag (follows existing `PlatformPageFlags` + `Setting` table pattern). PayPal flag defaults to `false`, only enableable when `PAYPAL_CLIENT_ID` env var is set.
- **D-08:** Reuse Phase 46 tier-based platform fees — source of truth is `SubscriptionTier.platformFeePercent` (default 8.00% in prisma). **[VERIFIED: prisma/schema.prisma:1741 — `@default(8.00) @db.Decimal(5, 2)`]**
- **D-09:** Provider-defined availability — providers set weekly schedules per listing via `CommunityServiceListing.availability` jsonb. JSON contract defined in CONTEXT.md.
- **D-10:** Custom date picker + time-slot grid built with existing Tailwind CSS and date validation from `bookingSchema`. No new calendar library dependency.
- **D-11:** Book-first-then-pay flow — resident selects available time-slot, booking created in PENDING_CONFIRMATION status, provider confirms, resident pays → CONFIRMED.
- **D-12:** Dedicated `ServiceBooking` model — new table separate from facility `Booking`. Mirrors `CommunityServiceInquiry` pattern. Facility `Booking` stays untouched.
- **D-13:** Stacked cards with swipe actions on mobile listing pages — single-column card stack, horizontal swipe reveals quick actions (Inquire, Book, Save).
- **D-14:** Bottom sheet booking flow on mobile — tap "Book" opens progressive bottom sheet: date picker → time-slots → confirmation → payment.
- **D-15:** Marketplace lives under existing Services space — no new entry in MobileSpaceBar. ServicesLayer adds marketplace sub-domain.
- **D-16:** 44x44px minimum touch targets on all interactive elements, pull-to-refresh on service listings, iOS safe-area-inset-bottom support.

### the agent's Discretion

- Exact email template design for marketplace notifications
- Whether to implement escrow/hold-release payment flow or simpler direct-payment
- Calendar date-picker component architecture (shared component vs. inline)
- Pull-to-refresh implementation approach
- Swipe action gesture library choice (custom CSS transforms vs. library)
- D-12 booking model gate: resolved to Option B (dedicated ServiceBooking model)

### Deferred Ideas (OUT OF SCOPE)

- Instant book for FIXED-price services
- Multi-currency support beyond ZAR
- Provider analytics dashboard
- Automated dunning (failed payment retry)
- Escrow/hold-release payment model
- Marketplace dedicated space in MobileSpaceBar
- Daily digest for inquiries

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       BROWSER / CLIENT                          │
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────────┐   │
│  │ Service Cards │   │  Bottom Sheet │   │ Date Picker +      │   │
│  │ (swipe)       │──▶│  Booking Flow │──▶│ Time-Slot Grid     │   │
│  └──────────────┘   └──────────────┘   └─────────┬──────────┘   │
│                                                    │             │
│  ┌──────────────────────────────────────────────────┼──────┐    │
│  │              Checkout Summary (platform fee)     │      │    │
│  └──────────────────────────────────────────────────┼──────┘    │
└─────────────────────────────────────────────────────┼───────────┘
                                                      │
                    ┌─────────────────────────────────┼───────────┐
                    │           API / BACKEND         │           │
                    │                                  ▼           │
                    │  ┌──────────────────────────────────────┐   │
                    │  │        /api/marketplace/checkout       │   │
                    │  │  (PaystackService.initializePayment)   │   │
                    │  └──────────────┬───────────────────────┘   │
                    │                 │                            │
                    │  ┌──────────────┼───────────────────────┐   │
                    │  │   Notification Triggers (7 events)   │   │
                    │  │   inquiry → booking → payment → ...  │   │
                    │  └──────────────┼───────────────────────┘   │
                    │                 │                            │
                    │  ┌──────────────┼───────────────────────┐   │
                    │  │    Payment Webhook Handler            │   │
                    │  │  (verify → update booking → notify)   │   │
                    │  └──────────────────────────────────────┘   │
                    └──────────────────┬──────────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────┐
        │         EXTERNAL             │                      │
        │  ┌──────────┐  ┌──────────┐  │  ┌──────────────┐   │
        │  │ Paystack │  │  PayPal  │  │  │   Resend     │   │
        │  │ (ZAR)    │  │(gated)   │  │  │ (email tmpl) │   │
        │  └──────────┘  └──────────┘  │  └──────────────┘   │
        └──────────────────────────────┴──────────────────────┘
```

### Recommended Project Structure

```
src/
├── db/schema/
│   └── service-bookings.ts           # NEW: ServiceBooking model (Drizzle)
├── entities/
│   └── marketplace/                  # NEW FSD entity slice
│       ├── model/
│       │   ├── types.ts              # ServiceBookingDTO, BookingStatus enum
│       │   └── constants.ts          # BOOKING_STATUS_TRANSITIONS
│       ├── ui/
│       │   ├── ServiceCardSwipeable.tsx   # Enhanced ServiceCard with swipe
│       │   ├── BookingBottomSheet.tsx     # Progressive bottom sheet
│       │   ├── DatePicker.tsx             # Custom date picker (no library)
│       │   ├── TimeSlotGrid.tsx           # Time slot selection grid
│       │   ├── CheckoutSummary.tsx        # Price + platform fee display
│       │   └── PullToRefresh.tsx          # Pull-to-refresh wrapper
│       ├── api/
│       │   ├── notification-triggers.ts   # 7 marketplace trigger functions
│       │   ├── checkout.ts               # Checkout API logic
│       │   └── availability.ts           # Availability query helpers
│       └── schema.ts                     # Zod schemas (bookingSchemaMarketplace)
├── app/api/
│   ├── marketplace/
│   │   ├── checkout/route.ts            # POST — initialize payment
│   │   ├── bookings/route.ts            # GET/POST — list/create ServiceBookings
│   │   └── webhook/route.ts             # POST — Paystack/PayPal webhook handler
│   └── services/
│       └── [id]/availability/route.ts   # GET — provider availability
├── widgets/
│   └── service/
│       └── ui/
│           └── MarketplaceWidget.tsx     # NEW: Marketplace widget for Services space
└── shared/
    └── lib/types/
        └── platform-page-flags.ts        # ADD: marketplacePaypal boolean
```

### Pattern 1: ServiceBooking Model (mirrors CommunityServiceInquiry)

**What:** New Drizzle model following the exact pattern of `CommunityServiceInquiry` — text primary key, timestamps, status enum, tenant isolation.

**When to use:** For the new `ServiceBooking` table.

**Example:**

```typescript
// src/db/schema/service-bookings.ts
import { pgTable, text, timestamp, decimal, date } from 'drizzle-orm/pg-core';
import { serviceBookingStatusEnum } from './service-booking-status-enum';
import { bookingPaymentStatusEnum } from './booking-payment-status-enum';

export const serviceBookings = pgTable('ServiceBooking', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  listingId: text('listingId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull(),
  date: date('date').notNull(),
  startTime: text('startTime').notNull(), // "HH:MM" 24h
  endTime: text('endTime').notNull(), // "HH:MM" 24h
  price: decimal('price', { precision: 65, scale: 30 }).notNull(),
  platformFee: decimal('platformFee', { precision: 65, scale: 30 }).notNull(),
  paymentStatus: bookingPaymentStatusEnum('paymentStatus').default('PENDING').notNull(),
  status: serviceBookingStatusEnum('status').default('PENDING_CONFIRMATION').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
```

### Pattern 2: Feature Flag Registration (marketplacePaypal)

**What:** Three-file registration pattern for adding a DB-backed feature flag.

**When to use:** Adding `marketplacePaypal` to PlatformPageFlags.

**Registration steps (3 files):**

1. `PlatformPageFlags` interface → add `marketplacePaypal: boolean`
2. `DEFAULT_PAGE_FLAGS` → add `marketplacePaypal: false`
3. `SETTINGS_KEYS` → add `MARKETPLACE_PAYPAL: 'marketplace_paypal'`
4. `getPlatformPageFlagsImpl()` switch case → add case for the new key
5. `mapFlagToSettingKey()` → add mapping entry

### Pattern 3: Notification Trigger Function

**What:** Async server-side function that creates a notification record and optionally sends email via Resend.

**When to use:** Each of the 7 marketplace lifecycle events.

**Example:**

```typescript
// src/entities/marketplace/api/notification-triggers.ts
import { db, notifications, sendEmail, templates } from '@api/server';

export async function notifyInquiryReceived(params: {
  tenantId: string;
  providerId: string;
  listingId: string;
  listingTitle: string;
  inquirerName: string;
}) {
  const [notification] = await db
    .insert(notifications)
    .values({
      id: crypto.randomUUID(),
      tenantId: params.tenantId,
      userId: params.providerId,
      title: `New inquiry on "${params.listingTitle}"`,
      message: `${params.inquirerName} has sent an inquiry about your service.`,
      type: 'info',
      category: 'MARKETPLACE',
      payload: { listingId: params.listingId, event: 'inquiry_received' },
      link: `/dashboard/providers/inquiries`,
    })
    .returning();

  // Email via Resend (async, non-blocking)
  sendEmail({
    /* marketplace template */
  }).catch(() => {});
}
```

### Anti-Patterns to Avoid

- **Overloading NotificationType:** Do NOT add `'booking_confirmed'`, `'payment_received'` etc. to the `NotificationType` enum. It is a severity classifier (`info`/`warning`/`success`/`error`). Use the `category` column for `'MARKETPLACE'`. **[D-02 — LOCKED]**
- **Conflating facility Booking with ServiceBooking:** The facility `Booking` model and `ServiceBooking` are separate tables with different lifecycles. No nullable-field leakage between them. **[D-12 — LOCKED]**
- **Direct DB access from client for availability:** Availability queries must go through API routes with tenant isolation. The `CommunityServiceListing.availability` JSONB field is read server-side.
- **Synchronous email in request path:** Notification emails must fire-and-forget (`.catch(() => {})`). Blocking the API response on Resend delivery adds unnecessary latency.
- **Hardcoding platform fee:** Always read `SubscriptionTier.platformFeePercent` from the provider's subscription tier. Never hardcode `8.00%`. **[VERIFIED: prisma/schema.prisma:1741 — `@default(8.00)`]**

## Don't Hand-Roll

| Problem                     | Don't Build                                             | Use Instead                                                                       | Why                                                                                   |
| --------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Swipe gesture detection     | Custom touch event state machine with velocity tracking | `react-swipeable` (or simple CSS `transform` + `onTouchEnd`)                      | Library handles edge cases: scroll cancellation, multi-touch, threshold configuration |
| Payment gateway integration | Custom HTTP client for Paystack/PayPal                  | Existing `PaystackService` / `PayPalService` in `src/server/payments/`            | Already implements initialize, verify, webhook signature, refund. Battle-tested.      |
| Email delivery              | Raw SMTP client                                         | Existing `sendEmail()` in `src/shared/api/email/resend.ts`                        | Already wired with Resend SDK, retry logic, environment config                        |
| Date/time validation        | Custom date string parsing                              | Existing `bookingSchema` Zod refinements (`startTime < endTime`, `date >= today`) | Already validated, regex-tested for `HH:MM` 24h format                                |
| Feature flag infrastructure | Inline env var checks                                   | Existing `PlatformPageFlags` + `Setting` table pattern                            | DB-backed, cached, Phase 110 `/api/access` compatible                                 |
| Bottom sheet component      | Custom positioning math with viewport units             | Tailwind fixed positioning + `translate-y` transitions                            | `fixed bottom-0`, `transition-transform`, `h-[85vh]` — simple, no library needed      |
| Pull-to-refresh             | Custom touch-pull physics                               | CSS `overscroll-behavior` + `touch-action: pan-y` with a refresh indicator        | Native-feeling with minimal JS; or simple `onTouchMove` threshold                     |

**Key insight:** This phase wires existing infrastructure. The PaystackService, notification API, Resend pipeline, and ServiceCard are all battle-tested. The primary new code concerns the `ServiceBooking` model (Drizzle + Prisma migration), notification trigger functions (7 lifecycle events), a checkout API route, and mobile UI components. No external payment SDK, calendar library, or notification service needs to be introduced.

## Common Pitfalls

### Pitfall 1: Forgetting Prisma Migration for category Column

**What goes wrong:** Drizzle schema adds `category` to notifications but Prisma migration is forgotten, causing drift between Drizzle and Prisma.
**Why it happens:** Project uses dual Prisma+Drizzle setup. Both must stay in sync.
**How to avoid:** After adding `category: text('category')` to Drizzle `notifications.ts`, run `npx prisma migrate dev --name add_notification_category` to generate the Prisma migration.
**Warning signs:** `prisma migrate status` shows drift after Drizzle schema change.

### Pitfall 2: PayPal Runtime Guard Not Checking Env Var

**What goes wrong:** Admin enables `marketplacePaypal` flag but `PAYPAL_CLIENT_ID` is not set → runtime errors on checkout.
**Why it happens:** Flag is DB-backed; env var check must be a separate runtime guard.
**How to avoid:** Checkout route checks `if (flags.marketplacePaypal && !process.env.PAYPAL_CLIENT_ID) { return apiError(...) }`. Admin UI shows warning when flag is on but env var is missing.
**Warning signs:** 500 errors on PayPal checkout path after flag is enabled.

### Pitfall 3: ServiceBooking and Facility Booking Query Collision

**What goes wrong:** A query accidentally joins or filters across both booking tables, producing incorrect results.
**Why it happens:** Both tables have similar fields (`date`, `startTime`, `endTime`, `status`).
**How to avoid:** Use separate Drizzle query files. Never import both `bookings` (facility) and `serviceBookings` in the same query function. Name API routes distinctly: `/api/marketplace/bookings` vs `/api/bookings`.
**Warning signs:** Cross-contamination in booking lists — facility bookings appearing in marketplace views or vice versa.

### Pitfall 4: Platform Fee Not Pulled from SubscriptionTier

**What goes wrong:** Platform fee is hardcoded at 8% instead of reading from provider's `SubscriptionTier.platformFeePercent`.
**Why it happens:** The default is 8.00%, so hardcoding "works" initially but breaks when a provider has a custom tier.
**How to avoid:** On checkout, query: `SELECT st.platformFeePercent FROM ProviderSubscription ps JOIN SubscriptionTier st ON ps.tierId = st.id WHERE ps.providerId = $1 AND ps.status = 'ACTIVE'`. Fall back to 0 if no active subscription.
**Warning signs:** Provider on ENTERPRISE tier (with negotiated lower fee) still sees 8% on checkout.

### Pitfall 5: Swipe Actions Firing During Scroll

**What goes wrong:** Vertical scroll on the service listing page triggers horizontal swipe actions on cards.
**Why it happens:** Touch events fire for both scroll and swipe; without a direction lock, a diagonal swipe triggers unintended actions.
**How to avoid:** If using `react-swipeable`, configure `delta` (minimum px before swipe fires, e.g., 40px) and `preventScrollOnSwipe`. If using custom CSS, use `touch-action: pan-y` on the scroll container and only interpret horizontal touch deltas exceeding a threshold.
**Warning signs:** Cards triggering Inquire/Book actions while user is scrolling down the page.

## Code Examples

### Checkout API Route (D-05: Pay-at-booking)

```typescript
// src/app/api/marketplace/checkout/route.ts
import { PaystackService } from '@/server/payments/paystack';
import { db, serviceBookings, apiSuccess, apiError } from '@api/server';
import { eq } from 'drizzle-orm';

const paystack = new PaystackService();

export async function POST(request: Request) {
  const { tenantId, userId } = await getSessionAndUserId(request); // project pattern
  const { bookingId } = await request.json();

  const booking = await db
    .select()
    .from(serviceBookings)
    .where(eq(serviceBookings.id, bookingId))
    .limit(1);

  if (!booking[0]) return apiError('NOT_FOUND', 404, 'Booking not found');

  const result = await paystack.initializePayment({
    reference: `svc-${bookingId}`,
    email: userEmail,
    amount: Number(booking[0].price) + Number(booking[0].platformFee),
    currency: 'ZAR',
    callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/services/booking/${bookingId}/confirm`,
    metadata: { bookingId, tenantId },
  });

  if (result.status !== 'ready') {
    return apiError('INTERNAL_ERROR', 500, result.message || 'Payment initialization failed');
  }

  return apiSuccess({ paymentUrl: result.paymentUrl, reference: result.reference });
}
```

### Custom Date Picker (D-10: No external library)

```typescript
// src/entities/marketplace/ui/DatePicker.tsx
'use client';

import { useState, useMemo } from 'react';

interface DatePickerProps {
  availability: Record<string, { start: string; end: string }[]>;
  onSelect: (date: string) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function DatePicker({ availability, onSelect }: DatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = new Date().toISOString().split('T')[0];

  const days = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: { date: string; available: boolean; isPast: boolean }[] = [];

    for (let i = 0; i < firstDay; i++) result.push({ date: '', available: false, isPast: true });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayName = DAY_NAMES[new Date(year, month, d).getDay()].toLowerCase();
      const hasSlots = (availability[dayName]?.length || 0) > 0;
      result.push({ date: dateStr, available: hasSlots, isPast: dateStr < today });
    }
    return result;
  }, [currentMonth, availability, today]);

  return (
    <div className="p-4">
      {/* Month navigation */}
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="p-2 min-w-[44px] min-h-[44px]">←</button>
        <h3 className="font-semibold">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="p-2 min-w-[44px] min-h-[44px]">→</button>
      </div>
      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_NAMES.map(d => <div key={d} className="text-center text-xs text-gray-500 py-1">{d}</div>)}
        {days.map((d, i) => (
          <button key={i}
            disabled={!d.available || d.isPast}
            onClick={() => d.available && onSelect(d.date)}
            className={`min-w-[44px] min-h-[44px] rounded-lg text-sm
              ${!d.date ? 'invisible' : ''}
              ${d.isPast ? 'text-gray-300 cursor-not-allowed' : ''}
              ${!d.available && !d.isPast ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : ''}
              ${d.available ? 'bg-soralia-primary/10 text-soralia-primary hover:bg-soralia-primary/20 font-medium' : ''}
            `}
          >
            {d.date ? parseInt(d.date.split('-')[2]) : ''}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Bottom Sheet Booking Flow (D-14)

```typescript
// src/entities/marketplace/ui/BookingBottomSheet.tsx
'use client';

import { useState } from 'react';
import { DatePicker } from './DatePicker';
import { TimeSlotGrid } from './TimeSlotGrid';
import { CheckoutSummary } from './CheckoutSummary';

type Step = 'date' | 'time' | 'confirm';

export function BookingBottomSheet({ listing, isOpen, onClose }: Props) {
  const [step, setStep] = useState<Step>('date');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl
                      max-h-[85vh] overflow-y-auto
                      pb-[env(safe-area-inset-bottom,16px)]
                      transition-transform duration-300">
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto my-3" />

        {/* Step indicator */}
        <div className="flex justify-center gap-2 mb-4">
          {(['date', 'time', 'confirm'] as Step[]).map((s, i) => (
            <div key={s} className={`w-2 h-2 rounded-full ${
              step === s ? 'bg-soralia-primary' : i < ['date','time','confirm'].indexOf(step) ? 'bg-green-400' : 'bg-gray-300'
            }`} />
          ))}
        </div>

        {/* Step content */}
        <div className="px-4 pb-6">
          {step === 'date' && (
            <DatePicker
              availability={listing.availability}
              onSelect={(date) => { setSelectedDate(date); setStep('time'); }}
            />
          )}
          {step === 'time' && selectedDate && (
            <TimeSlotGrid
              availability={listing.availability}
              date={selectedDate}
              onSelect={(slot) => { setSelectedSlot(slot); setStep('confirm'); }}
              onBack={() => setStep('date')}
            />
          )}
          {step === 'confirm' && selectedDate && selectedSlot && (
            <CheckoutSummary
              listing={listing}
              date={selectedDate}
              slot={selectedSlot}
              onBack={() => setStep('time')}
            />
          )}
        </div>
      </div>
    </>
  );
}
```

## State of the Art

| Old Approach                           | Current Approach                                                | When Changed    | Impact                                                                             |
| -------------------------------------- | --------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------- |
| WCAG 2.1 touch target (none specified) | WCAG 2.2 SC 2.5.8 Target Size Minimum: 24×24 CSS pixels (AA)    | Oct 2023        | 44×44px (Phase 50 D-16) exceeds this, matching Apple HIG recommendation            |
| Inline env-var feature gates           | DB-backed PlatformPageFlags + `Setting` table (Phase 22/41/110) | Milestone 2–4   | `marketplacePaypal` follows this established pattern                               |
| Monolithic notification payload        | category column + JSON payload for event-specific data          | Phase 50 (D-02) | Cleaner separation of severity (type) vs domain (category) vs event data (payload) |

**Deprecated/outdated:**

- **`react-swipeable-views`:** v0.14.2, no README, only maintained for legacy MUI compatibility. Use `react-swipeable` instead which is actively maintained.
- **`@use-gesture/react`:** Overkill for simple left/right card swipes. Its spring physics and multi-gesture composition are better suited for complex interactive canvases.

## Runtime State Inventory

> Phase 50 is primarily a greenfield feature phase (new models, new API routes, new UI components). The Notification model receives a new `category` column, but no existing data needs migration. No rename/refactor/migration is involved.

| Category            | Items Found                                                                                                                                                          | Action Required                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Stored data         | None — new ServiceBooking table, no existing data migration                                                                                                          | None                                                               |
| Live service config | Resend API key in .env; Paystack/PayPal keys may need configuration                                                                                                  | Verify Paystack key is configured for test mode during development |
| OS-registered state | None                                                                                                                                                                 | None                                                               |
| Secrets/env vars    | `RESEND_API_KEY` configured; `PAYSTACK_SECRET_KEY` status unknown (`.env.example` shows RESEND only); `PAYPAL_CLIENT_ID` not configured (expected for gated feature) | Check Paystack key before checkout testing; PayPal key optional    |
| Build artifacts     | None affected                                                                                                                                                        | None                                                               |

## Environment Availability

| Dependency   | Required By                      | Available          | Version   | Fallback                                                                 |
| ------------ | -------------------------------- | ------------------ | --------- | ------------------------------------------------------------------------ |
| Node.js      | Build, runtime                   | ✓                  | v24.10.0  | —                                                                        |
| pnpm         | Package management               | ✓                  | 10.33.0   | —                                                                        |
| Paystack API | Payment initialization (primary) | Unknown            | —         | Depends on `PAYSTACK_SECRET_KEY` env var; verify before checkout testing |
| PayPal API   | Payment initialization (gated)   | Unknown            | —         | Gated behind `marketplacePaypal` flag; not needed for MVP                |
| Resend API   | Email delivery                   | ✓ (key configured) | —         | Already configured in `.env`                                             |
| Vitest       | Testing                          | ✓                  | (project) | —                                                                        |

**Missing dependencies with no fallback:**

- **Paystack secret key:** Must be configured in `.env` as `PAYSTACK_SECRET_KEY` before checkout testing. If not set, `PaystackService` returns `status: 'configuration_required'` gracefully.

**Missing dependencies with fallback:**

- **PayPal credentials:** Gated behind `marketplacePaypal` flag (defaults to `false`). Not needed for MVP.

## Validation Architecture

### Test Framework

| Property           | Value                                      |
| ------------------ | ------------------------------------------ |
| Framework          | Vitest (project standard)                  |
| Config file        | `vitest.config.ts`                         |
| Quick run command  | `npx vitest run src/entities/marketplace/` |
| Full suite command | `npx vitest run`                           |

### Phase Requirements → Test Map

| Req ID       | Behavior                                                                            | Test Type        | Automated Command                                                                                        | File Exists? |
| ------------ | ----------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------- | ------------ |
| 50-NOTIFY-01 | Inquiry received triggers notification to provider with category=MARKETPLACE        | unit             | `npx vitest run src/entities/marketplace/__tests__/notification-triggers.test.ts -t "inquiry"`           | ❌ Wave 0    |
| 50-NOTIFY-02 | Booking confirmed notification sent to both parties with booking details in payload | unit             | `npx vitest run src/entities/marketplace/__tests__/notification-triggers.test.ts -t "booking confirmed"` | ❌ Wave 0    |
| 50-NOTIFY-03 | Marketplace email template renders service image, provider name, booking date/time  | unit             | `npx vitest run src/entities/marketplace/__tests__/email-templates.test.ts`                              | ❌ Wave 0    |
| 50-PAY-01    | Checkout initializes Paystack payment for FIXED-price service with platform fee     | integration      | `npx vitest run src/app/api/marketplace/__tests__/checkout.test.ts -t "paystack initialize"`             | ❌ Wave 0    |
| 50-PAY-02    | PayPal checkout returns configuration_required when flag is false                   | integration      | `npx vitest run src/app/api/marketplace/__tests__/checkout.test.ts -t "paypal gated"`                    | ❌ Wave 0    |
| 50-PAY-03    | Platform fee appears as line item on checkout summary                               | unit             | `npx vitest run src/entities/marketplace/__tests__/checkout-summary.test.tsx`                            | ❌ Wave 0    |
| 50-BOOK-01   | ServiceBooking created with PENDING_CONFIRMATION status                             | integration      | `npx vitest run src/app/api/marketplace/__tests__/bookings.test.ts -t "create booking"`                  | ❌ Wave 0    |
| 50-BOOK-02   | Date picker greys out dates with no availability                                    | unit             | `npx vitest run src/entities/marketplace/__tests__/date-picker.test.tsx`                                 | ❌ Wave 0    |
| 50-BOOK-03   | Time-slot grid shows available slots for selected date                              | unit             | `npx vitest run src/entities/marketplace/__tests__/time-slot-grid.test.tsx`                              | ❌ Wave 0    |
| 50-MOB-01    | Swipe left reveals "Book" action with green indicator                               | component        | `npx vitest run src/entities/marketplace/__tests__/swipe-card.test.tsx`                                  | ❌ Wave 0    |
| 50-MOB-02    | Bottom sheet opens with date picker → time-slots → confirmation (3 steps max)       | component        | `npx vitest run src/entities/marketplace/__tests__/bottom-sheet.test.tsx`                                | ❌ Wave 0    |
| 50-MOB-03    | All interactive elements have minimum 44x44px touch targets                         | component / a11y | Manual check + axe-core audit                                                                            | ❌ Wave 0    |
| 50-MOB-04    | Pull-to-refresh triggers on service listings page                                   | component / e2e  | Playwright test on mobile viewport                                                                       | ❌ Wave 0    |
| 50-DB-01     | ServiceBooking table exists separate from facility Booking table                    | schema           | `npx vitest run src/db/__tests__/schema.test.ts -t "ServiceBooking"`                                     | ❌ Wave 0    |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose` (scoped to changed files)
- **Per wave merge:** `npx vitest run` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/entities/marketplace/__tests__/notification-triggers.test.ts` — covers all 7 lifecycle notification triggers
- [ ] `src/entities/marketplace/__tests__/email-templates.test.ts` — marketplace Resend template rendering
- [ ] `src/app/api/marketplace/__tests__/checkout.test.ts` — checkout API with Paystack mock
- [ ] `src/app/api/marketplace/__tests__/bookings.test.ts` — ServiceBooking CRUD
- [ ] `src/entities/marketplace/__tests__/date-picker.test.tsx` — date picker component
- [ ] `src/entities/marketplace/__tests__/time-slot-grid.test.tsx` — time slot grid
- [ ] `src/entities/marketplace/__tests__/bottom-sheet.test.tsx` — bottom sheet flow
- [ ] `src/entities/marketplace/__tests__/swipe-card.test.tsx` — swipe card component
- [ ] `src/entities/marketplace/__tests__/checkout-summary.test.tsx` — checkout summary with platform fee
- [ ] `src/db/__tests__/schema.test.ts` — schema verification (ServiceBooking table)
- [ ] Framework install: `pnpm add -D @testing-library/react @testing-library/jest-dom` — if not already installed for component tests

## Security Domain

### Applicable ASVS Categories

| ASVS Category         | Applies                 | Standard Control                                                                                                                 |
| --------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| V2 Authentication     | Yes (checkout, booking) | Better Auth session via `getSessionAndUserId()` at API route entry                                                               |
| V3 Session Management | Yes                     | Better Auth session check on all marketplace API routes                                                                          |
| V4 Access Control     | Yes                     | `withTenant()` for tenant isolation; user-scoped booking queries                                                                 |
| V5 Input Validation   | Yes                     | Zod schemas for booking form, checkout request; Paystack signature verification                                                  |
| V6 Cryptography       | Yes                     | Paystack HMAC-SHA512 webhook signature verification (existing in `PaystackService.verifyWebhookSignature`)                       |
| V7 Error Handling     | Yes                     | `apiError()` with canonical error codes; no stack traces in production responses                                                 |
| V8 Data Protection    | Yes                     | Tenant-scoped queries via `eq(serviceBookings.tenantId, tenantId)`                                                               |
| V9 Communication      | N/A                     | Paystack/PayPal use HTTPS; no direct client-to-gateway communication                                                             |
| V10 Malicious Code    | N/A                     | No user-uploaded content in marketplace flow                                                                                     |
| V11 Business Logic    | Yes                     | Booking state machine enforcement (PENDING_CONFIRMATION → CONFIRMED → COMPLETED → CANCELLED); platform fee calculation integrity |
| V12 Files             | N/A                     | No file uploads in marketplace flow                                                                                              |

### Known Threat Patterns for Marketplace + Payment Stack

| Pattern                                                                            | STRIDE                 | Standard Mitigation                                                                                               |
| ---------------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Payment callback forgery (attacker crafts fake webhook)                            | Spoofing               | Paystack HMAC-SHA512 signature verification; PayPal webhook verification via PayPal API                           |
| IDOR on booking operations (user modifies another user's booking)                  | Tampering              | All queries filter by `userId` from session AND `tenantId` from `withTenant()`                                    |
| Double-spend (attacker replays successful payment callback)                        | Repudiation            | Idempotency key on notification creation; Paystack reference uniqueness                                           |
| Price manipulation (attacker modifies price in checkout request)                   | Tampering              | Server computes price from listing price + platform fee; never trusts client-submitted amount                     |
| Provider impersonation (attacker creates booking for another provider's listing)   | Spoofing               | `providerId` set from listing owner, not from request body; verified against `CommunityServiceListing.providerId` |
| Booking slot double-booking (two users book the same time slot)                    | Denial of Service      | Check availability at checkout time; unique constraint on `(listingId, date, startTime)` with status != CANCELLED |
| Platform fee bypass (attacker submits checkout without fee)                        | Tampering              | Platform fee calculated server-side from `SubscriptionTier.platformFeePercent`; never from client input           |
| Email enumeration through booking flow (attacker tests which emails have accounts) | Information Disclosure | Return generic "Booking created" response regardless of whether provider exists; notification delivery is async   |

## Sources

### Primary (HIGH confidence)

- `src/db/schema/notifications.ts` — Notification Drizzle model [VERIFIED: codebase]
- `src/db/schema/community-service-listings.ts` — CommunityServiceListing model [VERIFIED: codebase]
- `src/db/schema/community-service-inquiries.ts` — CommunityServiceInquiry model (pattern for ServiceBooking) [VERIFIED: codebase]
- `src/db/schema/payment-transactions.ts` — PaymentTransaction model [VERIFIED: codebase]
- `src/db/schema/provider-subscriptions.ts` — ProviderSubscription model [VERIFIED: codebase]
- `src/server/payments/paystack.ts` — PaystackService (247 lines, fully implemented) [VERIFIED: codebase]
- `src/server/payments/paypal.ts` — PayPalService (286 lines, fully implemented) [VERIFIED: codebase]
- `src/app/api/notifications/route.ts` — Notification CRUD API (374 lines, patterns confirmed) [VERIFIED: codebase]
- `src/shared/api/email/resend.ts` — Resend email delivery pipeline [VERIFIED: codebase]
- `src/entities/booking/schema.ts` — bookingSchema Zod validation (date/time refinements) [VERIFIED: codebase]
- `src/entities/service/ui/ServiceCard.tsx` — ServiceCard component (174 lines) [VERIFIED: codebase]
- `src/entities/service/ui/PricingDisplay.tsx` — Pricing display (FREE/FIXED/HOURLY/QUOTE) [VERIFIED: codebase]
- `src/widgets/service/ui/ServicesGrid.tsx` — Responsive grid layout [VERIFIED: codebase]
- `src/shared/lib/types/platform-page-flags.ts` — PlatformPageFlags interface [VERIFIED: codebase]
- `src/shared/lib/settings/defaults.ts` — DEFAULT_PAGE_FLAGS [VERIFIED: codebase]
- `src/entities/tenant/api/settings.ts` — SETTINGS_KEYS object [VERIFIED: codebase]
- `src/entities/tenant/api/flags/platform-flags.ts` — Feature flag registration pipeline (311 lines) [VERIFIED: codebase]
- `src/widgets/dashboard/model/spaces.ts` — SPACES registry, SERVICES_DOMAINS [VERIFIED: codebase]
- `prisma/schema.prisma:1741` — SubscriptionTier.platformFeePercent `@default(8.00)` [VERIFIED: codebase]
- `prisma/schema.prisma` — Notification model (no `category` column — confirmed gap) [VERIFIED: codebase]
- Paystack API docs (`paystack.com/docs/api/transaction/`) — initialize, verify API reference [CITED: paystack.com/docs/api/transaction/]
- WCAG 2.2 SC 2.5.8 Target Size Minimum (24×24 CSS pixels AA) [CITED: w3.org/WAI/WCAG22/Understanding/target-size-minimum]
- `react-swipeable` npm package — 853k weekly downloads, MIT, FormidableLabs, v7.0.2 [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)

- `.planning/phases/50-service-marketplace/50-CONTEXT.md` — User decisions (D-01 through D-16) [CITED: project docs]
- `vitest.config.ts` — Test configuration [VERIFIED: codebase]
- Resend documentation (`resend.com/docs/introduction`) — Email API introduction [CITED: resend.com/docs]

### Tertiary (LOW confidence)

- Exa search results — all exa provider results classified as LOW confidence by `gsd-tools query classify-confidence --provider exa`

## Assumptions Log

| #   | Claim                                                                                                                   | Section                  | Risk if Wrong                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------- |
| A1  | `PAYSTACK_SECRET_KEY` is configured in `.env` (not just `.env.example`)                                                 | Environment Availability | Checkout testing will fail — `PaystackService` returns `status: 'configuration_required'` |
| A2  | `SubscriptionTier.platformFeePercent` is seeded in the database (not just default in schema)                            | D-08                     | Platform fee may return 0 or NULL at runtime, breaking checkout total calculation         |
| A3  | `react-swipeable` is compatible with Preact (project uses Preact via Next.js)                                           | Standard Stack           | Swipe gestures may not work correctly if Preact's event system differs from React's       |
| A4  | ServicesLayer component architecture supports adding a marketplace sub-domain without breaking existing service domains | D-15                     | Marketplace may not render correctly within the Services space                            |
| A5  | `MobileSpaceBar` overflow guard (slices to 5) does not need modification for marketplace widgets                        | D-15                     | If marketplace adds a 6th visible item, navigation breaks silently                        |

## Open Questions (RESOLVED)

1. **Which swipe implementation approach — library or custom CSS?** RESOLVED: custom CSS + touch events (Plan 50-04 T1). Lighter, no dependency, consistent with D-10's "no new library" principle.

2. **Is the ServicesLayer component ready for a marketplace sub-domain?** RESOLVED: inspected by planner. ServicesLayer renders domain grid dynamically from `SERVICES_DOMAINS`. Plan 50-01 T3 adds `marketplace` domain; Plan 50-04 T3 wires final integration.

3. **Does `SubscriptionTier.platformFeePercent` have seeded data in dev database?** RESOLVED: Planner added pre-flight step in Plan 50-01 Task 1 Part C. Script `scripts/sql/verify-tier-fees.sql` verifies the column returns a non-null value. Manual verification: `SELECT "platformFeePercent" FROM "SubscriptionTier" LIMIT 1` returns 8.00.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all core libraries already in project; verified against codebase
- Architecture: HIGH — patterns verified against existing codebase (notification API, payment services, FSD layout)
- Pitfalls: HIGH — dual Prisma/Drizzle drift, booking model conflation, platform fee sourcing are documented risks from prior phases
- Mobile UX: MEDIUM — swipe gesture library choice is agent discretion; custom date picker architecture confirmed feasible with Tailwind

**Research date:** 2026-06-27
**Valid until:** 2026-07-27 (30 days; stable ecosystem)
