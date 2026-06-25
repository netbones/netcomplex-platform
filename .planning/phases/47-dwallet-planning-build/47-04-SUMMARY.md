---
phase: 47-dwallet-planning-build
plan: 04
subsystem: api
tags: [drizzle, zod, nextjs, vitest, admin-api, tenant-isolation, transactions]

# Dependency graph
requires:
  - phase: 47-01
    provides: Prisma schema (DWallet, WalletTransaction, DataConsent, PayoutRequest, DataRevenueStream, DataShareBatch), Drizzle schema regeneration
  - phase: 47-02
    provides: Zod validation schemas (batchSchema, payoutStatusSchema, streamConfigSchema, streamUpdateSchema), getOrCreateWallet(), types, entity barrel
provides:
  - 7 admin-facing dWallet API routes (stats, batches CRUD, payouts list/process, streams CRUD)
  - 3 additional Vitest test files (batch math, immutability, tenant isolation)
  - Aggregate-only admin stats (Constraint 5 compliance)
  - Atomic batch distribution via Drizzle .transaction()
  - Double-entry DEBIT on payout COMPLETED
affects: [47-05 (feature gate integration), 47-06 (widgets), 47-07 (full page)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Admin route pattern: getSessionAndRole + hasPermission('admin') + withTenant() + apiSuccess/apiError"
    - 'Atomic batch distribution via Drizzle .transaction() — all credits or none'
    - 'Append-only WalletTransaction: balance derived from SUM(txns.amount), cached on DWallet'
    - 'Payout COMPLETED creates DEBIT transaction (double-entry ledger)'
    - 'Admin aggregate-only stats: counts and totals, never individual balances/consents'

key-files:
  created:
    - src/app/api/admin/dwallet/stats/route.ts — GET aggregate admin stats
    - src/app/api/admin/dwallet/batches/route.ts — GET list + POST create/run distribution batch
    - src/app/api/admin/dwallet/payouts/route.ts — GET list payout requests (name, no walletId)
    - src/app/api/admin/dwallet/payouts/[id]/route.ts — PATCH COMPLETED/REJECTED
    - src/app/api/admin/dwallet/streams/route.ts — GET list + POST create streams
    - src/app/api/admin/dwallet/streams/[id]/route.ts — PATCH update stream config
    - src/test/dwallet/batch.test.ts — B-BATCH + B-ATOMIC tests (9 test cases)
    - src/test/dwallet/immutable.test.ts — B-IMMUTABLE tests (8 test cases)
    - src/test/dwallet/isolation.test.ts — B-ISOLATION tests (10 test cases)
  modified: []

key-decisions:
  - 'notes field omitted from dataShareBatches insert — field not present in Phase 47-01 Drizzle schema; error logged via Pino instead'
  - "payoutProcessing uses 'PENDING' status check to prevent double-spend (Threat T-47-B11)"
  - 'streamConfigSchema.residentSharePct stored as string for Decimal DB compatibility'
  - 'batch POST route computes residentPool = totalRevenue × sharePct / 100 using JS number arithmetic with toFixed(2) for string serialization'

patterns-established:
  - "Pattern: Admin routes follow getSessionAndRole + hasPermission('admin') guard pattern, matching existing codebase conventions"
  - 'Pattern: All dWallet queries include tenantId in WHERE clause — no wallet-only queries'
  - 'Pattern: Batch FAILED path inserts a FAILED record outside the transaction, logging error via Pino'

requirements-completed: [DWALLET-B2]

# Metrics
duration: 5min
completed: 2026-06-25
---

# Phase 47 Plan 04: Admin dWallet API Routes Summary

**7 admin API routes built under `src/app/api/admin/dwallet/` with auth guards, tenant isolation, aggregate-only stats, atomic batch distribution, and double-entry payout processing**

## Performance

- **Duration:** 5 min
- **Started:** 2026-06-25T17:59:00Z
- **Completed:** 2026-06-25T18:04:00Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- 7 admin route files created (stats, batches GET+POST, payouts GET, payouts PATCH, streams GET+POST, streams PATCH)
- GET /stats returns aggregate-only admin dashboard data (optedInResidents, totalRewardsMonth, pendingPayouts, totalOptedInAllStreams) — never individual balances
- POST /batches uses Drizzle .transaction() for atomic distribution — all credits or none
- PATCH /payouts/:id COMPLETED creates immutable WalletTransaction DEBIT row and updates wallet balance
- PATCH /payouts/:id REJECTED leaves balance unchanged (resident keeps funds)
- 3 new Vitest test files with 27 test cases (batch math, atomic rollback, immutability, tenant isolation)
- All 6 dWallet test files pass (38 tests total, including 3 from Plan 47-03)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create admin stats and batch distribution routes** - `84a3831d` (feat)
2. **Task 2: Create admin payout and stream management routes** - `4bd7b487` (feat)
3. **Task 3: Create additional Vitest tests** - `d4afd57c` (test)

## Files Created/Modified

- `src/app/api/admin/dwallet/stats/route.ts` — GET aggregate admin stats (opted-in count, monthly rewards total, pending payout count, stream consent total)
- `src/app/api/admin/dwallet/batches/route.ts` — GET list batch history, POST atomic distribution with Drizzle .transaction()
- `src/app/api/admin/dwallet/payouts/route.ts` — GET list payout requests with resident name (JOIN users, excludes walletId)
- `src/app/api/admin/dwallet/payouts/[id]/route.ts` — PATCH COMPLETED (DEBIT + balance update) or REJECTED (no balance change)
- `src/app/api/admin/dwallet/streams/route.ts` — GET list streams, POST create with duplicate key check
- `src/app/api/admin/dwallet/streams/[id]/route.ts` — PATCH partial update of stream config
- `src/test/dwallet/batch.test.ts` — Distribution math, atomic rollback, zero opted-in, invalid stream, credit consistency
- `src/test/dwallet/immutable.test.ts` — UPDATE/DELETE prohibition, ADJUSTMENT corrections, balance derivation, DataConsent append-only
- `src/test/dwallet/isolation.test.ts` — tenantId filtering, cross-tenant boundaries, walletId exclusion, stats scoping

## Decisions Made

- **notes field omitted from dataShareBatches insert** — field not present in Phase 47-01 Drizzle schema; error logged via Pino instead. The `notes` field was referenced in the plan but the Drizzle schema generated in Plan 47-01 does not include it on the `dataShareBatches` table.
- **Double-spend prevention** — PATCH /payouts/:id checks that payoutRequest.status === 'PENDING' before processing, preventing double-spend (Threat T-47-B11).
- **Decimal storage** — streamConfigSchema.residentSharePct is stored as a string for PostgreSQL DECIMAL compatibility, consistent with existing codebase patterns.
- **Batch math** — residentPool computed using JS number arithmetic with `toFixed(2)` for string serialization to DECIMAL columns.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed nonexistent `notes` field from dataShareBatches insert**

- **Found during:** Task 1 (Batch distribution route)
- **Issue:** The `notes` field was specified in the plan for the FAILED batch insert path, but the Drizzle schema (`src/db/schema/data-share-batches.ts`) generated in Plan 47-01 does not include a `notes` column.
- **Fix:** Removed `notes` from the insert; error details are logged via Pino `logger.error()` instead. Added a comment explaining the schema constraint.
- **Files modified:** `src/app/api/admin/dwallet/batches/route.ts`
- **Committed in:** `84a3831d` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (bug)
**Impact on plan:** Minimal — error details are still captured via structured logging. Functional behavior unchanged.

## Issues Encountered

None — plan executed smoothly with only the expected schema field discrepancy.

## User Setup Required

None — no external service configuration required.

## Verification Results

| Check                                               | Result |
| --------------------------------------------------- | ------ |
| 6 admin route files exist                           | PASS   |
| No Prisma client usage (`grep -r "prisma\."` empty) | PASS   |
| Envelope usage (24 apiSuccess/apiError calls)       | PASS   |
| Auth guards (14 hasPermission calls)                | PASS   |
| Tenant isolation (34 tenantId references)           | PASS   |
| No individual balances in admin responses           | PASS   |
| TypeScript compiles clean (0 admin/dwallet errors)  | PASS   |
| All dWallet Vitest tests pass (6 files, 38 tests)   | PASS   |
| Batch uses Drizzle .transaction()                   | PASS   |
| Payout COMPLETED creates DEBIT transaction          | PASS   |
| Payout REJECTED leaves balance unchanged            | PASS   |

## Next Phase Readiness

- Admin API surface complete — ready for Phase 47-05 (Feature gate integration)
- Stats, batch distribution, payout processing, and stream management all operational
- All hard constraints (5, 7, 10, 11) verified via code review and tests
- Zero breaking changes to existing codebase (all files are new additions)

---

_Phase: 47-dwallet-planning-build_
_Completed: 2026-06-25_
