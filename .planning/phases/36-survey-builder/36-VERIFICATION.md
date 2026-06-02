---
phase: 36-survey-builder
verified: 2026-06-02T11:30:00Z
status: passed
score: 6/6 must-haves verified
---

# Phase 36: Survey Builder Verification Report

**Phase Goal:** Build a Google Forms-like survey/question builder in the admin panel — dedicated builder page, 6 question types, accordion sections, image support, drag-and-drop reordering, metadata tags
**Verified:** 2026-06-02T11:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Context

- REQUIREMENTS.md does not exist in this project. Verification performed against the four `must_haves` blocks in the PLAN frontmatter (truths + artifacts + key_links across 36-01 through 36-04) and the four `requirements-completed` lists in SUMMARY.md.
- Requirement IDs declared across the four plans:
  - 36-01: SURVEY-BUILD-01, SURVEY-BUILD-06
  - 36-02: SURVEY-BUILD-02, SURVEY-BUILD-06
  - 36-03: SURVEY-BUILD-03
  - 36-04: SURVEY-BUILD-04, SURVEY-BUILD-05
- ROADMAP.md declares: SURVEY-BUILD-01, SURVEY-BUILD-02, SURVEY-BUILD-03, SURVEY-BUILD-04, SURVEY-BUILD-05, SURVEY-BUILD-06 (6 IDs).
- No orphaned requirements — every ID in the plan frontmatter maps to one of the 6 SURVEY-BUILD-\* IDs.

## Goal Achievement

### Requirements Coverage (Goal-Back)

| ID              | Plan          | Description                                           | Status      | Evidence                                                                                                                       |
| --------------- | ------------- | ----------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| SURVEY-BUILD-01 | 36-01         | Sections + tags storage (schema)                      | ✓ SATISFIED | `SurveySection` model, `Question.sectionId` FK, `Survey.config` JSONB column, migration applied                                |
| SURVEY-BUILD-02 | 36-02         | API: question/section CRUD + reorder + survey GET/PUT | ✓ SATISFIED | 7 route files in `src/app/api/surveys/[id]/...`                                                                                |
| SURVEY-BUILD-03 | 36-03         | Builder UI: page, 6 question types, palette, sections | ✓ SATISFIED | Builder page + SurveyEditor + 6 type modules + SectionBlock + navigation links                                                 |
| SURVEY-BUILD-04 | 36-04         | Drag-and-drop reordering (questions + sections)       | ✓ SATISFIED | `@dnd-kit/core` + `@dnd-kit/sortable` in QuestionList + SurveyEditor; reorder endpoints called                                 |
| SURVEY-BUILD-05 | 36-04         | Image embedding + auto-save + responsive (mobile)     | ✓ SATISFIED | `BuilderRichText` (TipTap w/ image URL), `useDebouncedAutoSave` + `SaveIndicator`, mobile bottom-sheet in `BlockPalette`       |
| SURVEY-BUILD-06 | 36-01 + 36-02 | Metadata tags (data layer + API)                      | ✓ SATISFIED | `Survey.config: Json? @default("{}")` in Prisma schema; PUT `/api/surveys/[id]` accepts `config` body and persists via Drizzle |

**All 6 requirements satisfied.** No orphaned requirements.

### Observable Truths (from 4 PLAN must_haves blocks)

