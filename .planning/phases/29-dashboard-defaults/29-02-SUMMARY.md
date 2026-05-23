---
phase: 29-dashboard-defaults
plan: 02
subsystem: ui
tags: [zustand, react, better-auth, dashboard, widgets]

# Dependency graph
requires:
  - phase: 29-dashboard-defaults/01
    provides: default-layouts.ts with DEFAULT_LAYOUTS, DEFAULT_USER_WIDGETS, getDefaultLayout(role)
provides:
  - Role-aware default injection in DashboardPage via getDefaultLayout
  - resetToRoleDefaults(role, userId) action in widget store with DB persist
  - default-layouts.ts moved to @entities/widget/model/ (no circular dep)
affects: [dashboard, widget-store, auth-session]

# Tech tracking
tech-stack:
  added: []
  patterns:
    [
      role-seeded dashboard defaults,
      single-source-of-truth for initial widget lists,
      store-first then role-defaults fallback,
    ]

key-files:
  created: [src/entities/widget/model/default-layouts.ts]
  modified:
    [
      src/page-modules/dashboard/ui/DashboardPage.tsx,
      src/entities/widget/model/widget-store.ts,
      src/entities/widget/index.ts,
    ]

key-decisions:
  - 'Moved default-layouts.ts from @widgets/dashboard/model to @entities/widget/model to avoid circular dependency when widget-store imports it'
  - 'resetToRoleDefaults accepts both role and userId parameters for single-call persist flow'
  - 'DEFAULT_TABS.defaultWidgets kept on interface but no longer used as widget fallback source'

patterns-established:
  - 'Single source of truth for initial widget lists: getDefaultLayout(role) via default-layouts.ts'
  - 'Fallback chain: userWidgets[tab] → roleDefaults.userWidgets[tab] → []'
  - 'First-login seeding: useEffect checks isHydratedFromDb + empty store, seeds from getDefaultLayout'

requirements-completed: [DASH-DEFAULT-02, DASH-DEFAULT-03]

# Metrics
duration: 15min
completed: 2026-05-23
---

# Phase 29 Plan 02: Dashboard Defaults Wiring Summary

**Role-seeded default injection via getDefaultLayout(role) + resetToRoleDefaults action with DB persist, default-layouts moved to entities layer**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-23
- **Completed:** 2026-05-23
- **Tasks:** 3
- **Files modified:** 4 (1 moved, 3 modified)

## Accomplishments

- Reconciled double-default problem: DashboardPage fallback chain now reads from getDefaultLayout(role), not DEFAULT_TABS.defaultWidgets
- Added resetToRoleDefaults(role, userId) to widget store — clears store + persists to DB in one call
- Moved default-layouts.ts from @widgets/dashboard/model to @entities/widget/model to avoid circular dependency
- Seeding useEffect ensures new users get role-appropriate widgets on first login

## Task Commits

1. **Task 1+2: Reconcile defaults + Add resetToRoleDefaults** - `3447a05` (feat)
2. **Task 3: Verify end-to-end flow** - No code changes (verification only)

## Files Created/Modified

- `src/entities/widget/model/default-layouts.ts` - Moved from @widgets/dashboard/model; contains DEFAULT_LAYOUTS, DEFAULT_USER_WIDGETS, getDefaultLayout(role)
- `src/entities/widget/model/widget-store.ts` - Added resetToRoleDefaults(role, userId) action with saveToDatabase(userId) persist call
- `src/entities/widget/index.ts` - Added barrel export for default-layouts
- `src/page-modules/dashboard/ui/DashboardPage.tsx` - Added authClient.useSession(), role-aware fallback via getDefaultLayout, seeding useEffect, reset button wired to resetToRoleDefaults
- `src/widgets/dashboard/model/default-layouts.ts` - DELETED (moved to entities)

## Decisions Made

- **Moved default-layouts.ts to @entities/widget/model:** The widget store (@entities/widget/model/widget-store.ts) needs to import getDefaultLayout. Having it in @widgets/dashboard would create a circular dep (entities → widgets). Default layout data is configuration, not UI — it belongs in the entities layer.
- **resetToRoleDefaults takes userId parameter:** The store doesn't track the current user ID, so the caller must pass it. This is cleaner than having DashboardPage call saveToDatabase separately — one call resets and persists.
- **DEFAULT_TABS.defaultWidgets retained on interface:** Other code may reference the property. Only the widget rendering fallback chain was changed — no deletion of the field.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed `role` used-before-declaration in DashboardPage**

- **Found during:** Task 1 (DashboardPage modification)
- **Issue:** Plan's suggested code placed `role` definition after useEffect that referenced it
- **Fix:** Moved `role` and `userId` declarations to top of component, before all hooks and effects
- **Files modified:** src/page-modules/dashboard/ui/DashboardPage.tsx
- **Verification:** TypeScript compilation passes with 0 errors
- **Committed in:** 3447a05

**2. [Rule 3 - Blocking] Moved default-layouts.ts to entities layer to avoid circular dep**

- **Found during:** Task 2 (widget-store modification)
- **Issue:** Plan suggested importing from @widgets/dashboard/model/default-layouts but widget-store.ts is in @entities — this creates entities→widgets circular dependency
- **Fix:** Moved default-layouts.ts to @entities/widget/model/, updated barrel exports, deleted original
- **Files modified:** src/entities/widget/model/default-layouts.ts (created), src/widgets/dashboard/model/default-layouts.ts (deleted), src/entities/widget/index.ts
- **Verification:** TypeScript passes, git detected the rename (100% similarity)
- **Committed in:** 3447a05

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered

None — all verification checks passed on first try.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Role-seeded dashboard defaults fully wired and functional
- Zero TypeScript errors
- 37 widgets registered, all 9 new IDs present in dashboard-config
- resetToRoleDefaults persists to DB — reset survives page refresh
- Ready for manual QA testing of dashboard default flow

## Self-Check: PASSED

- [x] src/entities/widget/model/default-layouts.ts exists
- [x] src/page-modules/dashboard/ui/DashboardPage.tsx exists
- [x] src/entities/widget/model/widget-store.ts exists
- [x] src/widgets/dashboard/model/default-layouts.ts deleted (moved)
- [x] Commit 3447a05 found in git log

---

_Phase: 29-dashboard-defaults_
_Completed: 2026-05-23_
