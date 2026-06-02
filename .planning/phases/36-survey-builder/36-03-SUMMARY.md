---
phase: 36-survey-builder
plan: 03
subsystem: ui
tags: [react, nextjs, surveys, builder, drag-drop-prep, optimistic-updates, tailwind, lucide]

# Dependency graph
requires:
  - phase: 36-survey-builder/02
    provides: REST API for surveys/questions/sections (GET/PUT/POST/PATCH/DELETE) with canonical envelope and tenant scoping
provides:
  - /admin/surveys/:id/edit page that hydrates the editor in a single GET request
  - SurveyEditor orchestrator with optimistic add/update/delete + rollback on API error
  - SurveyEditorHeader with inline-editable title, status-cycle badge, Preview + Back-to-results links
  - BlockPalette floating + button with popover listing all 6 question types
  - SectionBlock collapsible accordion with inline question palette
  - QuestionBlock dispatching to type-specific Preview/ConfigPanel modules
  - 6 question-type modules: SingleChoice, MultipleChoice, Text, Rating, YesNo, LinearScale
  - OptionsEditor shared helper for add/remove/reorder option lists
  - "Edit" link on /admin/surveys list page
  - "Edit Survey" button on /admin/surveys/:id detail page (DRAFT only)
affects:
  - 36-04 — drag-and-drop reorder builds on the question/section layout
  - Future survey-taker public UI — uses the same /api/surveys/:id response shape

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Client component orchestrator with optimistic state + rollback (SurveyEditor)'
    - 'Type-specific block modules export { Preview, ConfigPanel } — registry pattern via Record<QuestionType, Component>'
    - 'Shared survey-types.ts colocated with the builder — single source of truth for QuestionType enum and metadata'
    - 'Temp IDs (prefix temp-) for optimistic creates — replaced on successful API response'
    - '2-click delete confirmation with 3s timeout (QuestionBlock and SectionBlock)'
    - 'FAB-style floating + button (BlockPalette) with popover + click-outside/Escape dismissal'
    - 'Inline edit on blur pattern for titles, descriptions, and option text (debounced by blur not timer)'

key-files:
  created:
    - src/app/(tenant)/admin/surveys/[id]/edit/page.tsx
    - src/components/surveys/builder/SurveyEditor.tsx
    - src/components/surveys/builder/SurveyEditorHeader.tsx
    - src/components/surveys/builder/BlockPalette.tsx
    - src/components/surveys/builder/SectionBlock.tsx
    - src/components/surveys/builder/QuestionBlock.tsx
    - src/components/surveys/builder/QuestionConfigPanel.tsx
    - src/components/surveys/builder/OptionsEditor.tsx
    - src/components/surveys/builder/survey-types.ts
    - src/components/surveys/builder/question-types/SingleChoiceBlock.tsx
    - src/components/surveys/builder/question-types/MultipleChoiceBlock.tsx
    - src/components/surveys/builder/question-types/TextBlock.tsx
    - src/components/surveys/builder/question-types/RatingBlock.tsx
    - src/components/surveys/builder/question-types/YesNoBlock.tsx
    - src/components/surveys/builder/question-types/LinearScaleBlock.tsx
  modified:
    - src/app/(tenant)/admin/surveys/page.tsx
    - src/app/(tenant)/admin/surveys/[id]/page.tsx

