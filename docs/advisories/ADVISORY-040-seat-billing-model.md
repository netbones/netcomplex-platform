---
title: ADVISORY-040: Seat-Level Billing Model (SeatPlan / SeatSubscription) for the Resident Billing & Plan Centre
status: proposed
reviewed: 2026-08-14
tags: [advisory, architecture, billing]
audience: developer
---

# ADVISORY-040: Seat-Level Billing Model for the Resident Billing & Plan Centre

**Status:** Proposed
**Priority:** Medium (unblocks a UI already mocked; not urgent until Solo/Premium Seat upgrades are sold)
**Related Advisories:** ADVISORY-039 (admin Plan & Seats split — this advisory's `SeatSubscription.isComplimentary` is the backing data for that advisory's "Grant complimentary seat" action; sequencing dependency, see §9 G5)
**Related Docs:** IDENTITY_MODEL.md (Solo Seat liberation fee, Premium Seat volume pricing, five complimentary board seats)
**Source:** Resident Billing & Plan Centre mockup, 2026-08-14 — built against fields that don't exist in `schema.prisma` yet

> ⚠️ Advisory numbers are externally managed. This document is provisionally **ADVISORY-040** — confirm against the register before treating the filename as canonical.

---

## 1. Problem Statement

IDENTITY_MODEL.md describes Solo Seat as carrying a monthly "liberation fee" and Premium Seat as having "volume pricing," and the resident-facing Billing & Plan Centre mockup was built to show exactly that — a priced upgrade card, a payment method, a billing history table. None of it has anywhere to actually live. `SoloSeat` and `PremiumSeat` each carry a bare `tier String @default(...)` field and nothing else billing-related. There is no price, no billing interval, no subscription status, no invoice, and no record of whether a given seat was paid for or granted complimentary.

This is not a new problem invented by the mockup — it's the same conflation ADVISORY-039 found on the admin side (an "Allocate Solo Seat" button with no billing context) traced down to its root: the schema genuinely has no seat-billing concept, so neither the admin action nor the resident-facing upgrade flow can be built honestly without inventing one first.

---

## 2. Root Cause Analysis

| Finding                                                                                                 | Evidence                                                                                                                                                                                                       | Consequence                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SoloSeat`/`PremiumSeat` have a `tier` string but no price, currency, or interval                       | `schema.prisma` models `SoloSeat`, `PremiumSeat`                                                                                                                                                               | Any "upgrade to Solo Seat" UI has to hardcode a price client-side — exactly what the mockup did, and exactly what shouldn't ship                                                                |
| A structurally identical pattern already exists for a different subject                                 | `ProviderSubscription` (`tierId`, `status`, `price`, `paymentGateway`, `startDate`/`endDate`/`nextBillingDate`) + `ProviderCharge` + `ProviderInvoice` + `PaymentTransaction`, all scoped to `ServiceProvider` | The shape to copy already exists and is proven in production for providers — this is not new domain design, it's applying an existing pattern to a second subject                               |
| `SoloSeat.isComplimentary` exists but has no counterpart billing record                                 | `schema.prisma` model `SoloSeat`                                                                                                                                                                               | The flag tells you a seat was free, but there's no linked subscription/invoice row explaining who granted it or when — ADVISORY-039's "Grant complimentary seat" action has nothing to write to |
| Premium Seat eligibility ("requires 2+ properties," per the mockup) has no rule representation anywhere | Full-text review of `schema.prisma`                                                                                                                                                                            | The eligibility check can only live in application code today, hardcoded per seat type, with no way to change the threshold without a deploy                                                    |
| Payment gateway integration already exists and is reusable                                              | `src/server/payments/paystack.ts`, `paypal.ts`; `PaymentGateway` enum (`PAYSTACK \| PAYPAL`) already used by `TenantPayment` and `ProviderSubscription`                                                        | No new payment integration is needed — this advisory is a schema/UI wiring problem, not a payments-integration problem                                                                          |
| This would be the **third** near-identical billing stack in the schema                                  | `TenantSubscription`/`TenantInvoice`/`TenantPayment` (tenant→NetComplex), `ProviderSubscription`/`ProviderCharge`/`ProviderInvoice` (provider), and now the proposed seat stack                                | Worth naming directly as a Conflict Register item rather than pretending it isn't happening — see §3 Option 4 and §7                                                                            |

**Root cause, stated simply:** every other priced relationship on the platform (tenant subscriptions, provider subscriptions) got a full subscription/charge/invoice stack; seats didn't, because nothing forced the question until a UI tried to render a real price.

---

## 3. Options

| #   | Option                                                                                                                           | Description                                                                                                                                                                                                                                                                                                                         | Pros                                                                                                                                                                                 | Cons                                                                                                                                                                                                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Do nothing — hardcode prices client-side**                                                                                     | Ship the mockup as-is with prices baked into UI copy                                                                                                                                                                                                                                                                                | Fastest                                                                                                                                                                              | No source of truth, no invoice trail, no way to change pricing without a redeploy, no way to distinguish paid from complimentary seats in the data                                                                                                                                |
| 2   | **Bolt price/interval fields directly onto `SoloSeat`/`PremiumSeat`**                                                            | Add `price`, `currency`, `nextBillingDate` columns to the seat models themselves                                                                                                                                                                                                                                                    | Minimal schema diff                                                                                                                                                                  | No invoice history, no charge trail, no distinct subscription lifecycle (active/cancelled/expired) separate from the seat's own `SeatStatus` — conflates "does this seat exist" with "is this seat paid up," the same conflation problem ADVISORY-039 is fixing on the admin side |
| 3   | **New `SeatPlan` + `SeatSubscription` + reuse `PaymentTransaction`, mirroring the `ProviderSubscription` pattern** (recommended) | `SeatPlan` is the priced offering (one row per seat type, price, interval, eligibility rule); `SeatSubscription` links a `user` + seat to a plan with its own lifecycle and `isComplimentary`/`grantedByUserId`; charges/invoices reuse the existing `PaymentTransaction` shape rather than inventing a fourth near-duplicate table | Directly backs the mockup as designed; complimentary grants get a proper audit trail; eligibility rules become data instead of hardcoded logic; reuses proven payment gateway wiring | Third billing stack in the schema — acknowledged directly rather than hidden, see §7                                                                                                                                                                                              |
| 4   | **Generalize into one polymorphic `Subscription` entity shared by tenants, providers, and seats**                                | Single `Subscription` table with a `subjectType`/`subjectId` pair instead of three parallel stacks                                                                                                                                                                                                                                  | Solves the duplication problem at the root                                                                                                                                           | Large, high-risk refactor touching `TenantSubscription` and `ProviderSubscription` call sites across billing, invoicing, and provider-dashboard code that are already live in production; not something to bundle into shipping one new UI                                        |

**Recommendation: Option 3**, with Option 4 named explicitly in the risk register as a deliberate deferral, not an oversight.

---

## 4. Architecture: Before / After

### Before

```
TenantSubscription ──► TenantInvoice / TenantPayment            (Tenant → NetComplex, exists)
ProviderSubscription ──► ProviderCharge / ProviderInvoice /     (ServiceProvider, exists)
                          PaymentTransaction
