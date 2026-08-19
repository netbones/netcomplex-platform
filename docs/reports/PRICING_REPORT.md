# Seat Pricing vs Tenant Tier Coherence Report

**Date:** 2026-08-17 (updated 2026-08-18)
**Scope:** Reconciliation of the competing pricing systems on Netcomplex / Soralia Village.
**Status:** Findings + recommendations. Values are quoted as found; `[Gate Gx]` markers are open decisions requiring DavDev sign-off.

> ⚠️ **Supersession notice (2026-08-18):** ADVISORY-040's tentative seat figures in §2.5
> below are **stale**. They were superseded the day after this report was written by
> **ADVISORY-041** (`docs/advisories/ADVISORY-041-seat-pricing-simplification.md`), formalised
> for executers by **ADVISORY-040-SUPPLEMENTAL-1**. ADVISORY-041 resolves most of this
> report's open gates (D2, D3) and keeps this report's _mechanism_ (`SeatPlan` = base ×
> multiplier, zero hardcoded prices), but collapses the public rate to a single flagship
> figure with a 60-home floor. Read §2.5, §4.1, §6, and §7 below in the light of §2.5a / §5 P2a.
> Gates G1/D2/D3 are closed by ADVISORY-041; **G5/D7 closed 2026-08-19** (see §2.5a
> and §6 — labour subsidy funded until the third scheme, R12.50 stays all-in);
> G2/D1, G3, G4 remain open.

---

## 1. Executive Summary

The project does not have "two competing pricing systems" — it has **four** surfaces that
misrepresent two different units of account under the same word ("seat"), plus two stale
legacy field sets. The result is that the same SKU shows different prices on different
screens, and the one real relationship the user cares about — **tenant plan → seat price** —
is not representable in the schema or the code at all.

**In one sentence:** a _Tenant Tier_ is a B2B rate card (what NetComplex charges the HOA),
a _Seat_ is a B2C/B2B2C licence SKU (what a household or individual is provisioned with),
and today both are hardcoded in five places under three different tier names with no rule
linking them.

The recommended outcome is a two-level model encoded as data, not constants:

```
TenantTier (STANDARD | PREMIUM | ENTERPRISE)   → capability ceiling + platform rate card
        │  (gates which Seat SKUs are sellable and sets their per-seat rate)
        ▼
Seat SKUs (StandardSeat, SoloSeat, PremiumSeat) → per-seat licence pricing (SeatPlan)
```

---

## 2. The Inventory — Every Pricing Surface

### 2.1 Surface A — Marketing / pricing page (B2B flat fee, per tenant)

| Source                                                | Tier → Price                                           |
| ----------------------------------------------------- | ------------------------------------------------------ |
| `src/app/api/pricing/route.ts:14-73`                  | core `R299/mo`, foundation `R599/mo`, pro-max `Custom` |
| `src/app/(platform)/features/page.tsx:202-224`        | core `R299/mo`, foundation `R599/mo`, pro-max `Custom` |
| `src/app/api/pricing/__tests__/pricing.test.ts:78,88` | **tests hardcode** foundation `R599`, core `R299`      |

The route itself admits: _"In the future, this could fetch from a database — for now, return static data"_ (`pricing/route.ts:80-81`). That future is now overdue.

### 2.2 Surface B — Billing seed data (Drizzle `billingPlans`)

`src/shared/lib/billing/seed-plans.ts:9-96`:

| Plan       | monthlyPrice  | annualPrice | seatLimits           |
| ---------- | ------------- | ----------- | -------------------- |
| Standard   | **R0** (free) | R0          | maxStandardSeats 50  |
| Premium    | **R299**      | R2,990      | maxStandardSeats 200 |
| Enterprise | **R999**      | R9,990      | unlimited            |

Note: `seatLimits` is a **cap**, not a price. And `AdminSubscriptionsWidget.tsx:26-37`
hardcodes the same numbers again (FREE / R299/mo / R999/mo) — a third copy.

### 2.3 Surface C — SaaS Licence Agreement v10 (the contract — legally drafted)

`docs/product/SaaS/SaaS_Licence_Agreement_Soralia_v10.txt` §4.1–4.3:

- Fees are **per Household Licence / per Premium Seat, per annum**.
- **Volume ladder by household count** (Standard seat only):

| Tier   | Households | Std seat /yr | Std seat /mo | Premium (1.5×) /yr | /mo    |
| ------ | ---------- | ------------ | ------------ | ------------------ | ------ |
| Tier 1 | 100–120    | R180         | R15.00       | R270               | R22.50 |
| Tier 2 | 121–150    | R170         | R14.17       | R255               | R21.25 |
| Tier 3 | 151–175    | R160         | R13.33       | R240               | R20.00 |
| Tier 4 | 176–200    | R150         | R12.50       | R225               | R18.75 |

- **Premium = 1.5 × Standard** — a fixed legal multiplier.
- **5 complimentary Premium Seats** for the board/committee.
- Invoiced on _Licence Count_ at term start (§4.3), pro-rata on increases.
- **Solo Seats do not exist in the contract.**

### 2.4 Surface D — Infrastructure cost model (unit economics, planning-only)

`docs/product/NetComplex_Infrastructure_Cost_Model_2026.md`:

- §2: Soralia-scale infra ≈ R729–R1,053/mo.
- §5: blended revenue target **R39/hh (conservative) — R75/hh (expected)**.
- §8: rollout "seat prices" including VAT — **Standard-Entry R20.08, Premium-Mid R40.16, Enterprise-Max R59.78** (ex-VAT R17.46 / R34.92 / R51.98).
- §9: Soralia anchor subsidy — full Enterprise features at Premium-Mid price (R34.92), a 32.8% pilot discount.
- Also references the R30,000 setup + R6,750/mo flat SaaS fee from the financial model.

### 2.5 Surface E — Seat-billing advisory (STALE as of 2026-08-18)

`docs/advisories/ADVISORY-040-seat-billing-model.md` §5.1 (2026-08-17):

- StandardSeat + 5 aliases — **R12.50/mo**
- SoloSeat (vanity address) — **R12.50/mo**
- PremiumSeat — **R36/mo**

The mockup's illustrative R89/mo Solo figure is superseded; G1 sign-off pending. The advisory
also delivers the right recommendation for _where_ seat prices should live: `SeatPlan` +
`SeatSubscription` (its Option 3).

### 2.5a Surface E′ — Final pricing (ADVISORY-041, 2026-08-18) — SUPERSEDES §2.5

`docs/advisories/ADVISORY-041-seat-pricing-simplification.md` (formalised into ADVISORY-040's
pipeline by `ADVISORY-040-SUPPLEMENTAL-1.md`) resolved the tentative figures and one major
strategic question this report explicitly left open — **the report's own §4.1 ladder was
rejected by DavDev in favour of a flat public rate card** to compete head-to-head on
simplicity against EstateMate's R10/household:

| Seat offering                               | ADVISORY-041 final (current) | Basis                                                                                                         |
| ------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| StandardSeat + 5 aliases, tenant ≥ 60 homes | **R12.50/mo**                | flagship base rate                                                                                            |
| StandardSeat + 5 aliases, tenant < 60 homes | **R15.00/mo**                | Tier 1 fallback (reuses the contract's Tier 1 figure — no fifth band invented)                                |
| SoloSeat                                    | **R12.50/mo**                | 1.0 × base — resolves this report's Gate D3                                                                   |
| PremiumSeat                                 | **R18.75/mo**                | 1.5 × base — resolves this report's Gate D2 in favour of the contract multiplier over ADVISORY-040's flat R36 |

Key structural points for anyone reading ADVISORY-040/041 together:

- **`SeatPlan` seeding becomes four rows, not three**: two Standard rows (flagship/fallback)
  carrying a `minimumHomes: 60` floor, plus Solo (1.0×) and Premium (1.5×) multiplier rows.
  Multipliers should be stored and computed against whichever Standard rate applies at read
  time, per ADVISORY-041 §4.
- **The internal four-tier ladder (Tier 2–4) is not deleted** — it is retained as an
  enterprise-negotiation lever for large multi-scheme deals and **never rendered on
  customer-facing surfaces** (ADVISORY-041 §4).
- **The 60–99 home band is new commercial territory**: the SaaS Licence Agreement v10 has no
  tier below 100 homes. This band's R15.00 rate is provisional until the contract is amended —
  ADVISORY-041 Gate G3.

### 2.5b G5/D7 decision (2026-08-19) — RESOLVED

DavDev confirmed **R12.50/household is marketed all-in**, seat-licence only, competing head-on
with EstateMate (which has no direct upsell path). The infra-vs-labour gap named in §P2a/§6-D7
is funded as a **time-boxed growth subsidy**: seat revenue covers resource costs (infra
R1,050/mo) from ~84 homes/one scheme; **labour (R5,500/mo retainer) is absorbed until the
third scheme** rolls on. At three 180-home schemes (540 homes × R12.50 = R6,750/mo) the full
R6,550 operating floor is covered; every scheme after the third is ~full margin. This matches
the infra cost model §5.3 multi-tenant amortisation case. Consequences:

- R12.50 remains a single, all-in, customer-facing rate — no new per-household line items
  before the third scheme.
- The labour subsidy is a CAC/growth investment, not a silent operating loss; it must be
  revisited if the third scheme has not contracted after N quarters (see infra model annex).
- Premium/Solo multipliers (1.5× / 1.0×) are unaffected and remain additive revenue above the
  R12.50 base.

### 2.6 Surface F — Stale / legacy fields still in the schema

- `PremiumSeat.subscriptionTier String @default("basic")` + `maxProperties Int @default(5)`
  (`prisma/schema/schema.prisma:397-398`) — the dead basic/pro/enterprise seat sub-tier from
  `docs/product/PremiumModelNote.md` (which itself is superseded: it documents
  `linkedHouseholds` on `PremiumSeat`, replaced long ago by the `PropertyPremiumSeat` join table).
- `PremiumSeat.tier String @default("core")` — display-only; ADVISORY-040 §5.1 confirms no code
  reads it as a price.
- `Tenant.subscriptionTier String @default("basic")` + `Tenant.maxPages` — legacy strings,
  already flagged as non-enforced in `docs/architecture/TIER_MODEL.md` ("Migration Notes").

### 2.7 Resulting "confusion by the numbers"

The same concept — the _middle_ tier — is published as **R599** (Surface A), **R299**
(Surface B + admin widget) and, as a per-seat figure, **R40.16/mo** (Surface D, incl VAT)
or **R225/yr = R18.75/mo** (Surface C). Soralia's own deal (Surface D §9) is invoiced at a
fourth number. No two surfaces agree on the meaning of "Premium".

---

## 3. Root Cause — What Is Actually Wrong

### 3.1 "Seat price" is overloaded — two units of account share one label

This is the single source of the market confusion:

1. **Licence SKU price** (Surface C, E): what an incremental identity/licence costs —
   standard ≈ **R12.50–15/mo**, premium ≈ **R18.75–22.50/mo** (1.5× rule).
2. **Per-home cost allocation** (Surface D): how the total platform fee + margin is spread
   across homes to engineer a sustainable price — **R20–60/mo**. These are _planning targets_
   for pricing the whole SaaS fee, not incremental units.

The numbers reconcile almost exactly once separated:
**R6,750/mo flat ÷ 180 homes = R37.50/home/mo + R12.50 Tier-4 licence ≈ R50.00 ≈
R51.98 Enterprise-Max ex-VAT (Surface D).** They disagree by ~4% only because Surface D adds
margin. The models are consistent; the _naming_ is not. "Seat price" must stop meaning both.

### 3.2 No relationship rule exists between Tenant Tier and seat price

Tenant tier today controls **feature capability only**. `billingPlans.seatLimits` is a cap,
not a rate. Nothing in the schema, the API, or the UI expresses "a household on a PREMIUM
tenant pays X per seat; on an ENTERPRISE tenant pays Y". The user's intuition ("a tenant plan
impacts the seat pricing") is _exactly right_ and it is un-representable today. That is the
gap this report exists to close.

### 3.3 Three active + two legacy naming schemes for one ladder

| Scheme                                        | Source                                                   | Status        |
| --------------------------------------------- | -------------------------------------------------------- | ------------- |
| `core` / `foundation` / `pro-max`             | `TierLevel`, marketing, feature registry                 | canonical     |
| `STANDARD` / `PREMIUM` / `ENTERPRISE`         | DB `TenantTier` enum                                     | canonical     |
| Standard-Entry / Premium-Mid / Enterprise-Max | Infra model §8                                           | planning-only |
| basic / pro / enterprise                      | `PremiumSeat.subscriptionTier` (+ dead PremiumModelNote) | stale         |
| Tier 1–4 (volume ladder)                      | SaaS Licence §4.2                                        | licence-only  |

Per `docs/STEERING/UBIQUITOUS_LANGUAGE.md:39`, Core/Foundation/Pro-Max are _intended_ to be
both technical and market-facing. Nothing enforces that today.

### 3.4 Prices are hardcoded in five code paths

`pricing/route.ts`, `features/page.tsx`, `AdminSubscriptionsWidget.tsx`, `pricing.test.ts`,
and setup copy in `src/features/setup/ui/sections/ConfigureSection.tsx:282` — none read a
price table. Any price change is a redeploy to at least four files that already disagree.

### 3.5 SoloSeat was unpriced and uncontracted — resolved 2026-08-18

The liberation identity is a core concept (`IDENTITY_MODEL.md`) but appeared in no licence
agreement and only as a tentative G1 figure (Surface E). **ADVISORY-041 resolved this**: Solo
is now a priced paid add-on at **1.0 × base (R12.50/mo)** — this report's Gate D3 is closed.
The remaining legal gap is that Solo has no line in the SaaS Licence Agreement v10; it should
be added at the next contract amendment (ADVISORY-041 Gate G3).

### 3.6 One market-facing discrepancy that must be resolved before anything else

**Foundation is priced at R599 (Surface A) but R299 (Surface B/C).** The admin widget and the
billing seed agree with each other (R299), so Surface A (marketing + its tests) is the outlier
— but it is the surface customers see.

---

## 4. Recommended Coherent Model

### 4.1 The principle: two levels, one rate card

- **Tenant Tier** = capability ceiling (what modules/seats a tenant may sell or provision)
  **and** the tenant's platform rate card. It determines the _base_ per-seat rate a tenant is
  charged (the contract's volume ladder: more homes → lower base).
- **Seat SKU** = an incremental licence priced **relative to the tenant's base rate**.
- **The relationship is expressed as a multiplier, never as absolute numbers buried in UI.**

Proposed Tier × Seat matrix (recommended defaults; all figures follow the 1.5× contract rule):

| Seat SKU                     | STANDARD (core)          | PREMIUM (foundation)         | ENTERPRISE (pro-max)             |
| ---------------------------- | ------------------------ | ---------------------------- | -------------------------------- |
| **StandardSeat + 5 aliases** | 1.0 × base ✅ (required) | 1.0 × base ✅                | 1.0 × base ✅ (lowest ladder)    |
| **SoloSeat** (liberation)    | ❌ not offered           | 1.0 × base (optional add-on) | 1.0 × base (optional add-on)     |
| **PremiumSeat** (portfolio)  | ❌ not offered           | 1.5 × base (paid)            | 1.5 × base (paid) + volume tiers |
| Complimentary (board, 5)     | —                        | ✅                           | ✅                               |

Where **base** = the tenant's Standard seat rate. **ADVISORY-041 (2026-08-18) collapsed the
ladder into one public base** — see §2.5a. Current agreed values:

- **Flagship base: R12.50/mo** for tenants at or above **60 homes**.
- **Fallback base: R15.00/mo** for tenants below 60 homes (reuses the contract's Tier 1
  rate; the band is new commercial territory pending contract amendment — Gate G3).
- **Multipliers: Standard 1.0×, Solo 1.0×, Premium 1.5×.** Solo was formally priced for the
  first time (D3 resolved); Premium returns to the contract's 1.5× rule (D2 resolved —
  supersedes ADVISORY-040's flat R36).
- The report's earlier per-tier ladder (STANDARD→R14.17, PREMIUM→R13.33, ENTERPRISE→R12.50)
  is **retired from public surfaces**; the internal Tier 2–4 ladder survives only as an
  enterprise-negotiation lever (ADVISORY-041 §4).

**This is the unification rule the user asked for: the tenant's rate card sets the Standard
base; seat type sets a multiplier; the product shows `base × multiplier` read from
`SeatPlan`.** No surface hardcodes absolute seat prices again.

### 4.2 Resolve the two units of account

Introduce two explicit concepts and stop calling both "seat":

1. **Household Licence** (contract language) — the identity/addressing SKU:
   StandardSeat, SoloSeat, PremiumSeat, priced per Surface C/E′. This is what
   `SeatPlan`/`SeatSubscription` (ADVISORY-040 Option 3) should carry.
2. **Platform subscription** (B2B) — what the HOA pays NetComplex; today a flat per-tenant
   fee (Surface A/B) or a per-home allocation built in Surface D, depending on the deal
   being sold. `BillingPlan` is the carrier; **relabel its `monthlyPrice` as the platform
   rate and keep `seatLimits` as caps only.**

Both read from the DB. ADVISORY-040's Surface-D-style per-home figures stay in the _financial
planning_ document, marked "planning target, not list price", so they stop leaking into
customer-facing UI.

### 4.3 One canonical naming ladder

- DB enum + marketing labels stay: `STANDARD↔core`, `PREMIUM↔foundation`, `ENTERPRISE↔pro-max`.
- Retire: "Standard-Entry/Premium-Mid/Enterprise-Max", "basic/pro/enterprise" (seat
  sub-tier), and "Tier 1–4" as a _tier_ name (it survives only as the internal volume-ladder
  table on `SeatPlan`).
- Add a line to `UBIQUITOUS_LANGUAGE.md` formalising this mapping.

---

## 5. Concrete Recommendations (prioritised)

### P0 — Make the relationship representable (schema, additive)

1. Adopt **ADVISORY-040 Option 3**: add `SeatPlan` + `SeatSubscription` + `SeatType`
   (`SOLO | PREMIUM`). Seed **four `SeatPlan` rows** per ADVISORY-041 §6 Phase 1 — Standard
   flagship (R12.50, `minimumHomes: 60`), Standard fallback (R15.00, <60 homes), Solo
   (1.0×), Premium (1.5×) — carrying `baseRate`/`multiplier`/`billingInterval`/`minTier`
   as data, no absolute multipliers in UI. `[Gate G2]` on the PaymentTransaction FK loosening.
2. Keep `SoloSeat`/`PremiumSeat`'s bare `tier`/`subscriptionTier` strings as display-only
   (per ADVISORY-040 §5.1) but **stop seeding/spreading them**; plan a cleanup once
   `SeatPlan` is read everywhere.
3. Fix the **Foundation price contradiction**: pick **one** source of truth (admin widget +
   billing seed already say R299; marketing + tests say R599). Align marketing to the seed
   or the treasury decision `[Gate G2]`.

### P1 — Single price engine, zero hardcoded prices

4. Route all pricing reads through `getTenantBillingSnapshot()` /
   `getSeatPlan(tenantId, tier)` backed by the DB. Delete hardcoded price strings from:
   `pricing/route.ts`, `features/page.tsx`, `AdminSubscriptionsWidget.tsx`,
   `ConfigureSection.tsx` copy, and rewrite `pricing.test.ts` against fixture data rather
   than literals.
5. Add a **price-source guard** (Steiger/ESLint or a unit test that greps `src/` for
   `/R\d+/mo/`) so a hardcoded price cannot be reintroduced.

### P2 — Contract parity & invoicing

6. Encode the licence volume ladder (Tier 1–4, 1.5× multiplier, 5 complimentary seats) as
   data on `SeatPlan`/`BillingPlan`, and invoice by **Licence Count** per contract §4.3
   (annual, pro-rata on increase). This makes Soralia's actual deal — and every future deal —
   compute, not hardcode.
7. **SoloSeat** is now deliberately priced at **1.0 × base (R12.50/mo)** per ADVISORY-041 —
   the remaining task is adding it to the next licence-agreement amendment (Gate G3), since
   the contract still has no Solo line.

### P2a — Residual tension introduced by the flat rate (NEW, 2026-08-18; **decision 08-19**)

8. **Sanity-check the flat rate against the operating floor.** The flagship price
   R12.50/household yields **R2,250/mo at Soralia's 180 homes**, versus the R6,550/mo
   operating floor (R1,050 infra + R5,500 labour retainer) and the R9,357/mo 30%-margin
   target from the infra cost model §4–5. ADVISORY-041's floor math (60 homes × R12.50 =
   R750) covers **infra only** — its own risk register concedes support/labour is not
   covered. **RESOLVED 2026-08-19:** treasury approved R12.50 as the all-in marketed rate;
   the labour gap is funded as a growth subsidy until the third scheme (~540 homes) covers
   the full operating floor — see §2.5b.

### P3 — Visibility & governance

9. Move Surface D's §8 per-seat figures into a planning-only annex explicitly captioned
   **"cost-engineering targets — not list prices"** to stop them ever being treated as per-
   seat list prices again.
10. In the admin Plan & Seats UI (ADVISORY-039), render the tenant's **base rate** (with the
    60-home floor band applied) and each seat SKU's **multiplier × base = price** so
    market-facing truth and data match on the same screen.