key-decisions:
  - 'Type-specific modules export { Preview, ConfigPanel } — QuestionBlock dispatches via Record<QuestionType, Component> registry; new types are added in one switch-equivalent place'
  - 'survey-types.ts co-located with the builder — keeps the QuestionType enum, QUESTION_TYPE_META (icon + badge), and getTypeMeta() in one file the API DTOs can mirror'
  - 'Optimistic updates with rollback — adds feel instant; failures restore previous state and logError() for observability'
  - 'Temp IDs prefixed temp- and temp-section- — replaced on successful API response; isTempId gates editing controls to prevent races'
  - '2-click delete with 3s timeout (auto-cancels) — protects against accidental deletes without an extra modal layer'
  - 'FAB + popover for the floating + button — fixed bottom-right on the builder area, mirrors Google Forms layout; popover lists 6 types with icons and one-line descriptions'
  - 'Inline edit on blur (not debounce) — single PATCH per field; matches the rest of the admin UI (Page settings, announcements, etc.)'
  - 'Edit Survey button only shown for DRAFT surveys on the detail page — ACTIVE/CLOSED surveys are immutable from the admin UI by design (live responses would be invalidated by edits)'
  - 'No new question type added (e.g. DATE, FILE_UPLOAD) — sticking to the 6 types in the QuestionType enum from Plan 01; new types would require enum migration'

patterns-established:
  - 'Builder pattern: orchestrator fetches once on mount, owns all state, dispatches per-question/section mutations'
  - 'Type block pattern: each QuestionType renders Preview + ConfigPanel that read from question.config (JSONB)'
  - 'Options editor pattern: add/remove/reorder with one-row minimum guard, Enter-to-commit, blur-to-cleanup'
  - 'API envelope unwrap: every fetch follows `json.success ? json.data : json` to handle both legacy and canonical responses'

requirements-completed: [SURVEY-BUILD-03]

# Metrics
duration: 25min
completed: 2026-06-02
---

# Phase 36 Plan 03: Survey Builder UI Summary

**Google Forms-like admin survey builder with live previews for all 6 question types, collapsible section accordions, and full CRUD wired to the Plan 02 API.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-06-02T08:06:26Z
- **Completed:** 2026-06-02T08:32:06Z
- **Tasks:** 3
- **Files modified:** 17 (15 created, 2 modified)

## Accomplishments

- Built `/admin/surveys/:id/edit` page that loads a survey in a single GET request and renders a full builder
- Built `SurveyEditor` orchestrator with optimistic add/update/delete for questions and sections, rollback on API error, and `logError()` telemetry
- Built `SurveyEditorHeader` with click-to-edit title (PUT on blur), click-to-cycle status badge, Preview and Back-to-results links
- Built `BlockPalette` floating + button (FAB style) with popover listing all 6 question types (icon + label + one-line description); click-outside and Escape both dismiss
- Built `SectionBlock` collapsible accordion with indigo-400 left accent border, inline-editable title and description, 2-click delete with 3s auto-cancel, and an inline `BlockPalette` for "add question to this section"
- Built `QuestionBlock` that dispatches to type-specific `Preview` and `ConfigPanel` modules via a `Record<QuestionType, Component>` registry
- Built all 6 type modules with live previews and full config panels:
  - **SingleChoice** — radio OR dropdown (toggle), options editor
  - **MultipleChoice** — checkbox preview, options editor
  - **Text** — single-line OR paragraph (toggle), 20-2000 char slider
  - **Rating** — 1-10 stars preview, numeric `maxStars` input with live preview
  - **YesNo** — static Yes/No radios, "no additional settings" config panel
  - **LinearScale** — 1-10 numbered bubble preview, min/max with cross-field validation, minLabel/maxLabel
- Built `OptionsEditor` helper with add/remove/reorder, one-row minimum guard, Enter-to-commit, and blur-to-cleanup of empty options
- Linked builder from `/admin/surveys` list page (Edit link next to View) and from `/admin/surveys/[id]` detail page (Edit Survey button shown only for DRAFT surveys)

## Task Commits

Each task was committed atomically:

1. **Task 1: Builder page shell with data loading and block palette** - `534e055` (feat)
   - `src/app/(tenant)/admin/surveys/[id]/edit/page.tsx`
   - `src/components/surveys/builder/SurveyEditor.tsx`
   - `src/components/surveys/builder/SurveyEditorHeader.tsx`
   - `src/components/surveys/builder/BlockPalette.tsx`
   - `src/components/surveys/builder/QuestionBlock.tsx` (placeholder — expanded in Task 2)
   - `src/components/surveys/builder/QuestionConfigPanel.tsx`
   - `src/components/surveys/builder/SectionBlock.tsx` (placeholder — expanded in Task 3)
   - `src/components/surveys/builder/survey-types.ts`
