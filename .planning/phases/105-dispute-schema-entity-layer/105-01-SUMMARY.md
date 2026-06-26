---
phase: 105-dispute-schema-entity-layer
plan: 01
subsystem: database
tags: [prisma, drizzle, postgres, dispute-resolution, schema-migration, enums]

# Dependency graph
requires: []
provides:
  - 6 dispute database models (DisputeCase, DisputeEvidence, DisputeEvent, DisputeMessage, DisputeMessageVersion, DisputeNotification)
  - 5 dispute enums (DisputeStatus, DisputeCategory, DisputeSeverity, DisputeRespondent, DisputeEventType)
  - Drizzle schemas for all 6 models (17 files including _relations)
  - disputes PlatformModule seed entry (STANDARD tier, defaultEnabled: false)
  - Migration file at prisma/migrations/20260626084137_add_dispute_resolution/
affects: [105-02, 106-dispute-api, 107-dispute-ui, 108-csos-export]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Prisma model naming: PascalCase models, SCREAMING_SNAKE_CASE enum values'
    - 'Named FK relations on user model: DisputeComplainant, DisputeRespondent, DisputeModerator, DisputeClosedBy'
    - 'Drizzle generator: pluralized table names (disputeCases, disputeEvents, etc.) with _relations files'
    - 'Shadow DB migration workaround: prisma migrate diff + db execute (same as Phase 104)'
    - 'Seed pattern: upsert for idempotent PlatformModule seeding'

