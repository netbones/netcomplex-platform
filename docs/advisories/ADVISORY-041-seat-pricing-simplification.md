---
title: ADVISORY-041: Collapse Seat Pricing to a Flat Rate Card (R12.50/Household, 60-Home Floor)
status: proposed
reviewed: 2026-08-18
tags: [advisory, pricing, architecture]
audience: developer
---

# ADVISORY-041: Collapse Seat Pricing to a Flat Rate Card (R12.50/Household, 60-Home Floor)

**Status:** Proposed
**Priority:** High (commercial-facing, blocks pricing page correctness)
**Related Advisories:** ADVISORY-040 (Seat-Level Billing Model — `SeatPlan`/`SeatSubscription`), [PRICING_REPORT.md](../reports/PRICING_REPORT.md) (2026-08-17, seat pricing vs tenant tier coherence findings)
**Related ADRs:** none directly; touches `docs/product/SaaS/SaaS_License_Agreement_Soralia_v10` §4.1–4.3 (contract, not code)
**Source:** DavDev decision memo, 2026-08-18 (this document formalizes that decision into the standard advisory pipeline)

---

## 1. Problem Statement

[PRICING_REPORT.md](../reports/PRICING_REPORT.md) (2026-08-17) documented six live pricing surfaces (marketing page, billing seed, the SaaS Licence Agreement's volume ladder, the infra cost model, ADVISORY-040's tentative `SeatPlan` figures, and stale legacy fields) that disagree with each other on what a "seat" costs, with the same nominal tier ("Premium"/"foundation") showing four different numbers depending on which screen a person looks at.

The report's own recommended fix (§4.1) was a two-level rate card: tenant tier sets a _base_ Standard-seat rate from a four-step volume ladder (R15.00/mo down to R12.50/mo as home count rises), and seat type applies a multiplier against that base (1.0× Standard/Solo, 1.5× Premium). That model is internally coherent but is still a ladder — it requires the market-facing pricing page to explain "your rate depends on your home count," which works against a second, business-level goal that sits outside the report's scope: **competing head-on against EstateMate's flat R10/household rate**, which is aggressively simple and has no visible ladder.

DavDev's direction (2026-08-18): drop the _public_ ladder entirely. Publish one number — **R12.50/household/month** — with a **60-home minimum** floor, and win the comparison against EstateMate on a value differentiator ("expressive communities" / dWallet resident revenue-share) rather than on price alone, since R12.50 > R10.

This advisory captures that decision, reconciles it against the report's still-open gates (D1–D6), and sequences it into ADVISORY-040's `SeatPlan`/`SeatSubscription` schema work so it ships as data, not a sixth hardcoded price surface.

---

## 2. Root Cause Analysis

This section is a _decision record_, not a fresh schema investigation — the schema-level root causes (five hardcoded price surfaces, `PremiumSeat.subscriptionTier` legacy field, `Tenant.subscriptionTier` legacy field) were already diagnosed in [PRICING_REPORT.md](../reports/PRICING_REPORT.md) §3 and are inherited here verbatim. What this advisory adds is the _resolution_ of the report's open gates, plus one new consideration the report didn't carry a business mandate to decide:

| Finding                                                                                                                                | Evidence                                                        | Consequence for this advisory                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The report's ladder model (§4.1) charges _more_ per seat as home count drops (R15.00/mo at 100–120 homes down to R12.50/mo at 176–200) | [PRICING_REPORT.md](../reports/PRICING_REPORT.md) §2.3, §4.1    | A flat R12.50 published market-wide is **below** the ladder's rate for any tenant under 176 homes — this is a deliberate margin decision, not an oversight, and must be sized against infra cost (next row)                                 |
| Infra floor cost is ~R729–R1,053/mo regardless of tenant size (Surface D)                                                              | [PRICING_REPORT.md](../reports/PRICING_REPORT.md) §2.4          | A flat per-household rate without a floor risks selling below cost to small communities; a minimum home count is the correct lever, not a per-seat markup that would break the "one number" pitch                                           |
| 60 homes × R12.50 = R750/mo, inside the R729–R1,053 infra floor range                                                                  | Arithmetic against Surface D                                    | Confirms 60 homes is a defensible minimum — clears the low end of the floor with limited headroom, not a large margin cushion                                                                                                               |
| The contract's existing volume ladder has no tier below 100 homes (Tier 1 = 100–120)                                                   | [PRICING_REPORT.md](../reports/PRICING_REPORT.md) §2.3          | Communities between 60–99 homes are **new commercial territory** — not covered by the current SaaS Licence Agreement v10 at all. This advisory's rate for that band is provisional until the licence agreement is amended (see §9 Gate G3). |
| ADVISORY-040 §5.1 tentatively priced PremiumSeat at a flat R36/mo, independent of any base rate                                        | [PRICING_REPORT.md](../reports/PRICING_REPORT.md) §2.5, Gate D2 | DavDev's direction supersedes this: Premium becomes 1.5× the R12.50 base = **R18.75/mo**, restoring the contract's multiplier rule instead of a standalone figure                                                                           |
| SoloSeat has never been priced or included in the licence agreement                                                                    | [PRICING_REPORT.md](../reports/PRICING_REPORT.md) §3.5, Gate D3 | DavDev's direction resolves this: SoloSeat = 1.0× base = **R12.50/mo**, sold as a paid add-on                                                                                                                                               |

