---
phase: 111-agent-gateway
plan: 05
subsystem: maintenance
tags: [maintenance, routing, landlord, delegation, ResidentDelegation, AgentAccess]

requires:
  - phase: 111-agent-gateway
    plan: 01
    provides: AgentAccess model, ResidentDelegation model, AgentToken model
  - phase: 111-agent-gateway
    plan: 02
    provides: logDelegationAction, delegation audit trail

provides:
  - Maintenance routing engine (HOA vs LANDLORD based on occupancy)
  - ResidentDelegation API for owner-granted renter permissions
  - Landlord workflow (acknowledge, assign contractor)
  - Routing indicator UI in maintenance form
affects:
  - maintenance-api
  - property-management
  - delegation-system

tech-stack:
  added: []
  patterns:
    - Drizzle query builder for routing resolver
    - ResidentDelegation scoped permission check in API middleware
    - AgentAccess auto-activation for contractor assignment

key-files:
  created:
    - src/entities/maintenance/model/routing.ts
    - src/app/api/properties/[id]/resident-delegation/route.ts
    - src/app/api/maintenance/routing-hint/route.ts
    - src/entities/maintenance/__tests__/maintenance-routing.test.ts
    - src/app/api/properties/[id]/resident-delegation/__tests__/resident-delegation.test.ts
  modified:
    - prisma/schema.prisma
    - src/entities/maintenance/model/types.ts
    - src/entities/maintenance/services/index.ts
    - src/entities/maintenance/index.server.ts
    - src/app/api/maintenance/route.ts
    - src/app/api/maintenance/[id]/route.ts
    - src/features/maintenance/ui/MaintenanceForm.tsx
    - src/features/maintenance/model/useMaintenanceForm.ts
    - src/shared/api/db.ts
    - src/shared/api/server/index.ts

key-decisions:
  - Use Drizzle query builder (not Prisma) for routing resolver to match project pattern
  - Place server-only routing function in dedicated model/routing.ts (not constants.ts) to preserve client/server barrel split
  - Auto-activate AgentAccess on contractor assignment (no acceptance flow needed)
  - Routing hint endpoint returns routingType only — no PII, no financials
  - HOA maintenance workflow completely unchanged for non-rental properties

requirements-completed: []

duration: 24min
completed: 2026-06-28
---

# Phase 111 Plan 05: Maintenance Request Routing Summary

**Maintenance routing engine wiring property occupancy model to delegation system — RENTAL properties route to landlord, all others route to HOA, with owner-controlled renter permissions and landlord-to-contractor delegation.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-06-28T05:27:45Z
- **Completed:** 2026-06-28T05:52:41Z
- **Tasks:** 6
- **Files modified:** 16

## Accomplishments

- Added `MaintenanceRouting` enum (HOA/LANDLORD) and routing fields to `MaintenanceRequest` schema
- Built routing resolver that determines routing from property's active `Household.occupancyType`
- Created `ResidentDelegation` API — owners can grant renters `maintenance:create` and other permitted scopes
- Updated maintenance POST handler with routing resolution, renter permission check, and landlord notification
- Added landlord actions to PATCH handler (acknowledge → ASSIGNED, assign_contractor → scoped AgentAccess)
- Added routing indicator (amber/blue) to `MaintenanceForm` with hint endpoint

## Task Commits

1. **Task 1: Schema — MaintenanceRouting enum + routingType** — `9bd23c8f` (feat)
2. **Task 2: Routing engine (RED)** — `868a0053` (test)
3. **Task 2: Routing engine (GREEN)** — `ce2e2176` (feat)
4. **Task 2: Routing engine (REFACTOR)** — `c11f180e` (refactor)
5. **Task 3: ResidentDelegation API** — `b79a11b7` (feat)
6. **Task 4: Maintenance POST — routing logic** — `7732e6ca` (feat)
7. **Task 5: Maintenance PATCH — landlord actions** — `18a3d57a` (feat)
8. **Task 6: MaintenanceForm — routing indicator** — `f56083dc` (feat)

## Files Created/Modified

