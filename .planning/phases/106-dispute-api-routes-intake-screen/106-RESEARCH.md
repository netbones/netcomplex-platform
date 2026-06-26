# Phase 106: Dispute API Routes & Intake Screen — Research

**Researched:** 2026-06-26
**Domain:** REST API / Dispute Resolution / AI Integration
**Confidence:** HIGH

## Summary

Phase 106 implements the full dispute API layer: 11 route handlers spanning CRUD operations, cooling-off enforcement, mediation threads, evidence upload, moderator assignment, ruling issuance, and CSOS export — plus the AI frivolity-check intake screen. All routes follow the established codebase pattern (`withTenant()` → `getSessionAndRole()` → `assertModuleEnabled('disputes')` → business logic → `apiSuccess()`/`apiError()`).

The AI intake screen reuses Phase 104's platform AI pool (`checkQuota()` → `getAiProvider()` → `recordUsage()`) with the exact same pattern as `POST /api/translate`. PDF generation for CSOS export is deferred to Phase 108 — Phase 106 creates the route skeleton only.

**Primary recommendation:** Follow the `maintenance/route.ts` and `translate/route.ts` patterns precisely. Use `withErrorHandler()` wrapper from `@api/server` for dynamic-param routes (matching `maintenance/[id]/route.ts`). All routes are Next.js App Router route handlers — REST, not tRPC. The dispute entity layer from Phase 105 provides DTOs, constants, lifecycle validation, and the reference number generator.

## Architectural Responsibility Map

| Capability                               | Primary Tier  | Secondary Tier     | Rationale                                                           |
| ---------------------------------------- | ------------- | ------------------ | ------------------------------------------------------------------- |
| Dispute CRUD (create, list, get, update) | API / Backend | Database / Storage | Server-side business logic + Drizzle persistence                    |
| Cooling-off enforcement                  | API / Backend | —                  | Server-side timestamp validation (R4 mitigation)                    |
| Mediation thread (messages)              | API / Backend | Supabase Realtime  | REST for CRUD; Realtime broadcast for new messages                  |
| Evidence file upload                     | API / Backend | CDN / Static (S3)  | S3 via `uploadImage()` — same pattern as existing                   |
| AI frivolity check (intake-screen)       | API / Backend | —                  | Server-side Anthropic call via platform AI pool                     |
| Moderator assignment                     | API / Backend | —                  | Auth-guarded POST route                                             |
| Ruling issuance                          | API / Backend | —                  | Auth-guarded POST route                                             |
| CSOS export                              | API / Backend | —                  | Route skeleton in Phase 106; PDF gen deferred to Phase 108          |
| Access control (role-based)              | API / Backend | —                  | `hasPermission()` + dispute-entity-level checks for party/moderator |

## User Constraints (from CONTEXT.md)

### Locked Decisions

- API routes per ADVISORY-017 §10: `POST /api/disputes`, `GET /api/disputes`, `GET /api/disputes/[id]`, `PATCH /api/disputes/[id]`, `POST /api/disputes/[id]/submit`, `POST /api/disputes/[id]/messages`, `GET /api/disputes/[id]/messages`, `POST /api/disputes/[id]/evidence`, `POST /api/disputes/[id]/assign`, `POST /api/disputes/[id]/ruling`, `GET /api/disputes/[id]/csos-export`
- Every route: `withTenant()` → `getSessionAndRole()` → `assertModuleEnabled('disputes')` → business logic → `apiSuccess()` / `apiError()`
- Intake screen: `POST /api/disputes/intake-screen` — uses Phase 104 AI pool (`checkQuota()` → `getAiProvider()` → `recordUsage()`)
- POPIA sanitation: strip surnames, unit numbers before sending description to AI
- Response not persisted — advisory only, never stored
- Graceful degradation: 503 when AI unavailable; intake wizard skips step
- Access control matrix: RESIDENT files/view-own; BOARD assigns/rules/views-all; ADMIN deletes
- CSOS export: 6 sections (Parties, Summary, History, Evidence, Ruling, Certification), 3 exports/case/day, logged as DisputeEvent
- Complainant anonymity: masked until `mediationAcceptedAt` is set (Gate G3)

### the agent's Discretion

- Exact PDF generation approach (existing infrastructure or new)
- Evidence file upload endpoint (existing upload patterns vs. new)
- Rate-limiting implementation (existing `rateLimitByKey`/`rateLimitByUser` helpers)

### Deferred Ideas (OUT OF SCOPE)

- Intake wizard UI (Phase 107)
- Widget registration (Phase 107)
- Full CSOS PDF formatting (Phase 108)
- Ruling issuance workflow polish (Phase 108)

## Phase Requirements

| ID         | Description                                                                                                    | Research Support                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| DISPUTE-03 | Core CRUD API routes: create DRAFT, list, get, update, submit with cooling-off enforcement                     | § API Route Patterns, § Drizzle Query Patterns                                     |
| DISPUTE-04 | Mediation thread (messages CRUD with visibility rules), evidence upload, moderator assignment, ruling issuance | § Mediation Thread Patterns, § Evidence Upload Patterns, § Access Control Patterns |
| DISPUTE-05 | Intake screen AI frivolity check + CSOS export route                                                           | § AI Integration Pattern, § CSOS Export Pattern                                    |

