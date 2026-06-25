---
phase: 47-dwallet-planning-build
plan: 03
subsystem: api
tags: [dwallet, consent, payout, vitest, drizzle, pino, nextjs]

# Dependency graph
requires:
  - phase: 47-02
    provides: Zod schemas, TypeScript types, getOrCreateWallet helper, useWallet hook
  - phase: 47-01
    provides: Prisma models (DWallet, WalletTransaction, DataConsent, PayoutRequest, DataRevenueStream, DataShareBatch), Drizzle schema, seed data
provides:
  - 9 resident API route files under src/app/api/v1/tenant/dwallet/ with full auth, tenant isolation, and envelope compliance
  - 3 Vitest test files (consent, payout threshold, ledger math) with 11 passing test cases
  - Append-only consent management with Pino audit logging
  - R50 minimum payout threshold enforcement
  - Immutable ledger with balance consistency validation
affects: [47-04 (admin API), 47-D-widgets, 47-F-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'API route guard pattern: getSessionAndRole() + withTenant() + apiSuccess/apiError + maxDuration=8'
    - 'Append-only consent with Pino audit log per DWALLET_SPEC.md Constraint 6'
    - 'String-based Decimal math for ZAR amounts (PostgreSQL DECIMAL mapped to JS string)'
    - 'Double-entry ledger invariant: balanceAfter = balanceBefore + amount for every transaction'

key-files:
  created:
    - src/app/api/v1/tenant/dwallet/route.ts — GET / wallet summary
    - src/app/api/v1/tenant/dwallet/transactions/route.ts — GET /transactions paginated ledger
    - src/app/api/v1/tenant/dwallet/consents/route.ts — GET /consents current state
    - src/app/api/v1/tenant/dwallet/consents/[streamKey]/route.ts — POST /consents/:streamKey append-only
    - src/app/api/v1/tenant/dwallet/streams/route.ts — GET /streams active streams
    - src/app/api/v1/tenant/dwallet/payout/route.ts — GET + POST /payout with R50 threshold
    - src/app/api/v1/tenant/dwallet/export/route.ts — POST /export JSON/CSV
    - src/app/api/v1/tenant/dwallet/deletion-request/route.ts — POST /deletion-request close+sweep+anonymise
    - src/app/api/v1/tenant/dwallet/statement/route.ts — GET /statement Phase 1 stub
    - src/test/dwallet/fixtures.ts — shared test fixtures
    - src/test/dwallet/consent.test.ts — consent append-only tests (3 cases)
    - src/test/dwallet/payout.test.ts — payout threshold tests (3 cases)
    - src/test/dwallet/ledger.test.ts — ledger math tests (5 cases)
  modified: []

key-decisions:
  - "userId anonymisation on deletion uses 'ANONYMISED' placeholder instead of null — schema has userId NOT NULL; null would cause DB constraint violation"
  - 'CSV export uses NextResponse with Content-Disposition header (not apiSuccess envelope) for file download compatibility'
  - 'Ledger tests are pure unit tests (no mocked Drizzle) — they validate the mathematical invariants that route implementations must enforce'

patterns-established:
  - 'Every dWallet route: import getSessionAndRole + withErrorHandler from @api/server, withTenant from @entities/tenant/server'
  - 'Every Drizzle query: tenantId filter in WHERE clause; walletId filter for ownership'
  - 'DECIMAL columns returned from Drizzle as strings — use Number() for comparisons, keep string for DB writes'
  - 'Consent management: INSERT-only (never UPDATE); current state = latest row per (walletId, streamKey)'

requirements-completed: [DWALLET-B1]

# Metrics
duration: 8min
completed: 2026-06-25
---

# Phase 47 Plan 03: Resident dWallet API Routes Summary

**9 resident API route files with auth guards, tenant isolation, envelope compliance, append-only consent with Pino audit, R50 payout threshold, and 11 passing Vitest tests**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-25T17:40:15Z
- **Completed:** 2026-06-25T17:48:46Z
- **Tasks:** 3
- **Files created:** 13

## Accomplishments

- 9 route files implementing the full resident dWallet API surface: wallet summary, transaction ledger, consent management, payout requests, data export, deletion requests, revenue streams listing, and annual statement
- Every route uses `getSessionAndRole()` for auth, `withTenant()` for tenant isolation, `apiSuccess()`/`apiError()` for envelopes, and `export const maxDuration = 8`
- `POST /consents/:streamKey` is append-only with Pino audit logging: never UPDATE, always INSERT, with structured log `{ event: 'consent_change', userId, streamKey, granted, tenantId, ip }`
- `POST /payout` enforces R50 minimum threshold server-side, creates PENDING PayoutRequest without modifying balance (balance debited only on admin COMPLETED)
- `POST /deletion-request` sweeps balance to Community Benefit Fund via ROLLOVER transaction, closes wallet, and anonymises consent records
- `POST /export` returns JSON (default) or CSV of all own wallet data, filtered by walletId + tenantId
- 3 Vitest test files with 11 passing cases covering consent append-only, payout threshold rejection, and ledger balance consistency (balanceAfter = balanceBefore + amount)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create resident wallet core routes (5 routes)** — `52eb76d4` (feat)
2. **Task 2: Create resident action routes (4 routes)** — `249e8073` (feat)
3. **Task 3: Create Vitest tests for consent, payout threshold, and ledger balance consistency** — `9f83f947` (test)

## Files Created

- `src/app/api/v1/tenant/dwallet/route.ts` — GET / — wallet summary (balance, lifetime stats, consent states, 5 recent transactions)
- `src/app/api/v1/tenant/dwallet/transactions/route.ts` — GET /transactions — paginated ledger with type filter and date range
- `src/app/api/v1/tenant/dwallet/consents/route.ts` — GET /consents — current consent state per active stream
- `src/app/api/v1/tenant/dwallet/consents/[streamKey]/route.ts` — POST /consents/:streamKey — append-only consent toggle with Pino audit log
- `src/app/api/v1/tenant/dwallet/streams/route.ts` — GET /streams — list active revenue streams
- `src/app/api/v1/tenant/dwallet/payout/route.ts` — GET + POST /payout — list own payout requests + create new (R50 minimum enforced)
- `src/app/api/v1/tenant/dwallet/export/route.ts` — POST /export — trigger JSON or CSV data export
- `src/app/api/v1/tenant/dwallet/deletion-request/route.ts` — POST /deletion-request — close wallet, sweep to CBF, anonymise consents
- `src/app/api/v1/tenant/dwallet/statement/route.ts` — GET /statement — Phase 1 stub placeholder
- `src/test/dwallet/fixtures.ts` — shared test fixtures (mock wallet, stream, consent, transaction, payout request)
- `src/test/dwallet/consent.test.ts` — 3 consent tests (creates row, append-only, revoke)
- `src/test/dwallet/payout.test.ts` — 3 payout tests (reject below R50, accept at minimum, balance unchanged)
- `src/test/dwallet/ledger.test.ts` — 5 ledger math tests (CREDIT/DEBIT, SUM derivation, ROLLOVER, sequential)

## Decisions Made

- Used `'ANONYMISED'` placeholder for userId on deletion instead of null — schema has userId NOT NULL; null would violate DB constraint
- CSV export uses `NextResponse` with `Content-Disposition` header (file download) instead of `apiSuccess()` envelope (JSON)
- Ledger balance consistency tests are pure unit tests (no mocked Drizzle) since they validate mathematical invariants, not implementation details
- All routes import from `@api/server` barrel for consistency (getSessionAndRole, db, tables, helper functions)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] userId anonymisation uses placeholder instead of null**