2. **Task 2: QuestionBlock components for all 6 types** - `fa4cea9` (feat)
   - `src/components/surveys/builder/QuestionBlock.tsx` (expanded to dispatch via type registry)
   - `src/components/surveys/builder/OptionsEditor.tsx` (new shared helper)
   - 6 question-type modules under `src/components/surveys/builder/question-types/`
3. **Task 3: SectionBlock component and link from surveys list/detail pages** - `0c5f28e` (feat)
   - `src/components/surveys/builder/SectionBlock.tsx` (expanded with inline palette)
   - `src/app/(tenant)/admin/surveys/page.tsx` (added Edit link)
   - `src/app/(tenant)/admin/surveys/[id]/page.tsx` (added Edit Survey button, DRAFT only)

## Files Created/Modified

- `src/app/(tenant)/admin/surveys/[id]/edit/page.tsx` — Builder route; extracts `surveyId` from `use(params)`, renders breadcrumbs + ErrorBoundary + Suspense around SurveyEditor
- `src/components/surveys/builder/SurveyEditor.tsx` — Main orchestrator; owns survey/questions/sections state, dispatches per-CRUD with optimistic updates + rollback
- `src/components/surveys/builder/SurveyEditorHeader.tsx` — Header bar with click-to-edit title, status badge, Preview/Back links
- `src/components/surveys/builder/BlockPalette.tsx` — FAB + popover listing 6 question types; click-outside and Escape close
- `src/components/surveys/builder/SectionBlock.tsx` — Collapsible accordion section with inline question palette
- `src/components/surveys/builder/QuestionBlock.tsx` — Dispatches to type-specific Preview + ConfigPanel
- `src/components/surveys/builder/QuestionConfigPanel.tsx` — Reserved extension point (returns null currently)
- `src/components/surveys/builder/OptionsEditor.tsx` — Shared add/remove/reorder option rows helper
- `src/components/surveys/builder/survey-types.ts` — Shared types: Survey, SurveyQuestion, SurveySection, QuestionType, QUESTION_TYPE_META
- `src/components/surveys/builder/question-types/SingleChoiceBlock.tsx` — Radio/dropdown preview + displayAs toggle + options editor
- `src/components/surveys/builder/question-types/MultipleChoiceBlock.tsx` — Checkbox preview + options editor
- `src/components/surveys/builder/question-types/TextBlock.tsx` — Short/paragraph input preview + isParagraph toggle + char slider
- `src/components/surveys/builder/question-types/RatingBlock.tsx` — Star preview + maxStars input
- `src/components/surveys/builder/question-types/YesNoBlock.tsx` — Static Yes/No radios, no-config panel
- `src/components/surveys/builder/question-types/LinearScaleBlock.tsx` — Numbered bubble preview + min/max with validation + labels
- `src/app/(tenant)/admin/surveys/page.tsx` — Added Edit link in survey rows (beside View)
- `src/app/(tenant)/admin/surveys/[id]/page.tsx` — Added Edit Survey button in header (DRAFT only)

## Decisions Made

