---
phase: 11-announcements
plan: 01
subsystem: api
tags: [drizzle, prisma, notifications, priority, rbac, zod, next.js]

# Dependency graph
requires: []
provides:
  - Announcement model with targetFilter, targetRoles, resourceId, updatedAt
  - Priority taxonomy module with role-based enforcement
  - GET/POST /api/announcements with targeting + fanout + priority enforcement
  - GET/PATCH/DELETE /api/announcements/[id] with permission checks
  - announcements permission in RBAC system
  - Zod announcementSchema with targetFilter, targetRoles, resourceId
affects: [announcements-ui, notification-preferences, announcement-acknowledgement]

# Tech tracking
tech-stack:
  added: []
patterns:
  - Priority enforcement via validatePriorityForRole() before insert/update
  - Notification fanout with type=announcement-{priority} for future R4
  - Audience targeting via targetFilter + targetRoles intersection
  - Cap fanout at 500 users with TODO for queue-based processing

key-files:
  created:
    - src/db/schema/announcements-relations.ts
    - src/features/announcements/model/priority-taxonomy.ts
    - src/features/announcements/model/types.ts
    - src/app/api/announcements/route.ts
    - src/app/api/announcements/[id]/route.ts
  modified:
    - prisma/schema.prisma
    - src/db/schema/announcements.ts
    - src/db/schema/notifications.ts
    - src/db/schema/schema.ts
    - src/entities/tenant/api/permissions.ts
    - src/shared/api/schemas.ts

key-decisions:
  - 'Priority is structural not cosmetic — validatePriorityForRole downgrades if role insufficient, with warning in response'
  - 'Notification type includes priority suffix (announcement-urgent, announcement-high) enabling future R4 acknowledgement behaviour'
  - 'Fanout capped at 500 users with TODO for queue-based processing beyond that'
  - 'FUTURE comment on Notification table for requiresAck/ackedAt — no blocking constraints added'

patterns-established:
  - 'Priority enforcement pattern: validatePriorityForRole() called before insert/update, returns validated priority, adds warning to response if downgraded'
  - 'Notification fanout pattern: query target users → apply targetFilter → apply targetRoles → cap → bulk insert with type=announcement-{priority}'
  - 'Resource link validation pattern: verify resourceId exists AND belongs to same tenantId before insert/update'

requirements-completed: [ANN-01, ANN-02, ANN-03, R1, R2, R3, R6, R7]

# Metrics
duration: 82min
completed: 2026-05-21
---

# Phase 11 Plan 01: Announcements Schema + API Summary

**Announcement CRUD API with audience targeting, priority role-gating (BOARD/ADMIN=urgent, COMMITTEE=high, MANAGER=normal), and notification fanout with priority-suffixed type**

## Performance

- **Duration:** 82 min
- **Started:** 2026-05-21T07:50:59Z
- **Completed:** 2026-05-21T09:13:15Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Announcement model extended with targetFilter (ResidentFilter), targetRoles (Role[]), resourceId (optional FK to Resource), and updatedAt
- Priority taxonomy module enforces role-based priority limits (BOARD/ADMIN=urgent, COMMITTEE=high, MANAGER=normal) with validatePriorityForRole() and getAllowedPriorities()
- CRUD API routes with tenant isolation, auth guards via canPublishAnnouncements, priority enforcement on POST/PATCH, audience targeting via targetFilter + targetRoles intersection, and notification fanout with type=announcement-{priority}
- Zod announcementSchema validates title, content, author, priority, targetFilter, targetRoles, resourceId, and expiresAt
- announcements permission added to RBAC system (COMMITTEE/BOARD/ADMIN/MANAGER: true, others: false)
- FUTURE comment on Notification table for requiresAck/ackedAt (R4/R6) — no blocking constraints

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema migration + priority taxonomy module + permission helper** - `6c55d0d` (feat)
2. **Task 2: Announcement API routes with targeting + fanout + priority enforcement + Zod schema** - `68727c8` (feat)

## Files Created/Modified