- **Found during:** Task 2 (deletion-request route)
- **Issue:** Plan specified "UPDATE userId to null" but DataConsent.userId is NOT NULL in the Prisma/Drizzle schema. Attempting null would cause a database constraint violation.
- **Fix:** Changed userId to `'ANONYMISED'` string placeholder, documenting the deviation in the commit message and code comments
- **Files modified:** src/app/api/v1/tenant/dwallet/deletion-request/route.ts
- **Committed in:** 249e8073 (Task 2 commit)

**2. [Rule 1 - Bug] CSV export response type mismatch**

- **Found during:** Task 2 (export route)
- **Issue:** `new Response(csv, ...)` returned plain `Response` but `withErrorHandler` type expects `NextResponse`
- **Fix:** Changed to `new NextResponse(csv, ...)` with proper import from next/server
- **Files modified:** src/app/api/v1/tenant/dwallet/export/route.ts
- **Committed in:** 249e8073 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep. The userId placeholder preserves the anonymisation intent while respecting the DB schema constraint.

## Issues Encountered

None — all planned tasks completed without blocking issues. The two deviations were auto-fixed inline during implementation.

## Threat Flags

None — all threat model mitigations from the plan's STRIDE register are implemented:

- T-47-B01 (Consent tampering): Append-only rows with Pino audit log ✓
- T-47-B02 (Payout repudiation): R50 minimum enforced server-side ✓
- T-47-B03 (Export information disclosure): Only own data returned, filtered by walletId from auth session ✓
- T-47-B04 (Deletion tampering): Balance swept to CBF before closure, consents anonymised ✓
- T-47-B05 (Elevation of privilege): getSessionAndRole() on every route ✓
- T-47-B06 (Cross-tenant disclosure): tenantId in every Drizzle WHERE clause ✓

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Ready for Plan 47-04 (admin dWallet API routes) — resident routes provide the foundation
- All entity imports (getOrCreateWallet, Zod schemas, TypeScript types) verified working
- Test patterns established for future test files
- Drizzle-only pattern confirmed (zero Prisma client usage in dWallet routes)

---

_Phase: 47-dwallet-planning-build_
_Completed: 2026-06-25_
