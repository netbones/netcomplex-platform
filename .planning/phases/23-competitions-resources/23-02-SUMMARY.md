---
phase: 23-competitions-resources
plan: 02
subsystem: resources
tags: [drizzle, prisma, nextjs, api, admin-ui, tip tap, file-upload]

# Dependency graph
requires:
  - phase: 19-schema-corrections
    provides: tenant isolation patterns, withTenant() utility
provides:
  - Resource model with file attachments, visibility scoping, category taxonomy
  - 3 API routes (list/create, read/update/delete) with role-based visibility enforcement
  - 3 admin CRUD pages with ResourceList and ResourceForm widgets
  - Tiptap rich text editor integration for optional body content
  - File upload support via existing /api/upload endpoint
affects: [23-03, content-migration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Role-based visibility filtering (ADMIN/MANAGER/BOARD see all, COMMITTEE sees most, RESIDENTs see based on ownership)
    - File upload before resource creation pattern
    - Tiptap editor reuse from ContentForm pattern
    - Server-side data fetching for edit page

key-files:
  created:
    - prisma/schema.prisma (Resource model + enums)
    - src/db/schema/resources.ts (Drizzle table)
    - src/db/schema/resource-category-enum.ts
    - src/db/schema/resource-visibility-enum.ts
    - src/app/api/resources/route.ts
    - src/app/api/resources/[id]/route.ts
    - src/widgets/admin/ui/ResourceList.tsx
    - src/widgets/admin/ui/ResourceForm.tsx
    - src/app/(tenant)/admin/resources/page.tsx
    - src/app/(tenant)/admin/resources/new/page.tsx
    - src/app/(tenant)/admin/resources/[id]/page.tsx
  modified:
    - src/db/schema/schema.ts (added resources export)
    - src/shared/api/db.ts (added resources import/export)

key-decisions:
  - 'Visibility filtering uses role-based WHERE clauses with ownership check for RESIDENTs'
  - 'File upload uses existing /api/upload endpoint — upload first, then include URL in resource creation'
  - 'Tiptap editor reused from ContentForm pattern via RichTextEditor shared component'
  - 'Edit page uses server-side fetch for initial data (SSR pattern)'

patterns-established:
  - 'Resource CRUD follows events pattern: list page with widget, separate new/edit pages'
  - 'Visibility enforcement: buildVisibilityFilter helper builds Drizzle WHERE conditions per role'

requirements-completed: [RES-01, RES-02, RES-03]

# Metrics
duration: 16 min
completed: 2026-05-16
---

# Phase 23 Plan 02: Resources Summary

**Resource standalone model with file attachments, 8-category taxonomy, 4-level visibility scoping, admin CRUD pages with Tiptap editor**

## Performance

- **Duration:** 16 min
- **Started:** 2026-05-16T07:54:12Z
- **Completed:** 2026-05-16T08:10:17Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Resource model with ResourceCategory (8 values) and ResourceVisibility (4 values) enums
- API routes with role-based visibility enforcement (ADMIN/MANAGER/BOARD see all, COMMITTEE excludes BOARD_ONLY, RESIDENTs filtered by ownership)
- Admin CRUD pages with file upload, Tiptap rich text editor, category/visibility selectors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Resource model and enums** - `b35bf50` (feat)
2. **Task 2: Create Resource API routes** - `c3595b4` (feat — committed with 23-01)
3. **Task 3: Build admin resource pages** - `f746969` (feat)

**Plan metadata:** Pending final commit

## Files Created/Modified

- `prisma/schema.prisma` — Resource model, ResourceCategory enum, ResourceVisibility enum
- `src/db/schema/resources.ts` — Drizzle table definition
- `src/db/schema/resource-category-enum.ts` — pgEnum for categories
- `src/db/schema/resource-visibility-enum.ts` — pgEnum for visibility levels
- `src/app/api/resources/route.ts` — GET (list with visibility filter) and POST (create)
- `src/app/api/resources/[id]/route.ts` — GET, PATCH, DELETE with visibility enforcement
- `src/widgets/admin/ui/ResourceList.tsx` — Resource list with category/visibility filters
- `src/widgets/admin/ui/ResourceForm.tsx` — Form with file upload, Tiptap, Zod validation
- `src/app/(tenant)/admin/resources/page.tsx` — Admin resource list page
- `src/app/(tenant)/admin/resources/new/page.tsx` — New resource page
- `src/app/(tenant)/admin/resources/[id]/page.tsx` — Edit resource page (SSR)

## Decisions Made

- Visibility filtering uses a helper function that builds Drizzle WHERE clauses based on role
- File upload uses the existing /api/upload endpoint — user uploads first, gets URL, then creates resource
- Tiptap editor reused via RichTextEditor shared component from ContentForm pattern
- Edit page uses server-side fetch for initial data (SSR pattern matching project conventions)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Resource API routes already committed with 23-01**

- **Found during:** Task 2 execution
- **Issue:** The resource API route files were already committed as part of the 23-01 (Competition) commit due to pre-commit hook staging behavior
- **Fix:** Verified the committed content matches the plan specification — all visibility enforcement, tenant isolation, and CRUD operations are present
- **Files modified:** src/app/api/resources/route.ts, src/app/api/resources/[id]/route.ts
- **Verification:** Content matches plan requirements, typecheck passes
- **Committed in:** c3595b4 (part of 23-01 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — already committed)
**Impact on plan:** No scope creep. All API route functionality present and verified.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Resource model and admin CRUD fully functional
- Ready for Plan 03: Migrate Content RESOURCE category entries to standalone Resource model and remove RESOURCE from ContentCategory enum
- API routes support all visibility levels for verification

---

_Phase: 23-competitions-resources_
_Completed: 2026-05-16_

## Self-Check: PASSED

All 11 key files verified on disk. All 3 commits confirmed in git history.