11. Keep ADVISORY-040's Phase 5 (polymorphic `Subscription` consolidation) named-but-deferred
    — third near-duplicate billing stack is acknowledged debt, not a blocker for launch.

---

## 6. Known Discrepancies That Need a Sign-Off

| #   | Discrepancy                                                                                                                                            | Surfaces involved                                          | Recommended resolution                                                                                                                                                                                                      | Gate        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| D1  | Foundation shown as R599 vs R299                                                                                                                       | pricing API + features page vs billing seed + admin widget | **STILL OPEN.** ADVISORY-041 Phase 2 requires it resolved before the pricing page ships; note that once per-household pricing replaces the flat fee on public surfaces, this contradiction may dissolve rather than resolve | `[Gate G2]` |
| D2  | Premium seat = R36/mo (advisory) vs 1.5× contract rule                                                                                                 | ADVISORY-040 §5.1 vs licence §4.2.1                        | ✅ **RESOLVED 2026-08-18** by ADVISORY-041: Premium = **1.5 × R12.50 = R18.75/mo** (contract multiplier restored)                                                                                                           | closed      |
| D3  | SoloSeat price and legal existence                                                                                                                     | ADVISORY-040 vs licence (absent)                           | ✅ **RESOLVED 2026-08-18** by ADVISORY-041: paid add-on at **1.0 × base = R12.50/mo**; contract amendment still pending (60–99 band, Gate G3)                                                                               | closed      |
| D4  | "Standard = free" (billing seed) vs R299 core (marketing)                                                                                              | seed-plans vs pricing API                                  | Free plan only if a genuine free tier exists; otherwise align to treasury                                                                                                                                                   | `[Gate G2]` |
| D5  | Infra-model per-home R20–60 "seat prices" used as list prices                                                                                          | cost model vs licence                                      | Reclassify as planning targets (§5 P3.9)                                                                                                                                                                                    | —           |
| D6  | Anchor-subsidy pricing not surfaced anywhere in UI                                                                                                     | infra §9 vs Surface A                                      | Store Soralia's subsidized rate as a tenant override so admin/board see the real deal — deferred by ADVISORY-041 Phase 4                                                                                                    | `[Gate G4]` |
| D7  | **NEW 2026-08-18:** flagship R12.50/household (R2,250/mo at 180 homes) vs R6,550/mo operating floor — ADVISORY-041's R750 floor math covers infra only | ADVISORY-041 vs infra cost model §4–5                      | ✅ **RESOLVED 2026-08-19:** R12.50 marketed all-in (seat-licence only, vs EstateMate); labour absorbed as a growth subsidy until the third scheme (~540 homes) covers the full floor — see §2.5b                            | closed      |

