# Phase 120: API Governance Hardening — Pattern Map

**Mapped:** 2026-06-30
**Files analyzed:** 20 tRPC router files + 11 DTO files + 4 infrastructure files
**Analogs found:** 46 / 46

## File Classification

| New/Modified File                               | Role       | Data Flow        | Closest Analog                                                       | Match Quality |
| ----------------------------------------------- | ---------- | ---------------- | -------------------------------------------------------------------- | ------------- |
| **Wave 1 — Foundation**                         |            |                  |                                                                      |               |
| `src/shared/api/trpc/server.ts` (modify)        | middleware | request-response | already the canonical analog itself                                  | exact         |
| **Wave 2 — DTO Layer**                          |            |                  |                                                                      |               |
| `src/server/dto/disputes.ts` (new)              | model/DTO  | transform        | `src/server/dto/marketplace.ts`                                      | exact         |
| `src/server/dto/resources.ts` (new)             | model/DTO  | transform        | `src/server/dto/content.ts`                                          | exact         |
| `src/server/dto/index.ts` (modify)              | barrel     | —                | already exists                                                       | exact         |
| **Wave 3 — Router Migration: Flat Routers**     |            |                  |                                                                      |               |
| `src/server/routers/identity.ts`                | controller | CRUD             | `src/server/routers/achievements.ts` (cleanest DTO+envelope pattern) | role-match    |
| `src/server/routers/content.ts`                 | controller | CRUD             | `src/server/routers/events.ts` (entity+envelope pattern)             | role-match    |
| `src/server/routers/achievements.ts`            | controller | CRUD             | itself — already nearly compliant                                    | exact         |
| `src/server/routers/events.ts`                  | controller | CRUD             | itself — already uses toEnvelope+DTOs                                | exact         |
| `src/server/routers/bookings.ts`                | controller | CRUD             | `src/server/routers/events.ts`                                       | role-match    |
| `src/server/routers/competitions.ts`            | controller | CRUD             | `src/server/routers/events.ts`                                       | role-match    |
| `src/server/routers/groups.ts`                  | controller | CRUD             | `src/server/routers/events.ts`                                       | role-match    |
| `src/server/routers/merits.ts`                  | controller | CRUD             | `src/server/routers/achievements.ts`                                 | role-match    |
| `src/server/routers/notifications.ts`           | controller | CRUD             | `src/server/routers/achievements.ts`                                 | role-match    |
| `src/server/routers/invitations.ts`             | controller | CRUD             | `src/server/routers/achievements.ts`                                 | role-match    |
| `src/server/routers/settings.ts`                | controller | CRUD             | `src/server/routers/achievements.ts`                                 | role-match    |
| `src/server/routers/agents.ts`                  | controller | CRUD             | `src/server/routers/achievements.ts`                                 | role-match    |
| `src/server/routers/disputes.ts`                | controller | CRUD             | `src/server/routers/events.ts`                                       | role-match    |
| `src/server/routers/dwallet.ts`                 | controller | CRUD             | `src/server/routers/events.ts`                                       | role-match    |
| `src/server/routers/resources.ts`               | controller | CRUD             | `src/server/routers/events.ts`                                       | role-match    |
| **Wave 3 — Sub-Router Modules**                 |            |                  |                                                                      |               |
| `src/server/routers/chat/conversations.ts`      | controller | CRUD             | `src/server/routers/events.ts`                                       | role-match    |
| `src/server/routers/chat/messaging.ts`          | controller | CRUD             | `src/server/routers/chat/conversations.ts`                           | exact         |
| `src/server/routers/chat/shared.ts`             | utility    | import-shared    | itself — already clean pattern                                       | exact         |
| `src/server/routers/maintenance/*.ts` (5 files) | controller | CRUD             | `src/server/routers/events.ts`                                       | role-match    |
| `src/server/routers/marketplace/*.ts` (9 files) | controller | CRUD             | `src/server/routers/events.ts`                                       | role-match    |
| `src/server/routers/surveys/*.ts` (5 files)     | controller | CRUD             | `src/server/routers/events.ts`                                       | role-match    |

## Pattern Assignments

---

### `src/shared/api/trpc/server.ts` — errorFormatter + Suspension Middleware (modify)