## Standard Stack

### Core (all already installed)

| Library               | Version   | Purpose                                   | Why Standard                                                          |
| --------------------- | --------- | ----------------------------------------- | --------------------------------------------------------------------- |
| next                  | ^15.5.0   | App Router, route handlers                | Project framework [VERIFIED: package.json]                            |
| drizzle-orm           | ^0.45.2   | Database queries, transactions, joins     | Project ORM — all queries use Drizzle [VERIFIED: package.json]        |
| zod                   | ^3.25.76  | Request body validation                   | Project standard for all API validation [VERIFIED: package.json]      |
| @anthropic-ai/sdk     | ^0.106.0  | Anthropic API client                      | Used for frivolity screen AI call [VERIFIED: package.json]            |
| @aws-sdk/client-s3    | ^3.1019.0 | S3 file storage                           | Existing `uploadImage()` uses S3 [VERIFIED: package.json]             |
| @supabase/supabase-js | ^2.101.1  | Realtime broadcast for mediation messages | Existing chat pattern uses Supabase Realtime [VERIFIED: package.json] |
| ioredis               | ^5.11.1   | Rate limiting (Redis-backed)              | Existing `rateLimitByUser`/`rateLimitByKey` [VERIFIED: package.json]  |

### Supporting

| Library                | Version | Purpose                   | When to Use                                                    |
| ---------------------- | ------- | ------------------------- | -------------------------------------------------------------- |
| vitest                 | ^4.1.2  | Test runner               | All unit/integration tests [VERIFIED: package.json]            |
| @testing-library/react | ^16.3.2 | React component testing   | UI tests for intake screen components [VERIFIED: package.json] |
| jsdom                  | ^29.0.1 | DOM environment for tests | vitest environment [VERIFIED: package.json]                    |

### Alternatives Considered

| Instead of              | Could Use                            | Tradeoff                                                                                |
| ----------------------- | ------------------------------------ | --------------------------------------------------------------------------------------- |
| S3 `uploadImage()`      | Supabase Storage                     | S3 is already integrated and working; Supabase Storage would add complexity for no gain |
| Custom rate limiter     | `rateLimitByUser` from `@api/server` | Existing helper is Redis-backed, already tested, and used across the codebase           |
| PDF lib (pdfmake/jspdf) | Defer to Phase 108                   | Phase 106 only needs route skeleton; full PDF gen researched in Phase 108               |

**Installation:** No new packages required — all dependencies already in `package.json`.

## Package Legitimacy Audit

No new external packages are introduced by this phase. All dependencies are already installed, verified in the production `package.json`, and actively used across the codebase. Audit is N/A.

**Packages removed due to SLOP verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
CLIENT REQUEST (Next.js App Router API)
        │
        ▼
┌──────────────────────────────────────┐
│ ROUTE HANDLER (route.ts)             │
│ • maxDuration = 8 / 15 (AI routes)   │
│ • withTenant() → tenantId            │
│ • getSessionAndRole() → userId, role │
│ • assertModuleEnabled('disputes')    │
│ • Rate limiting (sensitive routes)   │
└──────────────┬───────────────────────┘
               │
    ┌──────────┼──────────────────┐
    ▼          ▼                  ▼
┌─────────┐ ┌──────────┐ ┌──────────────────┐
│ VALIDATE│ │ AUTHORIZE│ │ AI POOL (intake) │
│ Zod     │ │ hasPerm  │ │ checkQuota()     │
│ schemas │ │ + entity │ │ getAiProvider()  │
└────┬────┘ │ checks   │ │ recordUsage()    │
     │      └────┬─────┘ └────────┬─────────┘
     │           │                │
     ▼           ▼                ▼
