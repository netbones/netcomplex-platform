---
phase: 31-dashboard-tab-removal
plan: 01
subsystem: ui
tags: [zustand, persist, migration, widget-store, spaces]

# Dependency graph
requires:
  - phase: 30-dashboard-phase-b
    provides: Tab-to-space mapping, SPACES registry, space-based layouts
provides:
  - Widget store with v5 persist migration (tab→space key conversion on re-hydration)
  - Clean store API: addWidgetToSpace, removeWidgetFromSpace, resetSpaceToDefaults, resetSpaceLayout
  - Inlined TAB_TO_SPACE_MAP for persist migrate function
affects: [31-02, 31-03, dashboard, widget-card, draggable-widget, space-layout]

# Tech tracking
tech-stack:
  added: []
  patterns:
    [persist version bump for data migration, inline migration map to avoid deleted-module import]

key-files:
  created: []
  modified:
    - src/entities/widget/model/widget-store.ts

key-decisions:
  - 'Inlined TAB_TO_SPACE_MAP constant inside widget-store.ts instead of importing from tab-migration-map.ts (file will be deleted in Plan 31-02)'
  - 'Renamed resetTabLayout→resetSpaceLayout for API consistency (not in original plan but method name was misleading after tab→space migration)'

patterns-established:
  - 'Persist version bump pattern: increment version, add migration logic in migrate() function for old→new key conversion'
  - 'Inline migration map pattern: when migration map module will be deleted, inline the map as local constant in the persist consumer'

requirements-completed: [TAB-REM-01, TAB-REM-06]

# Metrics
duration: 15min
completed: 2026-06-02
---

# Phase 31: Dashboard Tab Removal Summary

**Widget store v5 persist with tab→space migration, method rename tabId→spaceId, and migration code cleanup**

## Performance

- **Duration:** 15 min
- **Started:** 2026-06-02T18:35:53Z
- **Completed:** 2026-06-02T18:50:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Persist version bumped 4→5 with automatic tab-to-space key conversion on re-hydration
- Removed migrateToSpaceLayouts() method and old-key detection from hydrateFromServer()
- Renamed all store methods: addWidgetToTab→addWidgetToSpace, removeWidgetFromTab→removeWidgetFromSpace, resetTabToDefaults→resetSpaceToDefaults, resetTabLayout→resetSpaceLayout
- Inlined TAB_TO_SPACE_MAP constant to avoid dependency on to-be-deleted tab-migration-map.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Bump persist version to 5 and run migrateToSpaceLayouts as final data migration** - `a4184e3` (feat)
2. **Task 2: Remove migration code and rename tabId→spaceId in store** - `fe63228` (feat)

## Files Created/Modified

- `src/entities/widget/model/widget-store.ts` - Persist v5, migration logic, method renames, inlined TAB_TO_SPACE_MAP
- `src/page-modules/dashboard/ui/DashboardPage.tsx` - Updated callers to new method names (file will be deleted in Plan 31-02)

## Decisions Made

- Inlined TAB_TO_SPACE_MAP as local constant inside widget-store.ts — the tab-migration-map.ts module will be deleted in Plan 31-02, so the persist migrate function needs the map locally
- Renamed resetTabLayout→resetSpaceLayout for consistency — the plan specified 3 method renames but missed this 4th method which still had "Tab" in its name while taking `spaceId` as parameter

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Renamed resetTabLayout→resetSpaceLayout**

- **Found during:** Task 2 (Remove migration code and rename tabId→spaceId)
- **Issue:** Plan specified renaming addWidgetToTab, removeWidgetFromTab, resetTabToDefaults but missed resetTabLayout which still had "Tab" in name while accepting spaceId parameter — inconsistent API
- **Fix:** Renamed resetTabLayout→resetSpaceLayout in both interface and implementation
- **Files modified:** src/entities/widget/model/widget-store.ts
- **Verification:** grep confirms zero references to resetTabLayout in codebase
- **Committed in:** fe63228 (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Minimal — adds one more method rename for API consistency. No scope creep.

## Issues Encountered

None - both tasks committed cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Widget store data migration complete — existing users' layouts will auto-migrate on re-hydration
- Store API uses clean space-based method names
- Ready for Plan 31-02 (delete tab-mode files, remove feature flag) and Plan 31-03 (strip tab-keyed defaults, rename component props)

---

_Phase: 31-dashboard-tab-removal_
_Completed: 2026-06-02_