key-files:
  created:
    - prisma/migrations/20260626084137_add_dispute_resolution/migration.sql
    - src/db/schema/dispute-cases.ts
    - src/db/schema/dispute-cases-relations.ts
    - src/db/schema/dispute-evidences.ts
    - src/db/schema/dispute-evidences-relations.ts
    - src/db/schema/dispute-events.ts
    - src/db/schema/dispute-events-relations.ts
    - src/db/schema/dispute-messages.ts
    - src/db/schema/dispute-messages-relations.ts
    - src/db/schema/dispute-message-versions.ts
    - src/db/schema/dispute-message-versions-relations.ts
    - src/db/schema/dispute-notifications.ts
    - src/db/schema/dispute-notifications-relations.ts
    - src/db/schema/dispute-status-enum.ts
    - src/db/schema/dispute-category-enum.ts
    - src/db/schema/dispute-severity-enum.ts
    - src/db/schema/dispute-respondent-enum.ts
    - src/db/schema/dispute-event-type-enum.ts
  modified:
    - prisma/schema.prisma (appended 6 models + 5 enums; added 8 back-reference relations on user model)
    - prisma/seed/modules.ts (added disputes PlatformModule entry)
    - src/db/schema/* (existing files reformatted by prisma-generator-drizzle)

key-decisions:
  - 'DisputeMessageVersion model designed from plan description (5 fields + FK to DisputeMessage) — ADVISORY-017 §8 only had the Gate G2 decision, not the full model definition'
  - 'Used named relations for all 8 dispute FK references on user model to avoid ambiguity with 54 existing user relations'
  - 'Shadow DB migration workaround from Phase 104 applied: prisma migrate diff + db execute + migrate resolve'

patterns-established:
  - 'DisputeEvent uses no @updatedAt field — append-only for audit integrity (Gate G4/Threat T-105-03)'
  - 'DisputeMessageVersion uses no @updatedAt field — originalContent never overwritten (Gate G2)'
  - 'DisputeCase.deletedAt for soft-delete compliance'

requirements-completed:
  - DISPUTE-01

# Metrics
duration: 8min
completed: 2026-06-26
---

# Phase 105 Plan 01: Dispute Schema & Entity Layer Summary

**6 dispute database models + 5 enums added to Prisma schema, migrated to PostgreSQL, Drizzle schemas generated, and disputes PlatformModule seeded**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-26T06:39:22Z
- **Completed:** 2026-06-26T06:48:17Z
- **Tasks:** 3
- **Files modified:** 22 (18 created, 4 modified)

## Accomplishments

- 6 new PostgreSQL tables created: DisputeCase (22 fields, 6 indexes, 4 named FK relations), DisputeEvidence, DisputeEvent (append-only, no @updatedAt), DisputeMessage, DisputeMessageVersion (original content preservation), DisputeNotification
- 5 new PostgreSQL enum types created: DisputeStatus (11 values), DisputeCategory (11), DisputeSeverity (4), DisputeRespondent (4), DisputeEventType (15)
- Drizzle schemas generated at src/db/schema/ — 17 files including per-model \_relations files
- disputes PlatformModule seed entry added (STANDARD tier, defaultEnabled: false, key: 'disputes')
- 8 back-reference relations added to user model for all dispute FK links
- All Drizzle schema files pass TypeScript typecheck with 0 errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add 6 dispute models + 5 enums to Prisma schema** - `beff1efb` (feat)
2. **Task 2: Run Prisma migration, generate Drizzle schemas, and seed PlatformModule** - `f395fa20` (feat)
3. **Task 3: Push schema to database and verify** — No new changes (db already in sync from Task 2 migration)

## Files Created/Modified

- `prisma/schema.prisma` — Added 6 dispute models (DisputeCase, DisputeEvidence, DisputeEvent, DisputeMessage, DisputeMessageVersion, DisputeNotification) + 5 enums + 8 back-reference relations on user model
- `prisma/seed/modules.ts` — Added disputes PlatformModule seed entry in STANDARD tier section
- `prisma/migrations/20260626084137_add_dispute_resolution/migration.sql` — 212-line DDL for all tables and enums
- `src/db/schema/dispute-cases.ts` — Drizzle schema for DisputeCase (22 columns, all enums imported)
- `src/db/schema/dispute-evidences.ts` — Drizzle schema for DisputeEvidence (8 columns)
- `src/db/schema/dispute-events.ts` — Drizzle schema for DisputeEvent (10 columns, append-only)
- `src/db/schema/dispute-messages.ts` — Drizzle schema for DisputeMessage (11 columns)
- `src/db/schema/dispute-message-versions.ts` — Drizzle schema for DisputeMessageVersion (5 columns)
- `src/db/schema/dispute-notifications.ts` — Drizzle schema for DisputeNotification (7 columns)
- `src/db/schema/dispute-status-enum.ts` — Drizzle enum for DisputeStatus (11 values)
- `src/db/schema/dispute-category-enum.ts` — Drizzle enum for DisputeCategory (11 values)
- `src/db/schema/dispute-severity-enum.ts` — Drizzle enum for DisputeSeverity (4 values)
- `src/db/schema/dispute-respondent-enum.ts` — Drizzle enum for DisputeRespondent (4 values)
- `src/db/schema/dispute-event-type-enum.ts` — Drizzle enum for DisputeEventType (15 values)
- Plus 6 `_relations.ts` companion files generated by prisma-generator-drizzle

## Decisions Made

- DisputeMessageVersion model constructed from plan description (5 fields: id, messageId, originalContent, editedAt, createdAt) — ADVISORY-017 §8 had the Gate G2 decision but no full Prisma model definition
- Used named relations for all 8 FK references on user model to avoid ambiguity with existing 54 user relations
- Named relation pattern applied uniformly: DisputeComplainant, DisputeRespondent, DisputeModerator, DisputeClosedBy, DisputeEvidenceUploader, DisputeEventActor, DisputeMessageSender, DisputeNotificationUser

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Missing relation back-references on user model**

- **Found during:** Task 2 (Migration step)
- **Issue:** Prisma validation failed — 9 errors about missing opposite relation fields on user model and DisputeMessage model for all FK references from new dispute models
- **Fix:** Added 8 back-reference relation fields to user model (disputeCases_complainant, disputeCases_respondent, etc.) and added `versions DisputeMessageVersion[]` to DisputeMessage model. Updated relation annotations in dispute models to use named relations matching the user model references.
- **Files modified:** prisma/schema.prisma
- **Verification:** Prisma migrate diff + db execute succeeds, all 6 tables created
- **Committed in:** f395fa20 (Task 2 commit)

**2. [Rule 3 - Blocking] Shadow DB migration replay failure (pre-existing)**

- **Found during:** Task 2 (Migration step)
- **Issue:** `prisma migrate dev` failed with P3006 — shadow database couldn't replay existing migration due to Role enum value change
- **Fix:** Used Phase 104 workaround: `prisma migrate diff` to generate SQL, `prisma db execute` to apply, `prisma migrate resolve --applied` to mark
- **Files modified:** prisma/migrations/20260626084137_add_dispute_resolution/migration.sql (new)
- **Verification:** 6 tables + 5 enums confirmed in PostgreSQL via Supabase MCP
- **Committed in:** f395fa20 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both auto-fixes essential for correct migration. First fix (relation back-references) was a Prisma requirement — the ADVISORY-017 schema excerpt omitted back-reference fields on user model. No scope creep.

## Issues Encountered

- None — pre-existing shadow DB issue was handled with known workaround

## Next Phase Readiness

- Database foundation complete — all 6 tables and 5 enums ready for Plan 105-02 (entity layer)
- Drizzle schemas available at `src/db/schema/` for entity-layer imports
- disputes PlatformModule seeded for feature gate integration
- Ready for Plan 105-02

---

_Phase: 105-dispute-schema-entity-layer_
_Completed: 2026-06-26_
