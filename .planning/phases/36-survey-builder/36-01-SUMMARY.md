---
phase: 36-survey-builder
plan: 01
subsystem: database
tags: [prisma, drizzle, schema, surveys, questions, jsonb, postgres, migration]

# Dependency graph
requires:
  - phase: 24-dashboard-enhancement-01
    provides: existing Survey/Question/Response models and answer-taking flow
provides:
  - LINEAR_SCALE question type in QuestionType enum
  - config: Json? on Question (type-specific settings)
  - config: Json? on Survey (metadata tags)
  - SurveySection model (collapsible question groupings)
  - Question.sectionId FK with SetNull on section delete
  - Migration 20260529000000_add_survey_builder_schema applied
  - Drizzle schemas regenerated with all new columns/tables/relations
affects:
  - All survey-related code: question type system, section management, builder UI

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'JSON config column pattern (config: Json? @default("{}")) for type-specific question settings'
    - 'Optional FK with SetNull cascade for soft-references (Question.sectionId)'
    - 'Manual migration file + prisma db push + prisma migrate resolve pattern for additive changes'

key-files:
  created:
    - prisma/migrations/20260529000000_add_survey_builder_schema/migration.sql
    - src/db/schema/survey-sections.ts
    - src/db/schema/survey-sections-relations.ts
  modified:
    - prisma/schema.prisma
    - src/db/schema/question-type-enum.ts
    - src/db/schema/questions.ts
    - src/db/schema/questions-relations.ts
    - src/db/schema/surveys.ts
    - src/db/schema/surveys-relations.ts
    - src/db/schema/schema.ts
    - src/shared/api/db.ts

key-decisions:
  - 'LINEAR_SCALE added as 6th QuestionType value (1-N scale with optional endpoint labels per CONTEXT.md)'
  - "config stored as JSONB with default '{}' to avoid NULL handling for existing rows"
  - 'Question.sectionId uses SetNull on Section delete (preserves questions if section removed)'
  - 'SurveySection cascades on Survey delete (sections are owned by survey)'
  - "Migration written manually since db push doesn't generate migration files"
  - 'Migration marked as applied via prisma migrate resolve (DB was already in sync via db push)'

patterns-established:
  - 'Type-specific config in JSON: displayAs, charLimit, minValue/maxValue/minLabel/maxLabel, maxStars'
  - 'Section-based question grouping: questions belong to SurveySection (optional) which belongs to Survey'

requirements-completed: [SURVEY-BUILD-01, SURVEY-BUILD-06]

# Metrics
duration: 9min
completed: 2026-06-02
---

# Phase 36 Plan 01: Survey Builder Schema Summary

**Prisma schema extended with LINEAR_SCALE question type, JSON config columns, and SurveySection model for collapsible question groupings; Drizzle schemas regenerated and migration applied.**

## Performance

- **Duration:** 9 min (8m 58s)
- **Started:** 2026-06-02T07:28:13Z
- **Completed:** 2026-06-02T07:37:11Z
- **Tasks:** 2
- **Files modified:** 10 (excluding regenerator noise)

## Accomplishments

- Added `LINEAR_SCALE` to the `QuestionType` enum (6th question type for 1-N scale questions)
- Added `config: Json?` columns to `Question` and `Survey` models for type-specific settings and metadata tags
- Added optional `sectionId` foreign key to `Question` with `SetNull` cascade
- Created new `SurveySection` model with title, description, image, order, and timestamps
- Wired relations: `Question → SurveySection` (optional, many-to-one), `Survey → SurveySection` (one-to-many)
- Applied schema changes to database via `prisma db push`
- Created migration file `20260529000000_add_survey_builder_schema/migration.sql` and marked it as applied via `prisma migrate resolve`
- Regenerated Drizzle schemas via `prisma generate` (auto-added `surveySections` to `schema.ts` barrel)
- Added `surveySections` to the Drizzle `dbSchema` in `src/shared/api/db.ts` so queries can use it

## Task Commits

Each task was committed atomically:

1. **Task 1: Update Prisma schema with new fields and model** - `97b4571` (feat)
   - QuestionType enum adds LINEAR_SCALE
   - Question: config: Json? + sectionId FK
   - Survey: config: Json? for metadata tags
   - New SurveySection model with full fields