- **Type-specific modules export `{ Preview, ConfigPanel }`** — `QuestionBlock` dispatches via a `Record<QuestionType, ComponentType>` registry. Adding a new type means: (1) add to `QuestionType` union in `survey-types.ts`, (2) add `QUESTION_TYPE_META` entry, (3) add a new module under `question-types/`, (4) register in both MAP constants in QuestionBlock. No other file changes.
- **survey-types.ts co-located with the builder** — keeps `QuestionType`, `QUESTION_TYPE_META`, `getTypeMeta()` in one file. The DB enum is the canonical source; this file mirrors it for the UI.
- **Optimistic updates with rollback** — `onAddQuestion` / `onUpdateQuestion` / `onDeleteQuestion` (and their section counterparts) apply the change locally first, then call the API; failures restore the previous state and log to `logError`. Makes the editor feel instant on a slow connection.
- **Temp IDs (`temp-…` and `temp-section-…`)** — optimistic creates use a synthesized ID starting with `temp-` so the new question/section renders immediately. The server-returned entity replaces it on success. The `isTempId` flag disables destructive controls (delete) until the server confirms the ID.
- **2-click delete with 3s auto-cancel** — protects against accidental deletes without an extra modal. Click once turns the icon red with a 3s window to confirm; the timeout auto-resets if the user moves on.
- **FAB + popover for the floating + button** — fixed bottom-right on the builder area, mirroring Google Forms. Popover lists 6 types with `lucide-react` icons and one-line descriptions. Closes on click-outside and Escape.
- **Inline edit on blur (no debounce)** — single PATCH per field. Matches the existing admin pattern (page settings, announcements). Faster and more predictable than a debounced timer.
- **Edit Survey button only for DRAFT** — ACTIVE/CLOSED surveys are immutable from the admin UI by design. An active survey with live responses would produce inconsistent response data if questions are edited after the fact. Closing/reopening the survey is the correct flow for edits.
- **Reorder handles are placeholders for Plan 04** — the drag handle icon is rendered on every question and section, but disabled. Plan 04 will wire drag-and-drop using the existing `/reorder` endpoints.
- **No new question types** — DATE, FILE_UPLOAD, NUMBER, etc. were considered but deferred. Adding them would require (1) a Drizzle migration to extend the QuestionType enum, (2) API validation updates, and (3) the new module. The 6 types in Plan 01 cover the MVP.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Inline `AddSectionButton` and `QuestionList` components were not in the plan but were required by `SurveyEditor`.**