**Analog:** itself (`src/shared/api/trpc/server.ts`)

**Current errorFormatter** (lines 63-74):

```typescript
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});
```

**Canonical code mapper** (already in `src/shared/api/envelope.ts:61-78`, needs wiring):

```typescript
// Line 61-74: TRPC_TO_CANONICAL mapping table
export const TRPC_TO_CANONICAL: Record<string, CanonicalErrorCode> = {
  UNAUTHORIZED: ERROR_CODES.AUTH_REQUIRED,
  FORBIDDEN: ERROR_CODES.FORBIDDEN,
  BAD_REQUEST: ERROR_CODES.VALIDATION_ERROR,
  NOT_FOUND: ERROR_CODES.NOT_FOUND,
  CONFLICT: ERROR_CODES.CONFLICT,
  TOO_MANY_REQUESTS: ERROR_CODES.RATE_LIMITED,
  INTERNAL_SERVER_ERROR: ERROR_CODES.INTERNAL_ERROR,
  PRECONDITION_FAILED: ERROR_CODES.TENANT_REQUIRED,
  METHOD_NOT_SUPPORTED: ERROR_CODES.VALIDATION_ERROR,
  TIMEOUT: ERROR_CODES.INTERNAL_ERROR,
  PAYLOAD_TOO_LARGE: ERROR_CODES.VALIDATION_ERROR,
  UNPROCESSABLE_CONTENT: ERROR_CODES.VALIDATION_ERROR,
};

// Line 76-78: Helper function
export function tRPCCodeToCanonical(trpcCode: string): CanonicalErrorCode {
  return TRPC_TO_CANONICAL[trpcCode] ?? ERROR_CODES.INTERNAL_ERROR;
}
```

**Target: Wired errorFormatter** (RESEARCH.md lines 438-471):

```typescript
import { tRPCCodeToCanonical } from '../envelope';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    let canonicalCode: string;
    if (error.message === 'SUSPENDED_USER') {
      canonicalCode = 'SUSPENDED_USER';
    } else if (error.message === 'FEATURE_DISABLED') {
      canonicalCode = 'FEATURE_DISABLED';
    } else {
      canonicalCode = tRPCCodeToCanonical(error.code);
    }
    return {
      ...shape,
      data: {
        ...shape.data,
        code: canonicalCode,
        httpStatus: shape.data.httpStatus,
        zodError:
          error.code === 'BAD_REQUEST' && error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    };
  },
});
```

**Suspension check middleware** — pattern from `auth-utils.ts` (lines 75-108) `checkActiveSuspension()`:

```typescript
// Source: src/shared/api/auth-utils.ts:75-108
async function checkActiveSuspension(userId: string): Promise<SuspensionInfo | null> {
  const [suspension] = await db
    .select({
      id: platformSuspensions.id,
      suspensionType: platformSuspensions.suspensionType,
      reason: platformSuspensions.reason,
      description: platformSuspensions.description,
      startDate: platformSuspensions.startDate,
      endDate: platformSuspensions.endDate,
      isPermanent: platformSuspensions.isPermanent,
      createdById: platformSuspensions.createdById,
    })
    .from(platformSuspensions)
    .where(and(eq(platformSuspensions.userId, userId), eq(platformSuspensions.isActive, true)))
    .limit(1);

  if (!suspension) return null;

  // Auto-unsuspend expired timed suspensions
  if (suspension.endDate && new Date(suspension.endDate) < new Date()) {
    await db
      .update(platformSuspensions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(platformSuspensions.id, suspension.id));
    await db.update(users).set({ isActive: true }).where(eq(users.id, userId));
    return null;
  }
  return suspension;
}
```

**Target: suspension check wired into `privilegedProcedure`** (RESEARCH.md lines 476-517):

