# Phase 120: API Governance Hardening — Research

**Researched:** 2026-06-30
**Domain:** tRPC API governance, response envelope, canonical error codes, DTO mapping, procedure tiers
**Confidence:** HIGH

## Summary

This phase closes 3 systemic governance gaps between 20 tRPC router files and the Netcomplex API Governance Standard (`API.md`, `API_ARCHITECT.md`). The codebase investigation reveals that substantial infrastructure already exists — `tenantProcedure`, `privilegedProcedure`, `ApiEnvelope<T>`, `toEnvelope()`, `TRPC_TO_CANONICAL` mapping, and the full DTO layer — but none of it is systematically wired. Zero routers use `tenantProcedure`/`privilegedProcedure`; the canonical error mapper exists but is not called from the `errorFormatter`; the DTOs exist but routers still define inline Zod schemas and return raw Drizzle rows. The envelope helper `toEnvelope()` is used per-procedure in ~7 routers but without consistency.

**Primary recommendation:** Wire the existing infrastructure — do NOT rebuild. The highest-impact single change is adding canonical error code rewriting in `errorFormatter` and adding suspension checks to `privilegedProcedure`. Router migration should be done router-by-router with the existing DTO layer, replacing inline schemas and adopting `tenantProcedure`/`privilegedProcedure` tiers.

## Architectural Responsibility Map

| Capability                      | Primary Tier     | Secondary Tier | Rationale                                                                               |
| ------------------------------- | ---------------- | -------------- | --------------------------------------------------------------------------------------- |
| Response envelope wrapping      | API / Backend    | —              | tRPC server middleware/errorFormatter layer                                             |
| Canonical error code mapping    | API / Backend    | —              | `errorFormatter` in trpc/server.ts rewrites codes before client receives them           |
| DTO validation & mapping        | API / Backend    | —              | Zod schemas validated before response; drizzle-zod derivation ensures zero schema drift |
| Auth: session check             | API / Backend    | —              | protectedProcedure middleware in trpc/server.ts                                         |
| Auth: tenant membership         | API / Backend    | —              | tenantProcedure middleware                                                              |
| Auth: role/permission           | API / Backend    | —              | privilegedProcedure/adminProcedure/agentProcedure middleware                            |
| Auth: suspension check          | API / Backend    | —              | Middleware queries platformSuspensions table (step 4 of 5)                              |
| Auth: feature flag check        | API / Backend    | —              | Middleware checks isModuleEnabled() (step 5 of 5, deferred to Wave 3+)                  |
| Classification metadata (JSDoc) | API / Backend    | —              | JSDoc tags on procedure definitions are doc-only; no runtime effect                     |
| OpenAPI metadata                | API / Backend    | —              | `.meta({ openapi })` on external procedures for @trpc/openapi generation                |
| Frontend client consumption     | Browser / Client | —              | tRPC client reads envelope shape; may need updating if shape changes                    |

## Standard Stack

### Core (all already installed)

| Library        | Version              | Purpose                                                       | Why Standard                                                   |
| -------------- | -------------------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| `@trpc/server` | 11.17.0              | tRPC server — routers, procedures, middleware, error handling | Already in use; v11 has `errorFormatter` and `.use()` chaining |
| `drizzle-zod`  | 0.8.3                | Derive Zod schemas from Drizzle table definitions             | Already in use by all 11 DTO files; ensures zero column drift  |
| `zod`          | 4.4.3 (via `zod/v4`) | Schema validation and DTO type inference                      | Already in use; DTOs use `zod/v4`, routers use `zod`           |

### Supporting

| Library         | Version       | Purpose                                              | When to Use                                                                 |
| --------------- | ------------- | ---------------------------------------------------- | --------------------------------------------------------------------------- |
| `@trpc/openapi` | 11.17.0-alpha | Generate OpenAPI specs from governed tRPC procedures | Wave 4: `.meta({ openapi })` on external procedures                         |
| `@trpc/next`    | 11.17.0       | Next.js App Router integration                       | Already in use for tRPC route handler in `src/app/api/trpc/[trpc]/route.ts` |
| `vitest`        | (installed)   | Testing framework                                    | Wave verification and regression tests                                      |
| `redocly`       | (installed)   | OpenAPI validation                                   | Post-Wave-3: `redocly lint` on generated OpenAPI                            |

### Alternatives Considered

| Instead of                            | Could Use                                                                              | Tradeoff                                                                                                                                                                                                                                        |
| ------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Per-procedure `toEnvelope()` wrapping | tRPC `errorFormatter` + middleware for codes only (no response wrapping in middleware) | tRPC v11 has NO built-in success-response transformer at the middleware level — only error formatting. Each procedure must wrap its return value. The per-procedure `toEnvelope()` pattern seen in identity.ts is the correct approach for v11. |
| Custom error codes inline             | TRPCError with native codes + errorFormatter rewriting                                 | The existing `TRPC_TO_CANONICAL` mapping + errorFormatter is the standard tRPC v11 approach. `onError` is for side effects (logging) only, not code rewriting.                                                                                  |
| Manual DTO mappers                    | `drizzle-zod` `createSelectSchema()` + `.pick()`                                       | Already adopted. `drizzle-zod` guarantees zero drift from the Drizzle schema. Manual mappers risk missing new columns.                                                                                                                          |

**Installation:** No new packages needed. All dependencies are already installed.

## Package Legitimacy Audit

> This phase adds NO new packages. All listed packages are already installed and in active use.

| Package        | Registry | Age    | Downloads | Source Repo                         | Verdict                  | Disposition                                    |
| -------------- | -------- | ------ | --------- | ----------------------------------- | ------------------------ | ---------------------------------------------- |
| `@trpc/server` | npm      | 5+ yrs | 2M+/wk    | github.com/trpc/trpc                | [VERIFIED: npm registry] | Approved — active project dependency           |
| `drizzle-zod`  | npm      | 3+ yrs | 500K+/wk  | github.com/drizzle-team/drizzle-orm | [VERIFIED: npm registry] | Approved — active project dependency           |
| `zod`          | npm      | 5+ yrs | 40M+/wk   | github.com/colinhacks/zod           | [VERIFIED: npm registry] | Approved — active project dependency (v4 used) |

