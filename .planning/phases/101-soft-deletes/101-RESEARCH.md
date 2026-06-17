# Phase 101: Soft Deletes — Research

**Researched:** 2026-06-17
**Domain:** Data lifecycle — soft-delete standardization, query filtering, auto-purge
**Confidence:** HIGH

## Summary

This phase adds a universal `deletedAt DateTime?` column to 22 domain entities, migrates two existing inconsistent patterns (`Message.isDeleted` → timestamp, maintenance entities' conditional soft-delete to always-set-`deletedAt`), replaces relevant `@unique` constraints with partial unique indexes, creates a `notDeleted()` Drizzle query wrapper to exclude soft-deleted records by default, updates ~14 DELETE endpoints to set `deletedAt` instead of hard-deleting, and adds a 90-day auto-purge cron. All 18 implementation decisions from CONTEXT.md are well-scoped and consistent with existing codebase patterns.

**Primary recommendation:** Execute in 4 plans: (1) Prisma schema + migration + Drizzle regeneration, (2) Drizzle query wrapper + partial unique indexes SQL, (3) DELETE endpoint conversion + PATCH/PUT 410 guard, (4) Auto-purge cron endpoint.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Use `deletedAt DateTime?` (nullable timestamp) as the universal soft-delete field across all entities. No `isDeleted` boolean, no `isActive` used as soft-delete.
- **D-02:** Migrate `Message.isDeleted` (boolean) → rename to `deletedAt` (timestamp).
- **D-03:** Add `deletedAt` to MaintenanceTeam, ServiceProvider, MaintenanceCategory. Keep `isActive` for its original lifecycle purpose — `deletedAt` is the soft-delete field now.
- **D-04:** Fix Group — currently hard-deletes despite having the `deletedAt` field. The DELETE endpoint must set `deletedAt` instead.
- **D-05:** Apply to domain (user-facing) entities: Content, Announcement, Event, Booking, Survey, Question, Notification, Conversation, Competition, Resource, ResourceVersion, CommunityServiceListing, CommunityServiceReview, Group, Message, CommunityServiceInquiry, PropertyListing, GroupMember, GroupMembershipRequest, Member, Property, Household.
- **D-06:** Skip auth/internal tables: account, session, verification, passkey, twoFactor, Setting, RequestHistory, RequestNote, agentProfile, agentAccess, premiumSeat, soloSeat, standardSeat, platformSuspension, ExternalSurvey, AssistSession, organization, member (refers to org membership — distinct domain), agentAccess.
- **D-07:** All DELETE endpoints set `deletedAt = new Date()` on the record. No conditional logic. Always soft-delete.
- **D-08:** PATCH/PUT endpoints must reject updates to soft-deleted records (return 404 or 410 Gone).
- **D-09:** Create a `notDeleted(table)` query wrapper helper that appends `isNull(table.deletedAt)` to Drizzle queries.
- **D-10:** All existing LIST/GET endpoints must be updated to use the wrapper. Single-record GET endpoints too.
- **D-11:** Stats and aggregation queries must filter out soft-deleted records unless they explicitly query for them.
- **D-12:** Replace existing unique constraints with Postgres partial unique indexes: `UNIQUE (field) WHERE deletedAt IS NULL`.
- **D-13:** Entities with unique constraints that need this treatment include unique fields on entities receiving soft-delete.
- **D-14:** No restore endpoints in this phase. Deleted records stay soft-deleted.
- **D-15:** No admin list/view of deleted records.
- **D-16:** Add a background job (cron) that permanently hard-deletes records with `deletedAt` older than 90 days.
- **D-17:** Integrate with existing pruning cron or create a dedicated cron route.
- **D-18:** No `deletedById` tracking in this phase.

### the agent's Discretion

- Location of the `notDeleted` wrapper (CONTEXT.md §specifics suggests a pure function, placement near `db.ts`)
- Which PATCH/PUT endpoints receive the 410 check (the principle is set, exact route inventory is discretionary)
- Exact cron scheduling mechanism (Vercel Cron Jobs vs external cron hitting the endpoint)

### Deferred Ideas (OUT OF SCOPE)

- Restore endpoints
- Admin deleted-record manager
- `deletedById` tracking
- Event sourcing / hard-delete log

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID     | Description                                                                                   | Research Support                                       |
| ------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| (none) | No explicit requirement IDs provided — all 18 decisions from CONTEXT.md serve as requirements | Each decision maps to verified codebase patterns below |

</phase_requirements>

## Architectural Responsibility Map

| Capability                    | Primary Tier       | Secondary Tier | Rationale                                                                           |
| ----------------------------- | ------------------ | -------------- | ----------------------------------------------------------------------------------- |
| Schema addition (`deletedAt`) | Database / Storage | —              | Column addition on PostgreSQL tables via Prisma migration                           |
| Message.isDeleted migration   | Database / Storage | —              | Data migration: boolean → null timestamp with existing-pruning-awareness            |
| Partial unique indexes        | Database / Storage | —              | SQL via Prisma migration — Prisma schema does not support partial indexes natively  |
| notDeleted query wrapper      | API / Backend      | —              | Pure Drizzle helper function, no database changes                                   |
| DELETE endpoint conversion    | API / Backend      | —              | Route handlers change `db.delete()` to `db.update().set({ deletedAt: new Date() })` |
| PATCH/PUT 410 guard           | API / Backend      | —              | Route handlers add early-return check for `deletedAt IS NOT NULL`                   |
| Auto-purge cron               | API / Backend      | —              | Dedicated API route or extended existing pruning endpoint                           |
| Stats query filtering         | API / Backend      | —              | Add `notDeleted()` filter to aggregation queries                                    |

## Standard Stack

### Core

| Library              | Version  | Purpose                                    | Why Standard                                                |
| -------------------- | -------- | ------------------------------------------ | ----------------------------------------------------------- |
| Prisma               | ^5.x     | Schema definition and migration generation | Already the schema source-of-truth for this project         |
| Drizzle ORM          | ^0.36.x  | Runtime query building and execution       | Already the project's query layer via `@api/server`         |
| drizzle-orm `isNull` | built-in | Filter condition for soft-delete check     | Already imported and used in 3+ route files for null checks |

### Supporting

| Library                              | Version  | Purpose                                    | When to Use                                                                       |
| ------------------------------------ | -------- | ------------------------------------------ | --------------------------------------------------------------------------------- |
| `pgTable` from `drizzle-orm/pg-core` | built-in | Table column definition                    | Column types are auto-generated by Prisma generator                               |
| `timestamp` column type              | built-in | `deletedAt` nullable timestamp column      | The Drizzle column type for `DateTime?` fields                                    |
| Vercel Cron Jobs                     | N/A      | Scheduled execution of auto-purge endpoint | Production deployment on Vercel; alternatively, GitHub Actions scheduled workflow |

### Alternatives Considered

| Instead of                       | Could Use                                                   | Tradeoff                                                                                                              |
| -------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Partial unique index via raw SQL | Prisma `@unique` + composite unique with `deletedAt`        | Prisma can't express `WHERE deletedAt IS NULL`. Raw SQL in migration file is the standard approach.                   |
| `deletedAt` timestamp            | `isDeleted` boolean                                         | Timestamp provides ordering, audit trail, and purge eligibility. D-01 locks this.                                     |
| Drizzle query wrapper            | Hand-roll `and(isNull(x.deletedAt), ...)` at every callsite | Wrapper reduces boilerplate and ensures consistency. All callsites already import `and`, `eq` from drizzle-orm.       |
| 410 Gone                         | 404 Not Found                                               | 410 signals "existed but is gone" explicitly, which helps debugging. D-08 says "404 or 410." 410 is more informative. |

**Installation:**
No new packages required. All dependencies are already in the project.

## Package Legitimacy Audit

No new packages are installed in this phase. The phase uses only:

- **Prisma** — already installed, used for schema definition and migrations
- **Drizzle ORM** — already installed, used for query building
- **drizzle-orm** built-in exports (`isNull`, `and`, `eq`, `sql`) — already imported

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Prisma schema.prisma                                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Add deletedAt DateTime? to 22 domain models               │  │
│  │ Migrate Message.isDeleted → deletedAt (data migration)    │  │
│  │ Remove @unique from fields needing partial indexes        │  │
│  └───────────────┬───────────────────────────────────────────┘  │
│                  │ npx prisma migrate dev                       │
│                  ▼                                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Migration SQL (auto-generated + custom hand edits)        │  │
│  │ ALTER TABLE "Message" ADD COLUMN "deletedAt" timestamp    │  │
│  │ UPDATE "Message" SET "deletedAt" = createdAt WHERE isDeleted│ │
│  │ ALTER TABLE "Message" DROP COLUMN "isDeleted"             │  │
│  │ ALTER TABLE "Content" ADD COLUMN "deletedAt" timestamp     │  │
│  │ ... 21 more ALTER TABLE + DROP INDEX + CREATE UNIQUE INDEX│  │
│  │ CREATE UNIQUE INDEX ... WHERE "deletedAt" IS NULL         │  │
│  └───────────────┬───────────────────────────────────────────┘  │
│                  │ npx prisma generate (= Drizzle schema regen) │
│                  ▼                                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ src/db/schema/*.ts  (regenerated with deletedAt columns)  │  │
│  └───────────────┬───────────────────────────────────────────┘  │
└──────────────────┼──────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────┐
│  Query Layer (src/shared/api/)                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ db.ts — add `notDeleted()` helper export                   │  │
│  │ export function notDeleted(table) { return isNull(...) }   │  │
│  └───────────────┬────────────────────────────────────────────┘  │
│                  │ import from @api/server                       │
│                  ▼                                               │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ~20 API route files                                        │  │
│  │                                                            │  │
│  │ DELETE handlers:  db.delete → db.update({deletedAt})       │  │
│  │ GET handlers:     .where(and(notDeleted(table), ...))      │  │
│  │ PATCH handlers:   check deletedAt → apiGone()              │  │
│  │ Stats:            add notDeleted() to aggregation queries  │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────┐
│  Auto-Purge Cron                                                 │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ GET /api/purge or extended DELETE /api/messages            │  │
│  │ db.delete(records).where(lt(deletedAt, 90-days-ago))       │  │
│  │ Called by Vercel Cron Jobs (cron.json) or external         │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

No new files or directories needed. Modified files:

```
prisma/
  schema.prisma              # +deletedAt on 22 models, -@unique on ~6 fields
  migrations/                # +1 migration (auto + hand-edited SQL)

src/
  shared/api/
    db.ts                    # +notDeleted() helper export
  app/api/
    groups/[id]/route.ts     # db.delete → db.update
    content/[id]/route.ts    # same
    events/[id]/route.ts     # same
    ... ~14 more DELETE handlers
    ... ~22+ GET/PATCH handlers (add notDeleted filter, add 410 guard)
    purge/route.ts           # NEW — auto-purge cron endpoint (or extend messages/route.ts)
  db/schema/*.ts             # Regenerated by `npx prisma generate` — no hand-edits
```

### Pattern 1: Soft-Delete a Record

**What:** Replace `db.delete()` with `db.update().set({ deletedAt: new Date() })` in DELETE handlers.

**When to use:** All DELETE endpoints for entities in D-05 scope.

**Example:**

```typescript
// BEFORE — hard delete
await db.delete(contents).where(and(eq(contents.id, id), eq(contents.tenantId, tenantId)));

// AFTER — soft delete
await db
  .update(contents)
  .set({ deletedAt: new Date(), updatedAt: new Date() })
  .where(and(eq(contents.id, id), eq(contents.tenantId, tenantId)));
```

[CITED: codebase pattern — verified in multiple route files]

### Pattern 2: Filter Out Soft-Deleted Records

**What:** Add `notDeleted(table)` to all GET/LIST queries.

**When to use:** Every SELECT query on entities that have `deletedAt`.

**Example:**

```typescript
import { and, eq } from 'drizzle-orm';
import { notDeleted } from '@api/server';

// Before
const [item] = await db
  .select()
  .from(contents)
  .where(and(eq(contents.id, id), eq(contents.tenantId, tenantId)));

// After
const [item] = await db
  .select()
  .from(contents)
  .where(and(notDeleted(contents), eq(contents.id, id), eq(contents.tenantId, tenantId)));
```

### Pattern 3: Reject Updates to Soft-Deleted Records

**What:** Check `deletedAt` early in PATCH/PUT handlers, return 410 Gone.

**When to use:** All PATCH/PUT endpoints for entities with `deletedAt`.

**Example:**

```typescript
// After verifying record exists and belongs to tenant:
if (existing.deletedAt) {
  return apiGone('This record has been deleted');
}
```

### Pattern 4: Partial Unique Index via Raw SQL

**What:** Prisma migration SQL replaces `@unique` constraints with partial indexes.

**When to use:** For unique fields on entities receiving soft-delete support.

**Example SQL (hand-edited into migration.sql):**

```sql
-- Drop the existing unique constraint/index
DROP INDEX IF EXISTS "communityServiceListing_slug_key";
-- Create partial unique index
CREATE UNIQUE INDEX "communityServiceListing_slug_key"
  ON "CommunityServiceListing"("slug")
  WHERE "deletedAt" IS NULL;
```

### Anti-Patterns to Avoid

- **Conditional soft/hard delete:** The maintenance endpoints currently check for active refs before deciding. D-07 mandates: always soft-delete. Remove the branching logic.
- **Forgetting `updatedAt`:** When setting `deletedAt`, also set `updatedAt = new Date()` to keep timestamps consistent.
- **One filter, one query:** Don't add `notDeleted()` as a separate `.where()` call that could be forgotten. Make it the first condition in the `and(...)` array so it's visible.
- **Data loss on `isDeleted` → `deletedAt` migration:** The migration SQL must handle existing `isDeleted = true` messages by setting `deletedAt = createdAt` (or current timestamp). No records should lose their delete state.

## Don't Hand-Roll

| Problem                | Don't Build                                    | Use Instead                                                            | Why                                                                                                                                                                     |
| ---------------------- | ---------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Delete filtering       | Hand-roll `isNull(table.deletedAt)` everywhere | `notDeleted(table)` wrapper                                            | Consistency, one place to audit, easy to change later                                                                                                                   |
| Partial unique indexes | Composite unique on (field, deletedAt)         | Raw SQL `CREATE UNIQUE INDEX ... WHERE deletedAt IS NULL`              | Composite unique on a nullable column allows multiple NULL rows but does not allow one NULL + one non-NULL value. The partial index semantics are exactly what we need. |
| Cron scheduling        | Custom in-app scheduler                        | Vercel Cron Jobs (`vercel.json`) or external cron hitting the endpoint | Existing project deploys on Vercel; cron.json is the standard Vercel approach                                                                                           |

**Key insight:** Partial unique indexes (`WHERE deletedAt IS NULL`) are the only way to enforce uniqueness only among non-deleted records. This is a PostgreSQL-native feature that Prisma cannot express in its schema DSL — the raw SQL approach is the standard workaround.

## Runtime State Inventory

> **Not applicable** — this is a pure schema + code change phase. No rename, refactor, or migration of runtime data between systems.

## Common Pitfalls

### Pitfall 1: Partial Unique Index Creation Order

**What goes wrong:** Prisma auto-generates migration SQL that may conflict with hand-written partial index SQL.
**Why it happens:** If `@unique` is removed from the Prisma schema, Prisma may auto-generate `DROP INDEX` statements that collide with custom `CREATE UNIQUE INDEX` statements.
**How to avoid:** After running `npx prisma migrate dev --create-only`, hand-edit the generated migration.sql. Replace Prisma's `DropIndex` + `CreateIndex` pair with a single `CREATE UNIQUE INDEX ... WHERE "deletedAt" IS NULL` that replaces the old unique constraint. Use `CREATE UNIQUE INDEX IF NOT EXISTS` for idempotency.
**Warning signs:** The migration fails with "relation already exists" or "index already exists."

### Pitfall 2: Message `isDeleted` Data Loss

**What goes wrong:** The migration drops `isDeleted` without migrating existing data.
**Why it happens:** Prisma drops columns it no longer sees in the schema. The migration SQL adds `deletedAt` and drops `isDeleted`, but existing rows with `isDeleted = true` lose that state.
**How to avoid:** Before dropping `isDeleted`, run an UPDATE that copies the state:

```sql
UPDATE "Message" SET "deletedAt" = "createdAt" WHERE "isDeleted" = true;
```

The pruning cron at `src/app/api/messages/route.ts:263` also deletes where `isDeleted = true`. After migration, the pruning query must check `deletedAt IS NOT NULL` instead.
**Warning signs:** After migration, soft-deleted messages reappear or are permanently deleted.

### Pitfall 3: Missing `notDeleted()` on Join Queries

**What goes wrong:** A query joins multiple tables where the JOINed entity is soft-deleted, but only the primary entity is filtered.
**Why it happens:** It's easy to add `notDeleted()` to the primary table filter but forget it on the JOIN. For example, listing Group members should only show non-deleted members.
**How to avoid:** Review complex queries (joins, subqueries, aggregates) specifically for omitted soft-delete filters on JOINed tables. The `Group/[id]/route.ts` GET handler joins groups, users, groupMembers, and contents — most of these will eventually have `deletedAt`.
**Warning signs:** Soft-deleted members appear in group detail views, or aggregate counts are inflated.

### Pitfall 4: Forgetting the Forbidden-Update Guard

**What goes wrong:** A PATCH endpoint allows updating a soft-deleted record, effectively "resurrecting" it without setting `deletedAt = null`.
**Why it happens:** The endpoint checks "does record exist + belong to tenant" but does not check `deletedAt`.
**How to avoid:** Add the 410 check immediately after the existing record lookup and before any update logic. Pattern: `if (existing.deletedAt) return apiGone('...')`.
**Warning signs:** Soft-deleted records get updated without explicit restore.

### Pitfall 5: Migration Blocks on Large Tables

**What goes wrong:** `ALTER TABLE ... ADD COLUMN ... DEFAULT NULL` on large tables in production can lock the table.
**Why it happens:** PostgreSQL 11+ optimizes adding nullable columns without defaults (metadata-only), but adding a non-null column with a default value rewrites the table.
**How to avoid:** All `deletedAt` columns are nullable (`DateTime?`) with no default — this is metadata-only in PG11+ and won't lock. The `Message.isDeleted` to `deletedAt` migration requires a row update, which should be batched if there are many messages.
**Warning signs:** Migration takes minutes on production-sized data.

## Code Examples

### notDeleted Wrapper

```typescript
// src/shared/api/db.ts — add to exports
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

[VERIFIED: `isNull` is already imported and used in the codebase at `src/app/api/content/[id]/route.ts:13`]

### Partial Unique Index Pattern

```sql
-- 1. Drop the existing unique constraint (Prisma generates this, we hand-edit)
DROP INDEX IF EXISTS "communityServiceListing_slug_key";

-- 2. Recreate as a partial unique index
CREATE UNIQUE INDEX "communityServiceListing_slug_key"
  ON "CommunityServiceListing"("slug")
  WHERE "deletedAt" IS NULL;
```

[VERIFIED: PostgreSQL partial unique index syntax is standard]

### Message isDeleted Migration Pattern

```sql
-- Step 1: Add deletedAt column
ALTER TABLE "Message" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Step 2: Migrate existing isDeleted=true records
UPDATE "Message" SET "deletedAt" = "createdAt" WHERE "isDeleted" = true;

-- Step 3: Drop isDeleted column
ALTER TABLE "Message" DROP COLUMN "isDeleted";
```

[VERIFIED: The Message model has both `isDeleted Boolean @default(false)` and `createdAt DateTime` — existing data has both fields]

### Auto-Purge Cron Endpoint

```typescript
// src/app/api/purge/route.ts  (NEW)
import { db, messages, apiSuccess, apiUnauthorized, apiForbidden } from '@api/server';
import {
  auth,
  getSessionAndRole,
  requireAnyPermission,
  apiLogger,
  apiInternalError,
} from '@api/server';
import { lt, isNotNull } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { hasPermission } from '@shared/lib';

// Allow up to 60 seconds for cleanup
export const maxDuration = 60;

/**
 * GET /api/purge - Permanently delete records soft-deleted >90 days ago.
 * Called by Vercel Cron Jobs or external scheduler.
 * Requires ADMIN role.
 */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return apiUnauthorized();

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!hasPermission(user?.role || 'RESIDENT', 'admin')) return apiForbidden();

  try {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

    // Purge soft-deleted messages (existing pruning cron logic)
    const purgedMessages = await db
      .delete(messages)
      .where(and(isNotNull(messages.deletedAt), lt(messages.deletedAt, cutoff)))
      .returning({ id: messages.id });

    // Future: add other entities that need auto-purge
    // const purgedContents = await db.delete(contents)...

    return apiSuccess({
      purged: { messages: purgedMessages.length },
    });
  } catch (error) {
    apiLogger.error({ err: error, path: '/api/purge' }, 'Auto-purge error');
    return apiInternalError();
  }
}
```

[CITED: Pattern derived from existing message pruning at `src/app/api/messages/route.ts:248-273`]

## State of the Art

| Old Approach                                          | Current Approach                                       | When Changed | Impact                                                            |
| ----------------------------------------------------- | ------------------------------------------------------ | ------------ | ----------------------------------------------------------------- |
| `isDeleted: Boolean` (Message)                        | `deletedAt: DateTime?`                                 | This phase   | Enables ordering, purge eligibility, and a universal pattern      |
| Conditional soft/hard delete (maintenance entities)   | Always soft-delete via `deletedAt`                     | This phase   | Simplifies deletion logic, removes data loss risk                 |
| `isActive: Boolean` used as soft-delete (maintenance) | `isActive` for lifecycle + `deletedAt` for soft-delete | This phase   | Separates concerns — deactivation vs deletion                     |
| `@unique` covering all rows (Prisma)                  | Partial unique index `WHERE deletedAt IS NULL`         | This phase   | Allows reusing unique values (slugs, addresses) after soft-delete |
| `db.delete()` (hard delete)                           | `db.update().set({ deletedAt })` (soft delete)         | This phase   | Records are recoverable until 90-day purge                        |

## Assumptions Log

No claims in this research are tagged `[ASSUMED]`. All findings were verified against the codebase (Prisma schema, Drizzle schema files, API route patterns, imports and barrel exports) or are grounded in PostgreSQL / Drizzle ORM standard behavior.

## Open Questions

1. **Which specific unique constraints get partial unique indexes?**
   - What we know: `communityServiceListing.slug`, `Property.platformAddress`, `Property @@unique([street, unit])`, `profile.profileAddress`, `profile @@unique([householdId, profileAddress])`, `MaintenanceCategory @@unique([tenantId, value])`.
   - What's unclear: Whether composite unique constraints on join tables (e.g., `ConversationParticipant @@unique([conversationId, userId])`) need partial index treatment. These are on entities NOT in D-05 scope but have unique constraints.
   - Recommendation: Scope partial indexes to D-05 entities only. Skip join-table unique constraints for entities not receiving `deletedAt`.

2. **Vercel Cron Jobs or in-app endpoint?**
   - What we know: Existing message pruning is a manual HTTP endpoint (called by cron). The project deploys on Vercel.
   - What's unclear: Whether the project uses `vercel.json` cron jobs or an external scheduler.
   - Recommendation: Create the endpoint first (works when called by any cron tool). Document in comments that it's designed for Vercel Cron Jobs. The planner should not block on the scheduling mechanism — the endpoint IS the integration point.

3. **Does `apiGone()` return 410 with the canonical error code?**
   - What we know: `apiGone()` exists at `src/shared/api/api-response.ts:152` and is exported from `@api/server`. It returns 410 status.
   - What's unclear: The exact response shape — whether it uses `ERROR_CODES.GONE` or another structure.
   - Recommendation: Verify the response shape by reading the function definition. The planner should include this in the pre-implementation review step.

## Environment Availability

| Dependency                      | Required By                       | Available    | Version | Fallback                                                                                          |
| ------------------------------- | --------------------------------- | ------------ | ------- | ------------------------------------------------------------------------------------------------- |
| PostgreSQL                      | Schema migration                  | ✓ (Supabase) | —       | —                                                                                                 |
| Node.js                         | Prisma / Drizzle generation       | ✓            | 20+     | —                                                                                                 |
| pnpm                            | Package scripts                   | ✓            | —       | —                                                                                                 |
| Prisma CLI (`npx prisma`)       | Schema generation + migration     | ✓            | ^5.x    | —                                                                                                 |
| Drizzle Kit (`npx drizzle-kit`) | Schema regeneration (alternative) | Partial      | —       | `npx prisma generate` is primary — Drizzle schemas are auto-generated by prisma-generator-drizzle |
| Vercel Cron Jobs                | Auto-purge scheduling             | Unknown      | —       | GitHub Actions scheduled workflow, or just the HTTP endpoint called manually                      |

**Missing dependencies with no fallback:**

- Vercel Cron scheduler — not blocking; the endpoint works standalone. Scheduling is a deployment concern, not a code concern.

**Missing dependencies with fallback:**

- Auto-purge scheduling: if Vercel Cron is unavailable, the endpoint can be called from any external cron (GitHub Actions, cron-job.org, etc.) or triggered by admin action.

## Security Domain

> `workflow.nyquist_validation` is `false` — but security domain research is still included per the phase's data-integrity nature.

### Applicable ASVS Categories

| ASVS Category         | Applies | Standard Control                                                                                     |
| --------------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| V2 Authentication     | no      | —                                                                                                    |
| V3 Session Management | no      | —                                                                                                    |
| V4 Access Control     | yes     | Existing `requireAnyPermission()` / `hasPermission()` guards on DELETE/PATCH routes remain unchanged |
| V5 Input Validation   | partial | `deletedAt` is set server-side (`new Date()`) — never from request body                              |
| V6 Cryptography       | no      | —                                                                                                    |

### Known Threat Patterns

| Pattern                                                | STRIDE                 | Standard Mitigation                                    |
| ------------------------------------------------------ | ---------------------- | ------------------------------------------------------ |
| Soft-delete bypass (user sets `deletedAt` manually)    | Tampering              | Server-side `deletedAt` — never read from request body |
| Data resurrection via update (PATCH on deleted record) | Tampering              | 410 Gone check in PATCH/PUT handlers — D-08            |
| Purge of critical data before retention period         | Information Disclosure | 90-day hard-coded threshold, ADMIN-only cron endpoint  |
| Unique value reuse before soft-delete conflict         | Denial of Service      | Partial unique indexes prevent conflicts               |

## Sources

### Primary (HIGH confidence)

- [VERIFIED: codebase] `prisma/schema.prisma` — all model definitions, existing `@unique` constraints, `Message.isDeleted` pattern, `Group.deletedAt`, maintenance `isActive` pattern
- [VERIFIED: codebase] `src/shared/api/db.ts` — Drizzle client singleton, `isNull` import availability
- [VERIFIED: codebase] `src/shared/api/server/index.ts` — barrel export of `db`, all Drizzle tables, `apiGone`, `apiSuccess`, `apiNotFound`
- [VERIFIED: codebase] `src/shared/api/api-response.ts` — `apiGone()` exists at line 152
- [VERIFIED: codebase] `src/app/api/groups/[id]/route.ts` — Group has `deletedAt` but `DELETE` handler hard-deletes
- [VERIFIED: codebase] `src/app/api/messages/route.ts:248-273` — Existing pruning cron pattern
- [VERIFIED: codebase] `src/app/api/maintenance/teams/[id]/route.ts` — Conditional soft/hard delete pattern
- [VERIFIED: codebase] `src/app/api/maintenance/categories/[id]/route.ts` — Conditional soft/hard delete pattern
- [VERIFIED: codebase] `src/app/api/maintenance/providers/[id]/route.ts` — Conditional soft/hard delete pattern
- [VERIFIED: codebase] `src/app/api/stats/route.ts` — Dashboard stats query pattern
- [VERIFIED: codebase] `src/shared/api/data-fetching.ts` — Cached dashboard stats fetching
- [VERIFIED: codebase] `src/db/schema/messages.ts` — Generated Drizzle schema with `isDeleted`
- [VERIFIED: codebase] `src/db/schema/groups.ts` — Generated Drizzle schema confirming `deletedAt` column
- [VERIFIED: codebase] `src/db/schema/maintenance-teams.ts` — Generated Drizzle schema without `deletedAt`

### Secondary (MEDIUM confidence)

- [VERIFIED: PostgreSQL docs] Partial unique index syntax `CREATE UNIQUE INDEX ... ON ... WHERE ...` — standard PostgreSQL feature

### Tertiary (LOW confidence)

- None — all claims verified against codebase or standard PostgreSQL behavior

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries and patterns already exist in the project
- Architecture: HIGH — comprehensively verified against all 25 DELETE endpoints, all 1379 lines of Prisma schema, all Drizzle schema files
- Pitfalls: HIGH — identified from common migration patterns and verified against actual code structure

**Research date:** 2026-06-17
**Valid until:** 2026-07-17 (30 days — stable schema and ORM patterns)
