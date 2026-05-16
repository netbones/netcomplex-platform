---
phase: 23-competitions-resources
plan: 04
subsystem: api
tags: [drizzle, nextjs, react-hook-form, zod, better-auth]

# Dependency graph
requires:
  - phase: 23-01
    provides: Competition model, API routes, admin pages
  - phase: 23-02
    provides: Resource model with file attachments, visibility scoping
  - phase: 23-03
    provides: Public /resources page, migration script
provides:
  - Unauthenticated access to upcoming competitions (ACTIVE only)
  - Competition status management via admin UI
  - Resource edit page with direct Drizzle access (no auth forwarding needed)
affects: [23-verification, public-competition-page, resource-admin]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server components query Drizzle directly instead of fetching from internal API
    - Conditional unauthenticated API access based on query parameters
    - Status enum fields in Zod schemas for admin form validation

key-files:
  created: []
  modified:
    - src/app/api/competitions/route.ts
    - src/widgets/admin/ui/CompetitionForm.tsx
    - src/app/(tenant)/admin/resources/[id]/page.tsx
    - src/shared/api/schemas.ts
    - src/app/(tenant)/admin/competitions/[id]/page.tsx

key-decisions:
  - 'Used direct Drizzle query for resource edit page instead of auth cookie forwarding — simpler, more reliable'
  - 'Made status field required in Zod schema (not optional with default) to avoid type inference issues with react-hook-form'

patterns-established:
  - 'Server components should query Drizzle directly for admin edit pages rather than fetching from internal API routes'
  - 'Public API endpoints can allow unauthenticated access for specific query parameters while requiring auth for others'

requirements-completed: [COMP-01, COMP-02, RES-01, RES-02, RES-03, RES-04, RES-05]

# Metrics
duration: 15min
completed: 2026-05-16
---

# Phase 23 Plan 04: Gap Closure Summary

**Closes 3 verification gaps: unauthenticated competition API, status selector UI, resource edit auth forwarding**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-16T09:30:00Z
- **Completed:** 2026-05-16T09:45:50Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Competition API GET now allows unauthenticated access for `upcoming=true` filter, returning only ACTIVE status competitions
- CompetitionForm displays status selector (DRAFT/ACTIVE/ENDED/CANCELLED) in edit mode, enabling admins to activate competitions
- Resource edit page fetches directly from Drizzle with tenant scoping, eliminating auth cookie forwarding problem for BOARD_ONLY/COMMITTEE_ONLY resources

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix Competition API unauthenticated access** - `826296f` (feat)
2. **Task 2: Add status selector to CompetitionForm** - `76035e9` (feat)
3. **Task 3: Fix resource edit page Drizzle query** - `6677eda` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified

- `src/app/api/competitions/route.ts` — Reordered auth check: upcoming=true skips auth, applies ACTIVE filter
- `src/widgets/admin/ui/CompetitionForm.tsx` — Added status select field, watch hook, status in submission
- `src/shared/api/schemas.ts` — Added status enum to adminCompetitionSchema
- `src/app/(tenant)/admin/competitions/[id]/page.tsx` — Pass status to CompetitionForm initialData
- `src/app/(tenant)/admin/resources/[id]/page.tsx` — Replaced API fetch with direct Drizzle query

## Decisions Made

- **Direct Drizzle over auth forwarding** — Resource edit page now queries Drizzle directly instead of forwarding auth cookies to the API. This is simpler, more reliable, and follows the server component pattern of having direct database access. No visibility filtering needed since admins should see all resources in edit mode.
- **Required status in Zod schema** — Made status a required field (not optional with `.default()`) to avoid type inference issues with react-hook-form's resolver. Default value is provided in `getInitialDefaultValues()` instead.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Zod `.default()` type inference** — Using `.default('DRAFT')` on the status enum made it optional in the inferred type, causing a type mismatch with react-hook-form's resolver. Fixed by making status required in the schema and providing the default value in `getInitialDefaultValues()`.
- **Drizzle Date vs string type mismatch** — ResourceForm expects `publishedAt` as `string | null` but Drizzle returns `Date | null`. Fixed by transforming the date in the page component before passing to the form.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 3 verification gaps from 23-VERIFICATION.md are now resolved
- Phase 23 is complete pending re-verification
- Public /competition page should now work without login and display only ACTIVE competitions
- Admin can activate competitions via the status selector in CompetitionForm
- Resource edit page can access all resources regardless of visibility setting

---

_Phase: 23-competitions-resources_
_Completed: 2026-05-16_

## Self-Check: PASSED

- SUMMARY.md: present
- All 4 commits verified: 826296f, 76035e9, 6677eda, cd0508e
- All key files present on disk
