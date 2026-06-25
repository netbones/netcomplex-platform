# Phase 50: Service Marketplace — Research

**Date:** 2026-06-25
**Status:** Pre-scoping (BD issues audited, acceptance criteria TBD)

## BD Issue Audit

| Issue | Title                        | Status | Partially Done?                                                                                                                                                                                                                                                      |
| ----- | ---------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gtm` | Notification system          | open   | Model exists (`Notification` table), notifications review (`oi9x`) completed. Marketplace-specific triggers (service inquiries, status updates, reviews) not implemented.                                                                                            |
| `cp8` | Payment processing           | open   | Most progress — Phase 46.1 (billing foundation) has plans/summaries, billing UI components exist (`CheckoutButton`, `PlanSelector`, `InvoiceList`, `PaymentMethodForm`), provider-billing feature exists. 46.1 still "pending execution", no checkout API route yet. |
| `qx7` | Booking calendar integration | open   | `Booking` model has `date`/`startTime`/`endTime` fields, `BookingForm` exists. No calendar picker UI or time-slot browsing.                                                                                                                                          |
| `4vk` | Mobile optimization          | open   | No mobile-specific work found.                                                                                                                                                                                                                                       |

## What Exists

### Notifications (`gtm`)

- **Schema:** `Notification` model with `title`, `message`, `type`, `link`, `read`, `deliveryStatus`, `payload`
- **Files:** `src/app/api/announcements/`, `src/shared/api/revalidation.ts`
- **Missing:** Marketplace-specific notification triggers (service inquiry received, status change, review posted)

### Payment Processing (`cp8`)

- **Phase 46.1** (billing foundation): `46.1-01-PLAN.md` through `46.1-04-SUMMARY.md` exist, status "pending execution"
- **Billing UI:** `src/features/billing/ui/` — `CheckoutButton`, `PlanSelector`, `InvoiceList`, `PaymentMethodForm`, `BillingOverview`
- **Provider billing:** `src/features/provider-billing/`, `src/shared/api/provider-billing.ts`
- **Schema:** Billing tables exist (`BillingPlan`, `TenantSubscription`, `TenantInvoice`, `TenantPayment`, `BillingAdjustment`, `BillingEvent`)
- **Missing:** Checkout API route (`/api/billing/checkout`), Paystack/PayPal webhook wiring, subscription→tier pipeline

### Booking Calendar (`qx7`)

- **Schema:** `Booking` model with `date`, `startTime`, `endTime`, `facility`, `purpose`, `status`
- **Booking feature:** `src/features/booking/ui/BookingForm.tsx`
- **Booking API:** `src/app/api/bookings/route.ts`, `src/app/api/v1/tenant/bookings/route.ts`
- **Missing:** Calendar date-picker UI, time-slot availability, booking management UI

### Mobile Optimization (`4vk`)

- **No mobile-specific work found** for the service marketplace
- General mobile responsiveness exists via Tailwind (mobile-first), but no marketplace-specific optimization

## Dependencies

- Phase 46 (Provider Platform) — provider listing/registration is prerequisite for marketplace
- Phase 46.1 (Billing Foundation) — subscription/payment infrastructure for `cp8`
- Phase 45 (Community Merits) — may affect marketplace credit/rewards flow

## Notes

- `gtm`, `cp8`, `qx7`, `4vk` all labeled `m5-plus`, `post-launch`
- Phase 50 was split from Phase 46 on 2026-06-19 (Provider Platform → Phase 46, Service Marketplace → Phase 50)
- Acceptance criteria still TBD — run `/gsd-discuss-phase 50-service-marketplace` to scope
