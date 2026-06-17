# Phase 101: Soft Deletes — Pattern Map

**Mapped:** 2026-06-17
**Files analyzed:** 4 new/modified areas, ~40 individual route files
**Analogs found:** 24 / 24

## File Classification

| New/Modified File                                         | Role       | Data Flow        | Closest Analog                                                | Match Quality     |
| --------------------------------------------------------- | ---------- | ---------------- | ------------------------------------------------------------- | ----------------- |
| `src/shared/api/db.ts`                                    | utility    | n/a (helper)     | `db.ts` existing `runWithRLS` pattern                         | exact (same file) |
| `src/shared/api/server/index.ts`                          | config     | n/a (barrel)     | existing barrel exports                                       | exact (same file) |
| `src/app/api/purge/route.ts` (NEW)                        | controller | request-response | `src/app/api/messages/route.ts` DELETE handler (pruning cron) | role-match        |
| `prisma/schema.prisma`                                    | config     | n/a (schema)     | existing model definitions with `deletedAt` (Group model)     | exact             |
| `prisma/migrations/<timestamp>_add_soft_deletes/`         | migration  | n/a              | existing `prisma/migrations/` directory                       | exact             |
| `src/app/api/groups/[id]/route.ts`                        | controller | CRUD             | itself (has `deletedAt` but doesn't use it)                   | exact-modify      |
| `src/app/api/content/[id]/route.ts`                       | controller | CRUD             | `src/app/api/content/[id]/route.ts` (hard-deletes)            | exact-modify      |
| `src/app/api/announcements/[id]/route.ts`                 | controller | CRUD             | `src/app/api/announcements/[id]/route.ts` (hard-deletes)      | exact-modify      |
| `src/app/api/events/[id]/route.ts`                        | controller | CRUD             | `src/app/api/events/[id]/route.ts` (hard-deletes)             | exact-modify      |
| `src/app/api/resources/[id]/route.ts`                     | controller | CRUD             | `src/app/api/resources/[id]/route.ts` (hard-deletes)          | exact-modify      |
| `src/app/api/surveys/[id]/route.ts`                       | controller | CRUD             | `src/app/api/surveys/[id]/route.ts` (no DELETE handler)       | exact-modify      |
| `src/app/api/community-services/listings/[id]/route.ts`   | controller | CRUD             | itself (hard-deletes)                                         | exact-modify      |
| `src/app/api/competitions/[id]/route.ts`                  | controller | CRUD             | `src/app/api/content/[id]/route.ts`                           | role-match        |
| `src/app/api/maintenance/teams/[id]/route.ts`             | controller | CRUD             | itself (conditional soft-delete via `isActive`)               | exact-modify      |
| `src/app/api/maintenance/categories/[id]/route.ts`        | controller | CRUD             | itself (conditional soft-delete via `isActive`)               | exact-modify      |
| `src/app/api/maintenance/providers/[id]/route.ts`         | controller | CRUD             | itself (conditional soft-delete via `isActive`)               | exact-modify      |
| `src/app/api/groups/route.ts`                             | controller | CRUD             | itself (GET list with `isActive` filter)                      | exact-modify      |
| `src/app/api/stats/route.ts`                              | controller | CRUD             | itself (aggregation queries)                                  | exact-modify      |
| `src/app/api/messages/route.ts`                           | controller | CRUD             | itself (`isDeleted` boolean filter)                           | exact-modify      |
| `src/app/api/bookings/[id]/route.ts`                      | controller | CRUD             | `src/app/api/events/[id]/route.ts`                            | role-match        |
| `src/app/api/households/[id]/route.ts`                    | controller | CRUD             | `src/app/api/events/[id]/route.ts`                            | role-match        |
| `src/app/api/invitations/[id]/route.ts`                   | controller | CRUD             | `src/app/api/events/[id]/route.ts`                            | role-match        |
| `src/app/api/groups/membership-requests/[id]/route.ts`    | controller | CRUD             | `src/app/api/surveys/[id]/route.ts`                           | role-match        |
| `src/app/api/notifications/[id]/route.ts`                 | controller | CRUD             | `src/app/api/announcements/[id]/route.ts`                     | role-match        |
| `src/db/schema/*.ts`                                      | model      | n/a              | auto-generated — no hand-edits                                | regeneration      |
| ~14 v1 API routes `src/app/api/v1/tenant/*/[id]/route.ts` | controller | CRUD             | v1 counterparts of above                                      | role-match        |

## Pattern Assignments

### `src/shared/api/db.ts` (utility — add `notDeleted()` helper)

**Analog:** Existing `runWithRLS` function in same file (lines 219–233)

**Imports pattern** (line 3):

```typescript
import { sql, eq } from 'drizzle-orm';
```

The `isNull` import is already available via `drizzle-orm` — used in `src/app/api/content/[id]/route.ts:13` and `src/app/api/messages/route.ts:26`.

**Core helper function pattern** (model after `runWithRLS`, lines 219–233):

- A pure exported function with JSDoc, a typed parameter, returning `SQL`
- Uses `isNull()` from `drizzle-orm`
- Add at bottom of file (before exports block starting at line 256) or after `runWithRLS` at line 233

**Concrete implementation (to add at line 234)**:

```typescript
import { isNull, type SQL } from 'drizzle-orm';

/**
 * Filter condition that excludes soft-deleted records.
 * Add to any query's WHERE clause for entities with `deletedAt`.
 *
 * @example
 *   db.select().from(contents)
 *     .where(and(notDeleted(contents), eq(contents.tenantId, tenantId)))
 */
export function notDeleted(table: { deletedAt: unknown }): SQL {
  return isNull(table.deletedAt);
}
```

**Export pattern** — must also be added to the export block at line 256:

```typescript
export { notDeleted } from './db'; // or add to existing re-exports
```

---

### `src/shared/api/server/index.ts` (config — barrel re-export)

**Analog:** Lines 1–130 (barrel re-export file)

**Imports/exports pattern** (lines 1, 91–108):

```typescript
// Add notDeleted to the db re-exports (near line 1)
export { db, runWithRLS, getRLSContext, notDeleted } from '../db';
```

Or add a separate line near the other utility exports.

---

### `src/app/api/purge/route.ts` (NEW — controller, request-response)

**Analog:** `src/app/api/messages/route.ts` lines 248–273 (existing pruning cron)

**Imports pattern** (lines 1–17 from messages/route.ts):

```typescript
import {
  auth,
  db,
  messages,
  users,
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiInternalError,
} from '@api/server';

import { eq, and, lt, isNotNull } from 'drizzle-orm';
```

**Auth pattern** (model after messages/route.ts lines 248–257):

```typescript
const session = await auth.api.getSession({ headers: request.headers });
if (!session?.user?.id) return apiUnauthorized();

const [user] = await db
  .select({ role: users.role })
  .from(users)
  .where(eq(users.id, session.user.id))
  .limit(1);
if (!hasPermission(user?.role || 'RESIDENT', 'admin')) return apiForbidden();
```

**Core cron pattern** (lines 259–272):

```typescript
try {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

  // Purge soft-deleted records
  const purgedMessages = await db
    .delete(messages)
    .where(and(isNotNull(messages.deletedAt), lt(messages.deletedAt, cutoff)))
    .returning({ id: messages.id });

  return apiSuccess({ purged: { messages: purgedMessages.length } });
} catch (error) {
  apiLogger.error({ err: error, path: '/api/purge' }, 'Auto-purge error');
  return apiInternalError();
}
```

**maxDuration pattern** (from `src/app/api/stats/route.ts:7`):

```typescript
export const maxDuration = 60; // Allow up to 60 seconds for cleanup
```

---

### `prisma/schema.prisma` (config — schema definition)

**Analog 1 — Group model** (lines 264–284, already has `deletedAt`):

```prisma
model Group {
  id                     String                   @id
  tenantId               String
  // ... other fields ...
  deletedAt              DateTime?
}
```

**Analog 2 — Message model** (lines 410–426, has `isDeleted` boolean to migrate):

```prisma
model Message {
  id             String       @id
  // ... other fields ...
  isDeleted      Boolean      @default(false)   // ← replace with deletedAt DateTime?
}
```

**Analog 3 — Maintenance entities** (lines 338–379, has `isActive` used as pseudo-soft-delete):

```prisma
model MaintenanceTeam {
  id          String   @id @default(cuid())
  // ... other fields ...
  isActive    Boolean  @default(true)     // ← KEEP for lifecycle, ADD deletedAt DateTime?
}
```

**Pattern for all 22 domain models** — add this field:

```prisma
  deletedAt             DateTime?
```

**Pattern for unique constraints** — remove `@unique` from the Prisma side:

```prisma
// BEFORE:
slug String? @unique

// AFTER (remove @unique — replaced by partial unique index SQL):
slug String?
```

**Key models needing `deletedAt`** (from D-05):

- Announcement, Booking, Content, Conversation, Competition, Event, Group, GroupMember, GroupMembershipRequest, Message, Notification, Question, Survey, Resource, ResourceVersion, communityServiceListing, communityServiceReview, communityServiceInquiry, propertyListing, Property, Household, Member (domain entities — note: `user` model may also need consideration)

**Models with `@unique` that need partial index conversion:**

- `communityServiceListing.slug` (line 675: `slug String? @unique`)
- `Property.platformAddress` (line 716: `platformAddress String @unique`)
- `Property @@unique([street, unit])` (line 733)
- `MaintenanceCategory @@unique([tenantId, value])` (line 377)
- `Group @@unique([userId, groupId])` on GroupMember (line 523)

---

### DELETE Endpoints — Pattern Conversion

**Analog for conversion:** `src/app/api/content/[id]/route.ts:235–247` (hard delete → soft delete)

**BEFORE (hard delete):**

```typescript
// src/app/api/content/[id]/route.ts lines 241
await db.delete(contents).where(and(eq(contents.id, id), eq(contents.tenantId, tenantId)));
```

**AFTER (soft delete):**

```typescript
await db
  .update(contents)
  .set({ deletedAt: new Date(), updatedAt: new Date() })
  .where(and(eq(contents.id, id), eq(contents.tenantId, tenantId)));
```

**Analog 2 — `src/app/api/groups/[id]/route.ts:158–183`** (BUG: has `deletedAt` field but hard-deletes):

```typescript
// Line 181 — BUG: should update instead of delete
await db.delete(groups).where(and(eq(groups.id, id), eq(groups.tenantId, tenantId)));

// FIX:
await db
  .update(groups)
  .set({ deletedAt: new Date(), updatedAt: new Date() })
  .where(and(eq(groups.id, id), eq(groups.tenantId, tenantId)));
```

**Analog 3 — Maintenance conditional delete** (`src/app/api/maintenance/teams/[id]/route.ts:61–104`):

```typescript
// Lines 91-98 — currently conditionally sets isActive = false
const [updated] = await db
  .update(maintenanceTeams)
  .set({ isActive: false, updatedAt: new Date() })
  .where(eq(maintenanceTeams.id, id))
  .returning();

// Lines 101-102 — currently conditionally hard-deletes
await db.delete(maintenanceTeams).where(eq(maintenanceTeams.id, id));

// AFTER — always soft-delete via deletedAt (D-07):
await db
  .update(maintenanceTeams)
  .set({ deletedAt: new Date(), updatedAt: new Date() })
  .where(eq(maintenanceTeams.id, id));
```

**Complete list of DELETE endpoints that need conversion:**
| File | Current behavior |
|---|---|
| `src/app/api/content/[id]/route.ts` | hard delete |
| `src/app/api/groups/[id]/route.ts` | hard delete (BUG: has `deletedAt` field) |
| `src/app/api/announcements/[id]/route.ts` | hard delete |
| `src/app/api/events/[id]/route.ts` | hard delete |
| `src/app/api/resources/[id]/route.ts` | hard delete |
| `src/app/api/community-services/listings/[id]/route.ts` | hard delete |
| `src/app/api/competitions/[id]/route.ts` | hard delete (verify) |
| `src/app/api/households/[id]/route.ts` | hard delete (verify) |
| `src/app/api/invitations/[id]/route.ts` | hard delete (verify) |
| `src/app/api/groups/membership-requests/[id]/route.ts` | hard delete (verify) |
| `src/app/api/maintenance/teams/[id]/route.ts` | conditional soft/hard |
| `src/app/api/maintenance/categories/[id]/route.ts` | conditional soft/hard |
| `src/app/api/maintenance/providers/[id]/route.ts` | conditional soft/hard |
| `src/app/api/messages/route.ts` (pruning DELETE) | hard-deletes expired — stays as hard-delete for purge |

---

### GET/LIST Endpoints — Pattern Conversion (add `notDeleted` filter)

**Analog:** `src/app/api/groups/route.ts:69–89` (GET list with `isActive` filter)

**BEFORE (groups list, lines 88):**

```typescript
.where(and(eq(groups.isActive, true), eq(groups.tenantId, tenantId)))
```

**AFTER (add `notDeleted`):**

```typescript
import { notDeleted } from '@api/server';
// ...
.where(and(notDeleted(groups), eq(groups.tenantId, tenantId)))
```

**Analog 2:** `src/app/api/groups/[id]/route.ts:25–43` (GET single with `.limit(1)`)

**BEFORE (lines 42):**

```typescript
.where(and(eq(groups.id, id), eq(groups.tenantId, tenantId)))
```

**AFTER:**

```typescript
.where(and(notDeleted(groups), eq(groups.id, id), eq(groups.tenantId, tenantId)))
```

**Analog 3 — Message list with `isDeleted` filter** (`src/app/api/messages/route.ts:106–132`):

```typescript
// Lines 126-131 — currently filters isDeleted === false
.where(
  and(
    eq(messages.conversationId, conversationId),
    eq(messages.isDeleted, false),           // ← replace with: notDeleted(messages)
    or(isNull(messages.expiresAt), gt(messages.expiresAt, new Date()))
  )
)
```

**Analog 4 — Stats aggregation** (`src/app/api/stats/route.ts:9–43`):

```typescript
// Lines 13-16 — count active users
const activeUsers = await db
  .select({ id: users.id })
  .from(users)
  .where(and(eq(users.isActive, true), eq(users.tenantId, tenantId)));
// AFTER: add notDeleted if user model gets deletedAt

// Lines 20-23 — count active groups
const activeGroups = await db
  .select({ id: groups.id })
  .from(groups)
  .where(and(eq(groups.isActive, true), eq(groups.tenantId, tenantId)));
// AFTER: add notDeleted(groups) to filter
```

---

### PATCH/PUT Endpoints — 410 Gone Guard Pattern

**Analog pattern:** `src/app/api/maintenance/teams/[id]/route.ts:29–37` (existing record check) + `apiGone()` from `src/shared/api/api-response.ts:152–153`

**BEFORE (patch with no deleted check, e.g., `src/app/api/groups/[id]/route.ts:114–156`):**

```typescript
const [group] = await db
  .update(groups)
  .set({ ... })
  .where(and(eq(groups.id, id), eq(groups.tenantId, tenantId)))
  .returning();
```

**AFTER (add 410 guard after record lookup):**

```typescript
// First, verify record exists (with tenant isolation)
const [existing] = await db
  .select({ id: groups.id, deletedAt: groups.deletedAt })
  .from(groups)
  .where(and(eq(groups.id, id), eq(groups.tenantId, tenantId)))
  .limit(1);

if (!existing) return apiNotFound('Not found');
if (existing.deletedAt) return apiGone('This record has been deleted');

// Then proceed with update
const [group] = await db
  .update(groups)
  .set({ ... })
  .where(eq(groups.id, id))
  .returning();
```

**`apiGone` signature** (from `src/shared/api/api-response.ts:152–153`):

```typescript
export function apiGone(message?: string): NextResponse<ApiErrorResponse> {
  return apiError(ERROR_CODES.GONE, message || 'Resource no longer available', 410);
}
```

---

### Message `isDeleted` → `deletedAt` Migration (data migration in SQL)

**Migration SQL pattern** (hand-edited into generated migration.sql):

```sql
-- Step 1: Add deletedAt column
ALTER TABLE "Message" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Step 2: Migrate existing isDeleted=true records
UPDATE "Message" SET "deletedAt" = "createdAt" WHERE "isDeleted" = true;

-- Step 3: Drop isDeleted column
ALTER TABLE "Message" DROP COLUMN "isDeleted";
```

---

### Partial Unique Index via Raw SQL

**Pattern for each unique constraint** (hand-edited into migration.sql):

```sql
-- 1. Drop the existing unique constraint/index
DROP INDEX IF EXISTS "communityServiceListing_slug_key";

-- 2. Create partial unique index
CREATE UNIQUE INDEX "communityServiceListing_slug_key"
  ON "CommunityServiceListing"("slug")
  WHERE "deletedAt" IS NULL;
```

**Target unique constraints needing this conversion:**
| Model | Constraint | Index name |
|---|---|---|
| `communityServiceListing` | `slug @unique` | `communityServiceListing_slug_key` |
| `Property` | `platformAddress @unique` | `Property_platformAddress_key` |
| `Property` | `@@unique([street, unit])` | `Property_street_unit_key` |
| `profile` | `profileAddress @unique` | `profile_profileAddress_key` |
| `profile` | `@@unique([householdId, profileAddress])` | `profile_householdId_profileAddress_key` |
| `MaintenanceCategory` | `@@unique([tenantId, value])` | `MaintenanceCategory_tenantId_value_key` |
| `GroupMember` | `@@unique([userId, groupId])` | `GroupMember_userId_groupId_key` |

---

## Shared Patterns

### `notDeleted()` Query Wrapper Usage

**Source:** `src/shared/api/db.ts` (new export) — re-exported from `@api/server`
**Apply to:** All GET/LIST/PATCH queries in ~40 route files
**Pattern:**

```typescript
import { notDeleted } from '@api/server';
import { and, eq } from 'drizzle-orm';

// In WHERE clauses: place notDeleted as the FIRST condition
.where(and(notDeleted(contents), eq(contents.id, id), eq(contents.tenantId, tenantId)))
```

### Soft-Delete via `db.update()` (replacing `db.delete()`)

**Apply to:** All DELETE route handlers (~14 files)
**Pattern:**

```typescript
await db
  .update(table)
  .set({ deletedAt: new Date(), updatedAt: new Date() })
  .where(and(eq(table.id, id), eq(table.tenantId, tenantId)));
```

### 410 Gone Guard on Update Endpoints

**Source:** `src/shared/api/api-response.ts:152–153`
**Apply to:** All PATCH/PUT handlers for entities with `deletedAt`
**Pattern:**

```typescript
if (existing.deletedAt) {
  return apiGone('This record has been deleted');
}
```

### `apiGone()` Response

**Source:** `src/shared/api/api-response.ts:152–153`

```typescript
export function apiGone(message?: string): NextResponse<ApiErrorResponse> {
  return apiError(ERROR_CODES.GONE, message || 'Resource no longer available', 410);
}
```

### `isNull` Import

**Source:** Used in `src/app/api/content/[id]/route.ts:13` and `src/app/api/messages/route.ts:26`

```typescript
import { eq, and, or, isNull, lte, gt, type SQL } from 'drizzle-orm';
```

### Revalidation After Delete

**Source:** `src/app/api/announcements/[id]/route.ts:185` and `src/app/api/content/[id]/route.ts:244`
**Pattern:** After soft-delete, call appropriate revalidation function:

```typescript
revalidateContent(); // For content, events, resources
revalidateDashboard(); // For announcements, bookings, maintenance
revalidateConversations(); // For messages
```

## No Analog Found

| File                                              | Role      | Data Flow | Reason                                                                    |
| ------------------------------------------------- | --------- | --------- | ------------------------------------------------------------------------- |
| `prisma/migrations/<timestamp>_add_soft_deletes/` | migration | n/a       | Each migration is unique — use partial index SQL pattern from RESEARCH.md |

All route files have exact analogs in the codebase (they are the files being modified). The `notDeleted()` helper is a new function but fits in the existing `db.ts` pattern alongside `runWithRLS`.

## Metadata

**Analog search scope:** `src/app/api/*/`, `prisma/schema.prisma`, `src/shared/api/`
**Files scanned:** ~40 route files, Prisma schema (1379 lines), Drizzle schema barrel, DB client
**Pattern extraction date:** 2026-06-17