**Packages removed due to SLOP verdict:** None — no new packages proposed.
**Packages flagged as suspicious:** None.

## Architecture Patterns

### System Architecture Diagram

```
                          ┌─────────────────────────────┐
                          │     tRPC Client (Browser)    │
                          │  expects {success, data,     │
                          │           meta} envelope     │
                          └──────────────┬──────────────┘
                                         │ HTTP POST /api/trpc/[procedure]
                                         ▼
┌────────────────────────────────────────────────────────────────────┐
│  src/app/api/trpc/[trpc]/route.ts                                  │
│  (Next.js App Router — existing, NOT in scope)                     │
└────────────────────────────────┬───────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────┐
│  src/shared/api/trpc/server.ts                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ initTRPC.create({ errorFormatter })  ← canonical code mapper │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Procedure Tier Hierarchy (middleware chain):                       │
│                                                                     │
│  publicProcedure                                                    │
│    │                                                                │
│    ├── protectedProcedure  (Step 1: session check)                 │
│    │     │                                                          │
│    │     ├── tenantProcedure  (Step 2: tenantId non-null)          │
│    │     │     │                                                    │
│    │     │     ├── privilegedProcedure  (Step 3: role check)       │
│    │     │     │     └── [Steps 4-5 MISSING: suspension, feature]  │
│    │     │     │                                                    │
│    │     │     ├── adminProcedure  (Step 3: ADMIN/BOARD)           │
│    │     │     └── agentProcedure  (Step 3: AGENT/ADMIN/BOARD)    │
│    │     │                                                          │
│    │     └── rateLimitMiddleware  (rate limiting, if configured)   │
│    │                                                                │
│    └── [no auth required]                                          │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────┐
│  src/server/routers/{identity,content,chat,...}.ts                 │
│  (20 router files, each defining procedures)                        │
│                                                                     │
│  Current state: ALL routers use protectedProcedure/adminProcedure  │
│  directly. NONE use tenantProcedure or privilegedProcedure.         │
│                                                                     │
│  Migration target: Every router adopts tenantProcedure for          │
│  tenant-scoped ops, privilegedProcedure for staff/admin ops.        │
│                                                                     │
│  Per-procedure pattern (already in identity.ts):                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ .input(z.object({...}))                                      │  │
│  │ .output(toEnvelopeSchema(z.object({...})))                   │  │
│  │ .query(async ({ ctx }) => {                                  │  │
│  │   const rows = await ctx.db.select()...                      │  │
│  │   return toEnvelope({ items: rows.map(r => dto.parse(r)) });│  │
│  │ })                                                            │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────┐
│  src/server/dto/{identity,content,chat,...}.ts                      │
│  (11 DTO files, drizzle-zod createSelectSchema + .pick())          │
│                                                                     │
│  DTO derivation: Drizzle table → createSelectSchema → .pick()      │
│  → .extend() → z.infer<typeof dto> → type-safe DTO                 │
│                                                                     │
│  Coverage gap: disputes.ts and resources.ts DTO files are           │
│  missing. Disputes uses dispute-related models, resources uses      │
│  resources table — need dedicated DTO files or inclusion in         │
│  existing files.                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
src/
├── shared/api/trpc/server.ts     # ← Wave 1: errorFormatter wiring, suspension middleware
├── shared/api/envelope.ts        # ← Already has TRPC_TO_CANONICAL, toEnvelope, tRPCCodeToCanonical
├── shared/api/api-response.ts    # ← Already has ERROR_CODES, apiSuccess, apiError (REST only)
├── shared/api/auth-utils.ts      # ← Already has requireNotSuspended(), getSessionAndRole()
├── server/
│   ├── dto/                      # ← Wave 2: EXISTS (11 files). Add disputes.ts, resources.ts
│   │   ├── index.ts              #   Barrel re-exports
│   │   ├── identity.ts           #   User, Property, Profile, Album, Seat, PremiumSeat
│   │   ├── content.ts            #   Content, Announcement
│   │   ├── chat.ts               #   Conversation, Message
│   │   ├── marketplace.ts        #   Listing, Review, ServiceBooking
│   │   ├── maintenance.ts        #   MaintenanceRequest
│   │   ├── dwallet.ts            #   Wallet, Transaction, Consent, Payout
│   │   ├── surveys.ts            #   Survey, Question, Response
│   │   ├── misc.ts               #   Event, Booking, Group, Merit, Notification
│   │   ├── more.ts               #   Achievement, Invitation, Setting, AgentProfile
│   │   ├── disputes.ts           #   ← NEEDED (Dispute, DisputeEvent, DisputeMessage)
│   │   └── resources.ts          #   ← NEEDED (Resource)
│   └── routers/                  # ← Wave 3: Migrate 20 routers
│       ├── identity.ts           #   1835 lines — largest; already uses toEnvelope + some DTOs
│       ├── content.ts            #   1055 lines — uses toEnvelope + DTOs
│       ├── chat/                 #   3 sub-routers
│       ├── marketplace/          #   6 sub-routers
│       ├── maintenance/          #   5 sub-routers
│       ├── surveys/              #   5 sub-routers
│       ├── competitions.ts
│       ├── events.ts
│       ├── bookings.ts
│       ├── groups.ts
│       ├── merits.ts
│       ├── notifications.ts
│       ├── achievements.ts
│       ├── invitations.ts
│       ├── settings.ts
│       ├── agents.ts
│       ├── disputes.ts
│       ├── dwallet.ts
│       └── resources.ts
└── docs/STEERING/
    ├── API.md                    # ← Wave 4: Update with completion status
    └── API_ARCHITECT.md          # ← Wave 4: Update procedure tiers documentation
```

### Pattern 1: tRPC ErrorFormatter for Canonical Code Rewriting

