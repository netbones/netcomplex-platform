---
phase: 30-dashboard-phase-b
plan: 02
subsystem: ui
tags: [react, next.js, dashboard, home-layer, feature-flags, zustand, migration]

requires:
  - phase: 30-dashboard-phase-b/30-01
    provides: space model, SPACES registry, routing scaffold

provides:
  - HomeLayer three-zone component (Urgency, Today, Activity)
  - NEXT_PUBLIC_FOCUS_SPACES feature flag toggle
  - TAB_TO_SPACE_MAP migration constant
  - Space-keyed default layouts via remapToSpaces
  - migrateToSpaceLayouts() auto-migration in widget store

affects: [30-04, 30-05]

tech-stack:
  added: []
  patterns:
    [three-zone-home-screen, feature-flag-toggle, tab-to-space-migration, persist-version-bump]

key-files:
  created:
    - src/widgets/dashboard/ui/HomeLayer.tsx
    - src/entities/widget/model/tab-migration-map.ts
  modified:
    - src/app/(tenant)/dashboard/page.tsx
    - src/entities/widget/model/default-layouts.ts
    - src/entities/widget/model/widget-store.ts

key-decisions:
  - 'NEXT_PUBLIC_FOCUS_SPACES env var toggles new architecture vs old DashboardPage'
  - 'Tab-to-space mapping: overview→home, maintenance→services, bookings→services, services→services, content→community, premium→community'
  - 'Widget store persist version bumped to 4 (triggers re-hydration for migration)'

patterns-established:
  - 'Three-zone home screen: Urgency (top, collapses when empty), Today (middle), Activity (bottom)'
  - 'Feature flag toggle pattern: env var controls which UI renders, old UI preserved for rollback'

requirements-completed: [FOCUS-03, FOCUS-04]

duration: 22min
completed: 2026-05-27
---

# Phase 30 Plan 02: HomeLayer & Feature Flag Wiring Summary

**Three-zone HomeLayer (Urgency/Today/Activity) with feature flag toggle, tab→space migration map, and auto-migration in widget store**

## Performance

- **Duration:** 22 min
- **Started:** 2026-05-27
- **Completed:** 2026-05-27
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- HomeLayer component with three zones: Urgency (urgent announcements, overdue maintenance, unread messages), Today (bookings, events), Activity (recent activity, community announcements)
- NEXT_PUBLIC_FOCUS_SPACES env var toggles HomeLayer vs old DashboardPage
- TAB_TO_SPACE_MAP shared constant for tab→space key mapping
- Space-keyed default layouts via remapToSpaces/getSpaceDefaultLayout
- migrateToSpaceLayouts() auto-migrates old tab keys on hydration, persist v4

## Task Commits

1. **Task 1: Build HomeLayer three-zone component** - `53b8214` (feat)
2. **Task 2: Wire HomeLayer + feature flag + migration map** - `7edece2` (feat)

## Files Created/Modified

- `src/widgets/dashboard/ui/HomeLayer.tsx` - Three-zone home screen with parallel data fetching
- `src/app/(tenant)/dashboard/page.tsx` - Feature-flagged home page (HomeLayer vs DashboardPage)
- `src/entities/widget/model/default-layouts.ts` - Space-keyed defaults via remapToSpaces
- `src/entities/widget/model/tab-migration-map.ts` - Shared TAB_TO_SPACE_MAP constant
- `src/entities/widget/model/widget-store.ts` - migrateToSpaceLayouts(), persist v4

## Decisions Made

- NEXT_PUBLIC_FOCUS_SPACES env var controls feature flag toggle (old tabs preserved for rollback)
- Tab-to-space mapping: overview→home, maintenance→services, bookings→services, services→services, content→community, premium→community
- Widget store persist version bumped to 4 to trigger re-hydration for migration
- HomeLayer uses single Promise.all for all fetches (avoids sequential render cascade)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- HomeLayer initially called `/api/messages?unread=true` which returned 400 (conversationId required). Fixed in 30-05 checkpoint fix commit to call `/api/messages/unread` instead.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- HomeLayer ready for Home space rendering in 30-04
- Feature flag wiring ready for mobile responsive layout in 30-05
- Migration map used by widget-to-space assignment in 30-03

---

_Phase: 30-dashboard-phase-b_
_Completed: 2026-05-27_