---

## 7. Suggested Phasing

Aligned to ADVISORY-041's phased plan (which sequences inside ADVISORY-040's phases).

| Phase            | Work                                                                                                                                                                                | Depends on                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **1**            | Seed `SeatPlan` with **four rows** (Standard flagship R12.50 ≥60 homes, Standard fallback R15.00 <60, Solo 1.0×, Premium 1.5×) + `SeatSubscription` schema (ADVISORY-040 Phase 1–2) | G1 ✅ (satisfied by ADVISORY-041), G2 |
| **2**            | Price engine: all five hardcoded surfaces read `getSeatPlan()`/`getTenantBillingSnapshot()`, delete literals, add price-source guard; resolve D1 before/alongside                   | Phase 1                               |
| **3**            | Marketing kicker (dWallet / expressive-communities lead) + surface the 5 complimentary board seats; resolve 60–99 band contract question                                            | G3                                    |
| **4**            | Tenant-level override for Soralia's anchor subsidy; reconcile against flagship rate                                                                                                 | G4                                    |
| **5** (deferred) | Polymorphic Subscription consolidation (ADVISORY-040 Phase 5)                                                                                                                       | —                                     |

---

## 8. Key Evidence Index

- Marketing pricing: `src/app/api/pricing/route.ts:14-73`, `src/app/(platform)/features/page.tsx:202-224`
- Price tests: `src/app/api/pricing/__tests__/pricing.test.ts:78,88`
- Billing seed: `src/shared/lib/billing/seed-plans.ts:9-96`
- Admin widget hardcodes: `src/widgets/dashboard/ui/AdminSubscriptionsWidget.tsx:26-37`
- Contract pricing: `docs/product/SaaS/SaaS_License_Agreement_Soralia_v10.txt` §4.1–4.3
- Cost model: `docs/product/NetComplex_Infrastructure_Cost_Model_2026.md` §2,5,8,9
- Seat-billing advisory + tentative figures (STALE §5.1): `docs/advisories/ADVISORY-040-seat-billing-model.md`
- **Final pricing decision (current):** `docs/advisories/ADVISORY-041-seat-pricing-simplification.md`
- **G1 amendment notice:** `docs/advisories/ADVISORY-040-SUPPLEMENTAL-1.md`
- Seat identity model: `docs/architecture/IDENTITY_MODEL.md`, `docs/product/PremiumModelNote.md` (stale)
- Tier↔level bridge: `src/shared/lib/types/tenant.ts`, `src/shared/lib/constants/tiers.ts`, gate mapping in `src/entities/tenant/api/gate/*`
- Existing two-tier-system notes: `docs/reports/TIER_REPORT.md`, `docs/architecture/TIER_MODEL.md`

