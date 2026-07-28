---
title: NetComplex Infrastructure Cost Model
status: current
reviewed: 2026-07-28
tags: [product, requirements]
audience: product
---

# NetComplex Infrastructure Cost Model

**Prepared for:** Soralia Village AGM — 13 August 2026 (financial supporting document)
**Prepared:** 5 July 2026
**Stack basis:** Vercel + Supabase + Upstash Redis (current production stack)
**FX rate used:** 1 USD = 16.20 ZAR (current market rate, vs. 17.56 used in the prior model — rand has strengthened ~7.7%)

> ⚠️ **Note:** This document replaces the infrastructure-cost assumptions in the earlier financial model (built pre-current-stack, using a stale FX rate). It does not replace the revenue/transaction-fee projections already presented — those remain valid and should be read alongside this cost baseline.

---

## 1. Current Published Pricing (verified July 2026)

### Vercel (hosting/deployment)

| Item                          | Price                                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| Hobby                         | Free — non-commercial only, not usable for production                                    |
| **Pro**                       | **$20/seat/month**, includes $20 usage credit, 1TB Fast Data Transfer, 10M Edge Requests |
| Additional seat               | $20/month each                                                                           |
| Bandwidth overage             | $40 per 100GB beyond 1TB                                                                 |
| Observability Plus (optional) | +$10/month                                                                               |

### Supabase (database/auth/storage/realtime)

| Item                                           | Price                                                                                  |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| Free                                           | $0 — 500MB DB, 50K MAUs, auto-pauses after 7 days idle — **not viable for production** |
| **Pro**                                        | **$25/month** base, includes $10/month compute credit (covers 1 Micro instance)        |
| Compute upgrade (Small, if Micro insufficient) | $15/month (net +$5 after credit)                                                       |
| Storage beyond included                        | usage-based                                                                            |
| Egress beyond included                         | $0.09/GB                                                                               |
| Team (compliance tier — not needed yet)        | $599/month                                                                             |

### Upstash Redis (caching / rate-limiting)

| Item              | Price                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------- |
| Free              | 256MB, 500K commands/month                                                                  |
| **Pay-as-you-go** | $0.20 per 100K commands + $0.25/GB storage beyond 1GB (free), bandwidth free to 200GB/month |
| Fixed alternative | $10/month flat (250MB, unlimited commands, predictable)                                     |

---

## 2. Modeled Monthly Cost — Soralia Village Scale (180 homes)

Two scenarios, since actual usage depends on realtime chat volume and admin traffic, which we don't yet have production telemetry for.

| Line item                                              | Conservative (light usage) | Realistic (moderate usage)     |
| ------------------------------------------------------ | -------------------------- | ------------------------------ |
| Vercel Pro (1 seat)                                    | $20                        | $20                            |
| Vercel bandwidth overage                               | $0                         | $0 (within 1TB for this scale) |
| Supabase Pro base                                      | $25                        | $25                            |
| Supabase compute (Small tier)                          | $0 (Micro sufficient)      | $5 (net, after credit)         |
| Supabase egress overage                                | $0                         | $10                            |
| Upstash Redis                                          | $0 (within free tier)      | $5 (pay-as-you-go)             |
| **Total (USD/month)**                                  | **$45**                    | **$65**                        |
| **Total (ZAR/month @ 16.20)**                          | **≈ R729**                 | **≈ R1,053**                   |
| **Total (ZAR/month @ old 17.56 rate, for comparison)** | ≈ R790                     | ≈ R1,141                       |

**Annual infra cost:** roughly **R8,750 – R12,600/year** at current FX — a small fraction of the R30,000 setup cost and well below the R6,750/month SaaS fee already in your model. This confirms the SaaS pricing has healthy margin headroom even before considering dev/support time.

---

## 3. What This Means for the AGM Numbers

1. **The R30,000 setup figure is not infrastructure-bound.** Actual hosting/DB/cache costs for Soralia's scale are under R1,000/month — the setup fee is covering integration, configuration, and onboarding labor, not server costs. Worth stating plainly if asked "why R30,000 if hosting is so cheap."
2. **The R6,750/month SaaS fee has strong margin** against a ~R730–1,050/month cost base — roughly 85–90% gross margin on infrastructure alone, before support/dev overhead. This is a good number to have in your back pocket if the board pushes on "is this sustainable."
3. **FX exposure is real but small.** A 10% rand depreciation would move monthly infra cost by roughly R70–100 — immaterial next to the R6,750 fee, so this isn't a line the board needs to worry about.
4. **Multi-tenant economics improve this further** — Vercel and Supabase costs above are largely fixed regardless of tenant count (one Vercel team, one Supabase project can serve many tenants via `tenantId` isolation per ADR-003/017). Onboarding Tenant B and C dilutes this fixed cost further, which is the structural case for "let's get the village onboarded first to prove the model, then scale."

---

## 4. Labor Cost & Total Operating Cost

Infrastructure alone understates true operating cost. Adding a conservative labor retainer for ongoing support/maintenance:

