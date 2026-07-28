---
title: ADVISORY-020: Phase 46.2 Address Registry — Pre-Execution Corrections
status: current
reviewed: 2026-07-28
tags: [advisory, architecture]
audience: developer
---

# ADVISORY-020: Phase 46.2 Address Registry — Pre-Execution Corrections

**Status:** Required before executing 46.2-01-PLAN.md / 46.2-02-PLAN.md / 46.2-03-PLAN.md
**Author:** Architecture advisory (Claude)
**Scope:** Corrections to the GSD plan set for `46.2-address-registry`, found during plan review. Does not re-litigate the locked decisions in `46.2-CONTEXT.md` — only fixes internal inconsistencies and unmitigated risks in the plans built from it.

---

## 1. Problem Statement

The three execution plans for Phase 46.2 (`46.2-01-PLAN.md` schema, `46.2-02-PLAN.md` service layer, `46.2-03-PLAN.md` route integration) are internally inconsistent and contain unmitigated risks that will either (a) silently corrupt identity data during an unattended migration, (b) fail to typecheck, or (c) bake a single-tenant assumption into infrastructure whose entire purpose is multi-tenant correctness. Because all three plans are `autonomous: true`, there is no human checkpoint between "agent reads plan" and "agent runs migration against the database" — these issues must be fixed in the plan documents themselves before execution starts.

Six defects, in priority order:

1. Backfill silently drops colliding addresses with no abort, log, or manual-resolution path.
2. Migration and `AddressService.generate()` hardcode the `soralia.org` domain in registry infrastructure meant to be tenant-generic.
3. `AddressOwnerType` enum has no value for `Property`, conflating property-owned addresses with true system-reserved addresses under `ownerType='SYSTEM'`.
4. Reserve → seat-insert → FK-backfill is not wrapped in a transaction, so a failed seat insert leaves an orphaned, permanently-squatted `Address` row.
5. Plan 02's `AddressService` API surface does not match what Plan 03 actually calls (`reserve()` arity mismatch; `lookupByOwnerInSeats()` invented ad hoc; `generate()` called as static when specified as instance method).
6. Threat IDs collide across the three plans, and Plan 01 has no automated post-migration orphan-FK check despite Risk 2 being rated MEDIUM in research.

## 2. Root Cause Analysis

The plans were generated in sequence (01 → 02 → 03) from a single context/research pass, but Plan 02's service contract was not validated against Plan 03's actual call sites before being finalized — each plan was internally coherent but the handoffs between them were not cross-checked. Separately, the migration's safety language ("the comment documents this as a known behavior") treats a data-loss risk as acceptable documentation rather than as a gate, which is appropriate for a human-reviewed migration but not for an autonomous one.

## 3. Options Considered

| Option                                                                                                                                                  | Description                                                                                                               | Verdict      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------ |
| A. Execute plans as-is, fix issues reactively if tests fail                                                                                             | Fast, but transaction/orphan-FK bugs won't surface in unit tests — they're data-integrity bugs that show up in production | Rejected     |
| B. Re-run planning from scratch with corrected CONTEXT                                                                                                  | Clean, but discards two days of otherwise-correct plan content for fixes that are narrow and surgical                     | Rejected     |
| C. Issue this advisory as a set of required pre-execution edits to the existing plan files, applied via `str_replace` before the agent executes Plan 01 | Minimal, surgical, preserves correct plan content, fixes only the defects found                                           | **Selected** |

## 4. Architecture Before / After

**Before (as currently planned):**

- `Address.domain` populated from a literal `'@soralia.org'` string in SQL and in `AddressService.generate()` defaults.
- Backfill: `INSERT ... ON CONFLICT (tenantId, address) DO NOTHING` with no pre-flight gate — collisions vanish silently.
- `AddressOwnerType`: `STANDARD_SEAT | PROFILE | SOLO_SEAT | PREMIUM_SEAT | PROVIDER | SYSTEM` (no `PROPERTY`).
- Route integration: `reserve()` → `db.insert(seat)` → `db.update(seat).set({ addressId })` as three independent statements.
- `AddressService.reserve(address, tenantId, kind)` — 3-arg signature in Plan 02; Plan 03 calls it with a 4th options object.

**After (required state before execution):**