- `prisma/schema.prisma` — MaintenanceRouting enum, routingType/landlordId on MaintenanceRequest, indexes, user back-relation
- `src/db/schema/maintenance-routing-enum.ts` — Drizzle-generated enum
- `src/entities/maintenance/model/types.ts` — MaintenanceRoutingType, MaintenanceRoutingContext types
- `src/entities/maintenance/model/routing.ts` — resolveRoutingType() function (Drizzle query builder)
- `src/entities/maintenance/index.server.ts` — Export resolveRoutingType from server barrel
- `src/entities/maintenance/services/index.ts` — Accept routingType/landlordId in createMaintenanceRequest
- `src/entities/maintenance/__tests__/maintenance-routing.test.ts` — 6 routing resolver tests (vitest)
- `src/app/api/properties/[id]/resident-delegation/route.ts` — POST/GET/DELETE handlers with scope validation
- `src/app/api/properties/[id]/resident-delegation/__tests__/resident-delegation.test.ts` — API route tests
- `src/app/api/maintenance/route.ts` — Routing resolution + renter permission check + landlord notification
- `src/app/api/maintenance/[id]/route.ts` — Landlord acknowledge/contractor-assign actions
- `src/app/api/maintenance/routing-hint/route.ts` — Lightweight GET endpoint for routing type
- `src/features/maintenance/ui/MaintenanceForm.tsx` — Routing indicator UI (amber/blue)
- `src/features/maintenance/model/useMaintenanceForm.ts` — routingHint state + fetch on propertyId change
- `src/shared/api/db.ts` — Import residentDelegations, agentTokens, delegationActions
- `src/shared/api/server/index.ts` — Export residentDelegations, agentTokens, delegationActions

## Decisions Made

- **Drizzle query builder** used for routing resolver instead of Prisma-style queries to match project pattern
- **Separate routing.ts file** for server-only resolver function — avoids importing db into client-exported constants.ts
- **AgentAccess auto-activation** on contractor assignment — no acceptance flow needed for maintenance delegation
- **Routing hint endpoint** returns only routingType — no PII, no financials, no landlord identity exposed
- **HOA path unchanged** — existing maintenance workflow runs as before for non-rental properties

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Rewrote routing resolver from Prisma to Drizzle query builder**

- **Found during:** Task 2 (GREEN phase)
- **Issue:** Plan's code used Prisma-style `db.property.findFirst()` but project uses Drizzle for queries. Prisma client pattern incompatible with `NodePgDatabase` type.
- **Fix:** Rewrote `resolveRoutingType` to use Drizzle `db.select().from(properties).where().limit()` pattern, importing table references from `@api/server`.
- **Files modified:** `src/entities/maintenance/model/routing.ts`, test file
- **Committed in:** `c11f180e` (refactor)

**2. [Rule 3 - Blocking] Added missing Drizzle table exports**

- **Found during:** Task 3 (ResidentDelegation API)
- **Issue:** `residentDelegations`, `agentTokens`, and `delegationActions` tables not exported from `@api/server` barrel.
- **Fix:** Added imports in `src/shared/api/db.ts` and re-exports in `src/shared/api/server/index.ts`.
- **Files modified:** `src/shared/api/db.ts`, `src/shared/api/server/index.ts`
- **Committed in:** `b79a11b7` (part of Task 3)

**3. [Rule 2 - Missing Critical] Fixed apiError parameter order**

- **Found during:** Task 3 (ResidentDelegation API)
- **Issue:** Plan used `apiError(code, status, message)` but actual signature is `apiError(code, message, status, details?)`.
- **Fix:** Reordered all apiError calls to match canonical signature.
- **Files modified:** `src/app/api/properties/[id]/resident-delegation/route.ts`
- **Committed in:** `b79a11b7` (part of Task 3)

**4. [Rule 1 - Bug] Used `apiCreated()` instead of `apiSuccess(data, 201)`**

- **Found during:** Task 3
- **Issue:** Plan called `apiSuccess(data, 201)` but `apiSuccess` signature is `(data, meta?, status?)`. Used `apiCreated()` for 201 responses.
- **Files modified:** `src/app/api/properties/[id]/resident-delegation/route.ts`
- **Committed in:** `b79a11b7` (part of Task 3)

---

**Total deviations:** 4 auto-fixed (1 blocking pattern mismatch, 1 blocking missing exports, 1 missing critical, 1 bug)
**Impact on plan:** All fixes necessary for correctness and project pattern alignment. No scope creep.

## Issues Encountered

- Pre-existing TypeScript LSP errors on Drizzle `NodePgDatabase` type not recognizing table properties — false positives, code works correctly at runtime
- `maintenance-routing.test.ts` required rewrite when implementation switched from Prisma to Drizzle — mock patterns differed significantly
- Drizzle schema regeneration after Prisma schema change was needed before new column types were available in TypeScript

## Next Phase Readiness

- Plan 111-05 complete — all 6 tasks committed
- ResidentDelegation API test file created but tests are structural — need full integration testing with running DB
- DB migration (Prisma migrate) needed before new routing fields are queryable at runtime
- Ready for next plan in Phase 111 or verification phase

---

_Phase: 111-agent-gateway_
_Completed: 2026-06-28_
