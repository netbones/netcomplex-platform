# ADVISORY-027 — Response to COMMUNIQUE-10: Seat / Invoice / Payment Model Duplication

**Status:** Awaiting decision gates
**Trigger:** COMMUNIQUE-10 (2026-07-03), BD issue `soralia-village-sioz`
**Number provisional:** Advisory numbering is maintained in an external register this
advisory does not have full visibility into. `ADVISORY-018`, `019`, `021`, `022`, `024`,
`025` are already in flight per current threads, so `026` is used here as the next
available slot after the highest known number. **Confirm before filing** (Gate G0).

---

## 1. Problem Statement

COMMUNIQUE-10 identifies three Prisma model clusters with 10–14 identical fields each:

- **Cluster A:** `PremiumSeat` / `SoloSeat` / `StandardSeat` (12 shared fields)
- **Cluster B:** `TenantInvoice` / `ProviderInvoice` (13 shared fields)
- **Cluster C:** `TenantPayment` / `PaymentTransaction` (14 shared fields)

COMMUNIQUE-10 frames these as one problem with five options (A–E) ranging from
"consolidate everything" to "do nothing," and asks which path to take.

This advisory treats the three clusters **separately**, because they differ in what
kind of duplication they actually represent — and that difference should drive the
decision, not the field-overlap percentage.

---

## 2. Root Cause Analysis (per cluster)

### Cluster A — Seats: this is not duplication, it's shared _implementation_, different _concepts_

`PremiumSeat`, `SoloSeat`, and `StandardSeat` share fields because they're all
"a user's access grant to something," not because they're the same domain concept.
Per `IDENTITY_MODEL.md`:

- **StandardSeat** = property ownership, required, 1-per-household, tied to a Property.
- **SoloSeat** = liberation from household constraints, optional upgrade path, tied to
  a Profile's tenure.
- **PremiumSeat** = portfolio consolidation across multiple properties, a different
  pricing tier entirely (`/investor/{id}` route, volume pricing).

These differences are load-bearing in the product model — they're in the PRD's
persona table, the Seat Comparison Matrix, and the upgrade-path diagrams. The
asymmetry COMMUNIQUE-10 flags (`user.premiumSeat` singular/optional vs.
`user.soloSeat[]`/`user.standardSeat[]` arrays) isn't an accident — a user can have
multiple Standard Seats (co-ownership across properties) and multiple Solo Seats
(liberation identities), but exactly zero or one Premium Seat (portfolio is a single
consolidated view). A generic `Seat` + `enum SeatType` model would need to re-derive
this cardinality rule in application code instead of getting it from the schema shape,
which is a net loss of type safety for a "clean win" that's mostly cosmetic.

**Root cause: field-level overlap without domain-level overlap.** Not a candidate for
table consolidation.

### Cluster C — Payments: there's a real correctness gap independent of consolidation

`TenantPayment` lacks `deletedAt`; `PaymentTransaction` has it. This is a soft-delete
gap, not a consolidation argument — whether or not the tables ever merge, this field
should exist on `TenantPayment` today. This is worth fixing on its own, immediately,
as a two-line migration, decoupled from the larger consolidation decision.

**Root cause: genuine schema drift / missed field, small and fixable now.**

### Cluster B — Invoices: real duplication, but consolidation doesn't solve the hard part

The polymorphic `subscriptionId` problem (pointing to either `TenantSubscription` or
`ProviderSubscription`) exists regardless of whether the tables are merged. Merging
into one `Invoice` model still requires two nullable FKs + a CHECK constraint to keep
referential integrity — the same cost you'd pay by leaving them separate and adding a
shared Zod/TS interface for the common fields. Consolidation here centralizes storage
but does not remove the architectural cost that COMMUNIQUE-10 itself identifies as the
"hard problem."

**Root cause: real duplication, but the ROI of DB-level consolidation is lower than it
looks because the polymorphic-FK cost persists either way.**

---

## 3. Options Considered (evaluated against COMMUNIQUE-10's A–E)

| Cluster      | COMMUNIQUE-10 recommends elsewhere    | This advisory recommends               | Why                                                                                                                                                                                                                                                           |
| ------------ | ------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A (Seats)    | Option A (consolidate, "highest ROI") | **Option E** (document as intentional) | Domain-distinct products, not duplication; consolidation cost (identity router + dashboard widget churn) exceeds benefit                                                                                                                                      |
| B (Invoices) | Option B                              | **Option E** (defer)                   | Polymorphic FK cost is paid either way; no urgency                                                                                                                                                                                                            |
| C (Payments) | Option C                              | **Option E** + immediate small fix     | Consolidation is HIGH complexity/risk; the actual bug (missing `deletedAt`) is a 1-column migration and shouldn't wait on a table-merge decision                                                                                                              |
| All three    | Option D (full sweep)                 | **Rejected**                           | Bundles a low-risk documentation fix (A), a deferred medium item (B), and a real-but-small bug fix (C) into one 3–4 day, high-rollback-risk migration window. Violates scope-control principle — these are three separate advisories' worth of work, not one. |

---

## 4. Architecture: Before / After

**Before (all three clusters):** unchanged schema, no action taken, debt undocumented.

**After this advisory (if gates approved):**