| Line                                       | Basis                                                                             | Cost/month       |
| ------------------------------------------ | --------------------------------------------------------------------------------- | ---------------- |
| Infrastructure (Section 2, realistic case) | Vercel + Supabase + Upstash                                                       | R1,050           |
| Labor retainer                             | 10 hrs/month @ R550/hr (conservative — low end of the 10–20 hr moderate estimate) | R5,500           |
| **Total fixed operating cost**             |                                                                                   | **R6,550/month** |

Hours beyond the 10-hr retainer are billed additionally at R550/hr. If actual support load runs at the higher end of the 10–20 hr range, the effective cost floor rises toward **R8,250/month** (15 hrs) — this is a contingency to flag, not build into the base case.

---

## 5. Breakeven vs. Profit Margin — These Are Different Numbers

A platform can cover its costs (breakeven) without being sustainable as a business (margin). NetComplex needs a genuine profit margin to be viable long-term, not just cost recovery.

**Definitions used below:**

- **Breakeven revenue** = Total cost (R6,550)
- **30% margin revenue** = Total cost ÷ 0.7 = **R9,357**

### 5.1 Flat SaaS fee alone (R6,750/month, fixed regardless of household count)

| Target              | Revenue | Result                                                           |
| ------------------- | ------- | ---------------------------------------------------------------- |
| Breakeven (R6,550)  | R6,750  | ✅ Covered, but only R200 profit (3% margin)                     |
| 30% margin (R9,357) | R6,750  | ❌ Not achievable — it's a flat fee, doesn't scale with adoption |

**Finding:** the flat subscription fee alone gets you to barely-breakeven, not to a sustainable margin.

### 5.2 Blended model (transaction fees + premium subscriptions + partnerships)

