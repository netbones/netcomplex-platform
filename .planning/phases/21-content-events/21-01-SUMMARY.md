---
phase: 21-content-events
plan: 01
subsystem: content
tags: [drizzle-orm, nextjs, content-scheduling, datetime]

# Dependency graph
requires: []
provides:
  - Content scheduling UI with date pickers for publish and expiry dates
  - API date filtering for public content queries
  - Admin bypass of date filtering for content management
affects: [content-display, public-pages, admin-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - HTML datetime-local inputs for admin date scheduling (no external picker)
    - Drizzle ORM date filtering with or/isNull/lte/gt for public queries
    - Admin permission bypass pattern for scheduled content

key-files:
  created: []
  modified:
    - src/widgets/admin/ui/ContentForm.tsx
    - src/app/api/content/route.ts
    - src/app/api/content/[id]/route.ts
    - src/shared/api/schemas.ts

key-decisions:
  - 'Use native HTML datetime-local inputs instead of external date picker library'
  - "Admin users with 'content' permission see all content regardless of schedule"
  - 'Public queries filter out not-yet-published and expired content at database level'

patterns-established:
  - "Date scheduling: publishedAt/expiresAt as optional DateTime fields with null meaning 'immediate/no expiry'"
  - 'Public vs admin query separation: date filtering only applied when !canViewAll'

requirements-completed: [CONTENT-01, CONTENT-02]

# Metrics
duration: 8 min
completed: 2026-05-15
---

# Phase 21 Plan 01: Content Scheduling Summary

**ContentForm with datetime-local date pickers for publishedAt/expiresAt scheduling, API middleware filtering public content by publish/expiry dates with admin bypass**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-15T12:55:00Z
- **Completed:** 2026-05-15T13:03:13Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- ContentForm has datetime-local inputs for publish date and expiry date scheduling
- Form submission converts datetime strings to Date objects for API
- GET /api/content filters out not-yet-published and expired content for public users
- Admin users see all content regardless of schedule dates
- POST /api/content accepts publishedAt and expiresAt in request body
- GET /api/content/[id] returns 404 for non-admin accessing scheduled/expired content
- PATCH /api/content/[id] accepts publishedAt and expiresAt updates

## Task Commits

Each task was committed atomically:

1. **Task 1: Add date pickers to ContentForm** - `8628082` (feat)
2. **Task 2: Add API date filtering** - `c2a780d` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `src/shared/api/schemas.ts` - Added publishedAt and expiresAt optional fields to contentSchema
- `src/widgets/admin/ui/ContentForm.tsx` - Added datetime-local inputs, date conversion on submit/load
- `src/app/api/content/route.ts` - Added date filtering for public GET, accepts dates in POST
- `src/app/api/content/[id]/route.ts` - Added date filtering for public GET, accepts dates in PATCH

## Decisions Made

- Used native HTML datetime-local inputs (no external library) — keeps bundle size minimal, works well for admin interfaces
- Date filtering applied at database level via Drizzle ORM where conditions — more efficient than in-memory filtering
- Admin users bypass date filtering — they need to see scheduled and expired content to manage it

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Content scheduling foundation complete
- Ready for 21-02: Events CRUD admin pages
- Ready for 21-03: Events dashboard tab and upcoming events widget

---

_Phase: 21-content-events_
_Completed: 2026-05-15_
