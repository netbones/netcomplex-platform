# Phase 50: Service Marketplace - Pattern Map

**Mapped:** 2026-06-27
**Files analyzed:** 22 new/modified files
**Analogs found:** 22 / 22

## File Classification

| New/Modified File                                                | Role            | Data Flow        | Closest Analog                                      | Match Quality |
| ---------------------------------------------------------------- | --------------- | ---------------- | --------------------------------------------------- | ------------- |
| `src/db/schema/service-bookings.ts`                              | model           | CRUD             | `src/db/schema/community-service-inquiries.ts`      | exact         |
| `src/db/schema/service-booking-status-enum.ts`                   | model           | CRUD             | `src/db/schema/inquiry-status-enum.ts`              | exact         |
| `src/db/schema/service-bookings-relations.ts`                    | model           | CRUD             | `src/db/schema/payment-transactions-relations.ts`   | exact         |
| `prisma/migrations/*_add_service_bookings/migration.sql`         | migration       | CRUD             | Existing booking/inquiry migrations                 | exact         |
| `src/app/api/marketplace/checkout/route.ts`                      | controller      | request-response | `src/app/api/community-services/inquiries/route.ts` | role-match    |
| `src/app/api/service-bookings/route.ts`                          | controller      | CRUD             | `src/app/api/community-services/inquiries/route.ts` | exact         |
| `src/shared/api/marketplace-notifications.ts`                    | service         | event-driven     | `src/app/api/notifications/route.ts` POST pattern   | role-match    |
| `src/shared/api/email/marketplace-templates.ts`                  | utility         | transform        | `src/shared/api/email/resend.ts`                    | exact         |
| `src/features/booking/ui/ServiceBookingCalendar.tsx`             | component       | request-response | `src/features/booking/ui/BookingForm.tsx`           | role-match    |
| `src/features/marketplace/ui/BottomSheetBooking.tsx`             | component       | request-response | `src/widgets/dashboard/ui/MobileSpaceBar.tsx`       | role-match    |
| `src/features/marketplace/ui/SwipeableServiceCard.tsx`           | component       | request-response | `src/entities/service/ui/ServiceCard.tsx`           | exact         |
| `src/features/marketplace/ui/MarketplaceListingsPage.tsx`        | component       | request-response | `src/widgets/service/ui/ServicesGrid.tsx`           | exact         |
| `src/features/marketplace/ui/MarketplaceDetailPage.tsx`          | component       | request-response | `src/entities/service/ui/ServiceCard.tsx`           | role-match    |
| `src/features/marketplace/ui/AvailabilitySchedule.tsx`           | component       | request-response | `src/features/booking/ui/BookingForm.tsx`           | role-match    |
| `src/features/marketplace/ui/ServiceCheckoutSummary.tsx`         | component       | request-response | `src/features/billing/ui/CheckoutButton.tsx`        | role-match    |
| `src/entities/marketplace/schema.ts`                             | utility         | transform        | `src/entities/booking/schema.ts`                    | exact         |
| `src/db/schema/notifications.ts` **(MODIFIED)**                  | model           | CRUD             | _adds column to existing schema_                    | exact         |
| `prisma/migrations/*_add_notification_category/migration.sql`    | migration       | CRUD             | Existing notification migrations                    | exact         |
| `src/shared/lib/types/platform-page-flags.ts` **(MODIFIED)**     | config          | request-response | _existing interface — add field_                    | exact         |
| `src/shared/lib/settings/defaults.ts` **(MODIFIED)**             | config          | request-response | _existing defaults — add field_                     | exact         |
| `src/entities/tenant/api/settings.ts` **(MODIFIED)**             | config          | request-response | _existing settings keys — add key_                  | exact         |
| `src/entities/tenant/api/flags/platform-flags.ts` **(MODIFIED)** | service         | request-response | _existing flag resolution — add case_               | exact         |
| `src/widgets/dashboard/model/spaces.ts` **(MODIFIED)**           | config          | request-response | _existing spaces — add widget IDs_                  | exact         |
| `src/widgets/dashboard/model/widgets.ts` **(MODIFIED)**          | widget manifest | request-response | _existing registry — add registrations_             | exact         |
| `src/widgets/service/index.ts` **(MODIFIED)**                    | barrel export   | N/A              | _existing barrel — add exports_                     | exact         |
| `src/db/index.ts` **(MODIFIED)**                                 | barrel export   | N/A              | _existing barrel — add export_                      | exact         |