```typescript
// Add import
import { db, platformSuspensions } from '../db';
import { eq, and, or, isNull, gt } from 'drizzle-orm';

// Inline or helper
async function checkNotSuspended(ctx: { userId: string; tenantId: string | null; db: typeof db }) {
  if (!ctx.userId || !ctx.tenantId) return;
  const [activeSuspension] = await ctx.db
    .select({ id: platformSuspensions.id })
    .from(platformSuspensions)
    .where(
      and(
        eq(platformSuspensions.userId, ctx.userId),
        eq(platformSuspensions.tenantId, ctx.tenantId),
        eq(platformSuspensions.isActive, true),
        or(isNull(platformSuspensions.endDate), gt(platformSuspensions.endDate, new Date()))
      )
    )
    .limit(1);
  if (activeSuspension) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'SUSPENDED_USER' });
  }
}

// In privilegedProcedure:
export const privilegedProcedure = tenantProcedure.use(async ({ ctx, next }) => {
  if (ctx.role !== 'ADMIN' && ctx.role !== 'BOARD' && ctx.role !== 'COMMITTEE') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Privileged access required' });
  }
  await checkNotSuspended(ctx);
  return next({ ctx });
});
```

---

### `src/server/dto/disputes.ts` — NEW (DTO, transform)

**Analog:** `src/server/dto/marketplace.ts` (lines 1-123) — multiple entities, `.extend()` for relations, date transforms

**Pattern to copy** (`src/server/dto/marketplace.ts:1-51`):

```typescript
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { disputeCases } from '@/db/schema/dispute-cases';
import { disputeEvents } from '@/db/schema/dispute-events';
import { disputeEvidences } from '@/db/schema/dispute-evidences';
import { disputeMessages } from '@/db/schema/dispute-messages';
import { disputeNotifications } from '@/db/schema/dispute-notifications';

const dateSchema = z.date().transform(d => d.toISOString());

export const disputeCaseDto = createSelectSchema(disputeCases, {
  intakeCompletedAt: dateSchema.nullable(),
  coolingOffEndsAt: dateSchema.nullable(),
  submittedAt: dateSchema.nullable(),
  mediationOfferedAt: dateSchema.nullable(),
  mediationAcceptedAt: dateSchema.nullable(),
  rulingIssuedAt: dateSchema.nullable(),
  csosEscalatedAt: dateSchema.nullable(),
  csosClosedAt: dateSchema.nullable(),
  resolvedAt: dateSchema.nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
  deletedAt: dateSchema.nullable(),
}).pick({
  id: true,
  tenantId: true,
  referenceNumber: true,
  complainantId: true,
  respondentId: true,
  respondentType: true,
  category: true,
  subcategory: true,
  title: true,
  description: true,
  desiredOutcome: true,
  severity: true,
  status: true,
  intakeCompletedAt: true,
  coolingOffEndsAt: true,
  submittedAt: true,
  assignedModeratorId: true,
  mediationOfferedAt: true,
  mediationAcceptedAt: true,
  rulingIssuedAt: true,
  rulingDescription: true,
  csosReferenceNumber: true,
  csosEscalatedAt: true,
  csosClosedAt: true,
  resolvedAt: true,
  closedById: true,
  closedReason: true,
  isConfidential: true,
  createdAt: true,
  updatedAt: true,
});

export const disputeEventDto = createSelectSchema(disputeEvents, {
  createdAt: dateSchema,
}).pick({
  id: true,
  disputeId: true,
  actorId: true,
  eventType: true,
  fromStatus: true,
  toStatus: true,
  note: true,
  metadata: true,
  createdAt: true,
});

export const disputeEvidenceDto = createSelectSchema(disputeEvidences, {
  createdAt: dateSchema,
}).pick({
  id: true,
  disputeId: true,
  uploadedBy: true,
  fileUrl: true,
  fileType: true,
  fileName: true,
  description: true,
  createdAt: true,
});

export const disputeMessageDto = createSelectSchema(disputeMessages, {
  createdAt: dateSchema,
  editedAt: dateSchema.nullable(),
}).pick({
  id: true,
  disputeId: true,
  senderId: true,
  content: true,
  isInternal: true,
  createdAt: true,
  editedAt: true,
});

export type DisputeCaseDto = z.infer<typeof disputeCaseDto>;
export type DisputeEventDto = z.infer<typeof disputeEventDto>;
export type DisputeEvidenceDto = z.infer<typeof disputeEvidenceDto>;
export type DisputeMessageDto = z.infer<typeof disputeMessageDto>;
```

**Key conventions:**

