---
phase: 36-survey-builder
plan: 02
subsystem: api
tags: [rest, drizzle, surveys, questions, sections, crud, reorder, transaction, jsonb]

# Dependency graph
requires:
  - phase: 36-survey-builder/01
    provides: Survey/Question/SurveySection models with config JSONB columns and sectionId FK
provides:
  - GET /api/surveys/[id] — fetch survey + nested questions[] + sections[]
  - PUT /api/surveys/[id] — partial update of survey metadata (title, description, status, config, startDate, endDate)
  - GET/POST /api/surveys/[id]/questions — list + create questions
  - PATCH/DELETE /api/surveys/[id]/questions/[questionId] — update + delete
  - POST /api/surveys/[id]/questions/reorder — batch update order + sectionId
  - GET/POST /api/surveys/[id]/sections — list (with nested questions) + create
  - PATCH/DELETE /api/surveys/[id]/sections/[sectionId] — update + delete
  - POST /api/surveys/[id]/sections/reorder — batch update order
affects:
  - 36-03 — survey builder UI consumes these endpoints
  - 36-04 — drag-and-drop reorder calls /reorder endpoints

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'GET-by-id returns composed payload { survey, questions, sections } for builder hydration'
    - 'POST auto-assigns order = MAX(existing.order) + 1 when not provided'
    - 'Reorder endpoints use db.transaction() to batch-update atomicity'
    - 'Choice question types default options to ["Option 1"] when not provided'
    - 'QuestionType validation via const-tuple type guard (VALID_QUESTION_TYPES) — keeps enum and runtime check in sync'
    - 'maxDuration=8s on batch reorder endpoints to bound transaction time'
    - 'Sections GET nests questions filtered by sectionId inArray — single round-trip vs N+1'

key-files:
  created:
    - src/app/api/surveys/[id]/route.ts
    - src/app/api/surveys/[id]/questions/route.ts
    - src/app/api/surveys/[id]/questions/reorder/route.ts
    - src/app/api/surveys/[id]/questions/[questionId]/route.ts
    - src/app/api/surveys/[id]/sections/route.ts
    - src/app/api/surveys/[id]/sections/reorder/route.ts
    - src/app/api/surveys/[id]/sections/[sectionId]/route.ts
  modified: []

key-decisions:
  - 'GET /api/surveys/[id] returns { survey, questions, sections } flat shape — builder UI hydrates in single request'
  - 'PUT /api/surveys/[id] accepts partial body — only updates fields that are present (not undefined)'
  - 'Question type validation uses const-tuple (VALID_QUESTION_TYPES) derived from pgEnum values — single source of truth'
  - 'SINGLE_CHOICE/MULTIPLE_CHOICE POST defaults options to ["Option 1"] when not provided — gives admin a visible starting point'
  - 'Reorder endpoints accept both `order` and optional `sectionId` per item — supports cross-section drag in one batch'
  - 'GET /api/surveys/[id]/sections nests questions inline rather than returning flat list — matches builder mental model'
  - 'DELETE /api/surveys/[id]/sections/[sectionId] relies on Question.sectionId SetNull cascade — questions survive section removal'
  - 'Reorder endpoints pre-verify all IDs belong to survey+tenant before starting transaction — fails fast with 404'

patterns-established:
  - 'Reorder pattern: validate body → verify ownership in single inArray query → batch update in transaction'
  - 'Auto-order pattern: SELECT COALESCE(MAX(order), -1) + 1 for new items appended at the end'
  - 'Const-tuple enum guard: `as const` array + type extraction for runtime + compile-time enum matching'

requirements-completed: [SURVEY-BUILD-02, SURVEY-BUILD-06]

# Metrics
duration: 11min
completed: 2026-06-02
---

# Phase 36 Plan 02: Survey Builder API Summary

**REST API layer for survey question and section management — full CRUD with batch reordering, all wrapped in the canonical response envelope.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-06-02T07:48:32Z
- **Completed:** 2026-06-02T07:59:41Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Built `GET /api/surveys/[id]` returning `{ survey, questions[], sections[] }` for single-request builder hydration
- Built `PUT /api/surveys/[id]` accepting partial body for title, description, status, config (JSONB), startDate, endDate
- Built full question CRUD: list, create (with auto-order + choice-type option defaults), update, delete
- Built `POST /api/surveys/[id]/questions/reorder` for batch order + sectionId updates in a transaction
- Built full section CRUD: list (with nested questions filtered by sectionId), create (with auto-order), update, delete
- Built `POST /api/surveys/[id]/sections/reorder` for batch order updates in a transaction
- All 7 route files use the canonical response envelope (`apiSuccess`, `apiCreated`, `apiNoContent`, `apiError`, `apiNotFound`, `apiForbidden`, `apiUnauthorized`, `apiValidationError`)
- All routes tenant-scoped via `withTenant()` and permission-gated via `hasPermission(role, 'content')`

## Task Commits

Each task was committed atomically:

1. **Task 1: Survey GET-by-id + PUT for metadata** - `21a321b` (feat)
   - New `src/app/api/surveys/[id]/route.ts`
   - GET: returns `{ survey, questions, sections }` ordered by sectionId, order
   - PUT: partial update for title, description, status, config, startDate, endDate