- `Address.domain` derived per-tenant from `Tenant.customDomain ?? `${tenant.slug}.netbones.co.za``(or whatever the canonical tenant-domain resolver already is — see Discovery Checklist item 4), passed explicitly into`reserve()`/`generate()`, never hardcoded.
- Backfill: duplicate-detection query runs first as a **blocking pre-check**; migration aborts (non-zero exit, no DDL applied) if duplicates are found, with output listing the colliding `(tenantId, address, sources[])` rows for manual resolution.
- `AddressOwnerType` gains a `PROPERTY` variant; Property backfill uses `ownerType='PROPERTY'`, not `'SYSTEM'`.
- Route integration: `reserve()` + seat insert + `addressId` backfill wrapped in a single `db.transaction(async (tx) => { ... })` per seat-creation route.
- `AddressService.reserve(address, tenantId, kind, opts?: { ownerType?: AddressOwnerType; ownerId?: string | null; skipReservedCheck?: boolean })` — single signature, documented in Plan 02, used consistently in Plan 03. `generate()` is a `static` method on `AddressService`, called as `AddressService.generate(...)` everywhere (not `new AddressService(db).generate(...)`).
- `lookupByOwnerInSeats(userId, tenantId)` is added to Plan 02's `must_haves.truths` and `artifacts` as a 10th method, not introduced ad hoc in Plan 03.

## 5. Pre-Execution Discovery Checklist

Run before touching any plan file. Each command's output determines whether the corresponding fix below is still necessary (schema/code may have moved since the plans were drafted).

```bash
# 1. Confirm current state of assertAddressUnique and the 3-table check it performs
grep -n "assertAddressUnique" -A 25 src/shared/api/db.ts

# 2. Confirm Profile uniqueness scope (household-scoped, not global) — validates Risk 4
grep -n "profileAddress" prisma/schema.prisma | grep -i unique

# 3. Confirm per-table platformAddress uniqueness is table-scoped, not tenant-scoped — validates Risk 1
grep -n "platformAddress.*@unique" prisma/schema.prisma

# 4. Find the canonical tenant-domain resolver (if one exists) before inventing a new one
grep -rn "customDomain\|netbones.co.za" src/entities/tenant/ src/shared/lib/ | grep -v test

# 5. Confirm no existing cross-table address collisions today (run against a DB snapshot, not prod)
psql "$DATABASE_URL" -c "
SELECT address, array_agg(DISTINCT source) AS sources, count(*) FROM (
  SELECT \"platformAddress\" AS address, 'StandardSeat' AS source FROM \"StandardSeat\"
  UNION ALL SELECT \"platformAddress\", 'SoloSeat' FROM \"SoloSeat\"
  UNION ALL SELECT \"platformAddress\", 'PremiumSeat' FROM \"PremiumSeat\"
  UNION ALL SELECT \"profileAddress\", 'Profile' FROM \"Profile\"
  UNION ALL SELECT \"platformAddress\", 'Property' FROM \"Property\"
) t GROUP BY address HAVING count(*) > 1;"

# 6. Confirm db.transaction(...) is the established pattern for multi-statement writes in this codebase
grep -rn "db.transaction(" src/app/api/seats/route.ts src/app/api/premium/portfolio/route.ts src/server/routers/marketplace/premium.ts
```

If item 5 returns any rows, **STOP-AND-ESCALATE to DavDev** before proceeding — those are real production collisions that need a merge decision, not something an autonomous agent should resolve unilaterally.

## 6. Phased Execution Plan

### Phase A — Patch Plan 02 (service contract) before Plan 01 executes

Plan 02 hasn't run yet, so this is a plan-document edit, not a code edit.

- [ ] ⏳ Update `46.2-02-PLAN.md` Task 1 `<behavior>` and method list: `reserve()` signature becomes `reserve(address, tenantId, kind, opts?)`.
- [ ] ⏳ Add `generate()` as `static` in the class structure description (not an instance method).
- [ ] ⏳ Add `lookupByOwnerInSeats(userId, tenantId)` to Task 1's method list, `must_haves.truths`, and `min_lines` artifact description.
- [ ] ⏳ Add a 7th must-have truth: `'reserve() and AddressService methods are safe to call inside an externally-supplied db.transaction(tx) and use tx for all queries when provided'`.

**STOP-AND-ESCALATE** if `AddressService` constructor pattern (`tx ?? db`) cannot accept a transaction-scoped Drizzle client cleanly — confirm against `src/server/payments/paystack.ts`'s transaction usage before assuming this works.