SoloSeat.tier (string, no price)                                 (no billing stack — the gap)
PremiumSeat.tier (string, no price)
```

### After

```
SeatPlan
  seatType: SOLO | PREMIUM
  price, currency, billingInterval
  eligibilityRule (Json, e.g. {"minProperties": 2})
       │
       ▼
SeatSubscription
  userId, seatType, soloSeatId? / premiumSeatId?
  planId ──► SeatPlan
  status: ACTIVE | CANCELLED | EXPIRED | PENDING   (reuses SubscriptionStatus enum)
  isComplimentary, grantedByUserId?                (ties directly to ADVISORY-039's
  startDate, endDate, nextBillingDate               "Grant complimentary seat" action)
       │
       ▼
PaymentTransaction (existing model, reused as-is — providerId becomes optional,
                     subscriptionId points at SeatSubscription instead of
                     ProviderSubscription for this subject type)
```

`SeatPlan` is deliberately a lookup table, not an enum-encoded price — the same lesson already flagged elsewhere as "on the horizon" for `CommunityServiceListing.category`: pricing and eligibility change more often than schema deploys should be required for.

### New schema (additive; `PaymentTransaction` gains an optional new FK rather than being duplicated)

```prisma
enum SeatType {
  SOLO
  PREMIUM
}

model SeatPlan {
  id              String              @id @default(uuid())
  tenantId        String?
  seatType        SeatType
  price           Decimal             @db.Decimal(10, 2)
  currency        String              @default("ZAR")
  interval        BillingPlanInterval @default(MONTHLY)
  eligibilityRule Json?
  isActive        Boolean             @default(true)
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  subscriptions SeatSubscription[]

  @@index([tenantId, seatType])
}