| #   | Truth                                                        | Source | Status     | Evidence                                                                                                                                                                         |
| --- | ------------------------------------------------------------ | ------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | Admin can attach metadata tags to a survey                   | 36-01  | ✓ VERIFIED | `Survey.config: Json? @default("{}")` in `prisma/schema.prisma:499`; PUT endpoint accepts `config` (route.ts:114)                                                                |
| T2  | Admin can organize questions into collapsible sections       | 36-01  | ✓ VERIFIED | `SurveySection` model with all fields, `Question.sectionId` FK with SetNull cascade; `SectionBlock` renders collapsible accordion                                                |
| T3  | Question type enum includes LINEAR_SCALE                     | 36-01  | ✓ VERIFIED | `enum QuestionType` at `prisma/schema.prisma:1247-1254` includes LINEAR_SCALE                                                                                                    |
| T4  | Question model stores type-specific config as JSON           | 36-01  | ✓ VERIFIED | `config: Json? @default("{}")` on Question model; Drizzle `jsonb('config').default({})`                                                                                          |
| T5  | Admin can fetch a survey with all questions and sections     | 36-02  | ✓ VERIFIED | GET `/api/surveys/[id]` returns `{ survey, questions, sections }` (route.ts:74)                                                                                                  |
| T6  | Admin can CRUD questions within a survey                     | 36-02  | ✓ VERIFIED | `questions/route.ts` (GET+POST), `questions/[questionId]/route.ts` (PATCH+DELETE)                                                                                                |
| T7  | Admin can CRUD sections within a survey                      | 36-02  | ✓ VERIFIED | `sections/route.ts` (GET+POST), `sections/[sectionId]/route.ts` (PATCH+DELETE)                                                                                                   |
| T8  | Admin can reorder questions and sections                     | 36-02  | ✓ VERIFIED | POST `/questions/reorder` + POST `/sections/reorder`; both validate ownership and use `db.transaction`                                                                           |
| T9  | Admin can update survey metadata tags                        | 36-02  | ✓ VERIFIED | PUT `/api/surveys/[id]` accepts `{ title, description, status, config, startDate, endDate }` (route.ts:111-120)                                                                  |
| T10 | Builder page at `/admin/surveys/:id/edit`                    | 36-03  | ✓ VERIFIED | `src/app/(tenant)/admin/surveys/[id]/edit/page.tsx` (69 lines) with breadcrumbs, ErrorBoundary, Suspense                                                                         |
| T11 | Admin can click a + button to see question types and add one | 36-03  | ✓ VERIFIED | `BlockPalette` FAB (`SurveyEditor.tsx:618`) renders all 6 types; onSelect → `onAddQuestion` POSTs to API                                                                         |
| T12 | Each of the 6 question types shows a live preview            | 36-03  | ✓ VERIFIED | `QuestionBlock.tsx:29-36` PREVIEW_MAP dispatches to type-specific Preview; all 6 modules export `Preview`                                                                        |
| T13 | Admin can click a question to see/configure settings         | 36-03  | ✓ VERIFIED | `QuestionBlock.tsx:125-133` click-to-expand toggles ConfigPanel; CONFIG_MAP dispatches per type                                                                                  |
| T14 | Sections show as collapsible accordion headers               | 36-03  | ✓ VERIFIED | `SectionBlock.tsx:176-184` ChevronDown/Up toggle; expand/collapse state in `expanded`                                                                                            |
| T15 | Admin can navigate from surveys list/detail to edit page     | 36-03  | ✓ VERIFIED | List page: line 116 links to `/admin/surveys/${id}/edit`; Detail page: line 285 Edit Survey button (DRAFT only)                                                                  |
| T16 | Admin can drag questions to reorder within section           | 36-04  | ✓ VERIFIED | `QuestionList.tsx:108-124` handleDragEnd → arrayMove → onReorder; DndContext wraps SortableContext                                                                               |
| T17 | Admin can drag questions between sections                    | 36-04  | ✓ VERIFIED | `QuestionList.tsx:120` sends `sectionId: q.sectionId ?? currentSectionId` in reorder payload; server respects `sectionId` when present (route.ts:108-110)                        |
| T18 | Admin can drag sections to reorder                           | 36-04  | ✓ VERIFIED | `SurveyEditor.tsx:441-454` handleSectionDragEnd → persistSectionOrder; `SectionBlock` uses `SortableSectionWrapper`                                                              |
| T19 | Admin can embed images in question descriptions              | 36-04  | ✓ VERIFIED | `BuilderRichText.tsx:91-110` handleInsertImage validates URL via `new URL()` and calls `editor.chain().setImage()`                                                               |
| T20 | Builder auto-saves changes on blur                           | 36-04  | ✓ VERIFIED | Inline edits use `onBlur={commitText/commitTitle}` (QuestionBlock:82, SectionBlock:167); description via `useDebouncedAutoSave` (2s delay, 4s maxWait)                           |
| T21 | Builder shows meaningful empty states                        | 36-04  | ✓ VERIFIED | `EmptySurvey` component (SurveyEditor.tsx:640-653) shows "no questions yet" + palette; section empty state (SectionBlock.tsx:222-224)                                            |
| T22 | Builder works on mobile (bottom sheet, touch drag)           | 36-04  | ✓ VERIFIED | `BlockPalette.tsx:154-193` BottomSheet activated when `isMobile && !compact`; `matchMedia('(max-width: 767px)')`; TouchSensor with delay:200 tolerance:5 in QuestionList.tsx:100 |

**Score: 22/22 truths verified.**

