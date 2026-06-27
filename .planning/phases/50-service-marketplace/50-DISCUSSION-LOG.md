# Phase 50: Service Marketplace - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-27
**Phase:** 50-service-marketplace
**Areas discussed:** Notification triggers, Checkout & payment flow, Booking calendar UX, Mobile marketplace UX

---

## Notification triggers (gtm)

### Marketplace notification events

| Option                      | Description                                                                                                                 | Selected |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------- |
| Full lifecycle              | inquiry received/response, booking confirmed, payment received, review posted, listing approved/rejected, booking cancelled | ✓        |
| Minimal (transactions only) | Only payment events and booking confirmations                                                                               |          |
| Provider-focused            | Priorities provider notifications; residents check dashboard                                                                |          |

**User's choice:** Full lifecycle — cover the complete marketplace transaction flow.

### Notification model strategy

| Option                                    | Description                                                    | Selected |
| ----------------------------------------- | -------------------------------------------------------------- | -------- |
| Reuse Notification model                  | Add marketplace types to existing enum; same delivery pipeline | ✓        |
| Dedicated marketplace_notifications table | Separate table with marketplace-specific fields                |          |

**User's choice:** Reuse existing Notification model — simpler, no duplication.

### Email templates

| Option                          | Description                                                          | Selected |
| ------------------------------- | -------------------------------------------------------------------- | -------- |
| Dedicated marketplace templates | Branded emails with service imagery, booking details, rating prompts | ✓        |
| Reuse generic template          | Same email template as all other notifications                       |          |

**User's choice:** Dedicated marketplace templates for better marketplace UX.

### Notification batching

| Option                     | Description                                                       | Selected |
| -------------------------- | ----------------------------------------------------------------- | -------- |
| Per-inquiry (real-time)    | Each inquiry fires immediate notification                         | ✓        |
| Daily digest for inquiries | Batch inquiries into daily summary; instant for bookings/payments |          |

**User's choice:** Per-inquiry real-time — providers see inquiries immediately.

---

## Checkout & payment flow (cp8)

### Payment timing for FIXED-price services

| Option            | Description                                                       | Selected |
| ----------------- | ----------------------------------------------------------------- | -------- |
| Pay at booking    | Resident pays when booking; held until provider completes service | ✓        |
| Pay after service | Resident pays after service completion                            |          |
| Provider chooses  | Each provider sets payment terms per listing                      |          |

**User's choice:** Pay at booking — trust model for both parties.

### Payment for HOURLY/QUOTE services

| Option                 | Description                                                      | Selected |
| ---------------------- | ---------------------------------------------------------------- | -------- |
| Quote → approve → pay  | Provider submits quote via inquiry; resident approves; then pays | ✓        |
| Card hold + settle     | Capture card at booking; charge on completion                    |          |
| Pay after — no upfront | Only FIXED-price requires upfront payment                        |          |

**User's choice:** Quote → approve → pay — standard marketplace pattern using existing inquiry system.

### Payment gateways

| Option                                   | Description                                                | Selected |
| ---------------------------------------- | ---------------------------------------------------------- | -------- |
| Paystack primary, PayPal feature-flagged | Paystack for launch; PayPal gated behind per-tenant toggle | ✓        |
| Paystack only                            | Single gateway for launch simplicity                       |          |
| Both from launch                         | Support both immediately                                   |          |

**User's choice:** Paystack primary for ZAR market; PayPal available as feature flag.

### Platform transaction fees

| Option                         | Description                                                        | Selected |
| ------------------------------ | ------------------------------------------------------------------ | -------- |
| Reuse Phase 46 tier-based fees | Apply same fee percentages from SaaS License Agreement Section 4.7 | ✓        |
| Flat fee for MVP               | Simple flat percentage on all transactions                         |          |
| No fee for MVP                 | Skip fees at launch                                                |          |

**User's choice:** Reuse Phase 46 tier-based platform fees — consistent with provider billing.

---

## Booking calendar UX (qx7)

### Availability model

| Option               | Description                                                                   | Selected |
| -------------------- | ----------------------------------------------------------------------------- | -------- |
| Provider-defined     | Providers set weekly schedules via CommunityServiceListing.availability jsonb | ✓        |
| Facility-based slots | Reuse existing Booking model time-slots defined by tenant admin               |          |
| Hybrid               | Facility-based for amenities, provider-defined for personal services          |          |

