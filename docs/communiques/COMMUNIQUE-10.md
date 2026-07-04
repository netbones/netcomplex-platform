# COMMUNIQUE-10 — Model Duplication: Seat Polymorphism & Invoice/Payment Overlap

**To:** Architecture Advisors
**Date:** 2026-07-03
**Status:** Decision Required
**Trigger:** `soralia-village-sioz` — assessment of three near-identical model clusters flagged in PRISMA_ANALYSIS.md findings #6, #7.

---

## 1. What We Found

Three duplication clusters in the Prisma schema, each sharing ~10–14 identical fields across separate tables:

### Cluster A: Seat Models (PremiumSeat, SoloSeat, StandardSeat)

3 tables → 1 with type discriminator. **12 shared fields** (id, tenantId, userId, platformAddress, organizationId, status, archivedAt, addressId + 3 relations).

| Discriminator | Unique Fields                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------ |
| PREMIUM       | isActive, portfolioName, subscriptionTier, maxProperties, messageRetentionDays, tier, PropertyPremiumSeat junction |
| SOLO          | propertyId?, seatType, isComplimentary, linkedFromProfileId                                                        |
| STANDARD      | propertyId (required), isPrimaryOwner, @@unique([userId, propertyId])                                              |

**Key asymmetry:** `user.premiumSeat` is singular/optional (unique), while `user.soloSeat`/`user.standardSeat` are arrays.

### Cluster B: Invoice Models (TenantInvoice, ProviderInvoice)

2 tables → 1 with type discriminator. **13 shared fields** — financial core is identical.

| Domain           | Unique Fields                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------- |
| TENANT_BILLING   | subtotal, taxAmount, downloadReady                                                       |
| PROVIDER_BILLING | providerId, platformFee, processorFee, netAmount, deletedAt, Provider FK, Transaction FK |

**Hard problem:** `subscriptionId` is polymorphic — points to either `TenantSubscription` or `ProviderSubscription`. No single FK can enforce both.

### Cluster C: Payment Models (TenantPayment, PaymentTransaction)

2 tables → 1 with type discriminator. **14 shared fields** — the most extreme overlap (amount, currency, platformFee, processorFee, netAmount, status, gateway, externalRef, invoiceUrl all identical).

| Domain           | Unique Fields                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------------- |
| TENANT_PAYMENT   | couponId?                                                                                                  |
| PROVIDER_PAYMENT | providerId, deletedAt, Provider FK, + 3 child collections (ProviderCharge, ProviderInvoice, RevenueRecord) |

**Downstream impact:** `PaymentTransaction` is referenced by 3 child models. Any rename cascades across 3 FK columns.

---

## 2. Options

### Option A — Consolidate Seats Only (highest ROI)

Unify PremiumSeat + SoloSeat + StandardSeat into a single `Seat` model with `enum SeatType`, keeping nullable premium-only/solo-only fields. Leave invoice/payment duplication for later.

**Pros:** 3 tables → 1, ~36 fields deduplicated. No child-model FK chains to update. Clean win.
**Cons:** `user.premiumSeat` (singular accessor) → `user.seats.find(s => s.seatType === 'PREMIUM')`. Downstream code churn.
**Complexity:** HIGH (6–8h + data migration, but isolated to seat domain).

### Option B — Consolidate Invoices Only

Unify TenantInvoice + ProviderInvoice into a single `Invoice` model with `enum InvoiceDomain`. Polymorphic `subscriptionId` handled via two nullable FKs + CHECK constraint.

**Pros:** Single financial lineage queryable across tenant/provider billing.
**Cons:** No FK enforcement for polymorphic subscriptionId. Medium downstream impact.
**Complexity:** MEDIUM (4–6h + data migration).

### Option C — Consolidate Payments Only

Unify TenantPayment + PaymentTransaction into a single `Transaction` model with `enum TransactionDomain`. Requires updating 3 child-model FK references.

**Pros:** Fixes fragmented financial ledger. Fixes missing `deletedAt` on tenant payments (soft-delete gap).
**Cons:** Highest downstream impact — 3 child collections re-point FKs. Highest risk.
**Complexity:** HIGH (6–8h + data migration).

### Option D — Consolidate All Three (full sweep)

Execute A + B + C together in a coordinated phase. Share the data-migration tooling and testing infra.

**Pros:** Single migration window. No partial-state debt.
**Cons:** Large diff, high review burden, high rollback risk. Blocked on architect sign-off for the polymorphic FK pattern.
**Complexity:** VERY HIGH (estimated 3–4 days).

### Option E — Do Nothing

Accept the duplication. Add documentation noting the models are intentionally separate due to differing FK targets and access patterns.

**Pros:** Zero risk.
**Cons:** Perpetuates debt flagged in PRISMA_ANALYSIS.md. Querying a unified financial ledger requires UNION queries. Any new seat variant adds a 4th table.

---

## 3. Decision Required

Which path should we take?

The polymorphic `subscriptionId` FK (pointing to either `TenantSubscription` or `ProviderSubscription`) is the key architectural constraint. Pure relational databases cannot express a polymorphic FK — the options are:

1. **Two nullable FKs + CHECK constraint** (principled but verbose)
2. **Single opaque `subscriptionId` string + no FK enforcement** (flexible but risks referential drift)
3. **Keep separate tables for invoice/payment** (safe, duplicates persist)
4. **Seat-only consolidation now** (clean win, defer invoice/payment)

---

## 4. Tracked As

BD issue: `soralia-village-sioz` (assessment complete, awaiting decision)
