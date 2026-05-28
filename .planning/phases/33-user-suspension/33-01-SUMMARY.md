---
phase: 33-user-suspension
plan: 01
subsystem: api
tags: [auth, suspension, drizzle, nextjs, admin]

# Dependency graph
requires:
  - phase: [32-users-list-refactor]
    provides: [users API patterns, admin permission model]
provides:
  - POST /api/users/[id]/suspend - create timed/permanent suspension
  - POST /api/users/[id]/unsuspend - revoke suspension and reactivate
  - GET /api/users/[id]/suspensions - suspension history endpoint
  - requireNotSuspended() / throwIfSuspended() auth guards
  - GET /api/auth/suspension-status - client-side suspension check
  - Auto-unsuspension for expired timed suspensions
  - getSessionAndRole() returns suspension info
affects: [Phase 33-02 suspension UI]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Drizzle transactions for atomic suspend/unsuspend operations
    - Auto-unsuspension on API request (no cron job needed)
    - Suspension auth guards applied via throwIfSuspended() to PATCH/DELETE

key-files:
  created:
    - src/app/api/users/[id]/suspend/route.ts
    - src/app/api/users/[id]/unsuspend/route.ts
    - src/app/api/users/[id]/suspensions/route.ts
    - src/app/api/auth/suspension-status/route.ts
  modified:
    - src/shared/api/auth-utils.ts
    - src/app/api/users/[id]/route.ts

key-decisions:
  - 'Auto-unsuspension on API request — timed suspensions expire on next request, no cron job needed'
  - 'requireNotSuspended() as separate helper — called independently or integrated into getSessionAndRole()'
  - 'throwIfSuspended() convenience guard returns 403 NextResponse for clean early-return pattern'
  - 'Drizzle transactions for atomic suspend/unsuspend — both suspension record and user deactivation succeed or fail together'

patterns-established:
  - 'Suspension guard pattern: throwIfSuspended() at top of route handlers after auth check'
  - 'Transaction pattern: db.transaction(async tx => ...) for atomic suspension + user deactivation/reactivation'
  - 'Auto-unsuspension: check endDate on every requireNotSuspended() call, deactivate if expired'

requirements-completed: []

# Metrics
duration: 11 min
completed: 2026-05-28
---

# Phase 33 Plan 01: User Suspension Backend Summary

**Backend suspension infrastructure — 4 API routes for creating, revoking, and querying timed/permanent user suspensions, with auth-layer enforcement guards and auto-unsuspension for expired suspensions.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-05-28T09:38:30Z
- **Completed:** 2026-05-28T09:51:05Z
- **Tasks:** 4
- **Files modified:** 6

## Accomplishments

- **Task 1:** `POST /api/users/[id]/suspend` — creates platformSuspension record + deactivates user atomically in Drizzle transaction. Validates suspensionType, reason (min 3 chars), checks for existing active suspension (409 Conflict). ADMIN/MANAGER only via hasPermission('users').
- **Task 2:** `POST /api/users/[id]/unsuspend` — atomically deactivates suspension record and reactivates user. Returns 409 if no active suspension found.
- **Task 3:** Added `requireNotSuspended()` and `throwIfSuspended()` with auto-unsuspension logic, modified `getSessionAndRole()` to return suspension info, created `GET /api/auth/suspension-status` endpoint, applied `throwIfSuspended` guard to PATCH/DELETE in users/[id]/route.ts.
- **Task 4:** `GET /api/users/[id]/suspensions` — returns full suspension history ordered by createdAt DESC, tenant-isolated, admin-only access.

## Task Commits

Each task was committed atomically:

1. **Task 1: POST /api/users/[id]/suspend** - `d07652f` (feat)
2. **Task 2: POST /api/users/[id]/unsuspend** - `0ae245d` (feat)
3. **Task 3: Suspension guards + status endpoint** - `72b3e62` (feat)
4. **Task 4: GET /api/users/[id]/suspensions** - `ef51fbb` (feat)

## Files Created/Modified

- `src/app/api/users/[id]/suspend/route.ts` - POST endpoint for creating suspensions with atomic user deactivation
- `src/app/api/users/[id]/unsuspend/route.ts` - POST endpoint for revoking suspensions with atomic user reactivation
- `src/app/api/users/[id]/suspensions/route.ts` - GET endpoint for suspension history (all records, ordered by date)
- `src/app/api/auth/suspension-status/route.ts` - GET endpoint for client-side suspension check
- `src/shared/api/auth-utils.ts` - Added requireNotSuspended(), throwIfSuspended(), updated getSessionAndRole() with suspension info and optional request param
- `src/app/api/users/[id]/route.ts` - Added throwIfSuspended() guard to PATCH and DELETE handlers

## Decisions Made

- **Auto-unsuspension on API request:** Timed suspensions expire on the next API request when requireNotSuspended() detects endDate has passed. No cron job needed.
- **requireNotSuspended() as separate helper:** Called independently for quick suspension checks, or integrated into getSessionAndRole() for automatic suspension info in every API response.
- **throwIfSuspended() convenience guard:** Returns 403 NextResponse with suspension details for clean early-return pattern at top of route handlers.
- **Drizzle transactions:** All suspend/unsuspend operations use db.transaction() for atomicity — suspension record and user (de)activation succeed or fail together.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Next Phase Readiness

- Backend suspension API is complete and compiles cleanly
- Ready for Phase 33-02: Suspension management UI (admin suspend dialog, suspension list display, suspension status banner)