## Pattern Assignments

---

### `src/db/schema/service-bookings.ts` (model, CRUD)

**Analogs:** `src/db/schema/community-service-inquiries.ts` + `src/db/schema/bookings.ts`

**Imports pattern** (inquiries.ts line 1):

```typescript
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { inquiryStatusEnum } from './inquiry-status-enum';
```

**D-12 ServiceBooking model — mirror CommunityServiceInquiry structure with bookings fields:**

```typescript
import { pgTable, text, decimal, timestamp } from 'drizzle-orm/pg-core';
import { serviceBookingStatusEnum } from './service-booking-status-enum';
import { bookingPaymentStatusEnum } from './booking-payment-status-enum';

export const serviceBookings = pgTable('ServiceBooking', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  listingId: text('listingId').notNull(), // → CommunityServiceListing
  providerId: text('providerId').notNull(), // → ServiceProvider
  userId: text('userId').notNull(), // resident/customer
  date: timestamp('date', { mode: 'date', precision: 3 }).notNull(),
  startTime: text('startTime').notNull(), // HH:MM 24h
  endTime: text('endTime').notNull(), // HH:MM 24h
  price: decimal('price', { precision: 65, scale: 30 }),
  status: serviceBookingStatusEnum('status').default('PENDING_CONFIRMATION').notNull(),
  paymentStatus: bookingPaymentStatusEnum('paymentStatus').default('PENDING').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
```

---

### `src/db/schema/service-booking-status-enum.ts` (model, CRUD)

**Analog:** `src/db/schema/inquiry-status-enum.ts` (line 1-3)

```typescript
import { pgEnum } from 'drizzle-orm/pg-core';

export const inquiryStatusEnum = pgEnum('InquiryStatus', [
  'PENDING',
  'RESPONDED',
  'ACCEPTED',
  'DECLINED',
  'COMPLETED',
  'CANCELLED',
]);
```

**New enum — D-12 status lifecycle:**

```typescript
import { pgEnum } from 'drizzle-orm/pg-core';

export const serviceBookingStatusEnum = pgEnum('ServiceBookingStatus', [
  'PENDING_CONFIRMATION',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
]);
```

---

### `src/db/schema/booking-payment-status-enum.ts` (model, CRUD)

**Analog:** `src/db/schema/transaction-status-enum.ts` (line 1-8)

```typescript
import { pgEnum } from 'drizzle-orm/pg-core';

export const transactionStatusEnum = pgEnum('TransactionStatus', [
  'PENDING',
  'COMPLETED',
  'FAILED',
  'REFUNDED',
]);
```

**New enum:**

```typescript
import { pgEnum } from 'drizzle-orm/pg-core';

export const bookingPaymentStatusEnum = pgEnum('BookingPaymentStatus', [
  'PENDING',
  'COMPLETED',
  'REFUNDED',
]);
```

---

### `src/db/schema/service-bookings-relations.ts` (model, CRUD)

**Analog:** `src/db/schema/payment-transactions-relations.ts` (line 1-23)

```typescript
import { relations } from 'drizzle-orm';
import { paymentTransactions } from './payment-transactions';
import { serviceProviders } from './service-providers';
// ... more imports

export const paymentTransactionsRelations = relations(paymentTransactions, helpers => ({
  provider: helpers.one(serviceProviders, {
    relationName: 'PaymentTransactionToServiceProvider',
    fields: [paymentTransactions.providerId],
    references: [serviceProviders.id],
  }),
  // ...
}));
```

**New relations:**