| Revenue scenario      | Rate/household | Households for breakeven (R6,550) | Households for 30% margin (R9,357)         |
| --------------------- | -------------- | --------------------------------- | ------------------------------------------ |
| Conservative (R39/hh) | R39            | 168 (93% of Soralia's 180 homes)  | 240 — **exceeds Soralia's total homes** ❌ |
| **Expected (R75/hh)** | **R75**        | **87 (48% of Soralia)**           | **125 (69% of Soralia)** ✅                |

**Finding:** Under the conservative scenario, a 30% margin is mathematically impossible on Soralia alone — there aren't enough households in the village. Under the expected scenario, it's achievable but requires roughly 7 in 10 homes actively engaged across at least one revenue stream (subscription, transaction, or partnership).

### 5.3 The strategic implication

Labor cost is largely **fixed regardless of tenant count** — the same support hours mostly serve the platform, not one tenant specifically. That means the path to a durable 30% margin isn't squeezing more adoption out of Soralia alone — **it's onboarding a second and third tenant to amortize that fixed cost across multiple revenue streams.** Soralia proves the model and gets NetComplex to breakeven; profitability at target margin is a multi-tenant outcome.

---

## 6. Why R75/Household Is the Right Figure to Aim At

The financial model produced two blended revenue scenarios: **conservative (R39/household)** and **expected (R75/household)**. R75 is the recommended planning target, for four reasons:

1. **It's not a stretch number — it's the model's own "expected" case, not a best-case or aspirational figure.** The spreadsheet's expected scenario already assumes realistic, moderate uptake (30% Premium subscription adoption — 60 of 200 modeled households), not a stretch target invented for this exercise.

2. **It's diversified, not dependent on one lever.** R75/household is a _blend_ of transaction fees, Premium subscriptions, and partnership revenue — not a single price point residents must all agree to pay. If Premium uptake underperforms, transaction volume or partnership revenue can still carry the number; it isn't a single point of failure the way a flat subscription increase would be.

3. **The conservative alternative (R39/household) is mathematically a dead end for margin.** Section 5.2 shows R39/household cannot reach 30% margin on Soralia alone under any adoption level — the household count required exceeds Soralia's total homes. R75 is the only one of the two modeled scenarios where sustainable profitability is achievable at all on a single tenant, which makes it the only credible planning figure to present.

4. **It sets an honest bar, not a soft one.** R75 still requires ~125 of 180 homes (69%) engaged to hit 30% margin — this isn't presenting an easy number to look good at the AGM; it's the model's realistic case, and the gap it exposes (needing more than Soralia can provide for true profitability) is exactly the argument for prioritizing Tenant B onboarding. Aiming at R75 keeps the multi-tenant growth case honest rather than papering over it with an optimistic number that was never in the original model.

**Recommendation:** present R75/household as the working target at the AGM, paired with the explicit statement that even at this figure, sustainable margin depends on expanding beyond Soralia — not as a caveat to bury, but as the core strategic ask.

---

## 8. NetComplex Platform Tier Pricing (Rollout Pricing — Post-Soralia)

Once NetComplex rolls out beyond Soralia, pricing is structured across three tiers, each targeting a 30% profit margin. Cost to Company scales with support/feature complexity per tier; infrastructure (~R1,050/month) is largely fixed across tiers, so the difference is mainly in the labor retainer.

| Tier               | Cost to Company (monthly) | Margin | Required Revenue (ex VAT) | Seat Price (ex VAT, monthly) | **Seat Price (incl. 15% VAT, monthly)** | Seat Price (incl. VAT, annual) |
| ------------------ | ------------------------- | ------ | ------------------------- | ---------------------------- | --------------------------------------- | ------------------------------ |
| **Standard-Entry** | R2,200                    | 30%    | R3,143                    | R17.46                       | **R20.08**                              | R240.98                        |
| **Premium-Mid**    | R4,400                    | 30%    | R6,286                    | R34.92                       | **R40.16**                              | R481.87                        |
| **Enterprise-Max** | R6,550                    | 30%    | R9,357                    | R51.98                       | **R59.78**                              | R717.32                        |

**Cost to Company breakdown per tier:**

| Tier           | Infra (fixed) | Labor retainer               | Total  |
| -------------- | ------------- | ---------------------------- | ------ |
| Standard-Entry | R1,050        | R1,150 (≈2 hrs/mo @ R550/hr) | R2,200 |
| Premium-Mid    | R1,050        | R3,350 (≈6 hrs/mo @ R550/hr) | R4,400 |
| Enterprise-Max | R1,050        | R5,500 (10 hrs/mo @ R550/hr) | R6,550 |

**Notes:**

- **Enterprise-Max is the validated, real number** — derived directly from Soralia's actual cost model (Section 4). Standard-Entry and Premium-Mid are scaled down proportionally, not independently measured — treat as directional until a lower-tier tenant provides real data.
- **VAT is a pass-through**, not revenue — it's collected on behalf of SARS per Section 4.7 of the SaaS Agreement ("all Fees are exclusive of VAT... Client responsible for VAT"). The ex-VAT column is what actually improves margin.
- Sanity check: Enterprise-Max's R51.98/month (ex VAT) aligns closely with the R51.75 Premium Seat rate independently derived from the 30%-adoption blended model (Section 6/7 seat modeling) — consistency across two calculation paths.

---

## 9. Soralia Pilot Subsidy — Year 1 Anchor Tenant Pricing

**This section applies specifically to Soralia during the pilot phase — it is not the rollout pricing in Section 8.** Soralia receives the full **Enterprise-Max feature set** but is charged at approximately the **Premium-Mid price point**, as an anchor-tenant / pilot discount.

**Discount applied:** R51.98 (Enterprise-Max) → R34.92 (Premium-Mid) = **32.8% pilot discount off the full Enterprise-Max rate.**

### Scaling by household count (ex VAT and incl. VAT), Enterprise-Max cost base held constant

| Households                      | Seat Price (ex VAT) | Seat Price (incl. 15% VAT) | Monthly Revenue (ex VAT) | Cost to Company | **Profit/(Loss)** | Margin |
| ------------------------------- | ------------------- | -------------------------- | ------------------------ | --------------- | ----------------- | ------ |
| 50                              | R34.92              | R40.16                     | R1,746                   | R6,550          | **(R4,804)**      | -275%  |
| 100                             | R34.92              | R40.16                     | R3,492                   | R6,550          | **(R3,058)**      | -88%   |
| 150                             | R34.92              | R40.16                     | R5,238                   | R6,550          | **(R1,312)**      | -25%   |
| _180 (full village, reference)_ | R34.92              | R40.16                     | R6,286                   | R6,550          | _(R264)_          | _-4%_  |

### What this chart is actually saying

**At the discounted Premium rate, Soralia does not reach breakeven even at full 180-household rollout** — this is not a modeling error, it is the intended mechanic of an anchor-tenant discount: Soralia is deliberately subsidized during the pilot in exchange for being the proof-of-concept and reference customer that unlocks Tenant B/C onboarding.

**Framing for the AGM:**

1. **This is a time-boxed pilot subsidy, not the permanent price.** Recommend presenting it as "Year 1 anchor-tenant rate," reverting toward the full Enterprise-Max rate (R51.98/R59.78 incl. VAT) once the platform is proven and/or a second tenant is onboarded to help carry the fixed cost base.
2. **This chart excludes other revenue streams.** Marketplace transaction fees, additional Premium Seat upsells, and partnership revenue (Sections 5–6) are not included here — those close part of the gap in practice and should be read alongside this table, not in isolation.
3. **Treat the subsidy as a customer-acquisition cost, not an operating failure.** A R1,312–4,804/month subsidy to lock in the anchor tenant and reference case for the wider NetComplex rollout is a standard SaaS CAC pattern, not evidence the model doesn't work.

---

## 10. Assumptions & Gaps to Flag

- **No production telemetry yet** on realtime chat command volume (Supabase Realtime + any Redis usage) — the "realistic" column is an estimate, not measured. Recommend instrumenting actual usage during Soralia's first live month to replace this with real numbers before the next board cycle.
- **AI/LLM costs are not included** — if `TenantAiUsage`/`AiUsageEvent` (per schema) draws meaningfully on Anthropic/OpenAI API costs, that's a separate line not covered by Vercel/Supabase/Upstash and should be modeled separately.
- **Prices verified July 2026** — Vercel, Supabase, and Upstash all publish usage-based components that can shift with traffic; treat the "realistic" column as a floor, not a ceiling, once real users are live.