---

## 9. Conclusion

The competing systems are not inherently contradictory — they are **two units of account
mislabeled as one, several naming schemes for one ladder, and a missing glue rule.** The
coherent target — now ratified by ADVISORY-041 — is:

> **The tenant's rate card sets the Standard base (flat R12.50/mo flagship at ≥60 homes,
> R15.00/mo fallback below, floor = 60 homes); seat type sets a multiplier (Standard 1.0×,
> Solo 1.0×, Premium 1.5×); every surface displays `base × multiplier` read from `SeatPlan`;
> every "per-home" planning number stays out of commercial UI.**

ADVISORY-041 went further than this report's own recommendation: it replaced the ladder base
with a single flagship number to win the EstateMate comparison on simplicity, kept the
mechanism (DB price table, zero hardcoded prices), resolved Solo and Premium pricing, and
left three genuinely open items for sign-off: **D1 (Foundation R599 vs R299, Gate G2)**,
**the 60–99 home contract gap (G3)**, and **Soralia's anchor subsidy reconciliation (G4)**.
The report's own **D7 (Gate G5)** — R12.50/household revenue not covering the labour+infra
operating floor — was **resolved 2026-08-19**: R12.50 is marketed all-in, and labour is
absorbed as a growth subsidy until the third scheme covers the full floor.

_Report updated 2026-08-19 to close G5/D7 and record the all-in R12.50 labour-subsidy
decision. Figures marked `[Gate]` require DavDev (or treasury) sign-off before any surface
is updated._