model SeatSubscription {
  id               String              @id @default(uuid())
  tenantId         String
  userId           String
  seatType         SeatType
  soloSeatId       String?
  premiumSeatId    String?
  planId           String
  status           SubscriptionStatus  @default(PENDING)
  isComplimentary  Boolean             @default(false)
  grantedByUserId  String?
  startDate        DateTime?
  endDate          DateTime?
  nextBillingDate  DateTime?
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt
  deletedAt        DateTime?

  plan          SeatPlan       @relation(fields: [planId], references: [id])
  transactions  PaymentTransaction[]

  @@index([tenantId, userId])
  @@index([soloSeatId])
  @@index([premiumSeatId])
}
```

`PaymentTransaction.providerId` and `.subscriptionId` (currently required, FK'd to `ServiceProvider`/`ProviderSubscription`) need to become optional with a second optional `seatSubscriptionId` FK, since the model is being shared rather than duplicated — this is the one non-additive change in this advisory and needs its own migration care (existing rows must not be affected).

---

## 5. Pre-Execution Discovery Checklist

```bash
# 1. Confirm ProviderSubscription's exact shape to mirror faithfully rather than diverging
grep -n "model ProviderSubscription" -A 20 prisma/schema/schema.prisma

# 2. Confirm PaymentTransaction's current required FKs, to size the migration in §4
grep -n "model PaymentTransaction" -A 20 prisma/schema/schema.prisma

# 3. Confirm the payment gateway adapters are subject-agnostic (take an amount + reference,
#    not a hardcoded ServiceProvider assumption)
cat src/server/payments/paystack.ts | grep -n "ServiceProvider\|providerId"

# 4. Confirm ADVISORY-039's manage:billing permission has landed before wiring the
#    admin "Grant complimentary seat" action to SeatSubscription
grep -n "manage:billing" src/entities/tenant/api/permissions.ts