- **Found during:** Task 1
- **Issue:** `SurveyEditor` needed to render the section list, questions, and an "add section" CTA. The plan's `files_modified` listed 4 files for Task 1 but the orchestrator imports SectionBlock, QuestionBlock, and an add-section button — all of which are listed in Tasks 2 and 3 of the plan. To make Task 1 compile independently, I created placeholder versions of those components and expanded them in Tasks 2 and 3.
- **Fix:** Created `QuestionBlock` and `SectionBlock` as minimal compile-clean placeholders in Task 1; expanded `QuestionBlock` with the type dispatch + 6 question modules in Task 2; expanded `SectionBlock` with the inline question palette in Task 3. Inlined the section-add button into `SurveyEditor.tsx` (the plan didn't explicitly name a separate `AddSectionButton.tsx` file).
- **Files modified:** `src/components/surveys/builder/SurveyEditor.tsx`, `src/components/surveys/builder/QuestionBlock.tsx`, `src/components/surveys/builder/SectionBlock.tsx`
- **Verification:** `npx tsc --noEmit` produces no errors in the builder files at every step
- **Committed in:** `534e055` (Task 1), `fa4cea9` (Task 2), `0c5f28e` (Task 3)

**2. [Rule 2 - Missing Critical] Plan named `OptionsEditor` as an inferred requirement but did not list the file.**

- **Found during:** Task 2
- **Issue:** Both `SingleChoiceBlock` and `MultipleChoiceBlock` need an add/remove/reorder option editor. The plan described the pattern ("use a local `useFieldArray`-style pattern with add/remove/reorder buttons for each option") but didn't list `OptionsEditor.tsx` as a deliverable.
- **Fix:** Extracted `OptionsEditor.tsx` as a shared helper in the builder directory. Reused by both choice-type modules.
- **Files modified:** `src/components/surveys/builder/OptionsEditor.tsx` (new), `src/components/surveys/builder/question-types/SingleChoiceBlock.tsx`, `src/components/surveys/builder/question-types/MultipleChoiceBlock.tsx`
- **Verification:** Both choice-type modules share the same option UX; typecheck clean
- **Committed in:** `fa4cea9` (Task 2)

**3. [Rule 3 - Blocking] `SurveyQuestion` type was needed in `question-types/*.tsx` but was declared in `survey-types.ts`, not `QuestionBlock.tsx` as the plan implied.**

- **Found during:** Task 2
- **Issue:** The plan said "Import types from a shared `survey-types.ts` or define inline interfaces." The natural place for type imports in the question-type modules is `../survey-types`. I initially imported from `../QuestionBlock` (which re-exports the types via `export type { QuestionType }`) but TypeScript flagged `SurveyQuestion` as not exported from `QuestionBlock`.
- **Fix:** Updated the question-type modules to import `SurveyQuestion` directly from `../survey-types` and only import the `QuestionBlockPreviewProps` / `QuestionBlockConfigProps` interfaces from `../QuestionBlock`. Cleaner separation: types come from the shared file, the prop interfaces come from the block.
- **Files modified:** All 5 question-type modules that needed `SurveyQuestion`
- **Verification:** `npx tsc --noEmit` clean
- **Committed in:** `fa4cea9` (Task 2)

---

**Total deviations:** 3 auto-fixed (2 missing critical, 1 blocking)
**Impact on plan:** All auto-fixes were necessary to (1) make the orchestrator compile independently per task, (2) share a UX primitive (OptionsEditor) across the two choice-type modules, and (3) follow TypeScript best practices for type re-exports. No scope creep — every deviation was required to execute the planned behavior.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. All changes are local UI components in the Next.js app.

## Next Phase Readiness

- Builder UI is complete and typecheck-clean
- All 6 question types render with live previews and editable config panels
- Sections render as collapsible accordions with inline question palette
- Navigation: surveys list → edit → builder works
- All API mutations use optimistic updates with rollback
- Ready for 36-04 (drag-and-drop reorder using `/api/surveys/:id/{questions,sections}/reorder` endpoints)
- Plan 04 will wire the disabled drag-handle icons currently rendered on every question and section

## Self-Check: PASSED

All 15 created files exist on disk:

- `src/app/(tenant)/admin/surveys/[id]/edit/page.tsx` ✓
- `src/components/surveys/builder/SurveyEditor.tsx` ✓
- `src/components/surveys/builder/SurveyEditorHeader.tsx` ✓
- `src/components/surveys/builder/BlockPalette.tsx` ✓
- `src/components/surveys/builder/SectionBlock.tsx` ✓
- `src/components/surveys/builder/QuestionBlock.tsx` ✓
- `src/components/surveys/builder/QuestionConfigPanel.tsx` ✓
- `src/components/surveys/builder/OptionsEditor.tsx` ✓
- `src/components/surveys/builder/survey-types.ts` ✓
- `src/components/surveys/builder/question-types/SingleChoiceBlock.tsx` ✓
- `src/components/surveys/builder/question-types/MultipleChoiceBlock.tsx` ✓
- `src/components/surveys/builder/question-types/TextBlock.tsx` ✓
- `src/components/surveys/builder/question-types/RatingBlock.tsx` ✓
- `src/components/surveys/builder/question-types/YesNoBlock.tsx` ✓
- `src/components/surveys/builder/question-types/LinearScaleBlock.tsx` ✓

All 2 modified files exist on disk:

- `src/app/(tenant)/admin/surveys/page.tsx` ✓
- `src/app/(tenant)/admin/surveys/[id]/page.tsx` ✓

All 3 commits present:

- `534e055` — feat(36-03): add survey builder shell with editor, header, palette, and placeholders
- `fa4cea9` — feat(36-03): add live preview and config panel for all 6 question types
- `0c5f28e` — feat(36-03): wire section accordion and link builder from list + detail pages

`npx tsc --noEmit` produces no errors for any of the 17 builder files (pre-existing errors in unrelated files like `prisma/seed.ts`, `api-response.ts`, `tooltip.tsx`, and `src/test/auth-*.test.tsx` are out of scope for this plan).

---

_Phase: 36-survey-builder_
_Completed: 2026-06-02_