┌──────────────────────────────────────────┐
│ BUSINESS LOGIC                           │
│ • Create DRAFT (coolingOffEndsAt calc)   │
│ • Submit: validate cooling-off expired   │
│ • Messages: enforce visibility rules     │
│ • Evidence: S3 upload via uploadImage()  │
│ • Assign: BOARD/ADMIN only               │
│ • Ruling: BOARD/ADMIN only               │
│ • CSOS export: route skeleton only       │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ PERSISTENCE (Drizzle ORM)                │
│ • disputeCases, disputeEvents,           │
│   disputeMessages, disputeEvidences,     │
│   disputeNotifications                   │
│ • Transactions for atomic multi-table    │
│ • Soft-delete only (deletedAt)           │
│ • always tenant-scoped (tenantId filter) │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ RESPONSE                                 │
│ • apiSuccess(data) / apiCreated(data)    │
│ • apiError(code, message, status)        │
│ • apiUnauthorized() / apiForbidden()     │
│ • apiNotFound() / apiConflict()          │
│ • Realtime broadcast (mediation messages)│
└──────────────────────────────────────────┘
```

### Recommended Project Structure

```
src/
├── app/api/disputes/
│   ├── route.ts                   # GET list, POST create DRAFT
│   ├── [id]/
│   │   ├── route.ts               # GET single, PATCH update
│   │   ├── submit/route.ts        # POST — DRAFT→SUBMITTED with cooling-off
│   │   ├── messages/route.ts      # GET list, POST create (isInternal flag)
│   │   ├── evidence/route.ts      # POST upload evidence files
│   │   ├── assign/route.ts        # POST — BOARD/ADMIN assign moderator
│   │   ├── ruling/route.ts        # POST — BOARD issue formal ruling
│   │   └── csos-export/route.ts   # GET — generate CSOS export (skeleton)
│   └── intake-screen/route.ts     # POST — AI frivolity check
├── entities/dispute/
│   ├── index.ts                   # Client-safe barrel (exists)
│   ├── index.server.ts            # Server-only barrel (exists)
│   ├── model/                     # Types, constants, lifecycle (exists)
│   ├── api/
│   │   └── reference.ts           # generateDisputeReference() (exists)
│   └── __tests__/                 # Route handler tests (NEW for Phase 106)
└── db/schema/
    ├── dispute-cases.ts           # Drizzle table def (exists)
    ├── dispute-events.ts          # Drizzle table def (exists)
    ├── dispute-messages.ts        # Drizzle table def (exists)
    ├── dispute-evidences.ts       # Drizzle table def (exists)
    └── dispute-notifications.ts   # Drizzle table def (exists)
```

### Pattern 1: Standard API Route Structure

**What:** Every route follows: `withTenant()` → `getSessionAndRole()` → `assertModuleEnabled('disputes')` → business logic → `apiSuccess()`/`apiError()`. Dynamic-param routes wrap with `withErrorHandler()`.

**When to use:** All 11 dispute API routes.

**Example (from existing codebase — `maintenance/[id]/route.ts`):**

```typescript
// src/app/api/maintenance/[id]/route.ts (existing pattern)
import {
  db,
  auth,
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  withErrorHandler,
} from '@api/server';
import { withTenant, assertModuleEnabled } from '@entities/tenant/server';
import { eq, and } from 'drizzle-orm';

export const maxDuration = 8;

export const GET = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const { tenantId } = await withTenant();
    const authData = await getSessionAndRole(request);
    if (!authData) return apiUnauthorized();
    // ... business logic ...
    return apiSuccess(result);
  }
);
```

[CITED: src/app/api/maintenance/[id]/route.ts lines 59-168]

### Pattern 2: AI Provider Integration (Intake Screen)

**What:** Pool-backed AI call: `checkQuota()` → `getAiProvider()` → `provider.complete()` → `recordUsage()` (always, even on failure). Follows the exact pattern from `POST /api/translate`.

**When to use:** `POST /api/disputes/intake-screen`

**Example (from existing codebase — `translate/route.ts`):**

```typescript
// Source: src/app/api/translate/route.ts (existing pattern, simplified)
import { getAiProvider, isAiCapabilityEnabled, checkQuota, recordUsage } from '@api/server';
import { AI_MODELS, rateLimitByUser } from '@api/server';

// Step 1: Capability check
if (!(await isAiCapabilityEnabled(tenantId, 'ai.disputes.frivolityScreen'))) {
  return apiError('FEATURE_DISABLED', 'AI dispute screening not available', 503);
}

// Step 2: Quota check
const quota = await checkQuota(tenantId, capability, db);
if (!quota.allowed) {
  return apiError('FEATURE_DISABLED', 'AI token quota exhausted', 429, { ... });
}

// Step 3: Get provider
const provider = await getAiProvider(tenantId);

// Step 4: Call with timing
const start = Date.now();
let result, success = true;
try {
  result = await provider.complete(sanitised, {
    systemPrompt: FRIVOLITY_SCREEN_PROMPT,
    maxTokens: 500,
    jsonMode: true,
  });
} catch (err) { success = false; }

// Step 5: Record usage (ALWAYS)
await recordUsage({ tenantId, capability, userId, provider: result.provider,
  model: AI_MODELS.ANTHROPIC, inputTokens: estimateInputTokens(sanitised),
  outputTokens: result.tokensUsed ?? 0, durationMs: Date.now() - start,
  success, errorCode }, db);
```

[CITED: src/app/api/translate/route.ts lines 24-153]

### Pattern 3: Drizzle CRUD with Tenant Scoping

**What:** All queries include `tenantId` filter. Use `crypto.randomUUID()` for IDs. Soft-delete via `deletedAt`.

**When to use:** All dispute CRUD operations.

**Example:**

```typescript
// Create
const [dispute] = await db
  .insert(disputeCases)
  .values({
    id: crypto.randomUUID(),
    tenantId,
    referenceNumber: await generateDisputeReference(tenantId),
    complainantId: authData.userId,
    category: body.category,
    title: body.title,
    description: body.description,
    status: 'DRAFT',
    coolingOffEndsAt: new Date(Date.now() + coolingOffHours * 3600_000),
  })
  .returning();