# 5. Confirm no existing code already assumes SoloSeat/PremiumSeat.tier is a price proxy
grep -rn "\.tier" src/ --include="*.ts" --include="*.tsx" | grep -i "seat"
```

```sql
-- Confirm current PaymentTransaction FK constraints before loosening them to optional
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = '"PaymentTransaction"'::regclass AND contype = 'f';
```

**Discovery deliverable:** confirmation that (a) payment gateway adapters are already subject-agnostic and need no changes, (b) the `PaymentTransaction` FK loosening is safe against existing provider-billing data, and (c) ADVISORY-039's permission split has landed so the complimentary-grant wiring has something to gate on.

### 5.1 Discovery Results (2026-08-17, Gate G0 ✅)

| #   | Check                                        | Result                                                                                                                                                                                                                                                                                                   |
| --- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | ProviderSubscription shape                   | **Confirmed.** `providerId`, `tenantId`, `tierId`, `status`, `startDate`/`endDate`/`nextBillingDate`, `price`, `currency`, `paymentGateway`, `transactions[]`, `charges[]`, `invoices[]`. The exact shape to mirror.                                                                                     |
| 2   | PaymentTransaction FKs                       | **Confirmed, safe to loosen.** `providerId` (NOT NULL → ServiceProvider, ON DELETE RESTRICT), `subscriptionId` (NOT NULL → ProviderSubscription, RESTRICT), `tenantId` (NOT NULL → Tenant, RESTRICT). **0 existing PaymentTransaction rows**, so the optional-FK migration has no data to protect today. |
| 3   | Payment gateway subject-agnosticism          | **Confirmed.** `PaystackService`/`PayPalService` take only `reference`, `email`, `amount`, `currency`, `metadata` — no hardcoded `ServiceProvider`/`providerId`. No changes needed.                                                                                                                      |
| 4   | `manage:billing` permission                  | **Landed.** Present in `src/shared/lib/permissions.ts` and already gating `src/app/api/seats/route.ts` + the plan-centre page.                                                                                                                                                                           |
| 5   | `SoloSeat`/`PremiumSeat.tier` as price proxy | **Not used as price.** Only display-field reads; no UI or API reads seat `.tier` as a price/interval. No existing behavior breaks when `SeatPlan` becomes the price source.                                                                                                                              |

**Discovery deliverable conclusions:**

- (a) Payment gateways require **no changes**.
- (b) `PaymentTransaction` FK loosening is **safe** (0 existing rows), but the advisory's optional-FK migration should still add a `CHECK` enforcing exactly one of `providerId`/`seatSubscriptionId`, since future provider rows will coexist.
- (c) ADVISORY-039's `manage:billing` permission **has landed**; Phase 4's complimentary-grant wiring has a permission to gate on.

**Note:** `SoloSeat` and `PremiumSeat` both still carry a bare `tier String` (display-only). This advisory does not propose removing it — `SeatPlan` becomes the authoritative billing source, and the legacy `tier` string remains a non-billing display field until a later cleanup.

---

## 6. Phased Execution Plan

### Phase 0 — Discovery

Run §5 checklist, produce findings note. **Gate: G0**

**Status: COMPLETE (2026-08-17).** See §5.1. G0 blocker cleared.

### Phase 1 — `SeatPlan` (additive only)

Add `SeatPlan` + `SeatType` enum. Seed two rows (Solo, Premium) with the prices already implied by IDENTITY_MODEL.md's pricing language, pending real figures from DavDev. **Gate: G1**

### Phase 2 — `SeatSubscription`

Add `SeatSubscription`. Loosen `PaymentTransaction`'s `providerId`/`subscriptionId` to optional and add `seatSubscriptionId`, with a migration verified against existing provider-billing rows (must remain fully populated and unaffected). **Gate: G2**

### Phase 3 — Resident upgrade flow

Wire the Billing & Plan Centre "Upgrade to Solo Seat" button to create a `SeatSubscription` (`status = PENDING`) and route to the existing Paystack/PayPal checkout pattern already used for tenant billing. Premium Seat eligibility check reads `SeatPlan.eligibilityRule` instead of hardcoded logic. **Gate: G3**

### Phase 4 — Admin complimentary grant (ADVISORY-039 wiring)

"Grant complimentary seat" action creates a `SeatSubscription` with `isComplimentary = true`, `grantedByUserId` set, `status = ACTIVE`, no `PaymentTransaction`. **Gate: G4 — depends on ADVISORY-039 Phase 1/3 landing first**

### Phase 5 (deferred, named not scheduled) — Billing stack consolidation

If a third near-duplicate billing stack becomes a maintenance burden, revisit Option 4 (polymorphic `Subscription`) as its own advisory. Not scheduled as part of this work.

---

## 7. Risk Register

| Risk                                                                                                                                                     | Likelihood                      | Impact                                          | Mitigation                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| This is the third structurally-duplicated billing stack in the schema                                                                                    | Certain (by design of Option 3) | Low now, Medium long-term (maintenance surface) | Named explicitly rather than hidden; Phase 5 is on record as the deliberate future option if duplication becomes costly                                                                          |
| Loosening `PaymentTransaction`'s required FKs breaks existing provider-billing queries that assume `providerId` is always present                        | Low                             | High                                            | Discovery item 2 + a reconciliation query before migration; consider a `CHECK` constraint requiring exactly one of `providerId`/`seatSubscriptionId` to be set, to prevent orphaned transactions |
| `eligibilityRule` as free-form JSON becomes an untyped, unvalidated rule engine                                                                          | Medium                          | Low                                             | Scope Phase 1 to a single documented shape (`{"minProperties": N}`) rather than open-ended rule composition; revisit only if a second rule type is actually needed                               |
| Complimentary grant bypasses billing but still needs to look identical to a paid seat everywhere else in the product (dashboard, seat comparison matrix) | Low                             | Low                                             | `SeatSubscription.isComplimentary` is a flag on the same model, not a separate code path — downstream seat-status checks don't need to branch on it                                              |
| Real pricing figures aren't available at Phase 1 seed time                                                                                               | Medium                          | Low                                             | Seed rows are placeholders explicitly pending DavDev sign-off (Gate G1); nothing charges real money until Phase 3 checkout wiring, which is a separate, later gate                               |

---

## 8. Done Criteria

- [x] ✅ Discovery findings note (§5.1) attached; G0 passed
- [ ] ⏳ `SeatPlan`, `SeatSubscription`, `SeatType` exist in `prisma/schema.prisma`
- [ ] ⏳ `PaymentTransaction` FKs loosened with a verified-safe migration against existing provider data
- [ ] ⏳ Resident Billing & Plan Centre "Upgrade" button creates a real `SeatSubscription` and routes to real checkout, no hardcoded prices remain in UI code
- [ ] ⏳ Premium Seat eligibility reads `SeatPlan.eligibilityRule`, not inline application logic
- [ ] ⏳ Admin "Grant complimentary seat" (ADVISORY-039) writes a `SeatSubscription` row with full audit fields, no `PaymentTransaction`
- [ ] ⏳ Discovery findings note confirms payment gateway adapters required no changes

---

## 9. Decision Gates

| Gate   | Question for DavDev                                                                                                                                                 | Blocks         |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| **G0** | ~~Confirm advisory number (040) against the register~~ **SATISFIED 2026-08-17 — discovery complete (§5.1)**                                                         | All execution  |
| **G1** | Confirm real Solo Seat / Premium Seat pricing figures (the R89/month in the mockup was illustrative, not sourced)                                                   | Phase 1        |
| **G2** | Confirm `PaymentTransaction` FK loosening is acceptable versus a stricter alternative (e.g. a `CHECK` constraint enforcing exactly one subject FK)                  | Phase 2        |
| **G3** | Confirm Premium Seat's eligibility rule is genuinely just `minProperties` for now, or whether other conditions (tenure, tier) need to be representable from day one | Phase 3        |
| **G4** | Confirm sequencing against ADVISORY-039 — this phase should not begin before that advisory's `manage:billing` permission and Plan & Seats admin view exist          | Phase 4        |
| **G5** | Confirm Phase 5 (billing stack consolidation) stays explicitly out of scope and unscheduled, not silently expected as part of this advisory                         | Scope boundary |
