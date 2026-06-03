---
phase: 31-dashboard-tab-removal
plan: 03
subsystem: ui
tags: [default-layouts, widget-props, spaceId, tabId, refactor]

# Dependency graph
requires:
  - phase: 31-01
    provides: Widget store with space-based method names (addWidgetToSpace, removeWidgetFromSpace)
  - phase: 31-02
    provides: Deleted tab-migration-map.ts, removed feature flag from dashboard routes
provides:
  - Clean default-layouts.ts with only space-keyed defaults
  - Canonical export names: DEFAULT_USER_WIDGETS, DEFAULT_LAYOUTS, getDefaultLayout
  - Component props renamed tabId→spaceId (WidgetCard, DraggableWidget, SpaceLayout)
affects: [dashboard, widget-card, draggable-widget, space-layout, default-layouts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    [
      canonical naming without prefix (DEFAULT not SPACE_DEFAULT,
      getDefaultLayout not getSpaceDefaultLayout),
    ]

key-files:
  created: []
  modified:
    - src/entities/widget/model/default-layouts.ts
    - src/widgets/dashboard/ui/WidgetCard.tsx
    - src/widgets/dashboard/ui/DraggableWidget.tsx
    - src/widgets/dashboard/ui/SpaceLayout.tsx

key-decisions:
  - 'Dropped SPACE_ prefix from constant names — DEFAULT_USER_WIDGETS and DEFAULT_LAYOUTS are now canonical (no more SPACE_DEFAULT_ prefix)'
  - 'getDefaultLayout() replaces getSpaceDefaultLayout() as the canonical layout lookup function'

patterns-established:
  - 'Canonical naming: after migration prefix is no longer needed, drop prefix for simplicity (SPACE_DEFAULT→DEFAULT)'

requirements-completed: [TAB-REM-03, TAB-REM-06]

# Metrics
duration: 12min
completed: 2026-06-03
---

# Phase 31: Dashboard Tab Removal Summary

**Stripped tab-keyed defaults, renamed SPACE_DEFAULT→DEFAULT constants, getSpaceDefaultLayout→getDefaultLayout, and tabId→spaceId props across 3 widget components**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-03T00:00:00Z
- **Completed:** 2026-06-03T00:12:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Removed ~210 lines of tab-keyed default layouts and migration helpers from default-layouts.ts
- Renamed SPACE_DEFAULT_USER_WIDGETS→DEFAULT_USER_WIDGETS, SPACE_DEFAULT_LAYOUTS→DEFAULT_LAYOUTS
- Renamed getSpaceDefaultLayout→getDefaultLayout as the canonical layout lookup
- Renamed tabId→spaceId prop in WidgetCard, DraggableWidget, and SpaceLayout
- Zero typecheck errors in Phase 31 files

## Task Commits

Each task was committed atomically:

1. **Task 1: Strip tab-keyed defaults and rename getSpaceDefaultLayout→getDefaultLayout** - `aaad9cd` (feat)
2. **Task 2: Rename tabId→spaceId props in WidgetCard, DraggableWidget, and SpaceLayout** - `3660666` (feat)

## Files Created/Modified

- `src/entities/widget/model/default-layouts.ts` - Stripped tab-keyed defaults, migration helpers; renamed SPACE* constants → DEFAULT*
- `src/widgets/dashboard/ui/WidgetCard.tsx` - tabId→spaceId prop rename
- `src/widgets/dashboard/ui/DraggableWidget.tsx` - tabId→spaceId prop rename
- `src/widgets/dashboard/ui/SpaceLayout.tsx` - Store method renames + getSpaceDefaultLayout→getDefaultLayout

## Decisions Made

- Dropped SPACE\_ prefix from constant names — once migration is done, the prefixed names are redundant. DEFAULT_USER_WIDGETS/DEFAULT_LAYOUTS are simpler and more canonical.
- getDefaultLayout() replaces getSpaceDefaultLayout() — single canonical function name

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All Phase 31 plans complete — no tab-keyed data, code, or constants remain
- Dashboard always renders in spaces mode (no feature flag)
- Widget store, default layouts, and component props all use space-based naming consistently

---

_Phase: 31-dashboard-tab-removal_
_Completed: 2026-06-03_
