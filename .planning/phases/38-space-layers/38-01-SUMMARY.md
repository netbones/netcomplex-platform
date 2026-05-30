---
phase: 38-space-layers
plan: 01
subsystem: api
tags: [drizzle, urgency-api, api-response, with-tenant]

# Dependency graph
requires:
  - phase: 34-admin-layer
    provides: AdminLayer urgency API pattern (/api/admin/urgency)
provides:
  - GET /api/services/urgency — services space urgency counts
  - GET /api/messages/urgency — messages space urgency counts
affects: [38-02, 38-03, 38-04]

# Tech tracking
tech-stack:
  added: []
  patterns: [urgency-api-per-space, commandBar+domainBadges response shape]

key-files:
  created:
    - src/app/api/services/urgency/route.ts
    - src/app/api/messages/urgency/route.ts
  modified: []

key-decisions:
  - 'Services urgency: RESIDENT role filters maintenance to own requests; admin/board see all'
  - 'Messages urgency: announcements count uses active (not-expired) as proxy for unread — no read-tracking table exists'
  - 'Both APIs use resident-facing auth (apiUnauthorized) not admin-gated permissions'

patterns-established:
  - 'Urgency API pattern: each space gets /api/{space}/urgency returning commandBar + domainBadges shape'
  - 'Resident-scoped filtering: role check from session.user.role determines query scope'

requirements-completed: [LAYER-01, LAYER-02]

# Metrics
duration: 15min
completed: 2026-05-30
---

# Phase 38: Space Layers — Plan 01 Summary

**Two urgency API routes (services + messages) following /api/admin/urgency pattern with resident-scoped filtering**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-30T17:30:00Z
- **Completed:** 2026-05-30T17:45:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- /api/services/urgency returns open maintenance + upcoming bookings counts with resident-scoped filtering
- /api/messages/urgency returns unread DMs + group messages + active announcements + pending notifications
- Both APIs use apiSuccess envelope, withTenant isolation, and authenticated session check

## Task Commits

1. **Task 1: Create /api/services/urgency route** - `fbd27e5` (feat)
2. **Task 2: Create /api/messages/urgency route** - `6e1db8e` (feat)

## Files Created/Modified

- `src/app/api/services/urgency/route.ts` - Services urgency API: openMaintenance, upcomingBookings, domainBadges
- `src/app/api/messages/urgency/route.ts` - Messages urgency API: unreadDirect, unreadGroup, unreadAnnouncements, domainBadges

## Decisions Made

- Resident-scoped maintenance: RESIDENT sees own requests only; ADMIN/BOARD see all for tenant
- Announcements "unread" proxy: counts active (not-expired) announcements since no read-tracking table exists yet
- Both APIs use apiUnauthorized (not requireAnyPermission) — these are resident-facing, not admin-gated

## Deviations from Plan

None - plan executed exactly as written

## Issues Encountered

None

## User Setup Required

None

## Next Phase Readiness

- Both urgency APIs ready for consumption by ServicesLayer (38-02) and MessagesLayer (38-03)
- Domain badge keys (maintenance, bookings, amenities, my-services, events for services; conversations, announcements, notifications for messages) match the domain definitions in Plans 02/03

---

_Phase: 38-space-layers_
_Completed: 2026-05-30_