```typescript
import { relations } from 'drizzle-orm';
import { serviceBookings } from './service-bookings';
import { communityServiceListings } from './community-service-listings';
import { serviceProviders } from './service-providers';
import { users } from './users';

export const serviceBookingsRelations = relations(serviceBookings, helpers => ({
  listing: helpers.one(communityServiceListings, {
    relationName: 'ServiceBookingToListing',
    fields: [serviceBookings.listingId],
    references: [communityServiceListings.id],
  }),
  provider: helpers.one(serviceProviders, {
    relationName: 'ServiceBookingToProvider',
    fields: [serviceBookings.providerId],
    references: [serviceProviders.id],
  }),
  user: helpers.one(users, {
    relationName: 'ServiceBookingToUser',
    fields: [serviceBookings.userId],
    references: [users.id],
  }),
}));
```

---

### `src/app/api/marketplace/checkout/route.ts` (controller, request-response)

**Analog:** `src/app/api/community-services/inquiries/route.ts` (line 1-24 imports, 178-242 POST handler)

**Imports pattern** (inquiries/route.ts lines 1-24):

```typescript
import { NextRequest } from 'next/server';
import {
  auth,
  db,
  communityServiceInquiries,
  communityServiceListings,
  // ...
  apiError,
  apiInternalError,
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
  now,
} from '@api/server';

import { eq, desc, and, sql, inArray } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';

export const maxDuration = 8;
```

**Auth pattern** (line 34-38, 180-186):

```typescript
const session = await auth.api.getSession({
  headers: request.headers,
});

if (!session?.user?.id) {
  return apiUnauthorized();
}
```

**Core POST pattern** (lines 178-242):

```typescript
export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) { return apiUnauthorized(); }

    // 2. Parse body
    const body = await request.json();

    // 3. Validate required fields
    if (!listingId || !description) {
      return apiError('VALIDATION_ERROR', 'Listing ID and description are required', 400);
    }

    // 4. Tenant isolation
    const { tenantId } = await withTenant();

    // 5. Insert with Drizzle
    const id = crypto.randomUUID();
    const ts = now();
    await db.insert(/* table */).values({
      id, tenantId, /* ...body fields */,
      createdAt: ts, updatedAt: ts,
    });

    // 6. Fetch + return
    const [record] = await db.select().from(/* table */).where(eq(/* id */)).limit(1);
    return apiSuccess({ success: true, /* record */ });
  } catch (error) {
    logError({ component: 'checkout-api', operation: 'CREATE' }, 'Checkout error', error);
    return apiInternalError();
  }
}
```

**Error handling** (line 373-380):

```typescript
  } catch (error) {
    logError(
      { component: 'inquiries-api', operation: 'CREATE' },
      'Community service inquiry creation error',
      error
    );
    return apiInternalError();
  }
```

**Paystack integration reference:** `src/server/payments/paystack.ts` — `PaystackService.initializePayment()` (line 44-99):

```typescript
import { PaystackService } from '@/server/payments';

const paystack = new PaystackService();
const result = await paystack.initializePayment({
  reference,
  email,
  amount,
  currency,
  callbackUrl,
  metadata,
});
// result.status: 'ready' | 'configuration_required' | 'degraded'
// result.paymentUrl: authorization_url to redirect user
```

**Platform fee reference:** `src/db/schema/subscription-tiers.ts` line 12-14:

```typescript
platformFeePercent: decimal('platformFeePercent', { precision: 65, scale: 30 })
  .default('8')
  .notNull(),
```

---

### `src/app/api/service-bookings/route.ts` (controller, CRUD)

**Analog:** `src/app/api/community-services/inquiries/route.ts` (same pattern as checkout above)

Key differences from checkout:

- GET: list user's bookings (filter by `userId` or `providerId`)
- POST: create booking (validate date/time against `availability` JSON)
- PATCH: update booking status (provider confirms, cancels)
- Uses `serviceBookings` Drizzle table instead of `communityServiceInquiries`

**GET pattern for listing + pagination** (inquiries/route.ts lines 32-172):