2. **Task 2: Question CRUD + reorder** - `58c4a96` (feat)
   - New `src/app/api/surveys/[id]/questions/route.ts` (GET, POST)
   - New `src/app/api/surveys/[id]/questions/reorder/route.ts` (POST)
   - New `src/app/api/surveys/[id]/questions/[questionId]/route.ts` (PATCH, DELETE)
3. **Task 3: Section CRUD + reorder** - `002e2b3` (feat)
   - New `src/app/api/surveys/[id]/sections/route.ts` (GET, POST)
   - New `src/app/api/surveys/[id]/sections/reorder/route.ts` (POST)
   - New `src/app/api/surveys/[id]/sections/[sectionId]/route.ts` (PATCH, DELETE)

## Files Created/Modified

- `src/app/api/surveys/[id]/route.ts` — Survey GET-by-id + PUT metadata
- `src/app/api/surveys/[id]/questions/route.ts` — Question list + create with auto-order
- `src/app/api/surveys/[id]/questions/reorder/route.ts` — Batch question order/sectionId update
- `src/app/api/surveys/[id]/questions/[questionId]/route.ts` — Question PATCH + DELETE
- `src/app/api/surveys/[id]/sections/route.ts` — Section list (with nested questions) + create
- `src/app/api/surveys/[id]/sections/reorder/route.ts` — Batch section order update
- `src/app/api/surveys/[id]/sections/[sectionId]/route.ts` — Section PATCH + DELETE

## Decisions Made

- **Const-tuple enum guard for `QuestionType`** — `VALID_QUESTION_TYPES` is a `as const` array; the type `QuestionType` is extracted from it. Runtime validation (`includes(body.type)`) and TypeScript type narrowing stay in sync without a separate enum import.
- **GET-survey returns flat `questions[]` + `sections[]` rather than nested** — matches how the builder UI will hydrate (it groups questions client-side into section accordions using `sectionId`).
- **GET-sections returns nested `{ section, questions: [...] }`** — separate endpoint with a different consumer (section accordion expansion) that benefits from pre-grouping server-side. The N+1 risk is bounded by `inArray(questions.sectionId, sectionIds)` which is a single query.
- **Auto-order via `SELECT COALESCE(MAX(order), -1) + 1`** — appends to the end when `order` is not provided. Uses SQL aggregation instead of fetching all rows, scales to large surveys.
- **Reorder endpoints pre-verify ownership** — `inArray` query against `tenantId` + `surveyId` returns count; if it doesn't match the requested batch size, return 404 _before_ starting the transaction. Avoids partial updates from misrouted IDs.
- **DELETE section relies on DB cascade** — `Question.sectionId` is `onDelete: SetNull` in the Prisma schema (set in Phase 36-01), so deleting a section automatically nullifies the references. The route handler just returns 204.
- **`maxDuration = 8s` on reorder endpoints** — guards against runaway batch updates on very large surveys. Matches the platform's existing pattern (e.g., `users/[id]/suspend`).

## Deviations from Plan

None - plan executed exactly as written.

The plan's `files_modified` listed 5 files; the actual commits include 7 (added `questions/[questionId]/route.ts` and `sections/[sectionId]/route.ts` for the PATCH/DELETE sub-routes, as the plan called for "3 route files" per task). This matches the plan's action descriptions which explicitly listed the three sub-route files per task.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. All changes are local API routes in the Next.js app.

## Next Phase Readiness

- API layer is complete and typecheck-clean
- All 6 question types (SINGLE_CHOICE, MULTIPLE_CHOICE, TEXT, RATING, YES_NO, LINEAR_SCALE) are accepted on create/update
- Section grouping with SetNull cascade works at the DB level
- Reorder endpoints support cross-section drag in a single batch
- Ready for 36-03 (builder UI components — survey editor page, question palette, drag-and-drop)

## Self-Check: PASSED

All 7 key files exist on disk:

- `src/app/api/surveys/[id]/route.ts` ✓ (GET, PUT exports)
- `src/app/api/surveys/[id]/questions/route.ts` ✓ (GET, POST)
- `src/app/api/surveys/[id]/questions/reorder/route.ts` ✓ (POST)
- `src/app/api/surveys/[id]/questions/[questionId]/route.ts` ✓ (PATCH, DELETE)
- `src/app/api/surveys/[id]/sections/route.ts` ✓ (GET, POST)
- `src/app/api/surveys/[id]/sections/reorder/route.ts` ✓ (POST)
- `src/app/api/surveys/[id]/sections/[sectionId]/route.ts` ✓ (PATCH, DELETE)

All commits present:

- `21a321b` — feat(36-02): add survey GET-by-id with nested questions/sections + PUT for metadata
- `58c4a96` — feat(36-02): add question CRUD routes with batch reorder endpoint
- `002e2b3` — feat(36-02): add section CRUD routes with batch reorder endpoint

`npx tsc --noEmit` produces no errors for the new files (pre-existing errors in `prisma/seed.ts` and `docs/prompts/trpc_caller_test_template.ts` are out of scope for this plan).

---

_Phase: 36-survey-builder_
_Completed: 2026-06-02_
