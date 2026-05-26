---
phase: 30-dashboard-phase-b
plan: 04
subsystem: ui
tags: [react, next.js, dashboard, admin, my-home, announcements, navigation]

requires:
  - phase: 30-dashboard-phase-b/30-02
    provides: HomeLayer, feature flag wiring
  - phase: 30-dashboard-phase-b/30-03
    provides: SpaceLayout, widget-to-space mapping

provides:
  - AdminSubLauncher 3-column icon grid for 9 admin domains
  - Admin domain pages at /dashboard/admin/[domain]
  - MyHomeSpace consolidating property/household/profile
  - Announcements routed into Messages space
  - NAV_REGISTRY with 5 dashboard space entries
  - MESSAGES_SUB_ROUTES constant

affects: [30-05]

tech-stack:
  added: []
  patterns: [admin-sub-launcher, domain-routing, my-home-consolidation]

key-files:
  created:
    - src/widgets/dashboard/ui/AdminSubLauncher.tsx
    - src/widgets/dashboard/ui/MyHomeSpace.tsx
    - src/app/(tenant)/dashboard/admin/[domain]/page.tsx
    - src/app/(tenant)/dashboard/admin/layout.tsx
    - src/app/(tenant)/dashboard/messages/announcements/page.tsx
  modified:
    - src/widgets/dashboard/model/spaces.ts
    - src/app/(tenant)/dashboard/page.tsx
    - src/shared/lib/navigation.ts

key-decisions:
  - '9 admin domains: users, maintenance, content, events, competitions, resources, surveys, announcements, system'
  - 'My Home consolidates property/household/profile (Q3 decision)'
  - 'Announcements absorbed into Messages space; admin UI at /dashboard/messages/announcements'

patterns-established:
  - 'Admin sub-launcher pattern: icon grid linking to /dashboard/admin/[domain] deep links'
  - 'MyHomeSpace consolidation: property details + household members + profile management in one view'

requirements-completed: [FOCUS-09, FOCUS-10, FOCUS-11]

duration: 25min
completed: 2026-05-27
---

# Phase 30 Plan 04: Admin Sub-Launcher, My Home & Announcements Routing Summary

**Admin sub-launcher with 9 domain icons, MyHomeSpace consolidation, and announcements routed into Messages space with role-gated management**

## Performance

- **Duration:** 25 min
- **Started:** 2026-05-27
- **Completed:** 2026-05-27
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- AdminSubLauncher: 3-column icon grid linking to /dashboard/admin/[domain] for 9 admin domains
- Admin domain pages render appropriate widgets per domain mapping (getAdminDomainWidgets)
- MyHomeSpace: consolidated property/household/profile view (Q3 decision)
- Dashboard home renders HomeLayer + MyHomeSpace when focus spaces enabled
- Admin space page shows overview widgets + sub-launcher below
- Announcements management at /dashboard/messages/announcements (role-gated admin/board only)
- Admin-announcements widget added to messages space
- NAV_REGISTRY: 5 dashboard space entries for internal workspace navigation

## Task Commits

1. **Task 1: Admin sub-launcher + My Home space + admin domain routes** - `be74e7c` (feat)
2. **Task 2: Announcements in Messages space + NAV_REGISTRY updates** - `aeae930` (feat)

## Files Created/Modified

- `src/widgets/dashboard/ui/AdminSubLauncher.tsx` - 3-column icon grid for admin domains
- `src/widgets/dashboard/ui/MyHomeSpace.tsx` - Property/household/profile consolidation
- `src/app/(tenant)/dashboard/admin/[domain]/page.tsx` - Admin domain pages with widget rendering
- `src/app/(tenant)/dashboard/admin/layout.tsx` - Admin layout with breadcrumbs
- `src/app/(tenant)/dashboard/messages/announcements/page.tsx` - Role-gated announcements management
- `src/widgets/dashboard/model/spaces.ts` - ADMIN_DOMAINS, MESSAGES_SUB_ROUTES, getAdminDomainWidgets()
- `src/app/(tenant)/dashboard/page.tsx` - Home renders HomeLayer + MyHomeSpace
- `src/shared/lib/navigation.ts` - NAV_REGISTRY with 5 dashboard space entries

## Decisions Made

- 9 admin domains: users, maintenance, content, events, competitions, resources, surveys, announcements, system
- My Home consolidates property/household/profile (Q3 decision from planning)
- Announcements absorbed into Messages space as broadcast message type (Q4 decision)
- Admin space shows overview widgets + sub-launcher grid below

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Admin sub-launcher and MyHomeSpace ready for mobile layout in 30-05
- All wave 3 deliverables complete, ready for wave 4 (mobile bar + responsive layout)

---

_Phase: 30-dashboard-phase-b_
_Completed: 2026-05-27_