### Required Artifacts (from 4 PLAN must_haves blocks)

#### Plan 36-01 artifacts

| Artifact                                                                   | Expected                                                  | Status     | Details                                                                                               |
| -------------------------------------------------------------------------- | --------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                                                     | LINEAR_SCALE in enum, config columns, SurveySection model | ✓ VERIFIED | LINEAR_SCALE at line 1253; config at lines 447, 499; SurveySection at lines 474-488                   |
| `src/db/schema/survey-sections.ts`                                         | SurveySection model (min 10 lines)                        | ✓ VERIFIED | 13 lines, all fields (id, tenantId, surveyId, title, description, image, order, createdAt, updatedAt) |
| `src/db/schema/questions.ts` (contains "config")                           | Question schema with config column                        | ✓ VERIFIED | `config: jsonb('config').default({}).notNull()` at line 14                                            |
| `src/db/schema/surveys.ts` (contains "config")                             | Survey schema with config column                          | ✓ VERIFIED | `config: jsonb('config').default({}).notNull()` at line 14                                            |
| `prisma/migrations/20260529000000_add_survey_builder_schema/migration.sql` | Migration file with DDL                                   | ✓ VERIFIED | 37 lines: enum value, ALTER TABLE for config/sectionId, CREATE TABLE SurveySection, FK constraints    |
| `src/db/schema/schema.ts` (exports surveySections)                         | Barrel export                                             | ✓ VERIFIED | imports at lines 28, 80; spreads at 138, 190                                                          |
| `src/shared/api/db.ts` (exports surveySections)                            | DB client includes surveySections                         | ✓ VERIFIED | imports at line 37; dbSchema at 97; re-exports at 243                                                 |

#### Plan 36-02 artifacts

| Artifact                                                   | Exports       | Status     | Details                                                                                                               |
| ---------------------------------------------------------- | ------------- | ---------- | --------------------------------------------------------------------------------------------------------------------- |
| `src/app/api/surveys/[id]/route.ts`                        | GET, PUT      | ✓ VERIFIED | GET returns `{survey, questions, sections}`; PUT accepts partial body with config                                     |
| `src/app/api/surveys/[id]/questions/route.ts`              | GET, POST     | ✓ VERIFIED | GET lists questions; POST validates against `VALID_QUESTION_TYPES` const-tuple, auto-assigns order via `MAX(order)+1` |
| `src/app/api/surveys/[id]/questions/reorder/route.ts`      | POST          | ✓ VERIFIED | Pre-verifies all IDs, batch update in `db.transaction`, `maxDuration=8`                                               |
| `src/app/api/surveys/[id]/questions/[questionId]/route.ts` | PATCH, DELETE | ✓ VERIFIED | PATCH validates type; DELETE returns 204                                                                              |
| `src/app/api/surveys/[id]/sections/route.ts`               | GET, POST     | ✓ VERIFIED | GET nests questions via `inArray(sectionId)`; POST auto-orders                                                        |
| `src/app/api/surveys/[id]/sections/reorder/route.ts`       | POST          | ✓ VERIFIED | Pre-verifies, batch update in transaction                                                                             |
| `src/app/api/surveys/[id]/sections/[sectionId]/route.ts`   | PATCH, DELETE | ✓ VERIFIED | PATCH updates title/description/image; DELETE returns 204 (SetNull cascade handled by DB)                             |

#### Plan 36-03 artifacts