**User's choice:** Provider-defined — uses the existing availability jsonb field designed for this.

### Calendar UI component

| Option                                     | Description                                                                | Selected |
| ------------------------------------------ | -------------------------------------------------------------------------- | -------- |
| Custom date picker + time-slot grid        | Built with existing Tailwind CSS and booking validation; no new dependency | ✓        |
| react-day-picker                           | Battle-tested library; adds ~15KB bundle                                   |          |
| Full calendar library (react-big-calendar) | Month/week/day views; overkill for time-slot picking                       |          |

**User's choice:** Custom date picker — keeps bundle small, matches existing UI patterns.

### Booking flow integration

| Option                   | Description                                                                  | Selected |
| ------------------------ | ---------------------------------------------------------------------------- | -------- |
| Book first, then pay     | Select time-slot → booking in PENDING_CONFIRMATION → provider confirms → pay | ✓        |
| Inquire first, then book | Send inquiry → negotiate time → create booking on payment                    |          |
| Two flows                | Instant book for FIXED + inquiry flow for QUOTE                              |          |

**User's choice:** Book first, then pay — booking exists immediately as a record.

### Booking schema

| Option                         | Description                                                                 | Selected |
| ------------------------------ | --------------------------------------------------------------------------- | -------- |
| Extend existing Booking model  | Add providerId + serviceListingId columns; reuse all booking infrastructure | ✓        |
| Dedicated ServiceBooking table | Separate table for marketplace bookings                                     |          |
| Use CommunityServiceInquiry    | Inquiry itself is the booking record; no new entity                         |          |

**User's choice:** Extend existing Booking model — one unified booking system.

---

## Mobile marketplace UX (4vk)

### Mobile service listings

| Option                           | Description                                                      | Selected |
| -------------------------------- | ---------------------------------------------------------------- | -------- |
| Stacked cards with swipe actions | Single-column card stack; horizontal swipe reveals quick actions | ✓        |
| Compact list with expand         | Simplified list; tap to expand full card                         |          |
| Horizontal card carousel         | Scrollable card strip for featured; standard stack below         |          |

**User's choice:** Stacked cards with swipe actions — modern mobile marketplace UX.

### Mobile booking flow

| Option                   | Description                                                 | Selected |
| ------------------------ | ----------------------------------------------------------- | -------- |
| Bottom sheet for booking | Full-screen detail; tap Book opens progressive bottom sheet | ✓        |
| Full-page flow           | Each step is a separate page route                          |          |
| Modal wizard             | Centered modal with step progression                        |          |

**User's choice:** Bottom sheet — progressive disclosure, keeps listing context visible.

### Navigation placement

| Option                     | Description                                                | Selected |
| -------------------------- | ---------------------------------------------------------- | -------- |
| Under Services space       | Marketplace as sub-section within existing Services space  | ✓        |
| New Marketplace space      | Dedicated space in MobileSpaceBar                          |          |
| Feature-flagged graduation | Start in Services; graduate to own space based on adoption |          |

**User's choice:** Under Services space — keeps nav simple with 5 icons.

### Touch UX requirements

| Option                                     | Description                                                                      | Selected |
| ------------------------------------------ | -------------------------------------------------------------------------------- | -------- |
| 44px targets + pull-to-refresh + safe-area | Mandatory accessibility: 44x44px touch targets, pull-to-refresh, safe-area-inset | ✓        |
| Just 44px touch targets                    | Minimum touch targets only; highest-impact single change                         |          |
| Full mobile native feel                    | Swipe-to-dismiss, haptic feedback, skeleton loading, infinite scroll             |          |

**User's choice:** 44px touch targets + pull-to-refresh + safe-area — accessibility requirements, not nice-to-have.

---

## the agent's Discretion

- Exact email template design for marketplace notifications
- Calendar date-picker component architecture (shared component vs. inline)
- Pull-to-refresh implementation approach
- Swipe action gesture library choice (custom CSS transforms vs. library)

## Deferred Ideas

- Instant book for FIXED-price services (skip provider confirmation)
- Multi-currency support beyond ZAR
- Provider analytics dashboard (booking volume, revenue, rating trends)
- Automated dunning (failed payment retry)
- Escrow/hold-release payment model with dispute resolution
- Marketplace dedicated space in MobileSpaceBar
- Daily digest for inquiries as notification preference