**Root cause, stated simply:** the report correctly diagnosed a schema/naming problem (five surfaces, no relationship rule) and proposed a mathematically coherent but commercially complex ladder as the fix. DavDev's decision keeps the report's _mechanism_ (`SeatPlan` = base × multiplier, read from the DB, zero hardcoded prices) but simplifies the _public-facing base rate_ from a four-step ladder to one flat number with a floor — trading a small amount of margin precision at the low end for a materially simpler sales pitch against a specific, named competitor.

---

## 3. Options

| #   | Option                                                           | Description                                                                                                                                             | Pros                                                                                                                                      | Cons                                                                                                                                                                                     |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Do nothing — ship the report's ladder as-is**                  | Publish the four-tier volume ladder (R15.00 → R12.50) as the public rate card                                                                           | Mathematically precise margin at every home count; already contract-compatible                                                            | Fails the stated competitive goal — a ladder cannot be pitched as "simpler than EstateMate's flat R10"; a prospective board has to compute their own rate before they can compare offers |
| 2   | **Flat R12.50, no minimum**                                      | Publish R12.50/household with no floor                                                                                                                  | Simplest possible pitch                                                                                                                   | Sells below the infra cost floor to any tenant under ~58 homes; no protection against small, high-support-cost communities signing at a loss                                             |
| 3   | **Flat R12.50, 60-home minimum** (recommended, DavDev direction) | Publish R12.50/household for tenants at or above 60 homes; sub-60 tenants priced at the existing Tier 1 rate (R15.00/mo) until they cross the threshold | One clean headline number for the segment being targeted against EstateMate; floor protects margin; doesn't turn away small HOAs outright | Creates a two-band public price (R15.00 under 60 homes, R12.50 at 60+) — not perfectly "one number," but the R12.50 figure is what's marketed and what 90%+ of realistic prospects see   |
| 4   | **Flat R12.50, hard decline under 60 homes**                     | Same floor, but sub-60 tenants are not offered a plan at all                                                                                            | Cleanest possible public pricing (truly one number)                                                                                       | Turns away small communities entirely, which may be a meaningful share of the addressable market and contradicts the platform's stated goal of broad community access                    |

**Recommendation: Option 3**, matching DavDev's direction. Sub-60 tenants keep an existing, already-contracted rate (Tier 1) rather than a new one, so this doesn't require inventing a fifth price band — it reuses [PRICING_REPORT.md](../reports/PRICING_REPORT.md)'s own Tier 1 figure as the "not yet at flagship rate" fallback.

---

## 4. Architecture: Before / After

### Before (per [PRICING_REPORT.md](../reports/PRICING_REPORT.md), as-is)

```
Public pricing page ──► hardcoded R599/R299/Custom (Surface A, disagrees with Surface B)
Billing seed         ──► R0/R299/R999 flat tenant fee (Surface B)
Licence agreement     ──► 4-tier volume ladder, R15.00→R12.50/mo Standard, 1.5× Premium (Surface C)
Infra cost model      ──► R20–60/mo per-home planning targets, never meant as list price (Surface D)
ADVISORY-040 draft     ──► StandardSeat R12.50, SoloSeat R12.50 (tentative), PremiumSeat R36 flat (Surface E)
No relationship rule exists between any of these and no seat price is read from the DB.
```

### After (this advisory + ADVISORY-040 Phase 1–2)

```
SeatPlan (DB, per ADVISORY-040 Option 3)
├── baseRate: R12.50/mo  (single flagship rate, tenants ≥ 60 homes)
├── belowMinimumRate: R15.00/mo  (Tier 1 fallback, tenants < 60 homes — provisional, see Gate G3)
├── minimumHomes: 60
├── StandardSeat  → 1.0 × base
├── SoloSeat      → 1.0 × base  (newly priced — resolves Gate D3)
└── PremiumSeat   → 1.5 × base  (resolves Gate D2 in favor of contract multiplier over ADVISORY-040's flat R36)

Public pricing page, admin Plan & Seats UI, and setup copy all read SeatPlan.
The internal 4-tier ladder (Tier 2–4) is retained only as an enterprise negotiation
lever for large multi-scheme deals — it is never rendered on customer-facing surfaces.
```