```typescript
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { tenantId } = await withTenant();

    const conditions = [
      eq(serviceBookings.tenantId, tenantId),
      eq(serviceBookings.userId, session.user.id), // or providerId for provider view
    ];

    const bookings = await db
      .select({
        /* columns */
      })
      .from(serviceBookings)
      .leftJoin(communityServiceListings /* ... */)
      .leftJoin(users /* ... */)
      .where(and(...conditions))
      .orderBy(desc(serviceBookings.createdAt))
      .limit(limit)
      .offset(offset);

    // Pagination total
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(serviceBookings)
      .where(and(...conditions));

    return apiSuccess({
      bookings,
      pagination: {
        total: totalResult?.count || 0,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logError({ component: 'service-bookings-api', operation: 'GET' }, 'Fetch error', error);
    return apiInternalError();
  }
}
```

---

### `src/shared/api/marketplace-notifications.ts` (service, event-driven)

**Analog:** `src/app/api/notifications/route.ts` POST handler (lines 175-242)

**The pattern is: call the notification API internally, NOT duplicate the logic.** Create helper functions that construct the notification payload and call the DB directly (following the notifications POST body structure):

```typescript
// Pattern for notification trigger functions
import { db, notifications, supabase } from '@api/server';
import { v4 as uuidv4 } from 'uuid';

export async function createMarketplaceNotification(params: {
  tenantId: string;
  recipientUserId: string;
  senderId?: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  category: 'MARKETPLACE'; // D-02: new category column
  payload: Record<string, unknown>; // listingId, bookingId, transactionId, etc.
  link?: string;
  sendEmail?: boolean;
}): Promise<void> {
  try {
    const [notification] = await db
      .insert(notifications)
      .values({
        id: crypto.randomUUID(),
        tenantId: params.tenantId,
        userId: params.recipientUserId,
        senderId: params.senderId || null,
        title: params.title,
        message: params.message,
        type: params.type,
        category: params.category,
        payload: params.payload,
        link: params.link || '',
        read: false,
      })
      .returning();

    // Broadcast via Supabase Realtime
    supabase
      .channel(`notifications:${params.recipientUserId}`)
      .send({
        type: 'broadcast',
        event: 'new-notification',
        payload: notification,
      })
      .catch(() => {});
  } catch (error) {
    // Non-blocking — log silently, never throw to caller
  }
}
```

**Notification trigger functions to create (D-01):**

- `notifyInquiryReceived()` — when resident submits inquiry
- `notifyInquiryResponse()` — when provider responds
- `notifyBookingConfirmed()` — booking status → CONFIRMED
- `notifyPaymentReceived()` — payment completed
- `notifyReviewPosted()` — new review on listing
- `notifyListingApproved()` / `notifyListingRejected()` — moderation
- `notifyBookingCancelled()` — booking cancelled

---

### `src/shared/api/email/marketplace-templates.ts` (utility, transform)

**Analog:** `src/shared/api/email/resend.ts` (line 1-58)

**sendEmail pattern:**

```typescript
import { sendEmail } from '@shared/api/email/resend';

await sendEmail({
  to: user.email,
  subject: `Soralia Village: ${subject}`,
  html: htmlContent,
});
```

**Template function pattern (create per notification type):**

```typescript
export function getBookingConfirmationHtml(params: {
  serviceName: string;
  providerName: string;
  date: string;
  time: string;
  price: string;
  serviceImage?: string;
  listingUrl: string;
}): string {
  // Return branded HTML with service imagery, booking details, action link
  return `...`;
}
```

---

### `src/features/booking/ui/ServiceBookingCalendar.tsx` (component, request-response)

**Analog:** `src/features/booking/ui/BookingForm.tsx`

**D-09/D-10 pattern:** Build a custom date picker + time-slot grid using existing patterns:

- Use `bookingSchema` date validation (`date >= today`, `startTime < endTime`)
- Read `CommunityServiceListing.availability` jsonb field (D-09 contract)
- Parse weekdays → generate available dates → generate time slots

**Component structure pattern** (from ServiceCard / BookingForm):

```tsx
'use client';

import { useState } from 'react';
// Component-specific Tailwind classes

interface ServiceBookingCalendarProps {
  listingId: string;
  availability: DaySchedule;
  onSlotSelect: (date: Date, startTime: string, endTime: string) => void;
}

export function ServiceBookingCalendar({
  listingId,
  availability,
  onSlotSelect,
}: ServiceBookingCalendarProps) {
  // ...
}
```

