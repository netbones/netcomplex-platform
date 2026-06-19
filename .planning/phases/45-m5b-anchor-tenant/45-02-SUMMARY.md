---
phase: 45
plan: 02
type: execute
subsystem: merits
tags: [community-merits, behavior-records, api, drizzle, prisma]
depends_on: [45-01]
provides: [merits-data-model, merits-api]
tech_stack:
  added: [BehaviorRecord model, Drizzle pgEnums, @entities/merit]
  patterns: [Prisma migration, Drizzle queries, audit logging, admin-gated CRUD]
key_files:
  created:
    - prisma/migrations/20260619000000_add_behavior_record/migration.sql
    - src/db/schema/behavior-records.ts (auto-generated)
    - src/db/schema/behavior-type-enum.ts (auto-generated)
    - src/db/schema/behavior-record-status-enum.ts (auto-generated)
    - src/db/schema/behavior-category-enum.ts (auto-generated)
    - src/db/schema/behavior-records-relations.ts (auto-generated)
    - src/entities/merit/model/constants.ts
    - src/entities/merit/model/types.ts
    - src/entities/merit/services/index.ts
    - src/entities/merit/permissions/index.ts
    - src/entities/merit/index.ts
    - src/app/api/merits/route.ts
    - src/app/api/merits/[id]/route.ts
    - src/app/api/merits/[id]/dispute/route.ts
    - src/app/api/merits/[id]/resolve/route.ts
  modified:
    - prisma/schema.prisma
    - src/db/schema/schema.ts (auto-updated barrel)
    - src/shared/api/db.ts
    - src/shared/api/server/index.ts
    - src/shared/api/audit-log.ts
decisions:
  - Split scoring: recognitionPoints (positive, MERIT) vs disciplinaryPoints (positive, WARNING/INFRACTION), overall = rec - disc
  - 5 standing tiers: GOLD(≥50), SILVER(≥20), BRONZE(≥0), WATCHLIST(<0), PROBATION(≤-20)
  - BehaviorRecordStatus workflow: ACTIVE → DISPUTED → UPHELD/OVERTURNED (never deleted)
  - Escalation engine: infraction COUNT triggers REVIEW_FLAG (3) and SUSPENSION_RECOMMENDATION (5)
  - Time-based expiry: WARNING 180d, INFRACTION 730d, MERIT never
duration: ~25 min
completed: 2026-06-19T08:45:00Z
---

# Phase 45 Plan 02: Community Merits — Data Model + API Summary

**One-liner:** Built BehaviorRecord schema with split scoring, 5-tier standing, dispute workflow, and count-based escalation engine — 7 API route handlers with audit logging.

## What Was Implemented

### Task 1: Prisma Model + Enums + Drizzle Schema

- Added 3 Prisma enums: `BehaviorType` (MERIT/WARNING/INFRACTION), `BehaviorRecordStatus` (ACTIVE/DISPUTED/UPHELD/OVERTURNED), `BehaviorCategory` (9 values)
- Added `BehaviorRecord` model with split scoring: `recognitionPoints`, `disciplinaryPoints`, `standingBefore/After`, `expiresAt`
- Added 3 back-relations to `user` model: `behaviorRecordsSubject`, `behaviorRecordsCreatedBy`, `behaviorRecordsResolvedBy`
- Created migration SQL via `prisma migrate diff` (non-interactive Prisma workaround)
- Drizzle files auto-generated via `prisma generate` (prisma-generator-drizzle 0.7.6)
- Registered in `schema.ts` barrel, `db.ts` proxy, `server/index.ts` exports

### Task 2: Constants + Helpers (Entity Slice)

- Created `@entities/merit` with FSD entity slice structure
- `BEHAVIOR_POINTS`: MERIT=+5, WARNING=2 (penalty), INFRACTION=10 (penalty)
- `DEFAULT_TIER_THRESHOLDS`: GOLD≥50, SILVER≥20, BRONZE≥0, PROBATION≤-20
- `ESCALATION_THRESHOLDS`: REVIEW_FLAG=3 infractions, SUSPENSION_RECOMMENDATION=5
- `DEFAULT_EXPIRY_DAYS`: WARNING=180d, INFRACTION=730d, MERIT=null (never)
- `getEffectivePoints()`: SUM recognitionPoints + SUM disciplinaryPoints with ACTIVE/UPHELD filter
- `getStandingTier()`: Map overall score to 5-tier standing
- `checkAndEscalateStanding()`: Count ACTIVE+UPHELD INFRACTIONS, compare to thresholds
- `getStandingTierConfig()`: Tier label + color classes
- `canManageMerits()`, `canResolveDisputes()`: ADMIN/BOARD/MANAGER gate

### Task 3: API Routes (7 handlers)

- **GET /api/merits**: Paginated list with status/category/userId filters
- **POST /api/merits**: Create entry with server-assigned points, expiry calc, standingBefore/After, escalation check
- **GET/PATCH/DELETE /api/merits/[id]**: CRUD with soft-delete, immutable points, audit logging
- **POST /api/merits/[id]/dispute**: Resident self-dispute (own records only, ACTIVE→DISPUTED)
- **POST /api/merits/[id]/resolve**: Admin UPHOLD/OVERTURN resolution (OVERTURN zeroes points)
- Auth guard + permission check on all admin endpoints
- Extended `AuditAction` with 5 new types: MERIT_RECORD_CREATED/UPDATED/DELETED, MERIT_DISPUTE_FILED/RESOLVED

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Build] Non-interactive Prisma migrate workaround**

- **Issue:** `prisma migrate dev` requires interactive TTY; not supported in agent environment
- **Fix:** Used `prisma migrate diff --script` to generate SQL, manually created migration directory, then `prisma generate`
- **Files modified:** Migration file at `prisma/migrations/20260619000000_add_behavior_record/migration.sql`

**2. [Rule 1 - Bug] Corrected apiError/auditLog signatures**

- **Issue:** `apiError('msg')` → needs `apiError('CODE', 'msg', statusCode)`. `writeAuditLog` uses `details` not `metadata`. `AuditAction` type union needed extension.
- **Fix:** Fixed all route handlers to match existing Phase 33 API patterns; added 5 new AuditAction values
- **Files modified:** All 4 route files, `audit-log.ts`

**3. [Rule 1 - Bug] Fixed ESLint no-explicit-any violations**

- **Issue:** `as any` casts in route handlers triggered ESLint error
- **Fix:** Added `eslint-disable-next-line` comments (Drizzle pgEnum types require runtime casts)
- **Files modified:** merits/route.ts, merits/[id]/route.ts, merits/[id]/resolve/route.ts

## Known Stubs

| File                               | Line          | Description                                                   |
| ---------------------------------- | ------------- | ------------------------------------------------------------- |
| `src/app/api/merits/[id]/route.ts` | PATCH handler | Does not recalculate standing after reason/description update |

## Commits

| Hash     | Description                                                                      |
| -------- | -------------------------------------------------------------------------------- |
| 0c89e04a | feat(45-02): add BehaviorRecord Prisma model + Drizzle schema with split scoring |
| 935c93f3 | feat(45-02): create merits constants, helpers, and API routes                    |

## Self-Check: PASSED

- BehaviorRecord model in schema.prisma: ✅
- Drizzle enums auto-generated: ✅
- GET/POST /api/merits route: ✅
- GET/PATCH/DELETE /api/merits/[id] route: ✅
- POST /api/merits/[id]/dispute: ✅
- POST /api/merits/[id]/resolve: ✅
- TypeScript compilation: ✅