This is a strict simplification of ADVISORY-040's already-recommended `SeatPlan`/`SeatSubscription` schema (Option 3) — no new tables are introduced. The only schema-relevant change from ADVISORY-040 as originally scoped is that `SeatPlan` seeding uses two rate bands (flagship + below-minimum) instead of four ladder tiers, and `PremiumSeat`'s multiplier is fixed at 1.5× rather than carrying a standalone price.

---

## 5. Pre-Execution Discovery Checklist

Run before any seeding or pricing-page change, consistent with standing practice (Phase 0 discovery precedes code):

```bash
# 1. Confirm ADVISORY-040's SeatPlan/SeatSubscription schema has not yet shipped
#    (this advisory must land as part of that phase, not as a parallel sixth surface)
grep -rln "SeatPlan" prisma/schema/ src/db/schema/ src/entities/ 2>/dev/null

# 2. Inventory every current hardcoded price literal so all five surfaces are replaced together
grep -rn "R599\|R299\|R999\|R12.50\|R18.75\|R36" src/app/api/pricing/route.ts \
  src/app/\(platform\)/features/page.tsx \
  src/widgets/dashboard/ui/AdminSubscriptionsWidget.tsx \
  src/features/setup/ui/sections/ConfigureSection.tsx \
  src/shared/lib/billing/seed-plans.ts

# 3. Confirm no existing tenant is currently below 60 homes and already on a flagship-rate contract
#    (would indicate a live pricing conflict, not just a future-state decision)
```

```sql
-- Run against a read replica / non-prod snapshot only
SELECT t.slug, t.name, COUNT(p.id) AS property_count
FROM "Tenant" t
LEFT JOIN "Property" p ON p."tenantId" = t.id
GROUP BY t.slug, t.name
HAVING COUNT(p.id) < 60;
```

```bash
# 4. Confirm Soralia's own anchor-tenant subsidy (infra model §9, Gate D6) does not
#    silently collide with the new flagship rate once this ships
grep -rn "subsidy\|anchor" docs/product/NetComplex_Infrastructure_Cost_Model_2026.md
```

**Discovery deliverable:** a short findings note confirming (a) whether ADVISORY-040's `SeatPlan` schema is mid-flight or not-yet-started, so this advisory's seed data lands in the right phase, and (b) whether any tenant currently sits below the 60-home floor with an active subscription, which would need explicit grandfathering language rather than a silent rate change.

---

## 6. Phased Execution Plan

Sequenced as a refinement of ADVISORY-040's existing phases, not a parallel track.

### Phase 1 — Seed the simplified rate card (additive, extends ADVISORY-040 Phase 1)