2. **Task 2: Apply migration and regenerate Drizzle schemas** - `cc55144` (feat)
   - `prisma db push` (DB schema synced)
   - `prisma generate` (Drizzle schemas regenerated)
   - `surveySections` added to `src/shared/api/db.ts` (import + dbSchema + re-exports)
   - Migration file created and marked as applied

## Files Created/Modified

- `prisma/schema.prisma` — QuestionType enum + Question/Survey config columns + new SurveySection model
- `prisma/migrations/20260529000000_add_survey_builder_schema/migration.sql` — DDL for all changes
- `src/db/schema/question-type-enum.ts` — LINEAR_SCALE added to pgEnum
- `src/db/schema/questions.ts` — sectionId + config: jsonb columns
- `src/db/schema/questions-relations.ts` — Section relation (optional, one)
- `src/db/schema/surveys.ts` — config: jsonb column
- `src/db/schema/surveys-relations.ts` — Section has-many relation
- `src/db/schema/survey-sections.ts` — **new** SurveySection table
- `src/db/schema/survey-sections-relations.ts` — **new** SurveySection relations
- `src/db/schema/schema.ts` — surveySections + surveySectionsRelations auto-added by generator
- `src/shared/api/db.ts` — surveySections added to imports, dbSchema object, and re-exports

## Decisions Made

- **`config: Json?` with default `{}`** — avoids NULL handling for existing rows; queries can rely on JSON object shape
- **`@default("{}")` in Prisma + `.default({}).notNull()` in Drizzle** — Drizzle generator chose NOT NULL with object default (mirrors Prisma behavior)
- **`Question.sectionId` uses `onDelete: SetNull`** — preserves questions if a section is deleted (questions remain, just ungrouped)
- **`SurveySection.surveyId` uses `onDelete: Cascade`** — sections are owned by survey, deleting survey removes its sections
- **Migration written manually** — `prisma db push` doesn't create migration files, so the DDL was authored by hand to match what `db push` actually applied; `prisma migrate resolve --applied` marks it as applied (DB is already in sync)
- **Generator's single-line collapse** — `prisma-generator-drizzle` collapses multi-line definitions to single-line; the pre-commit hook's `prettier --write` reformatted these back to multi-line for files without logical changes, so only files with actual schema changes appear in the diff

## Deviations from Plan

None - plan executed exactly as written.

The plan's `files_modified` listed 9 specific files, but the actual commit includes only those + the new migration + the db.ts update (10 files). The 100+ other schema files that the generator touched were reverted to HEAD by prettier's reformatting, leaving them byte-identical to the pre-execution state.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Database changes are local; the migration file is committed for reproducibility.

## Next Phase Readiness

- Schema supports all 6 question types (SINGLE_CHOICE, MULTIPLE_CHOICE, TEXT, RATING, YES_NO, LINEAR_SCALE)
- `config: Json?` columns provide type-specific extensibility without schema migrations
- `SurveySection` model enables collapsible section grouping with media support
- Drizzle client (`@schema/survey-sections`) and DB client (`src/shared/api/db.ts`) are ready for query layer
- All success criteria from PLAN.md are met

**Ready for 36-02 (likely question type validators, API routes, or builder UI).**

## Self-Check: PASSED

All key files exist on disk:

- `prisma/migrations/20260529000000_add_survey_builder_schema/migration.sql` ✓
- `src/db/schema/survey-sections.ts` ✓
- `src/db/schema/survey-sections-relations.ts` ✓
- `src/db/schema/question-type-enum.ts` ✓
- `src/db/schema/questions.ts` ✓
- `src/db/schema/surveys.ts` ✓
- `src/db/schema/questions-relations.ts` ✓
- `src/db/schema/surveys-relations.ts` ✓
- `src/db/schema/schema.ts` ✓
- `src/shared/api/db.ts` ✓
- `prisma/schema.prisma` ✓

All commits present:

- `97b4571` — feat(36-01): add LINEAR_SCALE enum, config JSON, and SurveySection model
- `cc55144` — feat(36-01): regenerate Drizzle schemas, add surveySections to db client, create migration

---

_Phase: 36-survey-builder_
_Completed: 2026-06-02_
