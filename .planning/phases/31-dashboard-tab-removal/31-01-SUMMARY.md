---
phase: 31-dashboard-tab-removal
plan: 01
subsystem: widget-store
tags: [zustand, persist, migration, tab-to-space, rename]
provides:
  - Persist version 5 migration from tab keys to space keys
  - Renamed store methods from tabId to spaceId terminology
  - Removed migrateToSpaceLayouts runtime method
  - Simplified hydrateFromServer (no old-key detection)
affects: [dashboard, widget-layout, space-layout]
tech-stack:
  added: []
  patterns: [persist-version-migration, inline-const-for-migration]
key-files:
  created: []
  modified:
    - src/entities/widget/model/widget-store.ts
    - src/widgets/dashboard/ui/SpaceLayout.tsx
key-decisions:
  - 'Inlined TAB_TO_SPACE_MAP in widget-store.ts instead of importing from tab-migration-map.ts (avoids import from file that will be deleted later)'
  - 'hydrateFromServer simplified: removed runtime old-key check since persist v5 migration handles it at hydration time'
  - 'DashboardPage.tsx left with broken old method names — it is deleted in plan 31-02'
duration: 100min
completed: 2026-06-02
---

# Phase 31 Plan 01: Migrate Persist & Rename Store Methods Summary

**Persist v5 migration remaps tab→space keys; store methods renamed tabId→spaceId; migrateToSpaceLayouts() removed**

## Performance

- **Duration:** ~100min
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Bumped zustand/persist version from 4→5 with v4→v5 migration logic that remaps old tab keys (overview, maintenance, bookings, services, content, premium) to space keys (home, services, services, services, community, community) and deduplicates widgets when merging collapsed tabs
- Removed `migrateToSpaceLayouts()` method from both interface and implementation
- Simplified `hydrateFromServer()` — no longer checks for old tab keys or calls migration method (persist v5 handles this)
- Renamed all store methods: `addWidgetToTab`→`addWidgetToSpace`, `removeWidgetFromTab`→`removeWidgetFromSpace`, `resetTabToDefaults`→`resetSpaceToDefaults`, `resetTabLayout`→`resetSpaceLayout`
- Renamed `WidgetLayouts` and `UserWidgets` interface keys from `tabId` to `spaceId`
- Renamed all internal `tabId` parameters to `spaceId` throughout implementations
- Updated SpaceLayout.tsx callers to use new method names
- Inlined `TAB_TO_SPACE_MAP` constant in widget-store.ts for persist migration (avoids dependency on tab-migration-map.ts which may be deleted later)

## Task Commits

1. **Task 1: Bump persist version to 5 with tab-to-space migration logic** - `ade145b`
2. **Task 2: Rename store methods tabId→spaceId and remove migration code** - `9a0957d`

## Files Created/Modified

- `src/entities/widget/model/widget-store.ts` - Persist v5 migration, method renames, interface renames, migration code removal, TAB_TO_SPACE_MAP inlined
- `src/widgets/dashboard/ui/SpaceLayout.tsx` - Updated store method calls from addWidgetToTab/removeWidgetFromTab to addWidgetToSpace/removeWidgetFromSpace

## Decisions & Deviations

### Decisions

1. **Inlined TAB_TO_SPACE_MAP**: Rather than keeping the import from `tab-migration-map.ts`, the map was inlined as a local constant in widget-store.ts. This ensures the persist migration function doesn't break if `tab-migration-map.ts` is deleted in a future plan.
2. **hydrateFromServer simplified**: The runtime old-key detection and `migrateToSpaceLayouts()` call were removed because the persist v5 migration function handles the key remapping automatically when localStorage is loaded.
3. **DashboardPage.tsx left broken**: It still references `addWidgetToTab`/`removeWidgetFromTab` but is scheduled for deletion in plan 31-02, so this is expected and acceptable per the plan.

### Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

- Store methods now use `spaceId` terminology — plan 31-02 can safely delete DashboardPage.tsx and replace it with space-based routing
- Persist v5 ensures all existing users will have their localStorage migrated on next load
- `default-layouts.ts` and `tab-migration-map.ts` still exist and are used by default-layouts.ts — cleanup deferred to later plans

## Self-Check: PASSED

- 31-01-SUMMARY.md: FOUND
- Commit ade145b: FOUND
- Commit 9a0957d: FOUND
- widget-store.ts: FOUND
- SpaceLayout.tsx: FOUND
