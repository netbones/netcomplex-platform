# Plan 102-01: Schema + Service + Listener + Seed — SUMMARY

**Status:** Complete
**Completed:** 2026-06-23

## What Was Built

### Prisma Models (4)

- **AchievementDefinition** — Platform catalog: id, key (unique), label, description, icon, eventType, threshold (default 1), category (AchievementCategory enum), createdAt
- **TenantAchievement** — Per-tenant config join: enabled toggle, customThreshold override. @@unique([tenantId, definitionId])
- **UserAchievementProgress** — Per-user counter: count (default 0), updatedAt. @@unique([userId, definitionId])
- **UserAchievement** — Unlock record: unlockedAt. @@unique([userId, definitionId])

### Enum

- **AchievementCategory** — ENGAGEMENT, CONTRIBUTION, MILESTONE

### Drizzle Schema (9 files)

- Auto-generated via `prisma generate`: 4 table files, 4 relations files, 1 enum file
- All imported into `src/db/schema/schema.ts` barrel
- Achievement tables registered in `src/shared/api/db.ts` schema object

### Migration

- `prisma/migrations/20260623182500_add_achievements/migration.sql`
- Creates all 4 tables with indexes, unique constraints, and foreign keys

### Achievement Service (`src/shared/api/achievements/`)

- **service.ts** — `processAchievementEvent({ tenantId, userId, eventType })`
  - Queries matching AchievementDefinition + TenantAchievement (enabled filter)
  - Atomic upsert on UserAchievementProgress using `onConflictDoUpdate` with `count + 1`
  - Threshold check: `customThreshold ?? definition.threshold`
  - Creates UserAchievement unlock record + Notification on threshold crossing
  - Never deletes UserAchievement rows (per D-11: historical preservation)
- **listener.ts** — Registers 6 event handlers via `onEvent()`:
  - `booking.created`, `maintenance.created`, `event.rsvp`, `content.created`, `group.joined`, `competition.entered`
  - Each handler extracts tenantId/userId and calls processAchievementEvent
  - All handlers wrapped in try/catch (listener errors must not propagate)
- **seed.ts** — `seedAchievementDefinitions()` with 12 definitions:
  - 6 one-shot (threshold=1): first_booking, first_maintenance, first_event_rsvp, first_post, first_group_join, first_competition_entry
  - 6 cumulative: maintenance_5, maintenance_10, event_attendee_5, event_attendee_10, content_creator_5, bookings_3
  - Uses `onConflictDoNothing` for idempotency
- **index.ts** — Barrel export: processAchievementEvent, seedAchievementDefinitions, imports listener for side-effect

## Key Decisions

- Event types use actual emitter.ts names (not CONTEXT.md D-03 names): `event.rsvp` not `event.attendee.added`, `group.joined` not `group.member.added`, `competition.entered` not `competition.entry.created`
- Missing TenantAchievement treated as "enabled by default" (matches PlatformModule pattern)
- Relative imports for `../db` and `../events` (ESLint blocks `@shared/api/*` deep imports)

## Verification

- `npx prisma validate` — exits 0
- `npx prisma generate` — exits 0
- `npx tsc --noEmit` — no errors in achievement files
- ESLint — passes with relative imports
