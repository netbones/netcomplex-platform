---
phase: 30-dashboard-phase-b
plan: 01
subsystem: ui
tags: [react, next.js, dashboard, spaces, navigation, feature-flags, zustand]

requires:
  - phase: 29-dashboard-defaults
    provides: widget registry, default layouts, widget store

provides:
  - SpaceDefinition type with 5-space model (home, services, community, messages, admin)
  - SPACES registry with metadata, icons, feature flags per space
  - getVisibleSpaces(role, flags) with core/optional/hybrid gating
  - SpaceLauncher desktop sidebar component
  - Dynamic /dashboard/[space] route pages
  - Dashboard layout wrapping all space routes

affects: [30-02, 30-03, 30-04, 30-05]

tech-stack:
  added: []
  patterns: [focus-space-architecture, hybrid-feature-gating, tab-to-space-migration]

key-files:
  created:
    - src/widgets/dashboard/model/spaces.ts
    - src/widgets/dashboard/ui/SpaceLauncher.tsx
    - src/app/(tenant)/dashboard/[space]/page.tsx
    - src/app/(tenant)/dashboard/[space]/layout.tsx
  modified:
    - src/widgets/dashboard/model/types.ts
    - src/app/(tenant)/dashboard/layout.tsx

key-decisions:
  - '5-space model: home, services, community, messages, admin replaces 6-tab model'
  - 'Community uses hybrid gating: no single requiredFlag, auto-hides when all sub-flags off'
  - 'WidgetManifest.spaces changed from optional to required'

patterns-established:
  - 'Space gating: core spaces (home, messages) always visible; optional spaces (services, community) hide when flags disabled; admin only for admin/board roles'

requirements-completed: [FOCUS-01, FOCUS-02, FOCUS-05]

duration: 18min
completed: 2026-05-27
---

# Phase 30 Plan 01: Space Definitions & Routing Scaffold Summary

**5-space model (home, services, community, messages, admin) with role+flag visibility gating, SpaceLauncher sidebar, and dynamic space route pages**

## Performance

- **Duration:** 18 min
- **Started:** 2026-05-27
- **Completed:** 2026-05-27
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- SpaceDefinition interface with 5-space registry and getVisibleSpaces(role, flags) gating logic
- Desktop SpaceLauncher sidebar with collapsible icon+label navigation
- Dynamic /dashboard/[space] route validating slugs and rendering space pages
- Dashboard layout wrapping all routes with SpaceLauncher sidebar

## Task Commits

1. **Task 1: Space model + SPACES registry** - `c20f7b8` (feat)
2. **Task 2: Dashboard layout + SpaceLauncher + route pages** - `d4f8bee` (feat)

## Files Created/Modified

- `src/widgets/dashboard/model/spaces.ts` - SpaceDefinition, SPACES registry, getVisibleSpaces, resolveSpace, SPACE_SLUGS
- `src/widgets/dashboard/model/types.ts` - Added optional spaces field to WidgetManifest (later made required in 30-03)
- `src/widgets/dashboard/ui/SpaceLauncher.tsx` - Desktop collapsible sidebar with icon+label navigation
- `src/app/(tenant)/dashboard/layout.tsx` - Dashboard layout wrapping routes with SpaceLauncher
- `src/app/(tenant)/dashboard/[space]/page.tsx` - Dynamic space route page with slug validation
- `src/app/(tenant)/dashboard/[space]/layout.tsx` - Pass-through layout for breadcrumbs

## Decisions Made

- 5-space dashboard architecture replacing 6-tab model (overview, maintenance, bookings, services, content, premium → home, services, community, messages, admin)
- Community uses hybrid gating: no single requiredFlag — auto-hides when ALL sub-flags (events, groups, surveys, competitions, news) are disabled
- Core spaces (home, messages) always visible; admin only for admin/board roles
- Maintenance merged under Services (Q1 decision)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Space model and routing scaffold ready for HomeLayer (30-02), widget migration (30-03), admin sub-launcher (30-04), and mobile bar (30-05)
- SpaceLauncher needs i18n wiring (added in 30-05 fix commit)

---

_Phase: 30-dashboard-phase-b_
_Completed: 2026-05-27_