- `import { z } from 'zod/v4'` (NOT `'zod'`) — consistent with all existing DTO files
- `dateSchema = z.date().transform(d => d.toISOString())` — standard date handling
- `createSelectSchema(table, { dateCol: dateSchema })` — override date columns
- `.pick({ ... })` — only expose safe fields
- Type exports: `export type FooDto = z.infer<typeof fooDto>;`

---

### `src/server/dto/resources.ts` — NEW (DTO, transform)

**Analog:** `src/server/dto/content.ts` (lines 1-58) — single entity with `.pick()`

**Pattern to copy** (`src/server/dto/content.ts:1-30`):

```typescript
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { resources } from '@/db/schema/resources';

const dateSchema = z.date().transform(d => d.toISOString());

export const resourceDto = createSelectSchema(resources, {
  publishedAt: dateSchema.nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
  deletedAt: dateSchema.nullable(),
}).pick({
  id: true,
  tenantId: true,
  title: true,
  description: true,
  category: true,
  fileUrl: true,
  fileType: true,
  fileSize: true,
  externalUrl: true,
  bodyContent: true,
  version: true,
  downloadCount: true,
  visibility: true,
  authorId: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type ResourceDto = z.infer<typeof resourceDto>;
```

---

### `src/server/dto/index.ts` — Barrel Update (modify)

**Analog:** itself (`src/server/dto/index.ts` lines 1-52)

**Pattern to extend:**

```typescript
// Add at appropriate position (alphabetical):
export { disputeCaseDto, disputeEventDto, disputeEvidenceDto, disputeMessageDto } from './disputes';
export type {
  DisputeCaseDto,
  DisputeEventDto,
  DisputeEvidenceDto,
  DisputeMessageDto,
} from './disputes';

export { resourceDto } from './resources';
export type { ResourceDto } from './resources';
```

---

### Router Migration: The Canonical Clean Pattern

**Analog:** `src/server/routers/achievements.ts` (lines 1-86, 136-187) — cleanest exemplar of the target pattern

#### Pattern A: Imports Structure

**Source:** `src/server/routers/achievements.ts:1-13`:

```typescript
import { z } from 'zod';
import { router, protectedProcedure, db, revalidateAdminChanges } from '@api/server';
import { toEnvelope } from '@api/server';
import { achievementDto, achievementProgressDto } from '@server/dto';

import { TRPCError } from '@trpc/server';
import { hasPermission } from '@shared/lib';

import { eq, and, or, isNull, sql } from 'drizzle-orm';
import { achievementDefinitions } from '@schema/achievement-definitions';
import { tenantAchievements } from '@schema/tenant-achievements';
```

**Key rules:**

