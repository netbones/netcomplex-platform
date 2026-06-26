---
phase: 106-dispute-api-routes-intake-screen
plan: 02
subsystem: api
tags: [dispute, mediation, evidence, moderator, ruling, supabase-realtime, drizzle, zod]

# Dependency graph
requires:
  - phase: 106-01
    provides: core CRUD routes (GET/POST/PATCH), submit route with cooling-off, test infrastructure
provides:
  - Mediation thread routes with visibility filtering and Supabase Realtime broadcast
  - Evidence file upload route with S3 integration via uploadImage
  - Moderator assignment route (BOARD/ADMIN only)
  - Formal ruling issuance route with canTransition validation (BOARD/ADMIN only)
  - 18 specialized route tests covering all 4 new routes
affects:
  - 106-03 (intake screen + CSOS export)
  - 106-04 (dispute widget + intake screen UI)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'withErrorHandler + inline getSessionAndRole for dynamic route handlers'
    - 'Per-route rate limiting tiers: 30/min (messages), 10/min (evidence)'
    - 'Drizzle db.transaction() for atomic update+event log on assign and ruling'
    - 'Supabase Realtime channel per dispute: supabase.channel(`dispute:${id}`).send({...})'
    - 'Visibility filtering: parties see isInternal:false only; moderators see all'
    - 'isInternal enforcement: server-side role check before DB insert, 403 for non-moderators'
    - 'canTransition() gate before FORMAL_RULING status change'

key-files:
  created:
    - src/app/api/disputes/[id]/messages/route.ts
    - src/app/api/disputes/[id]/evidence/route.ts
    - src/app/api/disputes/[id]/assign/route.ts
    - src/app/api/disputes/[id]/ruling/route.ts
    - src/app/api/disputes/__tests__/specialized-routes.test.ts
  modified:
    - src/entities/dispute/index.ts

key-decisions:
  - 'Added disputeMessageCreateSchema, disputeAssignSchema, disputeRulingSchema to client barrel — all are pure Zod schemas with no server dependencies'
  - 'Used inline getSessionAndRole (matching [id]/route.ts pattern) instead of importing from @api/server — keeps routes self-contained'
  - 'Evidence upload uses existing uploadImage() from @api/server (S3), not Supabase Storage — follows existing codebase pattern'
  - 'Ruling issue validates canTransition() before transaction, returns 409 on invalid transition — prevents invalid state changes'

patterns-established:
  - 'Mediation visibility: parties see non-internal only, moderators see all — enforced at query level with conditional eq() filter'
  - "Realtime broadcast: Supabase channel on dispute:{id}, event 'new-mediation-message' — mirrors messages/route.ts 'new-message' pattern"

requirements-completed:
  - DISPUTE-04

# Metrics
duration: 1h 33m
completed: 2026-06-26
---

# Phase 106 Plan 02: Specialized Dispute Routes Summary

**Mediation thread with visibility rules, Supabase Realtime broadcast, evidence file upload via S3, moderator assignment, and formal ruling issuance with status transition validation**

## Performance

- **Duration:** ~1h 33m
- **Started:** 2026-06-26T10:37:49+02:00
- **Completed:** 2026-06-26T12:10:24+02:00
- **Tasks:** 2 (both TDD cycles)
- **Files created/modified:** 6

## Accomplishments

- Mediation thread GET/POST routes with role-based visibility filtering (parties see non-internal; moderators see all)
- isInternal flag enforcement: server-side role check rejects non-moderators with 403 before DB insert
- Supabase Realtime broadcast on dispute channel for new mediation messages
- Evidence file upload route using existing uploadImage() S3 integration with DisputeEvidence insert
- Moderator assignment route (BOARD/ADMIN only) with atomic update+event in db.transaction
- Formal ruling route with canTransition() validation and status transition to FORMAL_RULING

## Task Commits

Each task was committed atomically (TDD RED → GREEN cycles):

1. **Task 1 RED: Mediation Thread Tests** — `e471959c` (test)
2. **Task 1 GREEN: Mediation Thread Implementation** — `8346f107` (feat)
3. **Task 2 RED: Evidence/Assign/Ruling Tests** — `cb2c438a` (test)
4. **Task 2 GREEN: Evidence/Assign/Ruling Implementation** — `47f8da42` (feat)

## Files Created/Modified

- `src/app/api/disputes/[id]/messages/route.ts` — GET list with visibility filtering, POST create with isInternal enforcement + sanitizeHtml + Supabase broadcast
- `src/app/api/disputes/[id]/evidence/route.ts` — POST upload via formData + uploadImage() + DisputeEvidence insert + EVIDENCE_ADDED event
- `src/app/api/disputes/[id]/assign/route.ts` — POST assign moderator (BOARD/ADMIN) with ASSIGNED event in transaction
- `src/app/api/disputes/[id]/ruling/route.ts` — POST issue ruling (BOARD/ADMIN) with canTransition() validation + RULING_ISSUED event in transaction
- `src/app/api/disputes/__tests__/specialized-routes.test.ts` — 18 tests (8 messages + 4 evidence + 3 assign + 3 ruling)
- `src/entities/dispute/index.ts` — Added disputeMessageCreateSchema, disputeAssignSchema, disputeRulingSchema to barrel exports

## Decisions Made

- Added three Zod schemas to the client barrel (`dispute/index.ts`) — all pure Zod objects with no server dependencies
- Used inline `getSessionAndRole` helper in each route (consistent with existing [id]/route.ts pattern)
- Evidence upload uses existing `uploadImage()` from `@api/server` (S3-backed), not Supabase Storage
- Ruling route uses `canTransition()` validation before the transaction to fail fast with 409 on invalid state transitions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added dispute schemas to client barrel**

- **Found during:** Task 1 GREEN (messages route implementation)
- **Issue:** `disputeMessageCreateSchema`, `disputeAssignSchema`, and `disputeRulingSchema` were only exported from `@entities/dispute/server` barrel, not the client barrel. Route imports from `@entities/dispute` failed.
- **Fix:** Added the three schemas to `src/entities/dispute/index.ts` exports. All are pure Zod objects with no server dependencies.
- **Files modified:** `src/entities/dispute/index.ts`
- **Verification:** All 18 tests pass with imports from `@entities/dispute`
- **Committed in:** `8346f107` (Task 1 GREEN)

**2. [Rule 1 - Bug] Fixed test isolation issue with shared mock state**

- **Found during:** Task 1 GREEN (test debugging)
- **Issue:** Tests passed individually but failed when run together. `vi.restoreAllMocks()` in afterEach was resetting mock implementations set up in beforeEach, causing stale mock chains between tests.
- **Fix:** Replaced `vi.restoreAllMocks()` with `vi.clearAllMocks()` in afterEach. Made mock data read-lazy from hoisted state at call time rather than capture at setup time.
- **Files modified:** `src/app/api/disputes/__tests__/specialized-routes.test.ts`
- **Verification:** All 18 tests pass when run together
- **Committed in:** `8346f107` (Task 1 GREEN)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both auto-fixes necessary for correct functionality. No scope creep.

## Issues Encountered

- Pre-commit hook (eslint --fix) took ~1 minute for 3-file commit — expected for first run; subsequent runs faster
- Test mock architecture required per-table chain differentiation for user lookups vs dispute lookups — resolved with shared call counter approach

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All 4 specialized routes implemented and tested (18 tests pass)
- Ready for 106-03 (intake screen AI frivolity check + CSOS export route)
- Ready for 106-04 (dispute widget + intake screen UI)

---

_Phase: 106-dispute-api-routes-intake-screen_
_Completed: 2026-06-26_