**What:** The `errorFormatter` callback in `initTRPC.create()` receives `{ shape, error }` and can rewrite `shape.data.code` before it reaches the client. This is where the `TRPC_TO_CANONICAL` mapping table should be wired.

**When to use:** Apply once in `src/shared/api/trpc/server.ts` — all 20 routers and all procedures inherit it automatically.

**Example:**

```typescript
// Source: trpc.io/docs/server/error-formatting (official docs)
// Adapted for netcomplex canonical codes
import { TRPC_TO_CANONICAL, tRPCCodeToCanonical } from '../envelope';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // Rewrite tRPC native code → canonical code
    const canonicalCode = tRPCCodeToCanonical(error.code);
    return {
      ...shape,
      data: {
        ...shape.data,
        code: canonicalCode, // ← canonical code replaces native code
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

### Pattern 2: Suspension Check Middleware

**What:** Extend `privilegedProcedure` (and optionally `protectedProcedure`) with a suspension check that queries `platformSuspensions` for the current user and throws `TRPCError` if suspended.

**When to use:** Add to `privilegedProcedure` (staff-facing) and optionally `protectedProcedure` (all authenticated). Current routers using `adminProcedure` should migrate to `privilegedProcedure` to inherit this check.

**Example:**

```typescript
// Source: existing requireNotSuspended() in auth-utils.ts + tRPC middleware docs
import { db, platformSuspensions, users } from '../db';
import { eq, and, or, isNull } from 'drizzle-orm';