- Highlight available dates with `bg-soralia-primary` (#4F46E5)
- Grey out unavailable dates
- 44x44px minimum touch targets (D-16)

---

### `src/features/marketplace/ui/BottomSheetBooking.tsx` (component, request-response)

**Analog:** `src/widgets/dashboard/ui/MobileSpaceBar.tsx` (mobile patterns, safe-area)

**Safe-area pattern** (MobileSpaceBar.tsx lines 72-75):

```tsx
className =
  'h-16 pb-[env(safe-area-inset-bottom,0px)] md:hidden bg-white border-t border-gray-200 z-40';
```

**Portal pattern** (line 69):

```tsx
import { createPortal } from 'react-dom';

return createPortal(<>{/* bottom sheet content */}</>, document.body);
```

**D-14 3-step flow:** date picker → time-slots → confirmation & pay
**D-16:** `pb-[env(safe-area-inset-bottom,0px)]` on bottom sheet + checkout buttons

---

### `src/features/marketplace/ui/SwipeableServiceCard.tsx` (component, request-response)

**Analog:** `src/entities/service/ui/ServiceCard.tsx` (line 1-80)

**ServiceCard pattern** (lines 1-34):

```tsx
'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export interface ServiceListing {
  id: string;
  title: string;
  description: string;
  category: string;
  priceType: 'FIXED' | 'HOURLY' | 'QUOTE' | 'FREE';
  price?: number;
  currency: string;
  images: string[];
  verified: boolean;
  rating: number;
  reviewCount: number;
  provider?: { id?: string; name?: string; email?: string; avatar?: string };
}

interface ServiceCardProps {
  service: ServiceListing;
  onInquiry?: (serviceId: string) => void;
}

export function ServiceCard({ service, onInquiry }: ServiceCardProps) {
```

**D-13 enhancements:**

- Add swipe gesture handlers (custom CSS transforms or gesture library)
- Swipe right → "Inquire" (blue icon + color)
- Swipe left → "Book" (green icon + color)
- Stacked card layout on mobile (`grid-cols-1`), responsive grid on desktop
- Show: image, title, rating, price, provider name, next available slot

**Existing ServiceCard imports/reuse:**

```typescript
import { ServiceTypeBadge } from './ServiceTypeBadge';
import { CategoryBadge } from './CategoryBadge';
import { ReviewStars } from './ReviewStars';
import { PricingDisplay } from './PricingDisplay';
```

---

### `src/features/marketplace/ui/MarketplaceListingsPage.tsx` (component, request-response)

**Analog:** `src/widgets/service/ui/ServicesGrid.tsx` (line 1-45)

```tsx
'use client';
import { ServiceCard, ServiceListing } from '@entities/service';

interface ServicesGridProps {
  services: ServiceListing[];
  viewMode?: 'grid' | 'list';
  onInquiry?: (serviceId: string) => void;
}

export function ServicesGrid({ services, viewMode = 'grid', onInquiry }: ServicesGridProps) {
  // Empty state, grid/list rendering
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {services.map(service => (
        <ServiceCard key={service.id} service={service} onInquiry={onInquiry} />
      ))}
    </div>
  );
}
```

**D-13/D-16 enhancements:**

- Mobile: single-column stack with SwipeableServiceCard
- Pull-to-refresh (D-16)
- 44x44px touch targets

---

### `src/entities/marketplace/schema.ts` (utility, transform)

**Analog:** `src/entities/booking/schema.ts`

```typescript
import { z } from 'zod';

// Reuse bookingSchema date/time validation pattern:
// - date >= today
// - startTime < endTime
// - HH:MM format validation

export const serviceBookingSchema = z
  .object({
    listingId: z.string().uuid(),
    date: z.string().refine(/* date >= today */),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  })
  .refine(data => data.startTime < data.endTime, {
    message: 'Start time must be before end time',
  });

export const availabilitySchema = z.object({
  monday: z.array(z.object({ start: z.string(), end: z.string() })).optional(),
  tuesday: z.array(z.object({ start: z.string(), end: z.string() })).optional(),
  // ... all weekdays
});
```

**D-09 availability JSON contract** (from CONTEXT.md):

```json
{
  "monday": [{ "start": "09:00", "end": "17:00" }],
  "saturday": [],
  "sunday": []
}
```

---

### Notifications Model: Add `category` Column (MODIFIED)

**Analog:** `src/db/schema/notifications.ts` (lines 1-19)

**Current schema (D-02 change needed):**

```typescript
import { pgTable, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { notificationTypeEnum } from './notification-type-enum';

export const notifications = pgTable('Notification', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  userId: text('userId').notNull(),
  senderId: text('senderId'),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: notificationTypeEnum('type').default('info').notNull(),
  link: text('link'),
  read: boolean('read').default(false).notNull(),
  readAt: timestamp('readAt', { mode: 'date', precision: 3 }),
  deliveryStatus: text('deliveryStatus').default('PENDING').notNull(),
  payload: jsonb('payload'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
```

**Add:** New nullable `category` column between `type` and `link`:

```typescript
category: text('category'),  // 'MARKETPLACE' | 'SYSTEM' | 'COMMUNITY' | null
```

**DO NOT change `type`** — it remains `NotificationType` (`info`, `warning`, `success`, `error`).

---

### Feature Flag: Add `marketplacePaypal` (MODIFIED — 4 files)

**Analog files (3-touch pattern):**

**1. Interface** — `src/shared/lib/types/platform-page-flags.ts` (lines 17-38):

```typescript
export interface PlatformPageFlags {
  // ... existing flags ...
  disputes: boolean;
  dWallet: boolean;
  providers: boolean;
  bookings: boolean;
  messages: boolean;
  marketplacePaypal: boolean; // NEW: gate PayPal for marketplace
  headerLinks: HeaderLinkId[];
}
```

**2. Defaults** — `src/shared/lib/settings/defaults.ts` (lines 3-23):

```typescript
export const DEFAULT_PAGE_FLAGS: PlatformPageFlags = {
  // ... existing defaults ...
  disputes: true,
  dWallet: false,
  providers: true,
  bookings: true,
  messages: true,
  marketplacePaypal: false, // NEW: PayPal off by default (D-07)
  headerLinks: ['directory', 'groups', 'services', 'resources'] as HeaderLinkId[],
};
```

**3. Settings key** — `src/entities/tenant/api/settings.ts` (lines 1-42):

```typescript
export const SETTINGS_KEYS = {
  // ... existing keys ...
  PAGE_DISPUTES_ENABLED: 'page_disputes_enabled',
  PAGE_MARKETPLACE_PAYPAL_ENABLED: 'page_marketplace_paypal_enabled', // NEW
  HEADER_LINKS: 'header_links',
  // ...
} as const;
```

**4. Flag resolution + mapping** — `src/entities/tenant/api/flags/platform-flags.ts`:

Add to `getPlatformPageFlagsImpl()` switch (after line 83):

```typescript
case SETTINGS_KEYS.PAGE_MARKETPLACE_PAYPAL_ENABLED:
  flags.marketplacePaypal = setting.value === 'true';
  break;
```

Add to `getPlatformPageFlagsWithTx()` switch (after line 228):

```typescript
case SETTINGS_KEYS.PAGE_MARKETPLACE_PAYPAL_ENABLED:
  flags.marketplacePaypal = setting.value === 'true';
  break;
```

Add to `mapFlagToSettingKey()` (after line 305):

```typescript
marketplacePaypal: SETTINGS_KEYS.PAGE_MARKETPLACE_PAYPAL_ENABLED,
```

Add to `setPlatformPageFlag` + `setPlatformPageFlagWithTx` — the switch in `mapFlagToSettingKey` handles this automatically via the `Record` mapping.

**D-07 runtime guard:** When PayPal is enabled, verify `process.env.PAYPAL_CLIENT_ID` exists before allowing the flag to be `true`.

---

### Spaces: Add Marketplace Widget IDs (MODIFIED)

**Analog:** `src/widgets/dashboard/model/spaces.ts` (lines 92-111)

**Current services.widgetIds:**

```typescript
services: {
  id: 'services',
  href: '/dashboard/services',
  labelKey: 'spaces.services',
  icon: Briefcase,
  isCore: false,
  requiredFlag: 'services',
  widgetIds: [
    'maintenance-requests',
    'maintenance-list',
    'maintenance-analytics',
    'my-services',
    'service-inquiries',
    'events',
    'surveys',
    'competitions',
    'agent-dashboard',
    'agent-activity',
  ],
},
```

**Add marketplace widget IDs:**

```
'service-marketplace',      // NEW: Marketplace listing grid
'service-marketplace-detail', // NEW: Marketplace detail view (optional standalone widget)
'booking-calendar',          // NEW: Service booking calendar (optional)
```

---

### Widget Registration: Add Marketplace Widgets (MODIFIED)

**Analog:** `src/widgets/dashboard/model/widgets.ts` — my-services registration (lines 813-827)

```typescript
registry.register({
  id: 'my-services',
  version: '1.0.0',
  name: 'My Services',
  description: 'Your community service listings, inquiries, and requests',
  author: 'internal',
  category: 'content',
  icon: Briefcase,
  featureFlag: 'services',
  component: lazy(() => import('@widgets/service').then(m => ({ default: m.MyServicesManager }))),
  defaultSize: { width: 4, height: 3 },
  minSize: { width: 2, height: 2 },
  dragHandleClassName: 'widget-drag-handle',
  spaces: ['services', 'community'],
});
```

**New widget registrations:**

```typescript
// Marketplace listing grid
registry.register({
  id: 'service-marketplace',
  version: '1.0.0',
  name: 'Service Marketplace',
  description: 'Browse and book community service providers',
  author: 'internal',
  category: 'content',
  icon: Briefcase,
  featureFlag: 'services',
  component: lazy(() =>
    import('@features/marketplace/ui/MarketplaceListingsPage').then(m => ({
      default: m.MarketplaceListingsPage,
    }))
  ),
  defaultSize: { width: 4, height: 3 },
  minSize: { width: 2, height: 2 },
  dragHandleClassName: 'widget-drag-handle',
  spaces: ['services'],
});
```

---

### Barrel Exports (MODIFIED)

**Analog: `src/db/index.ts`** (line 1-63) — add:

```typescript
export * from '@schema/service-bookings';
```

**Analog: `src/widgets/service/index.ts`** (line 1-5) — add:

```typescript
export * from '@features/marketplace/ui/MarketplaceListingsPage';
export * from '@features/marketplace/ui/ServiceCheckoutSummary';
```

---

## Shared Patterns

### Authentication

**Source:** `src/app/api/notifications/route.ts` lines 25-35
**Apply to:** All marketplace API routes

```typescript
async function getSessionAndUserId(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (!session?.user?.id) {
    return null;
  }
  return session.user.id;
}
```

### Tenant Isolation

**Source:** `src/app/api/community-services/inquiries/route.ts` line 48
**Apply to:** All marketplace API routes

```typescript
const { tenantId } = await withTenant();
```

### Error Handling

**Source:** `src/app/api/community-services/inquiries/route.ts` lines 373-380
**Apply to:** All API routes

```typescript
} catch (error) {
  logError(
    { component: 'component-name', operation: 'OPERATION' },
    'Human-readable error context',
    error
  );
  return apiInternalError();
}
```

### API Response Helpers

**Source:** `@api/server` barrel (used in all route files)
**Apply to:** All marketplace API routes

```typescript
import {
  apiSuccess, // 200 with JSON body
  apiCreated, // 201 with JSON body
  apiUnauthorized, // 401
  apiForbidden, // 403
  apiNotFound, // 404
  apiError, // custom status + code + message
  apiInternalError, // 500 generic
} from '@api/server';
```

### Drizzle Query Pattern

**Source:** `src/app/api/community-services/listings/route.ts` lines 96-138
**Apply to:** All DB reads

```typescript
const [result] = await db
  .select({
    /* columns */
  })
  .from(tableName)
  .leftJoin(relatedTable, eq(tableName.fk, relatedTable.id))
  .where(and(...conditions))
  .limit(1);
```

### Drizzle Insert Pattern

**Source:** `src/app/api/community-services/inquiries/route.ts` lines 231-245
**Apply to:** All DB writes

```typescript
const id = crypto.randomUUID();
const ts = now();
await db.insert(tableName).values({
  id, tenantId,
  /* ...fields */,
  createdAt: ts,
  updatedAt: ts,
});
```

### Prisma → Drizzle Dual Setup

**Source:** `prisma/migrations/` directory

- Add Prisma migration SQL file: `prisma/migrations/<timestamp>_add_service_bookings/migration.sql`
- Run `npx prisma migrate dev` to apply
- Run `npx prisma generate` to sync Drizzle
- **Never rename migration files** after they are applied

### Feature Flag Registration (3-touch)

**Source:** `src/shared/lib/types/platform-page-flags.ts` + `src/shared/lib/settings/defaults.ts` + `src/entities/tenant/api/settings.ts` + `src/entities/tenant/api/flags/platform-flags.ts`
**Apply to:** New feature flags

1. Add to `PlatformPageFlags` interface
2. Add default value in `DEFAULT_PAGE_FLAGS`
3. Add key in `SETTINGS_KEYS`
4. Add `case` in both `getPlatformPageFlagsImpl()` and `getPlatformPageFlagsWithTx()`
5. Add entry in `mapFlagToSettingKey()`

### FSD Entity Layout

**Source:** `src/entities/service/` directory structure
**Apply to:** New `src/entities/marketplace/`

```
src/entities/marketplace/
├── model/
│   ├── types.ts         # TypeScript interfaces
│   └── constants.ts     # Category enums, defaults
├── ui/                   # UI components
│   ├── ServiceCard.tsx
│   └── PricingDisplay.tsx
├── api/                  # API functions (server)
│   └── marketplace-api.ts
└── schema.ts             # Zod validation schemas
```

### Email Delivery Pipeline

**Source:** `src/shared/api/email/resend.ts` + `src/app/api/notifications/route.ts` lines 305-365
**Apply to:** Marketplace email templates

- Import `sendEmail` from `@shared/api/email/resend`
- Create template functions that return HTML strings
- Follow the retry pattern (3 attempts with exponential backoff) from notifications

---

## Business Logic Patterns

### Booking Lifecycle (D-05, D-11, D-12)

```
PENDING_CONFIRMATION  →  CONFIRMED  →  COMPLETED
                                     ↘  CANCELLED
```

- **PENDING_CONFIRMATION**: Booking created, awaiting provider confirmation
- **CONFIRMED**: Provider confirmed, resident pays → status transitions
- **COMPLETED**: Service delivered
- **CANCELLED**: Booking cancelled by either party

### Payment Flow by PriceType (D-05, D-06)

- **FIXED**: Resident pays at booking time → `paymentStatus: COMPLETED`, `status: CONFIRMED`
- **HOURLY / QUOTE**: Provider submits quote via inquiry → resident approves → payment → CONFIRMED
- **FREE**: No payment → auto-confirm if provider has availability

### Platform Fee Calculation

**Source:** `src/db/schema/subscription-tiers.ts` line 12-14

```typescript
// platformFeePercent defaults to 8.00%
const feeAmount = bookingPrice * (tier.platformFeePercent / 100);
// Show as line item in checkout summary (D-08, specifics section)
```

### Availability Checking (D-09)

Parse `CommunityServiceListing.availability` jsonb → check if given date falls on a configured weekday → check if requested time slot is within an available range → ensure no conflicting ServiceBookings for that provider+date+time.

---

## No Analog Found

No files lack an analog. All files have close matches in the existing codebase.

---

## Metadata

**Analog search scope:** `src/db/schema/`, `src/app/api/`, `src/server/payments/`, `src/entities/`, `src/widgets/`, `src/shared/`, `src/features/`
**Files scanned:** 40+ analog files
**Pattern extraction date:** 2026-06-27
