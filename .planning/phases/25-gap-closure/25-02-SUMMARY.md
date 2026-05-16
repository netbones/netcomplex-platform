---
phase: 25-gap-closure
plan: 02
subsystem: api
tags: [drizzle, transaction, widget-registry, deduplication]

# Dependency graph
requires:
  - phase: 20-self-service-inception
    provides: Onboarding wizard and signup flow
  - phase: 24-dashboard-enhancement
    provides: GroupModerationWidget component
provides:
  - Atomic onboarding setting persistence via db.transaction
  - Single moderation widget (GroupModerationWidget) — ModerationQueueWidget deprecated
affects: [platform-signup, admin-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'db.transaction for atomic multi-step operations in API routes'
    - 'Widget deduplication via deprecation comment + export removal'

key-files:
  created: []
  modified:
    - src/app/api/platform/onboarding/route.ts
    - src/widgets/admin/ui/ModerationQueueWidget.tsx
    - src/widgets/admin/ui/AdminWidgetRenderer.tsx
    - src/widgets/admin/index.ts

key-decisions:
  - "Adapted Task 1 to wrap existing setting upserts in transaction instead of user/tenant/role creation (which this route doesn't perform)"
  - 'Deprecated ModerationQueueWidget with comment rather than deleting, preserving for future reference'

patterns-established:
  - 'Onboarding route uses db.transaction to ensure step data and completion flag are committed atomically'
  - 'Widget deduplication: deprecate with comment, remove from exports and renderer switch'

requirements-completed: [INCEPT-01, GAP-09, GAP-12]

# Metrics
duration: 4 min
completed: 2026-05-16
---

# Phase 25 Plan 02: Onboarding Transaction & Widget Deduplication Summary

**Wrapped onboarding setting persistence in db.transaction and deprecated duplicate ModerationQueueWidget in favor of GroupModerationWidget**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-16T13:00:05Z
- **Completed:** 2026-05-16T13:04:09Z
- **Tasks:** 2/2
- **Files modified:** 4

## Accomplishments

- Onboarding route wraps all setting upserts in a single db.transaction — no partial state on failure
- ModerationQueueWidget deprecated with clear comment, removed from exports and renderer
- Only GroupModerationWidget remains as the active moderation widget

## Task Commits

Each task was committed atomically:

1. **Task 1: Wrap onboarding flow in database transaction** - `036cb77` (feat)
2. **Task 2: Deduplicate moderation widgets** - `50b8e4a` (feat)

## Files Created/Modified

- `src/app/api/platform/onboarding/route.ts` — Wrapped step save + completion flag in db.transaction
- `src/widgets/admin/ui/ModerationQueueWidget.tsx` — Added DEPRECATED comment at top
- `src/widgets/admin/index.ts` — Removed ModerationQueueWidget export
- `src/widgets/admin/ui/AdminWidgetRenderer.tsx` — Removed ModerationQueueWidget import and switch case

## Decisions Made

- **Task 1 adaptation:** The plan described wrapping user/tenant/role creation in a transaction, but the onboarding route only persists step data as settings. User/tenant creation happens in `/api/platform/tenants/route.ts` (which already has partial transaction coverage). Adapted to wrap the actual operations (setting upserts) in a transaction instead.
- **Widget deprecation approach:** Added DEPRECATED comment rather than deleting ModerationQueueWidget, preserving it for reference as specified in the plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan described non-existent operations in onboarding route**

- **Found during:** Task 1 (Wrap onboarding flow in database transaction)
- **Issue:** Plan specified wrapping "Create User record, Create Tenant record, Assign ADMIN role" in a transaction, but the onboarding route only saves onboarding step data as tenant settings. There is no `userRoles` table (roles are on the `users` table directly). User/tenant creation happens in `/api/platform/tenants/route.ts`.
- **Fix:** Wrapped the actual operations — step data upsert and completion flag — in a single `db.transaction`. This ensures that if saving step 5 (completion) fails, the earlier step data and completion flag are rolled back together.
- **Files modified:** `src/app/api/platform/onboarding/route.ts`
- **Verification:** `grep -n "db.transaction" route.ts` confirms transaction wrapping; TypeScript compiles without errors in modified files
- **Committed in:** `036cb77` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — plan described operations not present in target route)
**Impact on plan:** Transaction wrapping applied to actual route operations. Atomicity goal achieved for onboarding setting persistence. User/tenant creation atomicity is already partially handled in `/api/platform/tenants/route.ts` (transaction for linking, manual cleanup on Better Auth failure).

## Issues Encountered

None — pre-existing TypeScript errors in `openapi-router.ts` and `opapi-test.json/route.ts` are unrelated to changes made in this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Onboarding setting persistence is now atomic
- Admin dashboard has a single moderation widget
- Ready for next gap-closure plan (25-03)

---

_Phase: 25-gap-closure_
_Completed: 2026-05-16_