### Phase B — Patch Plan 01 (schema + migration) before execution

- [ ] ⏳ Add `PROPERTY` to `AddressOwnerType` enum definition in Task 1.
- [ ] ⏳ Change Property backfill (`Step 4`) from `ownerType='SYSTEM'` to `ownerType='PROPERTY'`.
- [ ] ⏳ Replace Step 7 ("document as known behavior") with a **blocking pre-flight check**: the migration script (or a `pre-migrate.sql` / a Node script run by `npx prisma migrate dev`'s `--create-only` + manual gate) must run the Discovery Checklist item 5 query and abort non-zero if any rows return.
- [ ] Remove hardcoded `'@soralia.org'` from any migration SQL; replace with `tenant.slug || '.' || COALESCE(tenant."customDomain", 'netbones.co.za')` or the resolver found in Discovery Checklist item 4 — confirm exact column/format before writing SQL.
- [ ] ⏳ Add to `<verify>`: the orphan-FK check query from RESEARCH.md Risk 2, run automatically post-migration, non-zero exit if any table reports `missing_fk > 0`.

### Phase C — Patch Plan 03 (route integration) before execution

- [ ] ⏳ Wrap `AddressService.reserve()` + seat insert + `addressId` update in `db.transaction(async (tx) => {...})` in `src/app/api/seats/route.ts`, `src/app/api/premium/portfolio/route.ts`, and the tRPC premium procedure. Pass `tx` into `new AddressService(tx)`.
- [ ] ⏳ Update all `reserve()` call sites to match Plan 02's corrected signature (Phase A).
- [ ] ⏳ Update seed script to call `AddressService.generate(...)` statically, matching Phase A.
- [ ] Re-number threat IDs `T-46.2-01` through `T-46.2-NN` sequentially across all three plans (single phase-level register) — purely cosmetic, do last.

### Phase D — Execute corrected plans in original order (01 → 02 → 03)

No change to the original wave/dependency structure — it was correct, only the contents needed fixing.

## 7. Risk Register

| ID       | Risk                                                                                                                 | Severity                                      | Disposition | Mitigation                                                                                                   |
| -------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| R-020-01 | Backfill silently drops a real resident's address on collision                                                       | HIGH                                          | Mitigate    | Phase B blocking pre-flight check; abort migration on any collision                                          |
| R-020-02 | Hardcoded `soralia.org` breaks address generation for any future second tenant                                       | HIGH                                          | Mitigate    | Phase B domain resolver fix                                                                                  |
| R-020-03 | Orphaned `Address` row after failed seat insert squats a name permanently                                            | MEDIUM                                        | Mitigate    | Phase A/C transaction wrapping                                                                               |
| R-020-04 | Plan 02/03 contract drift causes TypeScript compile failure mid-execution                                            | MEDIUM                                        | Mitigate    | Phase A signature reconciliation, done before Plan 01 starts so Plan 02 is correct on first pass             |
| R-020-05 | `ownerType='SYSTEM'` conflated with property ownership causes future `lookup('SYSTEM', ...)` to return property rows | LOW                                           | Mitigate    | Phase B enum addition                                                                                        |
| R-020-06 | Real production address collisions exist today and are discovered mid-migration                                      | UNKNOWN until Discovery Checklist item 5 runs | Escalate    | STOP-AND-ESCALATE to DavDev if any rows returned — do not let the agent choose a merge strategy unilaterally |

## 8. Done Criteria

- [ ] Discovery Checklist items 1–6 run and results recorded in the Plan 01 execution summary.
- [ ] ⏳ If item 5 returned rows: DavDev has confirmed a merge strategy before Phase D begins.
- [ ] ⏳ `46.2-02-PLAN.md` updated per Phase A, committed before Plan 01 execution starts.
- [ ] ⏳ `46.2-01-PLAN.md` updated per Phase B (enum, backfill domain, blocking pre-flight, orphan-FK verify) before `npx prisma migrate dev` is run.
- [ ] ⏳ `46.2-03-PLAN.md` updated per Phase C before route changes are made.
- [ ] ⏳ All three plans re-pass their own `<verify>` blocks after edits.
- [ ] Threat ID renumbering (Phase C, last item) complete — cosmetic, non-blocking for execution.

---

_Advisory: ADVISORY-020_
_Phase: 46.2-address-registry_
_Supersedes: none — corrective addendum to 46.2-01/02/03-PLAN.md, applied before first execution_