1. `z` from `'zod'` (v3, used in router `.input()`/.output())
2. Core infra from `@api/server` (procedure builders, db, revalidation helpers, `toEnvelope`)
3. DTOs from `@server/dto`
4. `TRPCError` from `@trpc/server`
5. Permissions from `@shared/lib`
6. Drizzle helpers from `drizzle-orm`
7. Table refs from `@schema/...` (NOT from `@api/server` — that's the old pattern)

#### Pattern B: Query Procedure (GET many)

**Source:** `src/server/routers/achievements.ts:44-86`:

```typescript
listAchievements: protectedProcedure
  .meta({
    openapi: { method: 'GET', path: '/achievements/list', protect: true, tags: ['achievements'] },
  })
  .query(async ({ ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const rows = await db
      .select({ /* ... columns ... */ })
      .from(achievementDefinitions)
      /* ... joins, conditions ... */
      .where(/* ... tenant-scoped ... */);

    return toEnvelope(
      rows.map(r => achievementDto.parse({ ...r, /* ... computed fields */ }))
    );
  }),
```

**Key rules:**

- Uses `protectedProcedure` → should migrate to `tenantProcedure` (no inline `!tenantId` check needed)
- `@public` JSDoc tag on tenantProcedure procedures
- Returns `toEnvelope(dto.parse(row))` — DTO mapping + envelope wrapping
- No raw DB rows in return

#### Pattern C: Mutation Procedure (POST)

**Source:** `src/server/routers/achievements.ts:136-187`:

```typescript
createAchievement: protectedProcedure
  .input(CreateAchievementInput)
  .meta({
    openapi: {
      method: 'POST', path: '/achievements/create', protect: true, tags: ['achievements'],
    },
  })
  .mutation(async ({ input, ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    if (!hasPermission(ctx.role, 'admin')) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin permission required' });
    }

    const [existing] = await db
      .select({ id: achievementDefinitions.id })
      .from(achievementDefinitions)
      .where(eq(achievementDefinitions.key, input.key))
      .limit(1);

    if (existing) {
      throw new TRPCError({ code: 'CONFLICT', message: `Achievement with key "${input.key}" already exists` });
    }

    const id = crypto.randomUUID();
    const [created] = await db
      .insert(achievementDefinitions)
      .values({ id, /* ... */ })
      .returning();

    revalidateAdminChanges();
    return toEnvelope(achievementDto.parse(created));
  }),
```

**Key rules:**

- On mutation: `revalidateAdminChanges()` or `revalidateContent()` or `revalidateDashboard()` after write
- Returns `toEnvelope(dto.parse(created))` — DTO maps the returned row
- Uses `crypto.randomUUID()` for ID generation
- Conflict checks before insert

#### Pattern D: Entity Service + Envelope Pattern

**Source:** `src/server/routers/events.ts:121-190`:

```typescript
export const eventsRouter = router({
  listEvents: protectedProcedure
    .input(ListEventsInput)
    .meta({ openapi: { method: 'GET', path: '/events/list', protect: true, tags: ['events'] } })
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const eventItems = await listEvents({ tenantId, limit: input?.limit, upcoming: input?.upcoming });
      const enriched = await enrichEvents(eventItems, ctx.userId, tenantId);

      return toEnvelope(enriched.map(r => eventDto.parse(r)));
    }),

  createEvent: protectedProcedure
    .input(CreateEventInput)
    .meta({ openapi: { method: 'POST', path: '/events/create', protect: true, tags: ['events'] } })
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }
      requireContentPermission(ctx.role);

      const event = await createEvent({
        id: crypto.randomUUID(), tenantId,
        title: input.title, description: input.description,
        date: new Date(input.date), location: input.location,
        organizer: input.organizer, image: input.image || null,
        isPublic: input.isPublic,
      });

      revalidateContent();
      emitEvent('event.rsvp', { tenantId, userId: ctx.userId, eventId: event.id });

      return toEnvelope(eventDto.parse(event));
    }),
```

**Key rules:**

- Delegates to entity service (`listEvents`, `createEvent` from `@entities/event/server`)
- Enriches response with computed data (attendee counts, registration status)
- `revalidateContent()` after mutation
- `emitEvent()` for real-time signalling

#### Pattern E: Sub-Router Shared Module

**Source:** `src/server/routers/chat/shared.ts:1-62`:

```typescript
import { z } from 'zod';
import {
  protectedProcedure,
  adminProcedure,
  db,
  conversations,
  conversationParticipants,
  messages,
  users,
  announcements,
  notifications,
  revalidateConversations,
} from '@api/server';
import { TRPCError } from '@trpc/server';
import { hasPermission } from '@shared/lib';
import { eq, and, or, desc, ne, gt, count, isNull, lt, sql, inArray } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export {
  z,
  protectedProcedure,
  adminProcedure,
  db,
  conversations,
  conversationParticipants,
  messages,
  users,
  announcements,
  notifications,
  revalidateConversations,
  TRPCError,
  hasPermission,
  eq,
  and,
  or,
  desc,
  ne,
  gt,
  count,
  isNull,
  lt,
  sql,
  inArray,
  SQL,
};
```

**Key rules:**

- Shared module just re-exports common imports for sub-routers
- Avoids duplication across conversation.ts, messaging.ts

---

### Router-Specific Migration Notes

#### `src/server/routers/identity.ts` (1848 lines — largest)

**Current state:** Uses `toEnvelope()` on all returns. But:

- Uses `adminProcedure`/`protectedProcedure` (NOT `tenantProcedure`/`privilegedProcedure`)
- Defines 15+ inline Zod schemas (lines 51-213) — `propertySchema`, `householdSchema`, `profileSchema`, `userSchema`, `soloSeatSchema`, `albumSchema`, etc.
- Uses `db` (global) instead of `ctx.db` in some procedures (line 281-282)

**Migration actions:**

1. Delete inline schemas (lines 51-213 except input schemas)
2. Replace schema references with DTOs: `propertySchema` → `propertyDto`, `profileSchema` → `profileDto`, etc.
3. Migrate to `tenantProcedure`/`privilegedProcedure`:
   - `adminProcedure` → `privilegedProcedure` (COMMITTEE included)
   - `protectedProcedure` (tenant-scoped) → `tenantProcedure`
   - Remove inline `!ctx.tenantId` checks
4. Use `ctx.db` instead of global `db`
5. Add classification JSDoc: `/** @privileged */` on admin routes, `/** @tenant */` on tenant routes

#### `src/server/routers/competitions.ts` (894 lines)

**Current state:** Uses `toEnvelope()` and `toEnvelopeSchema()` on returns. Some inline output schemas. No DTO imports.

**Migration actions:**

1. Create competition DTOs (or extend misc.ts) — currently no competition DTOs exist
2. Uses `adminProcedure` → migrate to `privilegedProcedure`
3. Has manual `toParticipantDTO()` mapper — keep but wrap with DTO parse
4. Add `/** @public */` on `listPublicCompetitions`

#### `src/server/routers/resources.ts` (406 lines)

**Current state:** Uses `toEnvelope()` but returns raw DB rows (line 142-148, `toEnvelope(await db.select()...)`). No DTO parsing.

**Migration actions:**

1. Import `resourceDto` from new `@server/dto/resources.ts`
2. Replace `toEnvelope(await db.select()...)` with `toEnvelope(rows.map(r => resourceDto.parse(r)))`
3. Migrate `protectedProcedure` → `tenantProcedure` where tenant-scoped

#### Sub-Router Modules (chat/, maintenance/, marketplace/, surveys/)

**Pattern:** Each sub-router follows the shared.ts pattern. Migration:

1. Add `toEnvelope` import to shared.ts re-exports
2. Add DTO imports where missing
3. Migrate `protectedProcedure` → `tenantProcedure`/`privilegedProcedure`
4. Wrap returns with `toEnvelope(dto.parse(row))`

---

## Shared Patterns

### 1. DTO Derivation (drizzle-zod)

**Source:** ALL 11 DTO files in `src/server/dto/`
**Apply to:** All DTO files (new and existing)

```typescript
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4'; // ← MUST use zod/v4, not 'zod'
import { tableName } from '@/db/schema/table-name';

const dateSchema = z.date().transform(d => d.toISOString());

export const entityDto = createSelectSchema(tableName, {
  createdAt: dateSchema,
  updatedAt: dateSchema,
}).pick({ id: true /* safe fields */ });

export type EntityDto = z.infer<typeof entityDto>;
```

### 2. Error Handling (TRPCError throws)

**Source:** All routers — e.g., `src/server/routers/events.ts:75-77`
**Apply to:** All router files

```typescript
import { TRPCError } from '@trpc/server';

// Not found
throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });

// Auth
throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });

// Conflict
throw new TRPCError({ code: 'CONFLICT', message: 'Resource already exists' });

// Bad request / validation
throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
```

### 3. Envelope Response (toEnvelope)

**Source:** `src/shared/api/envelope.ts:35-49`
**Apply to:** All router procedure returns

```typescript
import { toEnvelope, toEnvelopeSchema, toPaginatedEnvelope } from '@api/server';

// Simple wrapper
return toEnvelope(dto.parse(row));

// Array wrapper
return toEnvelope(rows.map(r => dto.parse(r)));

// Paginated
return toPaginatedEnvelope(dtos, page, pageSize, total);

// Output schema (for .output() on external procedures)
.output(toEnvelopeSchema(z.object({ items: z.array(entityDto), total: z.number() })))
```

### 4. Procedure Tier Selection

**Source:** `src/shared/api/trpc/server.ts:77-141`
**Apply to:** All router files
| Current | Migration Target | When |
|---|---|---|
| `publicProcedure` | `publicProcedure` (unchanged) | Unauthenticated endpoints |
| `protectedProcedure` + inline `!tenantId` check | `tenantProcedure` | Tenant-scoped endpoints |
| `adminProcedure` (where COMMITTEE should have access) | `privilegedProcedure` | Staff/admin/mod endpoints |
| `adminProcedure` (truly ADMIN/BOARD only) | `adminProcedure` (keep, add comment) | Sensitive platform ops |
| `agentProcedure` | `agentProcedure` (unchanged) | Agent-specific endpoints |

### 5. Permission Checking

**Source:** `src/server/routers/content.ts:187-197`
**Apply to:** All router mutation procedures

```typescript
import { hasPermission } from '@shared/lib';

// Inline check (small procedures)
if (!hasPermission(ctx.role, 'content')) {
  throw new TRPCError({ code: 'FORBIDDEN', message: 'Content permission required' });
}

// Reusable guard (exported from router files)
export function requireContentPermission(role: string | null | undefined): void {
  if (!hasPermission(role, 'content') && !hasPermission(role, 'contentOwn')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
  }
}
```

### 6. Classification JSDoc Tags

**Source:** CONTEXT.md D-09
**Apply to:** All procedure definitions

```typescript
/**
 * List all properties in the current tenant.
 * @tenant
 */
listProperties: tenantProcedure
  .meta({ ... })
  .query(async ({ ctx }) => { ... }),

/**
 * Create a new property — staff only.
 * @privileged
 */
createProperty: privilegedProcedure
  .meta({ ... })
  .mutation(async ({ input, ctx }) => { ... }),

/**
 * List active competitions — no auth required.
 * @public
 */
listPublicCompetitions: publicProcedure
  .meta({ ... })
  .query(async () => { ... }),
```

### 7. Router Registration (appRouter)

**Source:** `src/server/routers/index.ts:1-46`
**Apply to:** No changes needed — all 20 routers already registered

```typescript
import { router } from '@api/server';
import { identityRouter } from './identity';
// ... all 20 imports

export const appRouter = router({
  identity: identityRouter,
  competitions: competitionRouter,
  content: contentRouter,
  // ... all 20 routers
});

export type AppRouter = typeof appRouter;
```

---

## No Analog Needed

Files that follow their own existing pattern with only minor changes:

| File                                       | Reason                                                                                                                                                                 |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/server/routers/chat/conversations.ts` | Already has inline zod schemas and envelope-optional returns. Just needs `toEnvelope()` wrap + `tenantProcedure`. Pattern exists in own `listConversations` procedure. |
| `src/server/routers/marketplace/shared.ts` | Follows identical pattern to `chat/shared.ts` — just re-exports. No changes needed other than adding `toEnvelope` to exports.                                          |
| `src/server/routers/maintenance/shared.ts` | Same as above — shared re-export module.                                                                                                                               |
| `src/server/routers/surveys/shared.ts`     | Same as above.                                                                                                                                                         |

---

## Metadata

**Analog search scope:** `src/shared/api/trpc/server.ts`, `src/shared/api/envelope.ts`, `src/shared/api/api-response.ts`, `src/shared/api/auth-utils.ts`, `src/shared/api/server/index.ts`, `src/server/routers/` (42 files), `src/server/dto/` (11 files), `src/db/schema/` (for DTO table definitions)

**Files scanned:** 58 source files

**Pattern extraction date:** 2026-06-30

**Key findings:**

- All infrastructure exists (`tenantProcedure`, `privilegedProcedure`, `toEnvelope()`, DTOs, `TRPC_TO_CANONICAL`, `checkActiveSuspension()`), just not wired
- `errorFormatter` does NOT call `tRPCCodeToCanonical()` — that's the single highest-impact fix
- `privilegedProcedure` is missing suspension check (step 4 of 5-step auth)
- 0 of 20 routers use `tenantProcedure` or `privilegedProcedure` — all use `protectedProcedure`/`adminProcedure`
- 2 missing DTO files: `disputes.ts` and `resources.ts`
- `identity.ts` has 15+ inline Zod schemas duplicating the DTO layer
- Maintenance DTO (`maintenance.ts`) is hand-rolled Zod (not drizzle-zod) — may want migration but not in scope for Phase 120