export const suspensionMiddleware = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) return next({ ctx }); // publicProcedure passes through
  const [suspension] = await ctx.db
    .select({ id: platformSuspensions.id })
    .from(platformSuspensions)
    .where(
      and(
        eq(platformSuspensions.userId, ctx.userId),
        eq(platformSuspensions.isActive, true),
        // Check if not expired
        or(isNull(platformSuspensions.endDate), sql`${platformSuspensions.endDate} > NOW()`)
      )
    )
    .limit(1);
  if (suspension) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'SUSPENDED_USER', // ← signal for errorFormatter to rewrite
    });
  }
  return next({ ctx });
});
```

### Pattern 3: DTO Mapping with drizzle-zod

**What:** Derive Zod schemas from Drizzle table definitions using `createSelectSchema()`, then `.pick()` only the fields to expose, adding `.extend()` for computed/joined fields. The existing DTO files at `src/server/dto/*.ts` all follow this pattern.

**Example:**

```typescript
// Source: existing pattern in src/server/dto/marketplace.ts (verified codebase)
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { communityServiceListings } from '@/db/schema/community-service-listings';

const dateSchema = z.date().transform(d => d.toISOString());

export const listingDto = createSelectSchema(communityServiceListings, {
  price: z.coerce.number().nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
})
  .pick({
    id: true,
    providerId: true,
    title: true,
    description: true,
    category: true,
    // ... only fields safe for external exposure
  })
  .extend({
    provider: z.object({ id: z.string(), name: z.string() }).nullable().optional(),
  });

export type ListingDto = z.infer<typeof listingDto>;
```

### Anti-Patterns to Avoid

- **Per-procedure inline Zod schemas (instead of DTOs):** Routers like identity.ts define 15+ inline Zod schemas (`propertySchema`, `householdSchema`, `profileSchema`, etc.) that duplicate the DTO layer. This creates maintenance burden — two places to update when a column changes. Use the DTO from `@server/dto` instead.
- **Returning raw Drizzle rows without DTO mapping:** Governance Rule 6 mandates DTO mapping. Raw `InferSelectModel` returns leak internal database structure to clients. Always parse through a DTO: `dto.parse(dbRow)`.
- **Using `adminProcedure` when `privilegedProcedure` is more appropriate:** `adminProcedure` excludes COMMITTEE role. `privilegedProcedure` includes ADMIN, BOARD, and COMMITTEE. Most admin endpoints should use `privilegedProcedure` per the API classification table.
- **Throwing TRPCError without considering the errorFormatter:** The `errorFormatter` will rewrite ALL error codes through `TRPC_TO_CANONICAL`. If you need a specific canonical code not in the mapping table, add it to the table.
- **Using `protectedProcedure` for tenant-scoped endpoints:** 0 routers currently use `tenantProcedure`. All tenant-scoped procedures should migrate from `protectedProcedure` to `tenantProcedure` for consistent tenantId enforcement.

## Don't Hand-Roll

| Problem                             | Don't Build                                 | Use Instead                             | Why                                                                                                                                                                          |
| ----------------------------------- | ------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deriving Zod schemas from DB tables | Manual Zod schema definitions               | `drizzle-zod` `createSelectSchema()`    | Already in use across 11 DTO files. Manual schemas drift from the database schema. `createSelectSchema()` auto-derives types, `.pick()` selects exposed fields.              |
| Canonical error code mapping        | Per-procedure code rewriting                | `errorFormatter` in `initTRPC.create()` | tRPC v11's `errorFormatter` is the standard mechanism. It runs on every error globally. Per-procedure rewriting is redundant and error-prone.                                |
| Response envelope wrapping          | Custom response transformer                 | Per-procedure `toEnvelope(data)`        | tRPC v11 has NO middleware-level success-response transformation API. Each procedure must wrap its return value. `toEnvelope()` already exists and is the canonical wrapper. |
| Suspension check per-procedure      | Inline suspension queries in each procedure | Middleware on `privilegedProcedure`     | `requireNotSuspended()` already exists in `auth-utils.ts`. Adding it as middleware ensures consistent enforcement across all staff endpoints.                                |
| OpenAPI spec generation             | Hand-written OpenAPI YAML                   | `@trpc/openapi` + `.meta({ openapi })`  | Already installed. `.meta()` declarations on procedures auto-generate the spec. Hand-written specs drift.                                                                    |

**Key insight:** The infrastructure for all 4 waves already exists — it's just not wired together. The phase is about integration, not greenfield development.

## Current State: Plan vs. Reality

### Wave 1: Foundation

| Task                                | PLAN.md Expectation | Actual State                                                                                                                                      | Action Needed                                                                                                                                      |
| ----------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 `ApiEnvelope` types + helpers   | Create new          | ✅ EXISTS: `src/shared/api/envelope.ts` with `ApiEnvelope<T>`, `toEnvelope()`, `toErrorEnvelope()`, `toPaginatedEnvelope()`, `toEnvelopeSchema()` | None — verify it's re-exported from `@api/server` barrel (confirmed: line 161-167)                                                                 |
| 1.2 Canonical error mapper          | Create new          | ✅ EXISTS: `TRPC_TO_CANONICAL` + `tRPCCodeToCanonical()` in envelope.ts:61-78                                                                     | WIRE IT: Not called from `errorFormatter` in `server.ts:65-74`. Need to add `tRPCCodeToCanonical()` call in errorFormatter.                        |
| 1.3 `tenantProcedure` tier          | Create new          | ✅ EXISTS: `server.ts:119-127` — asserts non-null tenantId                                                                                        | EXTEND: Add suspension check. Currently only checks `ctx.tenantId !== null`.                                                                       |
| 1.4 `privilegedProcedure` tier      | Create new          | ✅ EXISTS: `server.ts:133-141` — checks ADMIN/BOARD/COMMITTEE                                                                                     | EXTEND: Add suspension check. Currently only checks role.                                                                                          |
| 1.5 `authLayerMiddleware` (5 steps) | Create new          | ❌ NOT FORMALIZED: Steps 1-2 in `protectedProcedure`, Step 3 in `adminProcedure`/`privilegedProcedure`, Steps 4-5 MISSING                         | BUILD: Create as middleware or inline in `privilegedProcedure`. Steps 4 (suspension) needed; Step 5 (feature flag) can be deferred per CONTEXT.md. |

### Wave 2: DTO Layer

| Task                                                     | PLAN.md Expectation            | Actual State                                     | Action Needed                                                       |
| -------------------------------------------------------- | ------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------- |
| 2.1 `src/server/dto/` directory + index                  | Create new                     | ✅ EXISTS: 11 DTO files + `index.ts` barrel      | None                                                                |
| 2.2 Identity DTOs                                        | Create new                     | ✅ EXISTS: `identity.ts` (106 lines, 6 DTOs)     | Minor: Verify `userDto` covers all exposed fields                   |
| 2.3 Content DTOs                                         | Create new                     | ✅ EXISTS: `content.ts` (3 DTOs)                 | None                                                                |
| 2.4 Chat DTOs                                            | Create new                     | ✅ EXISTS: `chat.ts` (4 DTOs)                    | None                                                                |
| 2.5 Marketplace DTOs                                     | Create new                     | ✅ EXISTS: `marketplace.ts` (4 DTOs, 123 lines)  | None                                                                |
| 2.6 Maintenance DTOs                                     | Create new                     | ✅ EXISTS: `maintenance.ts` (2 DTOs)             | None                                                                |
| 2.7 dWallet DTOs                                         | Create new                     | ✅ EXISTS: `dwallet.ts` (4 DTOs)                 | None                                                                |
| 2.8 Surveys DTOs                                         | Create new                     | ✅ EXISTS: `surveys.ts` (4 DTOs)                 | None                                                                |
| 2.9 Events, Bookings, Groups, Merits, Notifications DTOs | Create new                     | ✅ EXISTS: `misc.ts` (6 DTOs, 139 lines)         | None                                                                |
| 2.10 Achievements, Invitations, Settings, Agents DTOs    | Create new                     | ✅ EXISTS: `more.ts` (5 DTOs, 84 lines)          | None                                                                |
| — Disputes DTOs                                          | PLAN.md lists disputes in 2.9  | ❌ MISSING: No disputes DTO in index or any file | CREATE: `disputes.ts` with dispute DTOs from dispute-related tables |
| — Resources DTOs                                         | PLAN.md lists resources in 2.9 | ❌ MISSING: No resources DTO in index            | CREATE: `resources.ts` with resource DTO from resources table       |

### Wave 3: Router Migration

| Task                       | PLAN.md Expectation        | Actual State                                                                                                                                                                                                                                                                                                                                                                | Action Needed                                                                                                            |
| -------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 3.1 Identity router        | Migrate to envelope + DTOs | 🟡 PARTIAL: Imports `toEnvelope`, `toEnvelopeSchema`, and DTOs. Uses `toEnvelope()` in all returns. BUT: Defines 15+ inline Zod schemas AND uses `adminProcedure`/`protectedProcedure` (not `tenantProcedure`/`privilegedProcedure`). Still throws native TRPCError codes.                                                                                                  | Replace inline schemas with DTOs; adopt `tenantProcedure`/`privilegedProcedure`; error codes auto-map via errorFormatter |
| 3.2 Content router         | Migrate                    | 🟡 PARTIAL: Imports `toEnvelope`. Uses `protectedProcedure`. Has DTO imports.                                                                                                                                                                                                                                                                                               | Replace inline schemas; adopt procedure tiers                                                                            |
| 3.3-3.10 All other routers | Migrate                    | ❌ NOT STARTED: 0 routers use `tenantProcedure`/`privilegedProcedure`. Some import `toEnvelope` (achievements, events, bookings, groups, invitations, merits, notifications, settings, agents, chat sub-routers, marketplace sub-routers, maintenance sub-routers) but none apply it consistently. Competitions and resources routers import NEITHER `toEnvelope` nor DTOs. | Full migration: adopt tiers, wire DTOs, use `toEnvelope()`, remove inline schemas                                        |

### Wave 4: Classification + OpenAPI

| Task                       | PLAN.md Expectation                   | Actual State                                                                                             | Action Needed                                             |
| -------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 4.1 JSDoc tags             | Add `@public`/`@tenant`/`@privileged` | ❌ NOT STARTED                                                                                           | Add to all 20 routers after Wave 3 migration              |
| 4.2 OpenAPI `.meta()`      | Add to surveys/external.ts            | 🟡 PARTIAL: Some procedures in identity.ts have `.meta({ openapi })`. `surveys/external.ts` may have it. | Audit and complete                                        |
| 4.3 Governance docs update | Update `docs/STEERING/`               | ❌ NOT STARTED                                                                                           | Update API.md and API_ARCHITECT.md with completion status |

### Summary: What's Already Done vs. Still Needed

**ALREADY DONE (by pre-PLAN.md work):**

- ✅ All Wave 1 procedure tier definitions (`tenantProcedure`, `privilegedProcedure`, `adminProcedure`, `agentProcedure`)
- ✅ All Wave 1 response envelope types and helpers (`ApiEnvelope<T>`, `toEnvelope()`, `toErrorEnvelope()`, `toPaginatedEnvelope()`, `toEnvelopeSchema()`)
- ✅ Canonical error code constants (`ERROR_CODES`) and mapping table (`TRPC_TO_CANONICAL`)
- ✅ All Wave 2 DTO files (11 files covering 18 domain entities)
- ✅ Error code → canonical code helper (`tRPCCodeToCanonical()`)
- ✅ Suspension check utilities (`requireNotSuspended()`, `throwIfSuspended()` in `auth-utils.ts`)
- ✅ Barrel exports from `@api/server` (includes all procedure tiers and envelope helpers)
- ✅ Per-procedure `toEnvelope()` adoption in ~7 router files (identity, content, achievements, events, bookings, groups, invitations, merits, notifications, settings, agents, chat sub-routers, marketplace sub-routers, maintenance sub-routers)

**STILL NEEDED (the actual work of this phase):**

1. **Wire errorFormatter** — Call `tRPCCodeToCanonical()` in `server.ts:65-74` errorFormatter to rewrite codes globally
2. **Add suspension check** — Wire `requireNotSuspended()` logic into `privilegedProcedure` (and optionally `protectedProcedure`) as middleware
3. **Create 2 missing DTO files** — `disputes.ts` and `resources.ts` with drizzle-zod patterns
4. **Migrate all 20 routers** — Replace `protectedProcedure`→`tenantProcedure`, `adminProcedure`→`privilegedProcedure`, adopt DTOs instead of inline schemas, enforce `toEnvelope()` on all returns
5. **Add classification JSDoc tags** — `@public`/`@tenant`/`@privileged` on all procedures
6. **Update governance docs** — Mark completion in API.md, API_ARCHITECT.md

## Runtime State Inventory

> Not applicable — this is a code/infrastructure hardening phase, not a rename/refactor/migration. No runtime state changes are required. Database schema is unchanged. REST routes are unchanged.

## Common Pitfalls

### Pitfall 1: ErrorFormatter Timing — Must Be in `initTRPC.create()`, Not `onError`

**What goes wrong:** Adding canonical code mapping to `onError` instead of `errorFormatter`. The `onError` callback is for side effects (logging, reporting) and its return value is ignored. `errorFormatter` is the only mechanism that can rewrite the error shape sent to the client.
**Why it happens:** The names are confusing — both receive errors. The tRPC docs title `onError` as "Handling errors" while `errorFormatter` is "Error Formatting." Only `errorFormatter` actually changes the response.
**How to avoid:** `errorFormatter` is passed to `initTRPC.create({ errorFormatter })`. `onError` is passed to `createHTTPServer({ onError })` or the Next.js adapter — do NOT use for code rewriting.
**Warning signs:** Error codes still showing as `UNAUTHORIZED` instead of `AUTH_REQUIRED` after adding mapping logic to `onError`.

### Pitfall 2: Zod v3 vs v4 Import Mismatch

**What goes wrong:** DTO files use `import { z } from 'zod/v4'` while router files use `import { z } from 'zod'`. Mixing `zod/v4` schemas with `zod` (v3) types in the same `.output()` declaration causes type errors.
**Why it happens:** The project migrated some files to Zod v4 but routers still reference Zod v3 types. DTOs are v4, inline schemas are v3.
**How to avoid:** When migrating routers to use DTOs, the `.output(toEnvelopeSchema(dto))` will use v4 schemas. Ensure router files don't mix v3 and v4 in the same procedure. Prefer `zod/v4` going forward.
**Warning signs:** TypeScript errors like `Type 'ZodObject<...>' is not assignable to type 'ZodType<...>'` after importing DTOs.

### Pitfall 3: Inline Zod Schemas NOT Replaced After DTO Import

**What goes wrong:** identity.ts already imports DTOs (`propertyDto`, `userDto`) but also defines 15+ inline Zod schemas (`propertySchema`, `userSchema`, etc.) that are used in `.output()` declarations. The DTOs are imported but not actually used.
**Why it happens:** The DTOs were added as a separate Wave 2 task after the routers were written. No migration step was performed to replace inline schemas.
**How to avoid:** During Wave 3 router migration, systematically replace every inline Zod schema with the corresponding DTO from `@server/dto`. Delete the inline schemas.
**Warning signs:** Grepping for `= z.object({` in router files after migration — there should be none except for input schemas.

### Pitfall 4: `adminProcedure` vs `privilegedProcedure` Confusion

**What goes wrong:** Routers use `adminProcedure` (ADMIN/BOARD only) for endpoints that should include COMMITTEE members. Per `API.md` §4, `PRIVILEGED` classification includes "Tenant staff/admin/moderator" which maps to COMMITTEE role as well.
**Why it happens:** `adminProcedure` predates `privilegedProcedure` and was the only elevated tier available when routers were written.
**How to avoid:** During Wave 3 migration, audit each `adminProcedure` usage: if COMMITTEE members should access it → use `privilegedProcedure`. If truly ADMIN/BOARD only → keep `adminProcedure` but add comment.
**Warning signs:** Committee members reporting "Forbidden" on endpoints they should be able to access.

### Pitfall 5: Frontend tRPC Client Shape Mismatch

**What goes wrong:** After Wave 3 migration, all tRPC responses will include the `{success, data, meta}` envelope shape. Frontend components that destructure responses directly (e.g., `const { items } = trpc.identity.listProperties.useQuery()`) will break because `items` is now nested under `data`.
**Why it happens:** The envelope adds one level of nesting. The frontend tRPC client's type inference will change from `T` to `ApiEnvelope<T>`.
**How to avoid:** Per CONTEXT.md deferred item, this may be deferred to a separate BD issue. Two mitigation options: (a) update all frontend tRPC call sites to destructure `.data`, or (b) add a tRPC client-side transformer that unwraps the envelope. Option (a) is more explicit and recommended. The identity router already returns envelope-wrapped responses and the frontend already handles this for those procedures.
**Warning signs:** Runtime errors like `Cannot read properties of undefined (reading 'map')` because the frontend expects `data.items` but gets `data.data.items`.

## Code Examples

### Wiring Canonical Error Codes in errorFormatter

```typescript
// Source: trpc.io/docs/server/error-formatting (official docs) + existing codebase pattern
// File: src/shared/api/trpc/server.ts (modify existing errorFormatter at lines 65-74)

import { tRPCCodeToCanonical } from '../envelope';
import { TRPCError } from '@trpc/server';
// SUSPENDED_USER: use TRPCError message as signal
// FEATURE_DISABLED: use TRPCError message as signal

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // Determine canonical code — check for special message signals first
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

### Suspension Check Middleware for privilegedProcedure

```typescript
// Source: existing requireNotSuspended() in auth-utils.ts + tRPC middleware pattern
// File: src/shared/api/trpc/server.ts (add before privilegedProcedure definition)
import { db, platformSuspensions } from '../db';
import { eq, and, or, isNull, gt } from 'drizzle-orm';

async function checkNotSuspended(ctx: { userId: string; tenantId: string | null; db: typeof db }) {
  if (!ctx.userId || !ctx.tenantId) return; // no-op for non-tenant contexts

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
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'SUSPENDED_USER', // ← signal for errorFormatter
    });
  }
}

// Then in privilegedProcedure, add the check:
export const privilegedProcedure = tenantProcedure.use(async ({ ctx, next }) => {
  // Step 3: Role check (existing)
  if (ctx.role !== 'ADMIN' && ctx.role !== 'BOARD' && ctx.role !== 'COMMITTEE') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Privileged access required',
    });
  }
  // Step 4: Suspension check (NEW)
  await checkNotSuspended(ctx);
  return next({ ctx });
});
```

### Migrating a Router Procedure: Before → After

```typescript
// BEFORE (current pattern in most routers — identity.ts line 218-261):
listProperties: adminProcedure                              // ❌ adminProcedure
  .meta({ openapi: { method: 'GET', path: '/identity/properties', ... } })
  .input(z.object({ search: z.string().optional(), page: z.number().min(1).default(1), ... }).optional())
  .output(toEnvelopeSchema(z.object({                       // ❌ inline schema
    properties: z.array(z.object({ id: z.string(), ... })),  // ❌ manual Zod definition
    total: z.number(),
  })))
  .query(async ({ input }) => {
    const rows = await db.select().from(properties)...       // ❌ raw Drizzle rows
    return toEnvelope({ properties: rows, ... });            // ✅ envelope wrapping
  }),

// AFTER (migration target):
listProperties: privilegedProcedure                          // ✅ correct tier (includes COMMITTEE)
  .meta({ openapi: { method: 'GET', ... } })
  .input(z.object({ search: z.string().optional(), ... }).optional())
  .output(toEnvelopeSchema(z.object({
    properties: z.array(propertyDto)                         // ✅ DTO from @server/dto
      .transform(arr => arr.map(p => propertyDto.parse(p))),
    total: z.number(),
  })))
  .query(async ({ ctx, input }) => {
    const rows = await ctx.db.select().from(properties)...   // ✅ ctx.db (tenant-scoped context)
    return toEnvelope({                                      // ✅ envelope wrapping
      properties: rows.map(r => propertyDto.parse(r)),      // ✅ DTO mapping
      total: rows.length,
    });
  }),
```

## State of the Art

| Old Approach                                            | Current Approach                                                                                                                | When Changed | Impact                                         |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------------------------------------------- |
| `protectedProcedure` for all authenticated endpoints    | `tenantProcedure` for tenant-scoped, `privilegedProcedure` for staff, `protectedProcedure` only for cross-tenant or user-scoped | Phase 120    | All 20 routers must audited and migrated       |
| tRPC native error codes (`UNAUTHORIZED`, `BAD_REQUEST`) | Canonical error codes (`AUTH_REQUIRED`, `VALIDATION_ERROR`) via `errorFormatter`                                                | Phase 120    | Client error handling must use canonical codes |
| Inline Zod schemas in each router file                  | Shared DTOs from `src/server/dto/` derived from Drizzle tables via `drizzle-zod`                                                | Phase 120    | Single source of truth; zero schema drift      |
| Raw `InferSelectModel` returns                          | DTO-mapped responses via `dto.parse(row)`                                                                                       | Phase 120    | API contract stability; DB evolution isolation |
| `adminProcedure` (excludes COMMITTEE)                   | `privilegedProcedure` (includes COMMITTEE) for staff endpoints                                                                  | Phase 120    | Correct role coverage per API classification   |
| No suspension checks in tRPC middleware                 | Suspension check in `privilegedProcedure`                                                                                       | Phase 120    | Suspended staff/users blocked at API layer     |

**Deprecated/outdated:**

- **`adminProcedure` for COMMITTEE-accessible endpoints:** Use `privilegedProcedure` instead. `adminProcedure` should only be used where COMMITTEE is explicitly excluded.
- **Hardcoded TRPCError message-based code signals:** The `SUSPENDED_USER` and `FEATURE_DISABLED` detection via `error.message` string matching works but is fragile. Future improvement: use a custom `TRPCError` subclass or `cause` field. For Phase 120 scope, message matching is acceptable per existing patterns.

## Assumptions Log

| #   | Claim                                                                                                                                   | Section                         | Risk if Wrong                                                                                                                                                                                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | tRPC v11 has no built-in success-response transformation middleware — each procedure must wrap its own return value with `toEnvelope()` | Architecture Patterns           | If tRPC v11 adds a `mapResponse`/`formatResponse` API, we could simplify Wave 3 by applying it globally instead of per-procedure. Current docs confirm no such API exists.                                |
| A2  | The `error.message === 'SUSPENDED_USER'` pattern for signaling canonical codes to the errorFormatter is acceptable                      | Code Examples                   | If tRPC changes how error messages are serialized or if message-based checks become unreliable, a custom approach (TRPCError subclass) would be needed. Existing codebase uses similar patterns.          |
| A3  | Frontend tRPC clients already handle envelope-wrapped responses for identity router procedures                                          | Common Pitfalls                 | If frontend code bypasses envelope shape for some procedures, Wave 3 migration will cause runtime errors. Need to verify frontend consumption patterns during Wave 3.                                     |
| A4  | Disputes and resources DTOs can follow the same drizzle-zod pattern as existing DTOs                                                    | Current State: Plan vs. Reality | If disputes or resources tables have unusual column types that `createSelectSchema()` can't handle, manual Zod schemas may be needed. Risk is LOW — all other domain entities work fine with drizzle-zod. |
| A5  | The feature flag check (Step 5) can be deferred to a separate BD issue                                                                  | Common Pitfalls                 | If the feature flag check must ship with this phase (not deferred per CONTEXT.md), additional middleware is needed. CONTEXT.md explicitly defers it.                                                      |

## Open Questions

1. **Should `protectedProcedure` also get the suspension check?**
   - What we know: `privilegedProcedure` will get it (staff-facing). `requireNotSuspended()` currently exists only for REST routes.
   - What's unclear: Whether ALL authenticated users (not just staff) should be blocked by suspension at the tRPC layer.
   - Recommendation: Follow existing pattern — suspension only blocks at `privilegedProcedure` level for now, matching REST routes which check suspension at the handler level for admin routes.

2. **Should `tenantProcedure` add tenant membership validation beyond null check?**
   - What we know: Currently `tenantProcedure` only checks `ctx.tenantId !== null`. API.md Rule 7.1 says "resolve tenant from middleware/context" and "reject cross-tenant access."
   - What's unclear: Whether the existing `tenantId` from context (sourced from auth + DB lookup) is sufficient or whether an additional DB query to verify membership is needed.
   - Recommendation: The context already resolves `tenantId` from the user's `users.tenantId` column. This is sufficient. No additional membership check needed unless the data model supports multi-tenant users (it doesn't currently).

3. **Should inline `.output()` schemas be deleted or kept as documentation?**
   - What we know: identity.ts has 15+ inline Zod schemas that duplicate DTOs. The guidance says "replace with DTOs."
   - What's unclear: Whether to delete inline schemas entirely (clean slate) or keep them with deprecation comments (gradual migration).
   - Recommendation: Delete inline schemas during migration. The DTOs are the canonical source of truth. Keeping both creates maintenance burden and confusion about which is authoritative.

## Environment Availability

| Dependency          | Required By                | Available               | Version | Fallback |
| ------------------- | -------------------------- | ----------------------- | ------- | -------- |
| Node.js             | All TypeScript compilation | ✓ (assumed)             | ≥18     | —        |
| pnpm                | Package management         | ✓ (project uses it)     | —       | —        |
| TypeScript          | Type checking              | ✓ (installed)           | —       | —        |
| PostgreSQL/Supabase | Suspension checks query DB | ✓ (existing project DB) | —       | —        |

**Missing dependencies with no fallback:** None — all dependencies are pre-existing project dependencies.
**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework

| Property           | Value                                                            |
| ------------------ | ---------------------------------------------------------------- |
| Framework          | Vitest (project standard)                                        |
| Config file        | `vitest.config.ts` (project root)                                |
| Quick run command  | `pnpm vitest run src/shared/api/trpc/__tests__/` (new test file) |
| Full suite command | `pnpm test`                                                      |

### Phase Requirements → Test Map

| Req ID | Behavior                                                       | Test Type   | Automated Command                                       | File Exists?                                         |
| ------ | -------------------------------------------------------------- | ----------- | ------------------------------------------------------- | ---------------------------------------------------- |
| GOV-01 | All tRPC responses use `{success, data, meta}` envelope        | unit        | `pnpm vitest run src/test/api/trpc-envelope.test.ts`    | ❌ Wave 0 — create as part of infrastructure testing |
| GOV-02 | All tRPC errors use canonical codes via errorFormatter         | unit        | `pnpm vitest run src/test/api/trpc-error-codes.test.ts` | ❌ Wave 0                                            |
| GOV-03 | No raw Drizzle rows; all outputs mapped through DTO            | integration | `pnpm vitest run src/test/api/trpc-dto-mapping.test.ts` | ❌ Wave 0                                            |
| GOV-04 | `tenantProcedure` enforces session + tenant membership         | unit        | `pnpm vitest run src/test/api/trpc-procedures.test.ts`  | ❌ Wave 0                                            |
| GOV-05 | `privilegedProcedure` enforces tenant + role + suspension      | unit        | `pnpm vitest run src/test/api/trpc-procedures.test.ts`  | ❌ Wave 0                                            |
| GOV-06 | 5-step auth middleware formalized                              | unit        | Same as GOV-04/05 test file                             | ❌ Wave 0                                            |
| GOV-07 | `@public`/`@tenant`/`@privileged` JSDoc tags on all procedures | lint        | `pnpm lint` (ESLint rule TBD)                           | ❌ Wave 0                                            |
| GOV-08 | OpenAPI `.meta()` on external procedures                       | integration | `pnpm redocly lint` after Wave 4                        | ❌ Wave 0                                            |

### Sampling Rate

- **Per task commit:** `pnpm vitest run src/test/api/ --reporter=verbose` (scoped to API test files)
- **Per wave merge:** `pnpm tsc --noEmit && pnpm lint && pnpm test`
- **Phase gate:** Full suite green + `redocly lint` passes + 3 random procedure manual checks per wave

### Wave 0 Gaps

- ❌ `src/test/api/trpc-envelope.test.ts` — tests GOV-01 (envelope shape on success responses)
- ❌ `src/test/api/trpc-error-codes.test.ts` — tests GOV-02 (errorFormatter rewrites codes)
- ❌ `src/test/api/trpc-procedures.test.ts` — tests GOV-04/05/06 (procedure tier enforcement, suspension)
- ❌ `src/test/api/trpc-dto-mapping.test.ts` — tests GOV-03 (DTO validation on responses)
- ❌ ESLint rule for JSDoc tags — needed for GOV-07 enforcement
- ❌ Test infrastructure for tRPC procedure testing — needs `createCallerFactory` pattern setup

## Security Domain

### Applicable ASVS Categories

| ASVS Category         | Applies | Standard Control                                                                                                                      |
| --------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| V2 Authentication     | yes     | Better Auth session via `protectedProcedure`; Step 1 of auth middleware                                                               |
| V3 Session Management | yes     | Session validated in `createContext()`; auth cookies via Better Auth                                                                  |
| V4 Access Control     | yes     | Role-based via `privilegedProcedure`/`adminProcedure`/`agentProcedure`; Step 3 of auth middleware. Suspension enforcement via Step 4. |
| V5 Input Validation   | yes     | Zod schemas on all `.input()` declarations; drizzle-zod DTOs on all responses                                                         |
| V6 Cryptography       | no      | No cryptographic operations in this phase                                                                                             |
| V7 Error Handling     | yes     | Canonical error codes via `errorFormatter`; no stack traces in production                                                             |
| V8 Data Protection    | yes     | DTO mapping ensures internal DB structure is not exposed to clients (Rule 6)                                                          |
| V13 API Security      | yes     | Rate limiting middleware, tenant isolation via `tenantProcedure`, canonical response envelope                                         |

### Known Threat Patterns for tRPC + Next.js

| Pattern                                        | STRIDE                 | Standard Mitigation                                                                                 |
| ---------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| Cross-tenant data access (tenantId spoofing)   | Spoofing               | `tenantProcedure` enforces tenantId from context (server-resolved, not client-provided)             |
| Suspended user accessing API                   | Elevation of Privilege | Suspension check in `privilegedProcedure` middleware (Step 4)                                       |
| Information disclosure via raw DB rows         | Information Disclosure | DTO mapping via `drizzle-zod` `.pick()` — only safe fields exposed                                  |
| Error message leaking internal state           | Information Disclosure | `errorFormatter` strips stack traces in production; canonical codes prevent internal detail leakage |
| Missing auth on admin endpoints                | Elevation of Privilege | All 20 routers audited for correct procedure tier usage                                             |
| Invalid input bypassing validation             | Tampering              | Zod `.input()` on every procedure; no procedure should lack `.input()`                              |
| Response shape inconsistency confusing clients | Denial of Service      | Standardized `{success, data, meta}` envelope on all responses                                      |

## Sources

### Primary (HIGH confidence — verified in codebase)

- `src/shared/api/trpc/server.ts:1-154` — Existing procedure tiers, errorFormatter, context, middleware patterns
- `src/shared/api/envelope.ts:1-78` — ApiEnvelope types, toEnvelope helpers, TRPC_TO_CANONICAL mapping
- `src/shared/api/api-response.ts:1-158` — ERROR_CODES constants, ApiSuccessResponse, apiSuccess/apiError REST helpers
- `src/shared/api/auth-utils.ts:1-225` — getSessionAndRole, requireNotSuspended, throwIfSuspended
- `src/shared/api/server/index.ts:1-219` — Barrel exports confirming all procedure tiers and helpers exported
- `src/server/dto/*.ts` (11 files) — Existing DTO patterns with drizzle-zod createSelectSchema
- `src/server/routers/identity.ts:1-1848` — Current router pattern (envelope wrapping + inline schemas)
- `src/server/routers/index.ts:1-46` — AppRouter composition (20 routers)
- `docs/STEERING/API.md` — API Governance Standard (Rules 4, 5, 6, 7, §11, §12, §14, §15)
- `docs/STEERING/API_ARCHITECT.md` — tRPC implementation guide, procedure hierarchy, testing requirements
- Package versions verified on npm: `@trpc/server@11.17.0`, `drizzle-zod@0.8.3`, `zod@4.4.3`

### Secondary (MEDIUM confidence — official docs via Context7)

- [CITED: trpc.io/docs/server/error-formatting] — `errorFormatter` API: receives `{ shape, error }`, can rewrite `shape.data.code`
- [CITED: trpc.io/docs/server/error-handling] — tRPC error codes, TRPCError class, `onError` for side effects only
- [CITED: trpc.io/docs/server/middlewares] — `.use()` chaining, context extension, `.concat()` for reuse, logging middleware pattern

### Tertiary (LOW confidence)

- [ASSUMED] Brave web search results for tRPC patterns — supplementary context only; official docs are primary source

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — All packages already installed, versions verified on npm registry, patterns confirmed in codebase
- Architecture: HIGH — Existing procedure tiers and DTO layer confirmed in codebase; only wiring/integration needed
- Pitfalls: HIGH — Derived from tRPC v11 official docs errorFormatter vs onError distinction, verified Zod v3/v4 import patterns in codebase
- Current state assessment: HIGH — Direct codebase inspection of all 20 routers, 11 DTO files, barrel exports, and infrastructure files

**Research date:** 2026-06-30
**Valid until:** 2026-07-30 (stable — tRPC v11 API is well-established; phase involves integration of existing infrastructure, not new APIs)
