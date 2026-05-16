---
phase: 23-competitions-resources
plan: 01
subsystem: competitions
tags: [prisma, drizzle, nextjs, api, admin, competitions]

# Dependency graph
requires: []
provides:
  - Competition model with full CRUD API
  - Admin competition management pages (list, create, edit, delete)
  - CompetitionList and CompetitionForm reusable widgets
  - Dynamic public /competition page replacing hardcoded content
  - Tenant-scoped competition data with role-based access control
affects:
  - Future competition entry submission feature
  - Public competition display

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Admin CRUD pattern: API routes + widgets + pages (following Events pattern)'
    - 'Tenant isolation via withTenant() in all API routes'
    - 'Role-based access via hasPermission() for content management'
    - 'Zod schema validation for form data (adminCompetitionSchema)'
    - 'Color-coded status badges (DRAFT=gray, ACTIVE=green, ENDED=blue, CANCELLED=red)'

key-files:
  created:
    - prisma/schema.prisma (Competition model + CompetitionStatus enum)
    - src/db/schema/competitions.ts (Drizzle table)
    - src/db/schema/competition-status-enum.ts (Drizzle enum)
    - src/app/api/competitions/route.ts (GET list, POST create)
    - src/app/api/competitions/[id]/route.ts (GET read, PATCH update, DELETE)
    - src/app/(tenant)/admin/competitions/page.tsx (admin list page)
    - src/app/(tenant)/admin/competitions/new/page.tsx (admin create page)
    - src/app/(tenant)/admin/competitions/[id]/page.tsx (admin edit page)
    - src/widgets/admin/ui/CompetitionList.tsx (list widget)
    - src/widgets/admin/ui/CompetitionForm.tsx (form widget)
  modified:
    - src/shared/api/db.ts (added competitions import/export)
    - src/shared/api/schemas.ts (added adminCompetitionSchema)
    - src/app/competition/page.tsx (replaced hardcoded content)

key-decisions:
  - 'Used Events CRUD pattern as template for competition admin pages'
  - "Status filter uses typed union instead of 'any' cast for type safety"
  - 'Public page fetches upcoming competitions (startDate <= now AND endDate >= now)'
  - 'Entry submission button is placeholder — entry management is future work'

requirements-completed: [COMP-01, COMP-02]

# Metrics
duration: 18min
completed: 2026-05-16
---

# Phase 23 Plan 01: Competitions CRUD Summary

**Competition model with full admin CRUD, tenant-scoped API routes, and dynamic public competition page replacing hardcoded static data**

## Performance

- **Duration:** 18 min
- **Started:** 2026-05-16T07:54:29Z
- **Completed:** 2026-05-16T08:12:41Z
- **Tasks:** 4
- **Files modified:** 13

## Accomplishments

- Competition model added to Prisma schema with CompetitionStatus enum, generated Drizzle types, applied migration
- Full CRUD API with tenant isolation and role-based access (GET, POST, PATCH, DELETE)
- Admin competition management: list page, create form, edit form with delete confirmation
- CompetitionList widget with color-coded status badges, CompetitionForm with Zod validation
- Public /competition page replaced hardcoded content with database-driven active competition display

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Competition model** - `5c73ce4` (feat)
2. **Task 2: Create Competition API routes** - `c3595b4` (feat)
3. **Task 3: Build admin pages and widgets** - `c05521c` (feat)
4. **Task 4: Replace hardcoded competition page** - `aa53bfa` (feat)

**Plan metadata:** Final commit included in state update.

## Files Created/Modified

- `prisma/schema.prisma` - Competition model + CompetitionStatus enum
- `src/db/schema/competitions.ts` - Drizzle table definition
- `src/db/schema/competition-status-enum.ts` - Drizzle pgEnum
- `src/app/api/competitions/route.ts` - GET (list with filters), POST (create)
- `src/app/api/competitions/[id]/route.ts` - GET (read), PATCH (update), DELETE
- `src/app/(tenant)/admin/competitions/page.tsx` - Admin list page with CompetitionList
- `src/app/(tenant)/admin/competitions/new/page.tsx` - Admin create page with CompetitionForm
- `src/app/(tenant)/admin/competitions/[id]/page.tsx` - Admin edit page with CompetitionForm
- `src/widgets/admin/ui/CompetitionList.tsx` - Table widget with status badges, edit/delete
- `src/widgets/admin/ui/CompetitionForm.tsx` - Form widget with React Hook Form + Zod
- `src/shared/api/db.ts` - Added competitions import and export
- `src/shared/api/schemas.ts` - Added adminCompetitionSchema
- `src/app/competition/page.tsx` - Dynamic page fetching from API

## Decisions Made

- Followed Events CRUD pattern for consistency (adminEventSchema → adminCompetitionSchema)
- Used typed union for status filter validation instead of `as any` cast (Rule 1 - type safety)
- Public page shows first upcoming competition; empty state when none active
- Entry submission button kept as placeholder (entry management is future work)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added competitions to shared/api/db.ts exports**

- **Found during:** Task 2 (API route implementation)
- **Issue:** Plan didn't specify adding the new competitions table to the db.ts module — import would fail
- **Fix:** Added `competitions` import from `@schema/competitions`, added to drizzle schema object, and added to named exports
- **Files modified:** src/shared/api/db.ts
- **Verification:** TypeScript compilation succeeds, competitions importable from @api/db
- **Committed in:** c3595b4 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed ESLint errors: unused imports and `any` type**

- **Found during:** Task 2 (pre-commit hook)
- **Issue:** `asc` and `or` imported but unused; `statusParam as any` violated no-explicit-any rule
- **Fix:** Removed unused imports; added typed union `CompetitionStatus` with validation via `validStatuses.includes()`
- **Files modified:** src/app/api/competitions/route.ts
- **Verification:** ESLint passes, pre-commit hook succeeds
- **Committed in:** c3595b4 (Task 2 commit)

**3. [Rule 3 - Blocking] Fixed usePageLoading hook API mismatch**

- **Found during:** Task 4 (public page implementation)
- **Issue:** Initial implementation used incorrect hook API (`{ loading, setLoading }` vs `{ isReady, LoadingComponent }`); LoadingSpinner import path wrong; ErrorBoundary import path wrong
- **Fix:** Updated to use correct usePageLoading pattern with breadcrumbs array and additionalLoading option; imported ErrorBoundary and usePageLoading from @shared/ui
- **Files modified:** src/app/competition/page.tsx
- **Verification:** TypeScript compilation succeeds, no type errors
- **Committed in:** aa53bfa (Task 4 commit)

---

**Total deviations:** 3 auto-fixed (1 missing critical, 1 bug, 1 blocking)
**Impact on plan:** All auto-fixes necessary for correctness and type safety. No scope creep.

## Issues Encountered

None - all deviations resolved during execution.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Competition model and CRUD API complete and verified
- Admin pages functional for create, edit, delete operations
- Public page displays active competitions from database
- Ready for Plan 02 (Resources model and CRUD) and Plan 03 (Competition entries feature)
- Entry submission feature deferred (not in scope for this plan)

---

_Phase: 23-competitions-resources_
_Completed: 2026-05-16_

## Self-Check: PASSED

All 11 key files verified on disk. All 4 task commits confirmed in git history.