- Ship `SeatPlan` per ADVISORY-040 Option 3, seeded with exactly two Standard-seat rate rows (flagship R12.50 ≥60 homes, fallback R15.00 <60 homes) instead of the report's four-tier ladder
- Seed `SoloSeat` SeatPlan row at 1.0× base (newly priced)
- Seed `PremiumSeat` SeatPlan row at 1.5× base (supersedes ADVISORY-040 §5.1's flat R36 figure)
- **Gate: G1** — confirm the 60-home threshold and the R15.00 fallback rate are final before seeding

### Phase 2 — Replace all five hardcoded price surfaces

- Delete hardcoded literals from `pricing/route.ts`, `features/page.tsx`, `AdminSubscriptionsWidget.tsx`, `ConfigureSection.tsx`, and rewrite `pricing.test.ts` against fixture data
- All four surfaces read `getSeatPlan(tenantId)` / `getTenantBillingSnapshot()`, per [PRICING_REPORT.md](../reports/PRICING_REPORT.md) §5 (P1)
- Add the price-source guard (Steiger/ESLint rule or a grep-based unit test) recommended in [PRICING_REPORT.md](../reports/PRICING_REPORT.md) §5.5, so a sixth hardcoded price cannot be reintroduced
- **Gate: G2** — confirm Foundation's pre-existing R599/R299 contradiction (Gate D1, unrelated to this advisory) is resolved separately before or alongside this phase, so the pricing page ships internally consistent end-to-end

### Phase 3 — Marketing kicker + comparison positioning

- Update the public pricing page copy to lead with the dWallet / resident revenue-share differentiator, not price alone, per DavDev's direction
- Surface the 5 complimentary Premium board seats explicitly as "governance seats included"
- **Gate: G3** — confirm whether the 60–99 home band's R15.00 fallback rate needs a formal amendment to the SaaS Licence Agreement v10 (which currently has no tier below 100 homes), or whether it ships as an internal pricing decision pending a future contract revision

### Phase 4 — Reconcile Soralia's anchor subsidy against the new flagship rate (Gate D6, deferred)

- Confirm Soralia Village's actual invoiced rate against the new R12.50 flagship and infra model §9's subsidized figure; store as an explicit tenant-level override so admin/board see the real deal rather than a number that silently diverges from the public rate card
- **Gate: G4** — separate from this advisory's core scope; sequence after Phase 2 ships

---

## 7. Risk Register

| Risk                                                                                                                                                                                                                        | Likelihood                 | Impact | Mitigation                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 60-home floor doesn't fully cover support/operational cost beyond raw infra (only infra was modeled in Surface D)                                                                                                           | Medium                     | Medium | Treat R750/mo as a floor with limited headroom, not a margin target; revisit after 2–3 tenants onboard at or near the minimum                                                                                                 |
| Publishing R12.50 undercuts the existing contract's Tier 2–4 rates for tenants that would otherwise pay more under the ladder (e.g., a 120-home tenant currently modeled at R170/yr = R14.17/mo now sees R12.50 advertised) | High                       | Medium | Deliberate trade-off per DavDev's direction; existing signed tenants keep their contracted rate unless voluntarily migrated — this advisory prices _new_ sales, not automatic renegotiation of live contracts                 |
| 60–99 home band has no contractual basis in SaaS Licence Agreement v10                                                                                                                                                      | High (by definition)       | Medium | Gate G3 explicitly flags this; do not sell into this band under a formal contract until the licence agreement is amended, or sell under an interim addendum                                                                   |
| Marketing kicker (dWallet revenue-share) overpromises before the underlying revenue-share mechanics (data revenue streams, payout cadence) are commercially proven at scale                                                 | Medium                     | High   | Coordinate Phase 3 copy with whoever owns dWallet's actual revenue-share numbers before publishing hard claims; keep initial copy qualitative ("residents share in platform revenue") rather than quoting speculative figures |
| This advisory ships as a parallel sixth pricing surface instead of landing inside ADVISORY-040's schema work                                                                                                                | Low if sequenced correctly | High   | Discovery step §5(1) is mandatory before Phase 1 begins — confirm ADVISORY-040's `SeatPlan` status first                                                                                                                      |

---

## 8. Done Criteria

- [ ] ⏳ `SeatPlan` seeded with exactly the flagship (R12.50, ≥60 homes) and fallback (R15.00, <60 homes) Standard-seat rows, plus SoloSeat (1.0×) and PremiumSeat (1.5×) rows
- [ ] ⏳ All five previously-hardcoded price surfaces (`pricing/route.ts`, `features/page.tsx`, `AdminSubscriptionsWidget.tsx`, `ConfigureSection.tsx`, `pricing.test.ts`) read from `SeatPlan`/`getTenantBillingSnapshot()` with zero remaining literal price strings
- [ ] ⏳ Price-source guard in place (lint rule or grep-based test) preventing reintroduction of hardcoded prices
- [ ] ⏳ Public pricing page copy leads with the dWallet/expressive-communities kicker, not price alone
- [ ] ⏳ 5 complimentary Premium board seats explicitly surfaced as included in copy
- [ ] ⏳ Discovery findings note (§5) confirms no live tenant is currently below the 60-home floor without explicit grandfathering
- [ ] ⏳ Gate D1 (Foundation R599 vs R299) resolved before or alongside this advisory's Phase 2, so the shipped pricing page is internally consistent

---

## 9. Decision Gates

| Gate   | Question for DavDev                                                                                                                                                  | Blocks  |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| **G1** | Confirm 60 homes / R750 floor and R15.00 sub-60 fallback rate are final, and confirm advisory number against the external register                                   | Phase 1 |
| **G2** | Confirm resolution path for the pre-existing Foundation R599/R299 contradiction (Gate D1) so it doesn't ship inconsistently alongside this advisory                  | Phase 2 |
| **G3** | Confirm whether the 60–99 home band requires a formal SaaS Licence Agreement v10 amendment before being sold under contract, or can ship as an interim internal rate | Phase 3 |
| **G4** | Confirm Soralia's anchor-tenant subsidy (Gate D6) is sequenced as a follow-on, not blocking this advisory's core rollout                                             | Phase 4 |
