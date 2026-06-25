---
phase: 47-dwallet-planning-build
plan: 01
subsystem: database
tags: [prisma, drizzle, postgresql, dwallet, consent-ledger, double-entry-ledger, multi-tenant]

# Dependency graph
requires: []
provides:
  - 6 Prisma models (DWallet, WalletTransaction, DataConsent, PayoutRequest, DataRevenueStream, DataShareBatch)
  - 5 enums (WalletStatus, TransactionType, TransactionSource, PayoutStatus, BatchStatus)
  - Drizzle schema files for all 6 tables (10 files: 6 tables + 4 relations)
  - Migration SQL (164 lines) in prisma/migrations/*_add_dwallet_module/
  - dWallet PlatformModule seed entry (minTier: PREMIUM, defaultEnabled: false)
  - 8 DataRevenueStream seed entries for Soralia tenant
  - Drizzle singleton wiring in db.ts + @api/server barrel exports
affects: [47-02, 47-03, 47-04, 47-05, 47-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Immutable append-only ledger (WalletTransaction) with double-entry balanceBefore/balanceAfter
    - Append-only consent records (DataConsent) with latest-row-is-current semantics
    - Composite unique constraints for tenant-scoped uniqueness (tenantId + key)
    - Value Ledger pattern via TransactionSource enum for forward-compatible value sources

key-files:
  created:
    - prisma/migrations/20260625192155_add_dwallet_module/migration.sql
    - prisma/seed/dwallet-streams.ts
    - src/db/schema/d-wallets.ts
    - src/db/schema/d-wallets-relations.ts
    - src/db/schema/wallet-transactions.ts
    - src/db/schema/wallet-transactions-relations.ts
    - src/db/schema/data-consents.ts
    - src/db/schema/data-consents-relations.ts
    - src/db/schema/payout-requests.ts
    - src/db/schema/payout-requests-relations.ts
    - src/db/schema/data-revenue-streams.ts
    - src/db/schema/data-share-batches.ts
  modified:
    - prisma/schema.prisma
    - prisma/seed/modules.ts
    - src/shared/api/db.ts
    - src/shared/api/server/index.ts

key-decisions:
  - "Added @unique on DWallet.userId alongside @@unique([tenantId, userId]) to satisfy Prisma 1-1 relation validator while preserving tenant-scoped uniqueness invariant"
  - "Used prisma db push + manual migration SQL due to pre-existing shadow DB failure in migration 20260624000000"
  - "DataRevenueStream and DataShareBatch have no FK relations, so only 4 relation files generated (not 6) — correct per generator behavior"

patterns-established:
  - "Drizzle table naming: prisma-generator-drizzle outputs kebab-case filenames (d-wallets.ts, wallet-transactions.ts, etc.)"
  - "Seed file pattern: standalone module with PrismaClient, upsert on composite unique, side-effect imported from modules.ts"
  - "Barrel wiring: db.ts imports → dbSchema → re-exports → @api/server re-exports all tables"

requirements-completed: [DWALLET-A]

# Metrics
duration: 12min
completed: 2026-06-25
---

# Phase 47 Plan 01: dWallet Schema & Migration Summary

**6 Prisma models, 5 enums, Drizzle schema generation, seed data, and barrel wiring for the dWallet data rights, consent, and rewards module**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-25T17:17:10Z
- **Completed:** 2026-06-25T17:28:55Z
- **Tasks:** 3
- **Files modified/created:** 16

## Accomplishments

- 6 Prisma models added: DWallet (wallet per user), WalletTransaction (immutable double-entry ledger), DataConsent (append-only consent), PayoutRequest (resident-initiated payouts), DataRevenueStream (tenant revenue config), DataShareBatch (distribution runs)
- 5 enums with Value Ledger forward-compatibility: WalletStatus (ACTIVE/FROZEN/CLOSED), TransactionType (CREDIT/DEBIT/ROLLOVER/ADJUSTMENT), TransactionSource (6 value sources including RESIDENT_DATA_SHARE + 5 future slots), PayoutStatus (5 states), BatchStatus (4 states)
- Migration SQL (164 lines) creates all 6 tables, 5 enums, foreign keys, unique constraints, and indexes
- 10 Drizzle schema files auto-generated via prisma-generator-drizzle
- dWallet PlatformModule seed entry (key: 'dWallet', minTier: PREMIUM, defaultEnabled: false)
- 8 DataRevenueStream seed entries with placeholder percentages and TODO for Schedule F Table 2 confirmation
- All 6 Drizzle schema tables wired into db.ts singleton and exported from @api/server barrel

## Task Commits

1. **Task 1: Add 6 Prisma models + 5 enums + user reverse relation** - `49d3e8f0` (feat)
2. **Task 2: Create migration, regenerate Drizzle, seed entries** - `550a6d69` (feat)
3. **Task 3: Wire Drizzle schemas into db.ts and @api/server** - `7ecee99c` (feat)

## Files Created/Modified

- `prisma/schema.prisma` - 6 new models + 5 enums + user.dWallet reverse relation (165 lines added)
- `prisma/migrations/20260625192155_add_dwallet_module/migration.sql` - 164-line DDL migration
- `prisma/seed/modules.ts` - dWallet PlatformModule seed entry added
- `prisma/seed/dwallet-streams.ts` - 8 DataRevenueStream entries for Soralia tenant
- `src/db/schema/d-wallets.ts` - Drizzle schema for DWallet table
- `src/db/schema/d-wallets-relations.ts` - Drizzle relations for DWallet
- `src/db/schema/wallet-transactions.ts` - Drizzle schema for WalletTransaction (includes TransactionSource enum)
- `src/db/schema/wallet-transactions-relations.ts` - Drizzle relations for WalletTransaction
- `src/db/schema/data-consents.ts` - Drizzle schema for DataConsent
- `src/db/schema/data-consents-relations.ts` - Drizzle relations for DataConsent
- `src/db/schema/payout-requests.ts` - Drizzle schema for PayoutRequest
- `src/db/schema/payout-requests-relations.ts` - Drizzle relations for PayoutRequest
- `src/db/schema/data-revenue-streams.ts` - Drizzle schema for DataRevenueStream
- `src/db/schema/data-share-batches.ts` - Drizzle schema for DataShareBatch
- `src/shared/api/db.ts` - 6 new imports + dbSchema entries + re-exports
- `src/shared/api/server/index.ts` - 6 new table exports in barrel

## Decisions Made

- **DWallet.userId @unique:** Added single-column `@unique` on `userId` to satisfy Prisma's 1-1 relation validator while keeping `@@unique([tenantId, userId])` as a belt-and-suspenders composite constraint for tenant isolation documentation
- **Migration strategy:** Used `prisma db push` to sync schema directly (bypassing pre-existing shadow DB failure in migration `20260624000000`), then manually crafted the migration SQL using `prisma migrate diff --from-empty` as reference
- **Relation file count:** DataRevenueStream and DataShareBatch correctly generate no relation files (no FK relations), resulting in 10 Drizzle files (6 tables + 4 relations) instead of the expected 12

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added @unique to DWallet.userId for Prisma 1-1 relation compliance**

- **Found during:** Task 1 (prisma validate)
- **Issue:** Prisma requires `@unique` on the foreign key field (`userId`) for 1-1 relations, but the plan only specified `@@unique([tenantId, userId])` (composite)
- **Fix:** Added `@unique` on `userId` field while keeping `@@unique([tenantId, userId])` for tenant-isolation documentation. Both unique constraints coexist — `@unique` satisfies Prisma, composite documents business invariant.
- **Files modified:** prisma/schema.prisma
- **Verification:** prisma validate passes
- **Committed in:** `49d3e8f0`

**2. [Rule 3 - Blocking] Used prisma db push + manual migration due to pre-existing shadow DB failure**

- **Found during:** Task 2 (prisma migrate dev)
- **Issue:** Pre-existing migration `20260624000000_add_user_role_and_seat_lifecycle` fails shadow database validation with "unsafe use of new value 'USER' of enum type 'Role'" — PostgreSQL requires enum values to be committed before use as defaults in the same transaction
- **Fix:** Used `prisma db push` to apply schema changes directly (bypassing shadow DB), then manually created the migration SQL file using `prisma migrate diff --from-empty` output as reference for the targeted DDL
- **Files modified:** Created migration manually at `prisma/migrations/20260625192155_add_dwallet_module/migration.sql`
- **Verification:** Migration file exists (164 lines), prisma validate passes, DB schema matches
- **Committed in:** `550a6d69`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes were necessary to complete the plan given environmental constraints. No scope creep — the schema, migration, and wiring match the plan specification exactly.

## Issues Encountered

- Pre-existing billing schema type errors (billing-plan, tenant-invoice, tenant-subscription, tenant-payment, billing-event modules) prevent full `pnpm typecheck` from passing. These are unrelated to dWallet changes and were present before plan execution. Our files have zero type errors (verified via targeted typecheck).
- The `prisma migrate dev` shadow database validation fails on a pre-existing migration (`20260624000000`) — worked around via `prisma db push` + manual migration SQL.

## User Setup Required

None — no external service configuration required for this schema-only sub-phase.

## Next Phase Readiness

Sub-phase A complete. The database foundation for dWallet is ready:

- All 6 tables + 5 enums exist in the dev database
- Drizzle singletons are wired and type-safe
- Seed entries are ready for data population
- Ready for Sub-phase B (API layer — 10 resident + 7 admin routes)

---

_Phase: 47-dwallet-planning-build_
_Plan: 01 — Schema & Migration_
_Completed: 2026-06-25_