// List with pagination
const disputes = await db
  .select()
  .from(disputeCases)
  .where(
    and(
      eq(disputeCases.tenantId, tenantId),
      isNull(disputeCases.deletedAt)
      // additional filters...
    )
  )
  .orderBy(desc(disputeCases.createdAt))
  .limit(20)
  .offset(0);

// Update with status transition logging
await db.transaction(async tx => {
  await tx
    .update(disputeCases)
    .set({ status: 'SUBMITTED', submittedAt: new Date() })
    .where(and(eq(disputeCases.id, id), eq(disputeCases.tenantId, tenantId)));
  await tx.insert(disputeEvents).values({
    id: crypto.randomUUID(),
    tenantId,
    disputeId: id,
    actorId: userId,
    eventType: 'SUBMITTED',
    fromStatus: 'DRAFT',
    toStatus: 'SUBMITTED',
  });
});
```

[CITED: src/db/schema/dispute-cases.ts, src/entities/dispute/api/reference.ts]

### Anti-Patterns to Avoid

- **Hard-coded tenantId:** Never derive tenant from user — always use `withTenant()`.
- **Raw `Response.json()`:** Always use `apiSuccess()` / `apiError()` from `@api/server`.
- **Missing `deletedAt` filter:** All list queries MUST filter `isNull(deletedAt)`.
- **Client-side cooling-off check:** Cooling-off validation MUST be server-side (R4 mitigation).
- **Storing AI response in DB:** Intake screen results are advisory only — never persisted (POPIA).
- **Sending raw PII to AI:** Description MUST be sanitised (strip surnames, unit numbers) before the Anthropic call.

## Don't Hand-Roll

| Problem             | Don't Build             | Use Instead                                                             | Why                                                                         |
| ------------------- | ----------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| File upload         | Custom multipart parser | `uploadImage()` from `@api/server` (S3 via `@aws-sdk/client-s3`)        | Edge cases: MIME validation, size limits, S3 key generation, error handling |
| Session/role lookup | Custom auth check       | `getSessionAndRole()` from `@api/server`                                | Handles Better Auth + suspension check + role resolution                    |
| Rate limiting       | Custom counter          | `rateLimitByUser()` / `rateLimitByKey()` from `@api/server`             | Redis-backed, sliding window, already tested                                |
| Tenant isolation    | Manual tenant query     | `withTenant()` from `@entities/tenant/server`                           | Header-based resolution + local dev fallback                                |
| Module gate         | Manual DB check         | `assertModuleEnabled('disputes')` from `@entities/tenant/server`        | Returns canonical `FEATURE_DISABLED` error response                         |
| AI call lifecycle   | Direct SDK call         | `checkQuota()` + `getAiProvider()` + `recordUsage()` from `@api/server` | Quota enforcement + usage audit + 80% warning notifications                 |
| Reference number    | Custom sequence         | `generateDisputeReference()` from `@entities/dispute/server`            | Per-tenant per-year `DSP-YYYY-NNNN` format                                  |
| Status transitions  | If/switch checks        | `canTransition()` from `@entities/dispute`                              | Centralised lifecycle state machine                                         |
| Error responses     | `new Response()`        | `apiSuccess()`/`apiError()`/etc. from `@api/server`                     | Consistent envelope, canonical error codes                                  |

**Key insight:** The codebase already has battle-tested patterns for every cross-cutting concern this phase needs. The dispute routes differ only in business logic — the auth, tenant, storage, rate-limiting, and error-handling layers are plug-and-play.

## Common Pitfalls

### Pitfall 1: Forgetting `withTenant()` — Cross-Tenant Data Leak

**What goes wrong:** Query runs without `tenantId` filter, returning data from other tenants.
**Why it happens:** Route handler starts async work before calling `withTenant()`.
**How to avoid:** `const { tenantId } = await withTenant();` MUST be the first line after auth in every handler. Always AND `eq(table.tenantId, tenantId)` in every where clause.
**Warning signs:** Test with multiple tenant fixtures — a list query returns more rows than expected.

### Pitfall 2: AI Quota Exhaustion Blocking Intake

**What goes wrong:** `checkQuota()` returns `{ allowed: false }` for every intake-screen call after quota is used.
**Why it happens:** `HARD_STOP` policy for STANDARD tier; frivolity screen uses ~300 tokens per call.
**How to avoid:** Return 429 with user-friendly message. Intake wizard (Phase 107) skips the AI step gracefully.
**Warning signs:** All intake-screen calls return 429 after some number of successful calls.

### Pitfall 3: Cooling-Off Bypass via Direct API

**What goes wrong:** Client sends `submittedAt` in request body, bypassing cooling-off.
**Why it happens:** Trusting client-provided timestamps.
**How to avoid:** Server validates `coolingOffEndsAt < new Date()` server-side. Client cannot influence the timestamp — it's set at creation and checked at submit. Return 423 with remaining seconds.
**Warning signs:** A dispute in DRAFT status submitted before `coolingOffEndsAt`.

### Pitfall 4: Mediation Thread Visibility Leak

**What goes wrong:** `isInternal: true` messages visible to complainants/respondents.
**Why it happens:** Missing `isInternal` filter in GET messages query.
**How to avoid:** GET messages queries MUST include: `or(isInternal.eq(false), and(isInternal.eq(true), hasRole('BOARD','ADMIN','COMMITTEE')))` — internal notes only for moderators. Filter by `isParty OR isModerator`.
**Warning signs:** Resident sees "internal note" messages in mediation thread.

### Pitfall 5: DisputeEvent Not Created on Status Change

**What goes wrong:** Status transitions happen without audit trail — breaks CSOS compliance.
**Why it happens:** Forgetting to insert `DisputeEvent` row alongside status update.
**How to avoid:** Wrap status changes in `db.transaction()`: update `disputeCases` + insert `disputeEvents` atomically. `DisputeEvent` is append-only per ADVISORY-017 §14.
**Warning signs:** CSOS export missing timeline entries for status transitions.

## Code Examples

### Dispute Creation (DRAFT)

```typescript
// POST /api/disputes
const coolingOffHours = await getTenantCoolingOffHours(tenantId); // default 24, max 72
const [dispute] = await db
  .insert(disputeCases)
  .values({
    id: crypto.randomUUID(),
    tenantId,
    referenceNumber: await generateDisputeReference(tenantId),
    complainantId: authData.userId,
    respondentId: body.respondentId ?? null,
    respondentType: body.respondentType ?? 'RESIDENT',
    category: body.category,
    title: body.title,
    description: body.description,
    desiredOutcome: body.desiredOutcome ?? null,
    severity: body.severity ?? 'MODERATE',
    status: 'DRAFT',
    isConfidential: true,
    coolingOffEndsAt: new Date(Date.now() + coolingOffHours * 3600_000),
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  .returning();

// Log event
await db.insert(disputeEvents).values({
  id: crypto.randomUUID(),
  tenantId,
  disputeId: dispute.id,
  actorId: authData.userId,
  eventType: 'CREATED',
  fromStatus: null,
  toStatus: 'DRAFT',
});
```

[CITED: ADVISORY-017 §10, src/entities/dispute/api/reference.ts]

### Cooling-Off Validation (Submit)

```typescript
// POST /api/disputes/[id]/submit
const [dispute] = await db
  .select()
  .from(disputeCases)
  .where(and(eq(disputeCases.id, id), eq(disputeCases.tenantId, tenantId)))
  .limit(1);

if (dispute.status !== 'DRAFT') return apiConflict('Dispute is not in draft status');
if (dispute.complainantId !== authData.userId) return apiForbidden();

const now = new Date();
if (dispute.coolingOffEndsAt && dispute.coolingOffEndsAt > now) {
  const remainingMs = dispute.coolingOffEndsAt.getTime() - now.getTime();
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  return apiError(
    'COOLING_OFF_ACTIVE',
    `Cooling-off period has not elapsed. ${remainingSeconds}s remaining.`,
    423
  );
}

await db.transaction(async tx => {
  await tx
    .update(disputeCases)
    .set({ status: 'SUBMITTED', submittedAt: now, updatedAt: now })
    .where(and(eq(disputeCases.id, id), eq(disputeCases.tenantId, tenantId)));
  await tx.insert(disputeEvents).values({
    id: crypto.randomUUID(),
    tenantId,
    disputeId: id,
    actorId: authData.userId,
    eventType: 'SUBMITTED',
    fromStatus: 'DRAFT',
    toStatus: 'SUBMITTED',
  });
});
```

[CITED: ADVISORY-017 §6, §10; R4 mitigation]

### Mediation Thread Visibility

```typescript
// GET /api/disputes/[id]/messages
// Determine if user is party or moderator
const isParty =
  dispute.complainantId === authData.userId || dispute.respondentId === authData.userId;
const isModerator =
  hasPermission(authData.role, 'admin') ||
  authData.role === 'BOARD' ||
  authData.role === 'COMMITTEE';

const messages = await db
  .select()
  .from(disputeMessages)
  .where(
    and(
      eq(disputeMessages.disputeId, id),
      eq(disputeMessages.tenantId, tenantId),
      isNull(disputeMessages.deletedAt),
      // Visibility rule: parties see non-internal; moderators see all
      isParty
        ? eq(disputeMessages.isInternal, false)
        : isModerator
          ? undefined // no filter — moderators see all
          : sql`false` // neither party nor moderator — no access
    )
  )
  .orderBy(asc(disputeMessages.createdAt));

// POST — enforce isInternal flag based on role
const isInternal = body.isInternal ?? false;
if (isInternal && !isModerator) {
  return apiForbidden('Only moderators can post internal notes');
}
```

[CITED: ADVISORY-017 §10, §12 Access Control Matrix]

## State of the Art

| Old Approach                              | Current Approach                                              | When Changed | Impact                                                         |
| ----------------------------------------- | ------------------------------------------------------------- | ------------ | -------------------------------------------------------------- |
| Inline `getSessionAndRole` in every route | `getSessionAndRole()` from `@api/server`                      | Phase 40+    | Consistent auth + suspension check; imports from shared barrel |
| Manually calling `isModuleEnabled`        | `assertModuleEnabled('disputes')`                             | Phase 41     | Returns canonical error response; one-liner in routes          |
| Direct Anthropic SDK calls                | `checkQuota()` + `getAiProvider()` + `recordUsage()`          | Phase 104    | Quota enforcement + usage audit trail                          |
| Prisma queries                            | Drizzle `db.select().from()` with `eq()`, `and()`, `isNull()` | Phase 40+    | Edge-compatible, type-safe queries                             |

**Deprecated/outdated:**

- `prisma.disputeCase.create()` — Use Drizzle `db.insert(disputeCases).values(...).returning()`.
- `new Response(JSON.stringify(data))` — Use `apiSuccess(data)` / `apiError()`.
- Client-side timestamp trust — Server must validate all time-based gates.

## Assumptions Log

| #   | Claim                                                                                                            | Section               | Risk if Wrong                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------- |
| A1  | `assertModuleEnabled('disputes')` resolves by calling `withTenant()` internally (no `tenantId` parameter needed) | Architecture Patterns | Low — verified against `feature-gate.ts` source                                  |
| A2  | `getSessionAndRole()` from `@api/server` returns `{ userId, role, suspension }` with suspension check            | Architecture Patterns | Low — verified against `auth-utils.ts` source                                    |
| A3  | `uploadImage()` from `@api/server` accepts `File` + `userId` and returns `{ url, key }`                          | Evidence Upload       | Low — verified against `storage.ts` source                                       |
| A4  | Phase 106 does NOT need to implement PDF generation — Phase 108 will do the full implementation                  | CSOS Export           | Low — confirmed by CONTEXT.md deferred section                                   |
| A5  | `rateLimitByUser` works with Redis (Upstash) and falls back gracefully if Redis unavailable                      | Rate Limiting         | Medium — Redis fallback not verified; if broken, rate limiting degrades silently |
| A6  | The `disputes` PlatformModule seed entry exists from Phase 105                                                   | Module Gate           | Medium — Phase 105 should have seeded `platform_modules` with key `'disputes'`   |
| A7  | `crypto.randomUUID()` is available in the runtime (Node 19+, not edge)                                           | ID Generation         | Low — all existing API routes use this pattern                                   |
| A8  | Soralia tenant has `ENTERPRISE` tier with 200K tokens/month for AI quota (per Gate G8: 500K)                     | AI Pool               | Medium — tier depends on actual seed data; may need adjustment                   |

## Open Questions

1. **Cooling-off hours tenant setting** (RESOLVED)
   - RESOLVED: Default 24h, configurable 24–72h per tenant via `disputes.coolingOffHours` tenant setting. Read from tenant settings with fallback to 24. Create the setting key in Phase 106 if it doesn't exist.

2. **CSOS export route — stub vs. partial implementation** (RESOLVED)
   - RESOLVED: Return JSON with dispute data + events + evidence list (Section A–F data, not formatted PDF). Phase 108 wraps this in PDF.

3. **Mediation thread — Supabase Realtime pattern** (RESOLVED)
   - RESOLVED: Use channel `dispute:${disputeId}` with event `new-mediation-message`. Filter visibility client-side based on `isInternal`. Same broadcast pattern as chat.

## Environment Availability

| Dependency             | Required By      | Available | Version  | Fallback                                       |
| ---------------------- | ---------------- | --------- | -------- | ---------------------------------------------- |
| Node.js                | API routes       | ✓         | v24.10.0 | —                                              |
| pnpm                   | Package manager  | ✓         | 10.33.0  | —                                              |
| PostgreSQL (Supabase)  | Database         | ✓         | —        | —                                              |
| Redis (Upstash)        | Rate limiting    | ✓         | —        | Rate limiting silently degraded if unavailable |
| S3 (STORAGE_ENDPOINT)  | Evidence upload  | ✓         | —        | —                                              |
| PLATFORM_ANTHROPIC_KEY | AI intake screen | ⚠         | —        | NullProvider fallback → 503                    |
| Next.js                | Framework        | ✓         | ^15.5.0  | —                                              |
| Vitest                 | Test runner      | ✓         | ^4.1.2   | —                                              |

**Missing dependencies with no fallback:**

- `PLATFORM_ANTHROPIC_KEY` — AI intake screen returns 503 if unset (graceful degradation per spec)

**Missing dependencies with fallback:**

- None identified — all core dependencies are available

## Validation Architecture

### Test Framework

| Property           | Value                                  |
| ------------------ | -------------------------------------- |
| Framework          | vitest 4.1.2                           |
| Config file        | `vitest.config.ts`                     |
| Quick run command  | `npx vitest run src/entities/dispute/` |
| Full suite command | `npx vitest run`                       |

### Phase Requirements → Test Map

| Req ID     | Behavior                                                            | Test Type   | Automated Command                                                        | File Exists? |
| ---------- | ------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------ | ------------ |
| DISPUTE-03 | POST /api/disputes creates DRAFT with coolingOffEndsAt              | integration | `npx vitest run src/app/api/disputes/__tests__/ -t "create draft"`       | ❌ Wave 0    |
| DISPUTE-03 | POST /api/disputes/[id]/submit rejects 423 before cooling-off       | integration | `npx vitest run src/app/api/disputes/__tests__/ -t "cooling-off"`        | ❌ Wave 0    |
| DISPUTE-03 | GET /api/disputes lists user's disputes with pagination             | integration | `npx vitest run src/app/api/disputes/__tests__/ -t "list disputes"`      | ❌ Wave 0    |
| DISPUTE-03 | GET /api/disputes/[id] returns single dispute with access control   | integration | `npx vitest run src/app/api/disputes/__tests__/ -t "get dispute"`        | ❌ Wave 0    |
| DISPUTE-03 | PATCH /api/disputes/[id] updates fields                             | integration | `npx vitest run src/app/api/disputes/__tests__/ -t "update"`             | ❌ Wave 0    |
| DISPUTE-04 | POST /api/disputes/[id]/messages enforces visibility (isInternal)   | integration | `npx vitest run src/app/api/disputes/__tests__/ -t "message visibility"` | ❌ Wave 0    |
| DISPUTE-04 | POST /api/disputes/[id]/evidence uploads file via S3                | integration | `npx vitest run src/app/api/disputes/__tests__/ -t "evidence upload"`    | ❌ Wave 0    |
| DISPUTE-04 | POST /api/disputes/[id]/assign restricts to BOARD/ADMIN             | integration | `npx vitest run src/app/api/disputes/__tests__/ -t "assign moderator"`   | ❌ Wave 0    |
| DISPUTE-04 | POST /api/disputes/[id]/ruling restricts to BOARD/ADMIN             | integration | `npx vitest run src/app/api/disputes/__tests__/ -t "ruling"`             | ❌ Wave 0    |
| DISPUTE-05 | POST /api/disputes/intake-screen returns toneScore, likelyFrivolous | integration | `npx vitest run src/app/api/disputes/__tests__/ -t "intake screen"`      | ❌ Wave 0    |
| DISPUTE-05 | POST /api/disputes/intake-screen returns 503 when AI unavailable    | integration | `npx vitest run src/app/api/disputes/__tests__/ -t "AI unavailable"`     | ❌ Wave 0    |
| DISPUTE-05 | GET /api/disputes/[id]/csos-export returns JSON event log           | integration | `npx vitest run src/app/api/disputes/__tests__/ -t "csos export"`        | ❌ Wave 0    |
| —          | All routes reject unauthenticated requests                          | unit        | `npx vitest run src/app/api/disputes/__tests__/ -t "unauthorized"`       | ❌ Wave 0    |
| —          | All routes enforce tenant isolation (`withTenant()`)                | unit        | `npx vitest run src/app/api/disputes/__tests__/ -t "tenant isolation"`   | ❌ Wave 0    |

### Sampling Rate

- **Per task commit:** `npx vitest run src/app/api/disputes/__tests__/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/app/api/disputes/__tests__/` — entire directory does not exist (needs test setup with mocked `@api/server`, `@entities/tenant/server`)
- [ ] `src/app/api/disputes/__tests__/helpers.ts` — shared test fixtures: mock users (RESIDENT, BOARD, ADMIN), mock disputes, mock AI responses
- [ ] Test mock infrastructure: follow `src/test/api/bookings.test.ts` pattern — mock `@api/server`, `@entities/tenant/server`, `checkQuota`, `recordUsage`

## Security Domain

### Applicable ASVS Categories

| ASVS Category         | Applies | Standard Control                                                                           |
| --------------------- | ------- | ------------------------------------------------------------------------------------------ |
| V2 Authentication     | yes     | `getSessionAndRole()` via Better Auth — every route checks session                         |
| V3 Session Management | yes     | Better Auth session handled by `auth.api.getSession()`                                     |
| V4 Access Control     | yes     | Role-based via `hasPermission()` + entity-level checks (party/moderator/complainant)       |
| V5 Input Validation   | yes     | Zod schemas for all request bodies; `sanitizeHtml` for message content                     |
| V6 Cryptography       | no      | No cryptographic operations in this phase                                                  |
| V7 Error Handling     | yes     | `apiError()` with canonical error codes; no stack traces in responses                      |
| V8 Data Protection    | yes     | POPIA sanitation before AI call; `isConfidential` flag masks complainant; soft-delete only |
| V9 Communication      | yes     | HTTPS only (Vercel); no sensitive data in query params                                     |
| V10 Malicious Code    | yes     | S3 upload validation (MIME type, file size); `sanitizeHtml` on message content             |

### Known Threat Patterns for Next.js + Drizzle + PostgreSQL

| Pattern                                     | STRIDE                 | Standard Mitigation                                                                                       |
| ------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------- |
| SQL injection via query params              | Tampering              | Drizzle ORM parameterised queries — never raw string interpolation                                        |
| Cross-tenant data access                    | Information Disclosure | `eq(table.tenantId, tenantId)` in every query; `withTenant()` guard                                       |
| AI prompt injection (intake screen)         | Tampering              | Sanitise description before sending to Anthropic; strip PII; use system prompt with strict output format  |
| Cooling-off bypass                          | Elevation of Privilege | Server-side timestamp validation; client cannot influence `coolingOffEndsAt`                              |
| Mediation thread visibility leak            | Information Disclosure | Server-side `isInternal` + `isParty` / `isModerator` filter in all GET queries                            |
| File upload abuse                           | Denial of Service      | `rateLimitByUser` (10/min); MIME type validation; 2MB size limit                                          |
| CSOS export abuse (harassment)              | Repudiation            | Rate limit: 3 exports/case/day; log every export as `DisputeEvent`                                        |
| AI quota exhaustion DoS                     | Denial of Service      | `checkQuota()` pre-flight; `HARD_STOP` returns 429; intake wizard skips gracefully                        |
| Enumeration attacks on `/api/disputes/[id]` | Information Disclosure | `apiNotFound()` for non-existent/mismatched tenant; no distinguishing between "not found" and "no access" |
| Replay attacks on submit                    | Spoofing               | `canTransition()` validates from-status; once SUBMITTED, cannot re-submit                                 |

## Sources

### Primary (HIGH confidence)

- `src/app/api/maintenance/route.ts` — Standard API route pattern with `withTenant()`, `getSessionAndRole()`, Zod validation, `apiSuccess()`/`apiError()`, `revalidateDashboard()` [VERIFIED: codebase grep]
- `src/app/api/maintenance/[id]/route.ts` — Dynamic param route pattern with `withErrorHandler()`, status transitions, Drizzle updates [VERIFIED: codebase grep]
- `src/app/api/translate/route.ts` — Complete AI pool integration pattern: `checkQuota()` → `getAiProvider()` → `recordUsage()` [VERIFIED: codebase grep]
- `src/app/api/messages/route.ts` — Mediation thread pattern: Supabase Realtime broadcast, visibility filtering, `sanitizeHtml` [VERIFIED: codebase grep]
- `src/shared/api/ai/pool.ts` — `checkQuota()`, `recordUsage()`, `getOrCreateUsage()` implementations [VERIFIED: codebase grep]
- `src/shared/api/ai/provider.ts` — `getAiProvider()`, `getPoolProviderConfig()` factory [VERIFIED: codebase grep]
- `src/entities/dispute/` — Entity layer: types, constants, lifecycle, reference generator (Phase 105 output) [VERIFIED: codebase grep]
- `docs/advisories/ADVISORY-017.md` — Full dispute system spec, access control matrix, CSOS export structure [VERIFIED: codebase grep]
- `docs/advisories/ADVISORY-017-SUPPLEMENTAL-2.md` — Platform AI pool pattern, `checkQuota`/`recordUsage` callsite example [VERIFIED: codebase grep]
- `src/shared/api/server/index.ts` — Barrel exports: `apiSuccess`, `apiError`, `rateLimitByUser`, `uploadImage`, `getSessionAndRole` [VERIFIED: codebase grep]
- Context7: `/drizzle-team/drizzle-orm-docs` — Drizzle transaction patterns, joins, filtering, pagination [VERIFIED: Context7]
- Context7: `/colinhacks/zod` — Zod `refine`, `superRefine` for conditional validation [VERIFIED: Context7]

### Secondary (MEDIUM confidence)

- `src/entities/tenant/api/gate/feature-gate.ts` — `assertModuleEnabled()` implementation pattern [CITED: codebase grep]
- `src/shared/api/auth-utils.ts` — `getSessionAndRole()` with suspension check [CITED: codebase grep]
- `src/shared/lib/permissions.ts` — `hasPermission()` role-based access control [CITED: codebase grep]
- `src/shared/api/rate-limit.ts` — Redis-backed rate limiting [CITED: codebase grep]
- `src/shared/api/storage.ts` — `uploadImage()` via S3 with MIME + size validation [CITED: codebase grep]
- `src/shared/api/with-error-handler.ts` — Error handling wrapper for route handlers [CITED: codebase grep]

### Tertiary (LOW confidence)

- Context7: `/vercel/next.js` — Next.js route handler patterns (project already has working patterns; Context7 confirms no breaking changes for our version) [CITED: Context7]
- Context7: `/better-auth/better-auth` — Better Auth `getSession` API (project already uses this; Context7 confirms pattern) [CITED: Context7]

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries already installed, versions verified in `package.json`
- Architecture: HIGH — all patterns verified against existing codebase implementations
- Pitfalls: HIGH — derived from ADVISORY-017 risk register + existing codebase anti-patterns
- AI integration: HIGH — exact pattern verified in `translate/route.ts` and `pool.ts`
- CSOS export: MEDIUM — route skeleton pattern is clear; full PDF implementation deferred to Phase 108

**Research date:** 2026-06-26
**Valid until:** 2026-07-26 (stable domain, no expected breaking changes)
