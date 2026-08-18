---
title: ADVISORY-040 SUPPLEMENTAL 1 — G1 Pricing Superseded by ADVISORY-041
status: current
reviewed: 2026-08-18
tags: [advisory, amendment, billing, pricing]
audience: developer
---

# ADVISORY-040 SUPPLEMENTAL 1: G1 Pricing Superseded by ADVISORY-041

**Applies to:** ADVISORY-040 (Seat-Level Billing Model — `SeatPlan`/`SeatSubscription`)
**Reason:** Gate G1's tentative ballpark figures (§5.1) have been superseded by a business decision made after ADVISORY-040 was drafted. This supplemental does not reopen or modify ADVISORY-040's schema, phases, or gates — it amends **only** the pricing figures that Phase 1 seeds into that schema.

> ⚠️ **If you are executing ADVISORY-040 Phase 1, read this note before seeding `SeatPlan`.** The figures in ADVISORY-040 §5.1 ("Tentative ballpark pricing") are stale. Use the figures below instead.

---

## What changed

ADVISORY-040 §5.1 tentatively priced three independent, flat figures:

| Seat offering            | ADVISORY-040 original (stale) |
| ------------------------ | ----------------------------- |
| StandardSeat + 5 aliases | R12.50/mo                     |
| SoloSeat                 | R12.50/mo                     |
| PremiumSeat              | **R36/mo**                    |

ADVISORY-041 (2026-08-18) replaced this with a single base rate plus multipliers, and added a below-minimum fallback band that ADVISORY-040 never carried:

| Seat offering                                | ADVISORY-041 final (current) | Basis                                                                                     |
| -------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------- |
| StandardSeat + 5 aliases (tenant ≥ 60 homes) | **R12.50/mo**                | flagship base rate                                                                        |
| StandardSeat + 5 aliases (tenant < 60 homes) | **R15.00/mo**                | Tier 1 fallback rate (new — not present in ADVISORY-040)                                  |
| SoloSeat                                     | **R12.50/mo**                | 1.0 × base — unchanged in value, now explicitly derived rather than an independent figure |
| PremiumSeat                                  | **R18.75/mo**                | 1.5 × base — supersedes the R36 flat figure                                               |

The only offering whose _number_ is unchanged is SoloSeat (still R12.50) — but its _derivation_ changed from "an independent tentative figure" to "1.0× the base rate," which matters once `SeatPlan` seeding is tenant-aware (see below).

---

## Why this matters for Phase 1 seeding

ADVISORY-040 Phase 1 says: _"Seed two rows (Solo, Premium) with the prices already implied by IDENTITY_MODEL.md's pricing language, pending real figures from DavDev."_

Those real figures have now arrived, via ADVISORY-041, and they are **not** a simple drop-in replacement of three numbers — they introduce a home-count condition (60-home minimum) that ADVISORY-040's original `SeatPlan` model didn't need to represent, because the original figures were flat regardless of tenant size.

Concretely, Phase 1 should seed **four** `SeatPlan` rows, not three:

1. StandardSeat, flagship rate, R12.50/mo, condition: `tenantHomeCount >= 60`
2. StandardSeat, fallback rate, R15.00/mo, condition: `tenantHomeCount < 60`
3. SoloSeat, R12.50/mo (1.0× whichever Standard rate applies)
4. PremiumSeat, R18.75/mo (1.5× whichever Standard rate applies)

Whether "whichever Standard rate applies" is computed at read time (SoloSeat/PremiumSeat rows store a multiplier against the Standard row, not an absolute price) or seeded as pre-computed absolute values per band is an implementation choice for whoever executes Phase 1 — ADVISORY-041 §4 assumes the multiplier is stored and computed, consistent with ADVISORY-040's own architecture note that `SeatPlan` should carry rates as data, not hardcoded absolutes.

---

## What is unchanged

- `SeatPlan` / `SeatSubscription` schema shape (§4 of ADVISORY-040) — no new columns required by this amendment beyond what a home-count condition already implies could be handled via `eligibilityRule`-style JSON, or a plain `minHomes`/`maxHomes` pair on the row; this is an implementation detail for Phase 1, not a schema redesign
- `PaymentTransaction` FK loosening (§4, Phase 2) — untouched
- Gates G0, G2, G3, G4, G5 — untouched
- Phase 2–5 — untouched

**Gate G1 itself is considered satisfied by ADVISORY-041**, not by this supplemental. This document exists so that ADVISORY-040 is not read in isolation and seeded with stale numbers.

---

## Reference

Full rationale for the 60-home floor, the R18.75 Premium multiplier, and the competitive positioning against EstateMate's R10/household rate: see **ADVISORY-041-seat-pricing-simplification.md**.
