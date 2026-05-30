---
phase: 38-space-layers
plan: 04
subsystem: ui
tags: [routing, i18n, dashboard, spaces, layers, react]

# Dependency graph
requires:
  - phase: 38-02
    provides: ServicesLayer + ServicesCommandBar + ServicesSubLauncher components
  - phase: 38-03
    provides: MessagesLayer + MessagesCommandBar + MessagesSubLauncher components
provides:
  - Routing switch for all 5 dashboard spaces (admin→services→messages→SpaceLayout)
  - SERVICES_DOMAINS and MESSAGES_DOMAINS canonical constants in spaces.ts
  - Updated MESSAGES_SUB_ROUTES with 3 domains
  - i18n domain labels and descriptions for services and messages layers
affects: [dashboard, routing, i18n, spaces]

# Tech tracking
tech-stack:
  added: []
  patterns: [conditional layer routing in [space]/page.tsx, domain constants mirror SubLauncher definitions]

key-files:
  created: []
  modified:
    - src/app/(tenant)/dashboard/[space]/page.tsx
    - src/widgets/dashboard/model/spaces.ts
    - public/locales/en/services.json
    - public/locales/en/messages.json

key-decisions:
  - "SERVICES_DOMAINS and MESSAGES_DOMAINS placed in spaces.ts mirroring ADMIN_DOMAINS pattern"
  - "Routing order: admin → services → messages → SpaceLayout fallback preserves community as only DnD space"
  - "myServices (camelCase) used in JSON keys to match i18n library expectations — matches ServicesSubLauncher labelKey"

patterns-established:
  - "Layer routing: space-specific components checked before SpaceLayout fallback in [space]/page.tsx"
  - "Domain constants: canonical domain arrays in spaces.ts mirror SubLauncher definitions for type safety"

requirements-completed: [LAYER-03, LAYER-04]

# Metrics
duration: 37min
completed: 2026-05-30
---

# Phase 38 Plan 04: Routing Integration Summary

**ServicesLayer and MessagesLayer wired into dashboard routing with canonical domain constants and i18n keys**

## Performance

- **Duration:** 37 min
- **Started:** 2026-05-30T20:33:42Z
- **Completed:** 2026-05-30T21:11:14Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Routed /dashboard/services to ServicesLayer and /dashboard/messages to MessagesLayer (previously unreachable)
- Added SERVICES_DOMAINS (5 domains) and MESSAGES_DOMAINS (3 domains) constants following ADMIN_DOMAINS pattern
- Expanded MESSAGES_SUB_ROUTES from 1 to 3 domains (conversations, announcements, notifications)
- Populated i18n domain labels and descriptions in services.json and messages.json

## Task Commits

Each task was committed atomically:

1. **Task 1: Add domain constants to spaces.ts + update routing in [space]/page.tsx** - `71cd13b` (feat)
2. **Task 2: Populate i18n keys for service and message domains** - `00e6a9f` (feat)

**Plan metadata:** pending (docs)

## Files Created/Modified

- `src/app/(tenant)/dashboard/[space]/page.tsx` - Added ServicesLayer + MessagesLayer imports and routing branches
- `src/widgets/dashboard/model/spaces.ts` - Added SERVICES_DOMAINS, MESSAGES_DOMAINS, updated MESSAGES_SUB_ROUTES
- `public/locales/en/services.json` - Added domains section with 5 domain labels + descriptions
- `public/locales/en/messages.json` - Added domains section with 3 domain labels + descriptions

## Decisions Made

- **SERVICES_DOMAINS and MESSAGES_DOMAINS in spaces.ts:** Follows the existing ADMIN_DOMAINS pattern for canonical domain definitions — SubLaunchers consume these indirectly via their own definition arrays
- **Routing order (admin → services → messages → SpaceLayout):** Ensures community remains the only true DnD widget space; services and messages get their dedicated layer components
- **myServices (camelCase) in JSON:** Matches ServicesSubLauncher's labelKey `services.domains.myServices` — JSON keys don't support hyphens well with i18n libraries

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 38 complete: All 4 plans executed. ServicesLayer, MessagesLayer, routing, and i18n all wired.
- /dashboard/services renders ServicesLayer with domain grid
- /dashboard/messages renders MessagesLayer with domain grid
- /dashboard/community still renders SpaceLayout (DnD widget grid)
- /dashboard/admin still renders AdminLayer (unchanged)
- All domain labels render from i18n keys

## Self-Check: PASSED

All 4 modified files verified on disk. Both task commits (71cd13b, 00e6a9f) present in git log.

---

_Phase: 38-space-layers_
_Completed: 2026-05-30_
