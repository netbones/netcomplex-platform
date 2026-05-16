---
phase: 25-gap-closure
plan: 01
subsystem: auth
tags: [isPlatformAdmin, auth-guards, role-checks, better-auth, drizzle]

# Dependency graph
requires:
  - phase: 19-schema-corrections
    provides: users.isPlatformAdmin column on user table
provides:
  - Secured platform admin tenant CRUD routes with isPlatformAdmin guards
  - Fixed MobileMenu admin link visibility using case-insensitive isAdmin() helper
affects: [platform-admin-ui, tenant-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Server-only guard helper pattern (requirePlatformAdmin) in separate file to avoid breaking client imports'
    - 'Guard returns NextResponse on failure, null on success — called at top of every handler'

key-files:
  created:
    - src/entities/tenant/api/guards.ts
  modified:
    - src/app/api/admin/platform/tenants/route.ts
    - src/app/api/admin/platform/tenants/[id]/route.ts
    - src/shared/ui/MobileMenu.tsx

key-decisions:
  - 'Created requirePlatformAdmin in separate guards.ts file instead of permissions.ts to avoid breaking client-side imports of permissions.ts'
  - 'Guard pattern returns NextResponse on auth failure, null on success — consistent with existing assist route pattern'

patterns-established:
  - 'Server-side auth guards: separate file for DB-dependent guards, pure functions stay in permissions.ts'
  - 'Guard early-return pattern: const guard = await requirePlatformAdmin(req); if (guard) return guard;'

requirements-completed: [SCHEMA-04, GAP-03, GAP-04]

# Metrics
duration: 3 min
completed: 2026-05-16
---

# Phase 25 Plan 01: Platform Admin Auth Guards Summary

**Secured platform tenant CRUD routes with isPlatformAdmin guards and fixed MobileMenu admin link case-sensitivity**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-16T13:00:13Z
- **Completed:** 2026-05-16T13:03:26Z
- **Tasks:** 2/2
- **Files modified:** 4

## Accomplishments

- Created `requirePlatformAdmin` server-side guard helper in `src/entities/tenant/api/guards.ts`
- Added isPlatformAdmin guards to all 5 handlers across tenant CRUD routes (GET, POST, GET, PATCH, DELETE)
- Fixed MobileMenu admin link visibility by replacing hardcoded lowercase `'admin'` comparison with `isAdmin()` helper

## Task Commits

Each task was committed atomically:

1. **Task 1: Add isPlatformAdmin guards to platform tenant routes** - `7fbc254` (feat)
2. **Task 2: Fix MobileMenu role case-sensitivity bug** - `d6698a8` (fix)

**Plan metadata:** pending final commit

## Files Created/Modified

- `src/entities/tenant/api/guards.ts` - Server-only requirePlatformAdmin guard helper
- `src/app/api/admin/platform/tenants/route.ts` - Added guards to GET and POST handlers
- `src/app/api/admin/platform/tenants/[id]/route.ts` - Added guards to GET, PATCH, and DELETE handlers
- `src/shared/ui/MobileMenu.tsx` - Replaced hardcoded role comparison with isAdmin() helper

## Decisions Made

- Created `requirePlatformAdmin` in a separate `guards.ts` file instead of `permissions.ts` as the plan suggested. The `permissions.ts` file is imported by client components (Header.tsx), and adding server-only imports (`server-only`, `@api/db`, `@api/auth`) would break client-side builds. This is a minor deviation (Rule 3 - preventing a blocking build issue).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created guards.ts instead of adding to permissions.ts**

- **Found during:** Task 1 (requirePlatformAdmin helper creation)
- **Issue:** Plan specified creating helper in `src/entities/tenant/api/permissions.ts`, but that file is imported by client components (Header.tsx line 9). Adding server-only imports would break client builds.
- **Fix:** Created separate `src/entities/tenant/api/guards.ts` file with `import 'server-only'` and DB-dependent guard logic.
- **Files modified:** src/entities/tenant/api/guards.ts (created)
- **Verification:** TypeScript compiles without errors in guards.ts and tenant route files; no client import errors
- **Committed in:** 7fbc254 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Deviation essential for build correctness. No scope creep — same functionality, better architecture separation.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Platform admin tenant CRUD routes are now secured with isPlatformAdmin guards
- MobileMenu admin links now correctly show for users with ADMIN role (case-insensitive via isAdmin helper)
- Ready for next gap closure plans in phase 25

---

_Phase: 25-gap-closure_
_Completed: 2026-05-16_
