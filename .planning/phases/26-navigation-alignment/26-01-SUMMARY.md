---
phase: 26-navigation-alignment
plan: 01
subsystem: ui
tags: [navigation, react, i18n, flags, tenant-settings]

# Dependency graph
requires: []
provides:
  - navigation-config.ts with NavItem type and 5 filtering functions
  - headerEngagementFocus flag on PlatformPageFlags
  - SETTINGS_KEYS.HEADER_ENGAGEMENT_FOCUS
affects: [26-02, 26-03, Header, MobileMenu, SideDrawer, Footer, PageSettingsWidget]

# Tech tracking
tech-stack:
  added: []
  patterns: [single-nav-config, nav-filtering-by-flags, engagement-focus-mutual-exclusion]

key-files:
  created: [src/shared/lib/navigation-config.ts]
  modified:
    [
      src/entities/tenant/api/flags/platform-flags.ts,
      src/entities/tenant/api/settings.ts,
      src/app/api/flags/route.ts,
    ]

key-decisions:
  - 'Conservation/Campaign mutual exclusion encoded in navigation-config filtering functions, not in components'
  - "headerEngagementFocus defaults to 'conservation' per governance"
  - "isItemVisible helper handles conservation tri-state ('external' = hidden) vs boolean flags"

patterns-established:
  - 'Single nav config: All nav item definitions live in navigation-config.ts, consumed via filtering functions'
  - 'Nav taxonomy: explore/community/workspace/admin sections match NAVIGATION_GOVERNANCE.md'
  - 'Flag-driven visibility: isItemVisible() gates items by PlatformPageFlags'

requirements-completed: [NAV-01, NAV-02, NAV-03]

# Metrics
duration: 67min
completed: 2026-05-20
---

# Phase 26: Navigation Alignment Summary — Plan 01

**Single-source navigation-config.ts with NavItem taxonomy, filtering functions, and headerEngagementFocus flag for Conservation/Campaign mutual exclusion**

## Performance

- **Duration:** 67 min
- **Started:** 2026-05-20T07:15:45Z
- **Completed:** 2026-05-20T08:22:40Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created navigation-config.ts as the single source of truth for all navigation items
- Added headerEngagementFocus flag to PlatformPageFlags with 'conservation'|'campaign' type
- Conservation/Campaign mutual exclusion encoded in getHeaderItems/getMoreDropdownItems
- All nav items map to NAVIGATION_GOVERNANCE.md section taxonomy

## Task Commits

1. **Task 1: Create navigation-config.ts** - `ec617ba` (feat)
2. **Task 2: Add headerEngagementFocus to PlatformPageFlags** - `5ad3f52` (feat)

## Files Created/Modified

- `src/shared/lib/navigation-config.ts` - NavItem type, all nav arrays, 5 filtering functions
- `src/entities/tenant/api/flags/platform-flags.ts` - Added headerEngagementFocus field, switch case, default, mapping
- `src/entities/tenant/api/settings.ts` - Added HEADER_ENGAGEMENT_FOCUS setting key
- `src/app/api/flags/route.ts` - Added headerEngagementFocus to valid flags list

## Decisions Made

- Conservation/Campaign mutual exclusion encoded in filtering functions (getHeaderItems, getMoreDropdownItems) not in components — components just call the function and render
- headerEngagementFocus defaults to 'conservation' per governance spec
- isItemVisible helper handles conservation tri-state ('external' = hidden for local page) vs boolean flags (false = hidden)
- ADMIN_ITEMS use permissionKey for role-based filtering; getAdminItems uses hasPermission()

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- navigation-config.ts ready for consumption by Header, MobileMenu, SideDrawer, Footer (Plan 02)
- headerEngagementFocus flag ready for PageSettingsWidget UI (Plan 03)
- Existing NAV_LINKS/PUBLIC_NAV_LINKS/ADMIN_LINKS in constants.ts intentionally left for Plan 03 cleanup

---

_Phase: 26-navigation-alignment_
_Completed: 2026-05-20_