- `prisma/schema.prisma` - Added targetFilter, targetRoles, resourceId, updatedAt to Announcement; added Announcement[] relation on Resource
- `src/db/schema/announcements.ts` - Drizzle table with targetFilter (residentFilterEnum), targetRoles (roleEnum array), resourceId, updatedAt with $onUpdate
- `src/db/schema/announcements-relations.ts` - Announcement → Resource relation via resourceId
- `src/db/schema/schema.ts` - Import and spread announcementsRelations
- `src/db/schema/notifications.ts` - Added FUTURE comment for requiresAck (R4/R6)
- `src/features/announcements/model/priority-taxonomy.ts` - PRIORITY_TAXONOMY, MAX_PRIORITY_BY_ROLE, validatePriorityForRole(), getAllowedPriorities()
- `src/features/announcements/model/types.ts` - AnnouncementItem, AnnouncementFormData, AnnouncementWithResource interfaces
- `src/app/api/announcements/route.ts` - GET (list with priority/active/limit filters) + POST (create with targeting + fanout + priority enforcement)
- `src/app/api/announcements/[id]/route.ts` - GET/PATCH/DELETE single announcement with permission checks
- `src/entities/tenant/api/permissions.ts` - Added announcements: boolean to Permission, updated ROLE_PERMISSIONS, added canPublishAnnouncements()
- `src/shared/api/schemas.ts` - Added announcementSchema with targetFilter, targetRoles, resourceId

## Decisions Made

- Priority is structural not cosmetic — validatePriorityForRole() downgrades priority if user's role doesn't permit it, and the API response includes a warning message so the admin form can inform the user
- Notification type includes priority suffix (e.g., announcement-urgent, announcement-high) to enable future R4 where urgent/high notifications may require acknowledgement before dismissal
- Fanout capped at 500 users per announcement with TODO comment for queue-based processing beyond that threshold
- No requiresAck/ackedAt columns added to Notification yet — added FUTURE comment noting that adding them is trivial since no constraints block nullable boolean/timestamp columns

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added opposite relation field on Resource model**

- **Found during:** Task 1 (Prisma migration)
- **Issue:** Prisma validation requires an opposite relation field on the Resource model for the Announcement→Resource relation
- **Fix:** Added `announcements Announcement[]` to the Resource model in prisma/schema.prisma
- **Files modified:** prisma/schema.prisma
- **Verification:** `prisma db push` succeeded
- **Committed in:** 6c55d0d (Task 1 commit)

**2. [Rule 3 - Blocking] Used `prisma db push` instead of `prisma migrate dev`**

- **Found during:** Task 1 (Prisma migration)
- **Issue:** `prisma migrate dev` failed due to shadow database issue with existing migration `20260331000000_add_organization_id_to_identity_tables`
- **Fix:** Used `prisma db push` instead, which applies schema changes without shadow database requirement
- **Files modified:** None (command-only change)
- **Verification:** `prisma db push` succeeded and `prisma generate` ran automatically
- **Committed in:** 6c55d0d (Task 1 commit)

**3. [Rule 1 - Bug] Fixed Drizzle query builder type incompatibility with .limit()**

- **Found during:** Task 2 (announcements route)
- **Issue:** Reassigning query variable after `.limit()` caused TS2741 type error because Drizzle's PgSelectBase type changes after `.limit()`
- **Fix:** Refactored to use a single chained query with `.limit(limit ?? 10000)` instead of conditional `.limit()` application
- **Files modified:** src/app/api/announcements/route.ts
- **Verification:** TypeScript compiles with zero new errors
- **Committed in:** 68727c8 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (2 bug, 1 blocking)
**Impact on plan:** All auto-fixes necessary for correctness and buildability. No scope creep.

## Issues Encountered

- Prisma shadow database migration failure — resolved by using `db push` instead of `migrate dev`
- Drizzle generator overwrote manual edits to announcements.ts and notifications.ts — had to re-apply `$onUpdate` callback and FUTURE comment after generation

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Announcement schema and API complete, ready for admin UI implementation
- Priority taxonomy module is importable by both server and client for form dropdowns
- Future phases: announcement acknowledgement (R4/R6) via requiresAck on Notification, queue-based fanout for >500 users, announcement admin form with priority dropdown limited by role

## Self-Check: PASSED

All created files verified present. Both task commits verified in git history.

---

_Phase: 11-announcements_
_Completed: 2026-05-21_