1. Cluster A and B: schema unchanged. `UBIQUITOUS_LANGUAGE.md` Conflict Register gains
   two new entries (C8, C9) documenting the overlap as intentional, so future audits
   (like COMMUNIQUE-10) don't re-flag it as unaddressed debt without context.
2. Cluster C: schema gains one column —
   `TenantPayment.deletedAt DateTime?` — via a standalone Prisma migration, unrelated
   to any table consolidation. Filed as its own BD issue, not part of this advisory's
   execution plan (see §7 done criteria).

No table consolidation, no FK re-pointing, no identity-router changes occur under this
advisory.

---

## 5. Pre-Execution Discovery Checklist

Run before acting on any gate below.

```bash
# Confirm current advisory register state (Gate G0)
grep -rl "ADVISORY-0" docs/advisories/ | sort -V | tail -5

# Cluster A — estimate blast radius of seat accessor usage (for the record, not for execution)
grep -rn "\.premiumSeat\b" src/ --include="*.ts" --include="*.tsx" | wc -l
grep -rn "\.soloSeat\b" src/ --include="*.ts" --include="*.tsx" | wc -l
grep -rn "\.standardSeat\b" src/ --include="*.ts" --include="*.tsx" | wc -l

# Cluster C — confirm the deletedAt gap and check for existing soft-delete reads on TenantPayment
grep -n "model TenantPayment" -A 20 prisma/schema.prisma
grep -rn "TenantPayment" src/server/ src/shared/ --include="*.ts" | grep -i "deletedAt\|findMany\|findFirst"

# Cluster B — confirm no existing CHECK constraint or app-layer guard already handles the polymorphic FK
grep -rn "subscriptionId" prisma/migrations/*/migration.sql | grep -i "check\|constraint"
```

---

## 6. Phased Execution Plan

**Phase 0 (this advisory, no code changes):** DavDev resolves gates G0–G3 below.

**Phase 1 (only if G3 approved) — small, isolated fix:**

- New BD issue (not this advisory's number) for `TenantPayment.deletedAt`.
- Single Prisma migration: `ALTER TABLE "TenantPayment" ADD COLUMN "deletedAt" TIMESTAMP;`
- Update any `TenantPayment` read paths that should now filter `deletedAt: null`
  (discovery checklist above identifies these).
- No RLS policy changes required (TenantPayment is not in the ADR-019 RLS-scoped
  15-table list).

**Phase 2 (only if G2 approved) — documentation only:**

- Add Conflict Register entries C8 (Seat field overlap, accepted) and C9 (Invoice/
  Payment field overlap, accepted) to `UBIQUITOUS_LANGUAGE.md`, each with a one-line
  rationale and a trigger condition for revisiting (e.g., "revisit Cluster A only if a
  4th seat type is proposed").

No Phase 3+ — full consolidation is explicitly out of scope for this advisory and
would require its own numbered advisory if priorities change later.

---

## 7. Risk Register

| Risk                                                                            | Severity | Disposition                                                                                  |
| ------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------- |
| Deferred Cluster B duplication grows if a 3rd invoice-like model is added later | Low      | Accepted; documented in Conflict Register with a revisit trigger                             |
| Cluster A "do nothing" reads as ignoring COMMUNIQUE-10's stated ROI ranking     | Low      | Addressed by this advisory's explicit rationale — overlap ≠ domain equivalence               |
| `TenantPayment.deletedAt` fix touches billing read paths                        | Medium   | Scoped to Phase 1 discovery checklist; no schema-wide migration                              |
| Future PRISMA_ANALYSIS.md audits re-flag these clusters                         | Low      | Conflict Register entries pre-empt re-litigation by recording the decision and its rationale |

---

## 8. Done Criteria

- [ ] G0 resolved: advisory number confirmed against external register
- [ ] G1 resolved: DavDev concurs Clusters A and B are documented-debt, not consolidation candidates
- [ ] G2 resolved: Conflict Register entries C8/C9 approved and added
- [ ] G3 resolved: `TenantPayment.deletedAt` fix approved as separate, immediately-actionable BD issue
- [ ] BD issue `soralia-village-sioz` closed with reference to this advisory
- [ ] `docs/tech-debt-register.md` updated to reflect the accepted-debt disposition (if DavDev wants it tracked there in addition to the Conflict Register)

---

## 9. Open Decision Gates

**G0 — Advisory numbering.** Confirm `ADVISORY-026` is correct, or supply the actual
next number from the external register.

**G1 — Cluster A/B disposition.** Confirm agreement that Seats stay unconsolidated
(domain-distinct) and Invoices stay deferred (polymorphic-FK cost persists either
way), rather than proceeding with COMMUNIQUE-10's Option A / Option B.

**G2 — Documentation.** Approve adding Conflict Register entries C8/C9 to
`UBIQUITOUS_LANGUAGE.md` now, or defer documentation until a later cleanup pass.

**G3 — Cluster C small fix.** Approve filing `TenantPayment.deletedAt` as its own
BD issue for immediate execution, decoupled from any Payment/Transaction consolidation
decision.

**G4 (optional, no urgency) — Revisit trigger for Cluster A.** Confirm the proposed
revisit trigger ("only if a 4th seat type is proposed") is the right bar, or set a
different one.