| Artifact                                                                | Min Lines | Status      | Details                                                                                                                 |
| ----------------------------------------------------------------------- | --------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| `src/app/(tenant)/admin/surveys/[id]/edit/page.tsx`                     | 20        | ✓ VERIFIED  | 69 lines: use(params), breadcrumbs, ErrorBoundary, Suspense, SurveyEditor                                               |
| `src/components/surveys/builder/SurveyEditor.tsx`                       | 100       | ✓ VERIFIED  | 685 lines: orchestrator, DndContext for sections, optimistic CRUD, error rollback, debounced auto-save, Ctrl+S shortcut |
| `src/components/surveys/builder/BlockPalette.tsx`                       | 50        | ✓ VERIFIED  | 193 lines: FAB + popover + mobile bottom-sheet, click-outside + Escape close, body-scroll-lock on mobile                |
| `src/components/surveys/builder/question-types/SingleChoiceBlock.tsx`   | 30        | ✓ VERIFIED  | 91 lines: radio/dropdown preview, OptionsEditor integration                                                             |
| `src/components/surveys/builder/question-types/MultipleChoiceBlock.tsx` | —         | ✓ VERIFIED  | 34 lines: checkbox preview, OptionsEditor                                                                               |
| `src/components/surveys/builder/question-types/TextBlock.tsx`           | —         | ✓ VERIFIED  | 89 lines: short/paragraph preview, isParagraph toggle, charLimit slider (20-2000)                                       |
| `src/components/surveys/builder/question-types/RatingBlock.tsx`         | —         | ✓ VERIFIED  | 50 lines: 1-10 star preview + config, live re-render in config                                                          |
| `src/components/surveys/builder/question-types/YesNoBlock.tsx`          | —         | ✓ VERIFIED  | 23 lines: Yes/No radio preview, "no settings" config                                                                    |
| `src/components/surveys/builder/question-types/LinearScaleBlock.tsx`    | —         | ✓ VERIFIED  | 118 lines: 1-N bubble preview, min/max with cross-field validation, minLabel/maxLabel                                   |
| `src/components/surveys/builder/QuestionBlock.tsx`                      | —         | ✓ VERIFIED  | 136 lines: PREVIEW_MAP + CONFIG_MAP dispatch via Record<QuestionType, Component>                                        |
| `src/components/surveys/builder/SectionBlock.tsx`                       | —         | ✓ VERIFIED  | 261 lines: collapsible accordion, BuilderRichText description, inline palette, forwardRef, SortableSectionWrapper       |
| `src/components/surveys/builder/OptionsEditor.tsx`                      | —         | ✓ VERIFIED  | 123 lines: add/remove/reorder with min-1-row guard, Enter-to-commit, blur cleanup                                       |
| `src/components/surveys/builder/SurveyEditorHeader.tsx`                 | —         | ✓ VERIFIED  | 154 lines: title editing, status cycle, SaveIndicator, collapsible BuilderRichText description                          |
| `src/components/surveys/builder/survey-types.ts`                        | —         | ✓ VERIFIED  | 141 lines: Survey, SurveyQuestion, SurveySection, QuestionType, QUESTION_TYPE_META, getTypeMeta                         |
| `src/components/surveys/builder/QuestionConfigPanel.tsx`                | —         | ⚠️ ORPHANED | 21 lines, returns null. Unused (extension point). Type-specific ConfigPanels are dispatched directly by QuestionBlock.  |
| `src/app/(tenant)/admin/surveys/page.tsx` (Edit link)                   | —         | ✓ VERIFIED  | Line 116: `href={\`/admin/surveys/${survey.id}/edit\`}`                                                                 |
| `src/app/(tenant)/admin/surveys/[id]/page.tsx` (Edit button)            | —         | ✓ VERIFIED  | Line 285: Edit Survey button shown when `data.survey.status === 'DRAFT'`                                                |

#### Plan 36-04 artifacts

| Artifact                                                 | Min Lines | Status     | Details                                                                                             |
| -------------------------------------------------------- | --------- | ---------- | --------------------------------------------------------------------------------------------------- |
| `src/components/surveys/builder/QuestionList.tsx`        | 60        | ✓ VERIFIED | 165 lines: DndContext + SortableContext + DragOverlay, all 3 sensors (Pointer/Touch/Keyboard)       |
| `src/components/surveys/builder/builder-types.ts`        | 30        | ✓ VERIFIED | 47 lines: SortableItem union, QuestionReorderItem, SectionReorderItem                               |
| `src/components/surveys/builder/BuilderRichText.tsx`     | —         | ✓ VERIFIED | 256 lines: TipTap with Bold/Italic/Underline/lists/image-by-URL, URL validation, aria-label support |
| `src/components/surveys/builder/SaveIndicator.tsx`       | —         | ✓ VERIFIED | 90 lines: saving/saved/error/dirty pill with role/aria-live                                         |
| `src/components/surveys/builder/useSaveStatus.ts`        | —         | ✓ VERIFIED | 65 lines: in-flight counter (ref), 2s "saved" auto-fade, markDirty/beginSave/endSave API            |
| `src/components/surveys/builder/useDebouncedAutoSave.ts` | —         | ✓ VERIFIED | 66 lines: useDebounceCallback wrapper, leading:false, trailing:true, maxWait, unmount-flush         |

**Artifact score: 32/33 verified, 1 unused extension point (QuestionConfigPanel.tsx).** No blockers.

### Key Link Verification (from 4 PLAN must_haves blocks)

