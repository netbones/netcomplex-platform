# Plan 101-01 — Schema + Helper + Migration

## Goal

Add `deletedAt` column to all 25 domain entities, migrate `Message.isDeleted` → `deletedAt`, create the `notDeleted()` Drizzle helper, and generate the Prisma migration SQL.

## Requirements (CONTEXT.md)

- REQ-01: All domain entities get `deletedAt DateTime?`
- REQ-02: Message `isDeleted` field migrated to `deletedAt`
- REQ-03: `notDeleted()` helper composable on Drizzle queries
- REQ-04: Partial unique indexes added for 5 constraints that lost `@unique`
- REQ-05: Migration SQL hand-written (shadow DB unavailable)

## What Was Built

### Schema (`prisma/schema.prisma`)

- Added `deletedAt DateTime?` to 25 models
- Removed `isDeleted Boolean @default(false)` from Message, added `deletedAt DateTime?`
- Removed 5 `@unique` constraints (replaced by partial unique indexes in SQL)

### Helper (`src/shared/api/db.ts`)

- `notDeleted()` function: `isNull(table.deletedAt)` — composable in Drizzle `where` chains
- Barrel export from `src/shared/api/server/index.ts`

### Migration (`prisma/migrations/20260618100000_add_soft_deletes/migration.sql`)

- 23 `ALTER TABLE ADD COLUMN "deletedAt" TIMESTAMPTZ`
- Message data migration: `UPDATE "Message" SET "deletedAt" = NOW() WHERE "isDeleted" = true`
- 5 partial unique indexes (`CREATE UNIQUE INDEX … WHERE "deletedAt" IS NULL`)

### Type Fixes

- `MessageDTO`: `isDeleted: boolean` → `deletedAt: string | null`
- Test factory functions: `deletedAt: null` default with correct spread order

## Files Changed

```
prisma/schema.prisma                              (27 insertions, 6 deletions)
prisma/migrations/20260618100000_add_soft_deletes/migration.sql  (53 lines, new)
src/shared/api/db.ts                               (3 lines, new helper)
src/shared/api/server/index.ts                     (barrel export)
src/db/schema/*.ts                                 (24 files, 315 insertions, 25 deletions — regenerated)
src/shared/api/dto/message.ts                      (isDeleted → deletedAt)
src/test/dto-booking.test.ts                       (deletedAt default)
src/test/dto-event.test.ts                         (deletedAt default)
src/test/dto-property.test.ts                      (deletedAt default)
src/test/entity-chat.test.ts                       (isDeleted → deletedAt, test fix)
```

## Known Issues (to be resolved in Plans 02-03)

1. `src/app/api/messages/route.ts` — 3 `isDeleted` references
2. `src/app/api/conversations/route.ts` — 1 `isDeleted` reference

## Verification

- TypeScript: only the 4 expected `isDeleted` errors remain
- Tests: 79/79 pass across 4 test files
- Migration applied to dev DB via `prisma db push`
- Drizzle schemas regenerated
- `notDeleted()` returns correctly typed `SQL` expression
