---
## Phase 50 Review — Service Marketplace

Overall: the context doc is well-structured and the decisions are defensible. A few issues need attention before this goes to planning — one is a schema gap that will block execution, and there are two architectural misalignments worth correcting before the advisory is written.
---

### Critical: Schema constraint on D-02

**Decision D-02** proposes extending `NotificationType` with marketplace-specific values (`SERVICE_INQUIRY`, `SERVICE_BOOKING`, `SERVICE_PAYMENT`, `SERVICE_REVIEW`, `SERVICE_APPROVAL`).

This conflicts with how the enum is currently defined. The existing values are lowercase (`info`, `warning`, `success`, `error`), which means they're treating this as a _severity level_ enum, not an _event type_ enum. The proposed new values are SCREAMING*SNAKE_CASE \_category* values — a fundamentally different classification axis.

Mixing them would make the `type` column ambiguous: does `info` mean "low severity" or "a type of notification"? Every consumer of the `Notification` model — the existing notification API, the UI badge rendering, email templates — currently uses this enum to decide _how_ to display a notification (colour, icon, urgency). If you add `SERVICE_INQUIRY` alongside `info`, consumers break.

**The correct approach:** Keep `NotificationType` as the severity/display classifier. Add a separate `category` column (nullable String or a new enum) for the domain classifier (`MARKETPLACE`, `SYSTEM`, `COMMUNITY`, etc.), and use `payload` JSON for the event-specific data. The existing route at `src/app/api/notifications/route.ts` already accepts `payload`, so this would work without breaking anything.

This needs to be corrected in CONTEXT.md before the planning phase — otherwise the advisory will generate a bad migration.

---

### Architectural: D-12 (Booking model extension) needs a gate decision

**Decision D-12** extends the `Booking` model with `providerId` and `serviceListingId`. Looking at the current schema, `Booking.facility` is a plain `String` field (the facility name), and the model is tightly scoped to facility reservations (pool, gym, etc.) with `property` as the FK anchor.

Extending this model to also represent marketplace service bookings conflates two distinct domain concepts:

- **Facility booking:** A community asset reserved at a time slot. No provider. Managed by the tenant admin. `status` defaults to `CONFIRMED`.
- **Service booking:** A marketplace transaction between a resident and a provider. Has a provider, a price, a payment, and a multi-step lifecycle (PENDING_CONFIRMATION → CONFIRMED → COMPLETED).

The lifecycle difference alone is a problem. Facility bookings default to CONFIRMED; service bookings start at PENDING_CONFIRMATION and go through payment. Both would share the same `BookingStatus` enum, but the current enum (`CONFIRMED`, `CANCELLED`, `COMPLETED`) has no `PENDING_CONFIRMATION` state.

Two options:

**Option A — Extend Booking (current D-12 approach):** Add `providerId?`, `serviceListingId?`, `price?`, `paymentStatus?` columns and add `PENDING_CONFIRMATION` to `BookingStatus`. Simpler to query across all bookings, but the model carries a lot of nullable fields that only apply to one sub-type, and you'd need to gate every query correctly.

**Option B — Dedicated `ServiceBooking` model:** Clean separation. Mirrors the `CommunityServiceInquiry` pattern already in the schema. More tables, but each model is coherent and no nullable-field leakage. The canonical `Booking` model stays as facility-only.

The CONTEXT doc chose Option A. That's a legitimate call but the implications need to be explicit in the advisory: the migration must add `PENDING_CONFIRMATION` to `BookingStatus`, and all existing facility booking queries must add `WHERE serviceListingId IS NULL` to remain correct.

**Recommendation:** Make this an explicit GATE in the advisory rather than a silent assumption. The agent shouldn't be resolving this at execution time.

---

### Concern: D-09 (availability in JSON) lacks a schema contract

`CommunityServiceListing.availability` is a `Json?` field. The context says providers set weekly schedules through it, but there's no defined shape for that JSON anywhere in the canonical refs. Before the calendar picker (D-10) can be built, the agent needs a schema contract for what valid availability JSON looks like (e.g., `{ "monday": [{ "start": "09:00", "end": "17:00" }], ... }`).

If this isn't documented before execution, the calendar component and the availability form will produce incompatible JSON representations and the time-slot grid will silently break.

**Action:** Define the availability JSON schema in the advisory pre-execution discovery section, or add it to the CONTEXT specifics before the advisory is written.

---

### Minor issues

**D-08 (tier-based platform fees):** The context references "SaaS License Agreement Section 4.7" for fee percentages. If those percentages aren't in the codebase, the agent will need to look them up or you'll need to supply them. Confirm they're either hardcoded in `src/shared/api/provider-billing.ts` or in `SubscriptionTier.platformFeePercent` (which is in the schema). The schema shows `platformFeePercent` on `SubscriptionTier` — that's the correct source, confirm it's seeded before Phase 50 execution.

**D-07 (PayPal feature flag):** The context says the flag is `NEXT_PUBLIC_MARKETPLACE_PAYPAL_ENABLED` but the established flag pattern is DB-backed via `PlatformPageFlags` + the `Setting` table. An env-var-only flag is inconsistent with the gating architecture and won't appear in the admin page settings UI. Either use the DB flag system or explicitly document why env-var is appropriate here.

**`facility` field on Booking:** If D-12 proceeds (extend Booking), service bookings don't have a `facility`. The field is a plain non-nullable `String` in the schema — that will need to be made nullable or given a sentinel value for service bookings. This is a migration detail the advisory must address explicitly.

---

### What's solid

The notification lifecycle events (D-01) are comprehensive and correct. The quote → approve → pay flow (D-06) correctly leverages the existing `CommunityServiceInquiry` system rather than inventing a new entity. The decision to stay within the Services space rather than creating a new MobileSpaceBar entry (D-15) is the right call at this stage. The mobile UX decisions (D-13, D-14, D-16) are concrete and implementable. The canonical refs section is thorough.

---

### Summary of required actions before advisory

1. **Correct D-02** — Don't extend `NotificationType` enum with category values. Add a `category` String column (or enum) to `Notification` for domain classification; use `payload` for event-specific data.
2. **Gate D-12** — Explicitly flag the facility vs. service booking model extension as a decision gate in the advisory. Document the `PENDING_CONFIRMATION` enum addition and the `facility`/`serviceListingId` nullability implications.
3. **Define availability JSON schema** — Add the weekly schedule shape to the CONTEXT specifics before the advisory is written.
4. **Verify D-07 flag approach** — Align PayPal gating with the DB-backed `PlatformPageFlags` pattern or explicitly justify the env-var exception.