| From                   | To                                        | Via                             | Status  | Details                                                                                                                   |
| ---------------------- | ----------------------------------------- | ------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma` | `src/db/schema/`                          | prisma-generator-drizzle        | ✓ WIRED | Drizzle files regenerated; surveySections.ts has all fields                                                               |
| `questions/route.ts`   | `db.questions`                            | Drizzle insert/update/delete    | ✓ WIRED | `db.insert(questions).values(...)`, `db.update(questions).set(...)`, `db.delete(questions)`                               |
| `sections/route.ts`    | `db.surveySections`                       | Drizzle insert/update/delete    | ✓ WIRED | `db.insert(surveySections)`, `db.delete(surveySections)`                                                                  |
| `SurveyEditor.tsx`     | `/api/surveys/:id`                        | useEffect fetch on mount        | ✓ WIRED | `loadSurvey` → `fetch(\`/api/surveys/${surveyId}\`)` (line 64)                                                            |
| `BlockPalette.tsx`     | POST `/api/surveys/:id/questions`         | onSelect handler                | ✓ WIRED | `onSelect(type)` → SurveyEditor `onAddQuestion` → POSTs to API (line 154)                                                 |
| `QuestionList.tsx`     | POST `/api/surveys/:id/questions/reorder` | @dnd-kit onDragEnd              | ✓ WIRED | `onDragEnd` → `onReorder` callback → SurveyEditor `persistQuestionOrder` → POST (line 123)                                |
| `SurveyEditor.tsx`     | POST `/api/surveys/:id/sections/reorder`  | section drag end                | ✓ WIRED | `handleSectionDragEnd` → `persistSectionOrder` → POST (lines 441-415)                                                     |
| `SurveyEditor.tsx`     | PUT `/api/surveys/:id`                    | Auto-save on blur (debounced)   | ✓ WIRED | `useDebouncedAutoSave` wraps `onUpdateSurvey` → PUT (lines 338-347)                                                       |
| `BuilderRichText.tsx`  | `useDebouncedAutoSave.ts`                 | schedule + URL validation       | ✓ WIRED | `BuilderRichText.onChange` → `SectionBlock.commitDescription` → `onDescriptionChange` → `debouncedSectionDescriptionSave` |
| `BlockPalette.tsx`     | `QUESTION_TYPE_META` (survey-types.ts)    | Registry import                 | ✓ WIRED | All 6 types rendered via `QUESTION_TYPE_META.map` (line 98)                                                               |
| `QuestionBlock.tsx`    | 6 type modules                            | Record<QuestionType, Component> | ✓ WIRED | PREVIEW_MAP and CONFIG_MAP dispatch all 6 types                                                                           |
| `SectionBlock.tsx`     | `QuestionBlock`                           | Map over questions              | ✓ WIRED | Line 227: `questions.map(question => <QuestionBlock ...>)`                                                                |

**All 12 key links WIRED.** No stub connections found.

### Anti-Patterns Found

| File                                                     | Line   | Pattern       | Severity | Impact                                                                                                                                                                                     |
| -------------------------------------------------------- | ------ | ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/components/surveys/builder/QuestionConfigPanel.tsx` | 20     | `return null` | ℹ️ Info  | Planned extension point; never consumed. Type-specific ConfigPanels are dispatched directly by `QuestionBlock` via `CONFIG_MAP`. Acceptable per Plan 03 SUMMARY "Reserved extension point" |
| `src/components/surveys/builder/SaveIndicator.tsx`       | 22, 89 | `return null` | ℹ️ Info  | Intentional: hide when idle and not dirty; defensive fallback                                                                                                                              |
| `src/components/surveys/builder/QuestionList.tsx`        | 131    | `return null` | ℹ️ Info  | Intentional: empty list renders nothing (parent shows empty state)                                                                                                                         |

No TODO/FIXME/XXX/HACK/PLACEHOLDER comments found in builder code.
No empty handlers or stub components found.
TypeScript compiles cleanly for all 22 files in `src/components/surveys/builder/` and the 8 files under `src/app/api/surveys/[id]/` (pre-existing errors in `prisma/seed.ts` and `docs/prompts/trpc_caller_test_template.ts` are out of scope).

### Commits Verified

All 11 commits referenced in the four SUMMARY.md files exist in git history:

- `97b4571` — feat(36-01): add LINEAR_SCALE enum, config JSON, and SurveySection model
- `cc55144` — feat(36-01): regenerate Drizzle schemas, add surveySections to db client, create migration
- `21a321b` — feat(36-02): add survey GET-by-id with nested questions/sections + PUT for metadata
- `58c4a96` — feat(36-02): add question CRUD routes with batch reorder endpoint
- `002e2b3` — feat(36-02): add section CRUD routes with batch reorder endpoint
- `534e055` — feat(36-03): add survey builder shell with editor, header, palette, and placeholders
- `fa4cea9` — feat(36-03): add live preview and config panel for all 6 question types
- `0c5f28e` — feat(36-03): wire section accordion and link builder from list + detail pages
- `9bf22ed` — feat(36-04): integrate @dnd-kit drag-and-drop for questions and sections
- `d9fda4b` — feat(36-04): add TipTap rich text editor with image support for descriptions
- `42b2ed1` — feat(36-04): add auto-save, empty states, mobile polish, and shortcuts

Working tree has uncommitted changes in unrelated areas (`src/app/(tenant)/dashboard/`, `src/widgets/dashboard/`, `.planning/ADVISORY.md`, planning docs). No uncommitted changes in Phase 36 files.

### Human Verification Required

The following items are functionally wired but benefit from human visual/UX verification:

### 1. Survey editor end-to-end flow

**Test:** Log in as admin → navigate to `/admin/surveys` → click "Edit" on a DRAFT survey → add 1 of each question type → save → reload page → confirm persistence
**Expected:** All 6 question types render with correct previews; edits persist on reload
**Why human:** Visual rendering and persistence after refresh are difficult to verify without a running browser session

### 2. Drag-and-drop interactions

**Test:** Drag a question from one section to another; drag a section above another; drag a question to reorder within a section
**Expected:** Position changes persist; server-side reorder endpoints called; visual feedback during drag
**Why human:** Touch/mouse interactions and visual feedback during drag are not verifiable through file inspection alone

### 3. TipTap rich text with image embed

**Test:** Open a section description → click image button → paste URL → confirm image renders in description
**Expected:** Image inserted via TipTap Image extension; URL validated via `new URL()`; invalid URLs rejected with error
**Why human:** Browser DOM rendering and URL prompt UX are visual

### 4. Mobile bottom-sheet palette

**Test:** Resize browser to < 768px → click + FAB → confirm bottom sheet slides up; click an option → confirm question is created
**Expected:** Bottom sheet variant renders instead of popover; body scroll locked while open; 44px tap targets
**Why human:** Responsive layout breakpoints and touch interactions need a real mobile viewport

### 5. Auto-save indicator transitions

**Test:** Edit a question text → wait 2s → confirm "Saved" pill appears → wait another 2s → confirm it fades
**Expected:** Saving spinner → Saved check → auto-fade after 2s
**Why human:** Timing-based UI transitions are not verifiable through file inspection

### 6. Empty state messages

**Test:** Open a new survey with no questions → confirm "no questions yet" CTA appears; create a section with no questions → confirm section empty message
**Expected:** "This survey has no questions yet" + "Add section" CTA; "This section is empty"
**Why human:** Empty state copy and visual hierarchy need a browser session

## Final Assessment

**Status: passed**

**Score: 6/6 must-haves verified (100%)**

All 6 declared requirement IDs (SURVEY-BUILD-01 through SURVEY-BUILD-06) are satisfied with concrete code evidence. All 22 observable truths from the four PLAN must_haves blocks are verified. All 12 key links are wired. No blocker anti-patterns. TypeScript compiles cleanly for all 30+ Phase 36 files.

**Phase 36 goal achieved:** A Google Forms-like survey/question builder is live in the admin panel with:

- Dedicated builder page at `/admin/surveys/[id]/edit`
- 6 question types (SINGLE_CHOICE, MULTIPLE_CHOICE, TEXT, RATING, YES_NO, LINEAR_SCALE) with live previews and type-specific config panels
- Accordion/collapsible sections with title, rich-text description, and image embedding
- Drag-and-drop reordering for questions (within and across sections) and sections themselves
- Metadata tags via `Survey.config` JSONB column exposed through the PUT endpoint
- Bonus polish: 2s debounced auto-save with status indicator, mobile bottom-sheet palette, empty states, keyboard shortcuts (Ctrl/Cmd+S, Escape), 44px tap targets

Ready to proceed to Phase 37.

---

_Verified: 2026-06-02T11:30:00Z_
_Verifier: Claude (gsd-verifier)_
