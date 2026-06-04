# Phase 43: M4.5 Blockers - Research

**Researched:** 2026-06-04
**Domain:** Multi-tenant stabilization — fixing 5 BD issues that would surface as P0/P1 incidents during the 7-day M4.5 production soak
**Confidence:** MEDIUM-HIGH (most stack and patterns verified; package compatibility confirmed via npm; some integration details LOW until execution)

## Summary

Phase 43 must close 5 BD issues that would otherwise surface as incidents during the 7-day M4.5 production soak: a MyHomeSpace data-shape bug (cs5), a broken Prisma seed (tc4), an incomplete 80-route cross-tenant audit (e0w), missing RLS enforcement via `runWithRLS()` on admin routes (oqw), and a missing request-validation plugin for Better Auth (ltn). The blockers span 4 different concerns — data shape, seed correctness, audit infrastructure, RLS defense-in-depth, and input validation — and have no shared code surface, so they can be parallelized cleanly into 4-5 plans.

The critical insight is that three of the five blockers are **defense-in-depth / soak-readiness** work that the project has consciously deferred (RLS on routes, request validation, full 80-route audit) rather than core feature bugs. The MyHomeSpace bug (cs5) is the only true "user-facing production incident" risk. The seed bug (tc4) is real but only blocks `npx prisma db seed`; the actual seed used by the project's `pnpm db:seed` script (`scripts/seed-drizzle.ts`) is already correct.

**Primary recommendation:** Split into 4-5 small, focused plans. Execute in order: seed fix (fastest, unblocks soak startup) → MyHomeSpace data shape (highest user-impact) → 80-route audit (largest scope, do early) → RLS wrapping (defense-in-depth, do after audit to avoid rework) → Better Auth validation plugin (orthogonal, do last). Use git worktree isolation per the AGENTS.md mandate.

## Architectural Responsibility Map

| Capability                          | Primary Tier                    | Secondary Tier                     | Rationale                                                                                                                               |
| ----------------------------------- | ------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| MyHomeSpace property link (cs5)     | API/Backend (`/api/users/[id]`) | Browser/Client (`MyHomeSpace.tsx`) | API returns the data; client renders it. Bug is a query/data shape issue, not a UI bug. UI gracefully handles `property: null` already. |
| Prisma seed correctness (tc4)       | Database/Storage (seed script)  | —                                  | Pure data layer — must match `prisma/schema.prisma` and `src/db/schema/*` (Drizzle).                                                    |
| 80-route cross-tenant audit (e0w)   | API/Backend                     | —                                  | All 88 tenant-scoped routes need query-level tenant filter, not just entry handler.                                                     |
| RLS via `runWithRLS()` (oqw)        | Database/Storage (RLS policies) | API/Backend (route wrapping)       | DB policies exist; routes must call helper to activate them via `SET ROLE`.                                                             |
| Better Auth validation plugin (ltn) | Frontend Server (SSR)           | API/Backend (Better Auth handler)  | Plugin is server-side; `src/shared/api/auth.ts` config is the single integration point.                                                 |

## User Constraints (from CONTEXT.md)

### Locked Decisions

- All 5 BD issues must close (not defer) — phase must be done before M4.5 soak
- `pnpm db:seed` must work end-to-end (validates tc4)
- MyHomeSpace must correctly link user to property (validates cs5)
- All 80 audited routes have `withTenant()` OR a documented RLS escape hatch (validates e0w)
- `runWithRLS()` wraps sensitive routes in `src/app/api/admin/*` (validates oqw)
- Request validation plugin installed and wired to `/api/auth/*` (validates ltn)

### Agent Discretion

None specified in CONTEXT.md — planner can choose plan structure, ordering, and which RLS routes to wrap.

### Deferred Ideas (OUT OF SCOPE)

- M5a/M5b work (Phase 44, 45)
- 7cp (POPIA compliance) + jc1 (cookie management) — deferred to Phase 47 (dWallet)

## Phase Requirements

| ID               | Description                                                                                   | Research Support                                        |
| ---------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| (none specified) | Phase 43 is BD-driven, not requirements-driven. Each plan is anchored to a specific BD issue. | All 5 issues documented below with file-level evidence. |

## Standard Stack

### Core (no new packages required for cs5, tc4, oqw, e0w)

| Tool        | Version    | Purpose                                                           | Why Standard                                                            |
| ----------- | ---------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Drizzle ORM | `^0.45.2`  | All database queries in `src/shared/api/db.ts` and route handlers | Already used; `runWithRLS()` helper lives in `@api/db`                  |
| Better Auth | `^1.5.6`   | Auth server, `src/shared/api/auth.ts`                             | Already used; compatible with validation plugin per peer dep `^1.2.0`   |
| Zod         | `^3.25.76` | All request validation + form schemas                             | Already used; will reuse for validation-better-auth Zod schemas         |
| Prisma      | `5.22.0`   | Schema source of truth (Drizzle generated from it)                | Already used; `prisma/schema.prisma` is the canonical model definitions |

### New Package (ltn only)

| Package                  | Version                      | Peer Dep              | Purpose                                               | slopcheck | Disposition |
| ------------------------ | ---------------------------- | --------------------- | ----------------------------------------------------- | --------- | ----------- |
| `validation-better-auth` | `1.3.4` (latest, 2025-05-13) | `better-auth: ^1.2.0` | Request validation plugin for `/api/auth/*` endpoints | `[OK]`    | Approved    |

**Version verification:** Confirmed via `npm view validation-better-auth version 1.3.4` published 2025-05-13. Compatible with project's `better-auth@^1.5.6` (peer `^1.2.0` allows `1.5.6`).

**Installation (ltn only):**

```bash
pnpm add validation-better-auth
```

No other packages need installation for this phase.

## Package Legitimacy Audit

| Package                  | Registry | Age                     | Source Repo                                           | slopcheck | Disposition |
| ------------------------ | -------- | ----------------------- | ----------------------------------------------------- | --------- | ----------- |
| `validation-better-auth` | npm      | ~13 months (2025-05-13) | https://github.com/Daanish2003/validation-better-auth | [OK]      | Approved    |

**Packages removed due to slopcheck [SLOP] verdict:** None
**Packages flagged as suspicious [SUS]:** None

## Architecture Patterns

### Pattern 1: Better Auth Validator Plugin Wiring (ltn)

**What:** Wire `validation-better-auth` into the existing Better Auth config to validate `/api/auth/sign-up/email`, `/api/auth/sign-in/email`, and other auth endpoints with Zod schemas.

**When to use:** Whenever a public auth endpoint accepts user input that could crash handlers during traffic spikes — which is exactly the failure mode the soak would surface.

**Example** (from [Context7 /daanish2003/validation-better-auth](https://context7.com/daanish2003/validation-better-auth)):

```typescript
// src/shared/api/auth.ts (additions)
import { validator } from 'validation-better-auth';
import { z } from 'zod';

const SignupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(12),
});

const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// In betterAuth() config:
plugins: [
  twoFactor({ issuer: tenantConfig.auth.issuer }),
  organization(),
  bearer(),
  passkey(),
  validator([
    { path: '/sign-up/email', schema: SignupSchema },
    { path: '/sign-in/email', schema: SignInSchema },
  ]),
],
```

**Important:** The plugin is Better Auth 1.2+; project is on 1.5.6. The `path` value is Better Auth's internal route (relative to basePath `/api/auth`), NOT the Next.js route.

### Pattern 2: RLS Transaction Wrapping (oqw)

**What:** Wrap admin route queries in `runWithRLS(ctx, async (tx) => ...)` so that the database `app_user` role is activated for the transaction, enforcing RLS policies. The `getRLSContext(request)` helper derives the context from the session.

**When to use:** Routes that touch the 6 RLS-protected tables (`user`, `session`, `account`, `passkey`, `twoFactor`, `profile`) per ADR-019. The `runWithRLS()` helper already exists at `src/shared/api/db.ts:189-203` and `getRLSContext()` at `src/shared/api/db.ts:209-224`.

**Example** (existing implementation, src/shared/api/db.ts:189-203):

```typescript
export async function runWithRLS<T>(
  ctx: RLSContext,
  fn: (tx: NodePgDatabase<DbSchema>) => Promise<T>
): Promise<T> {
  return getDb().transaction(async tx => {
    await tx.execute(sql`SET ROLE app_user`);
    await tx.execute(sql`SELECT set_config('app.user_id', ${ctx.userId}, true)`);
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${ctx.tenantId}, true)`);
    await tx.execute(sql`SELECT set_config('app.user_role', ${ctx.role}, true)`);
    await tx.execute(
      sql`SELECT set_config('app.is_platform_admin', ${ctx.isPlatformAdmin ? 'true' : 'false'}, true)`
    );
    return fn(tx as unknown as NodePgDatabase<DbSchema>);
  });
}
```

**Usage in a route handler:**

```typescript
import { runWithRLS, getRLSContext, users } from '@api/db';

export async function GET(request: Request) {
  const ctx = await getRLSContext(request);
  if (!ctx) return apiUnauthorized();
  // ctx.userId, ctx.tenantId, ctx.role, ctx.isPlatformAdmin are now set for the tx

  const result = await runWithRLS(ctx, async tx => {
    return tx.select().from(users).where(eq(users.id, ctx.userId)).limit(1);
  });
  return apiSuccess(result);
}
```

**Critical caveat:** `runWithRLS()` is a single transaction scope. Cross-statement mutations must stay inside the callback. Read-only queries can use the helper for the same defense-in-depth.

### Pattern 3: 80-Route Audit Methodology (e0w)

**What:** Systematically verify that every database query inside every tenant-scoped route has a `tenantId` filter, not just the entry handler. The 88-tenant-scoped routes (per `docs/API_ROUTES.md` §1) are split into ~15 domains (admin, announcements, bookings, community-services, competitions, content, conversations, dashboard, flags, groups, households, invitations, maintenance, media, notifications, premium, resources, settings, surveys, users, etc).

**Audit approach:**

1. For each route file under `src/app/api/{resource}/`, list every `db.select()`, `db.update()`, `db.delete()`, `db.insert()` call
2. Verify the WHERE clause (or its enclosing `withTenant()` helper) includes `tenantId`
3. For queries inside helper functions (e.g., `listTenants`, `getPlatformPageFlags`), trace back to confirm tenantId is passed in
4. Document any route where tenantId is intentionally absent (admin/platform cross-tenant) with a comment header

**Output:** Audit spreadsheet (in RESEARCH.md appendix or a separate `docs/SECURITY_AUDIT_M4.5.md`) showing per-route compliance status. Any gaps become tasks in the same plan.

### Pattern 4: MyHomeSpace Property Resolution (cs5)

**What:** The current `/api/users/[id]` route (`src/app/api/users/[id]/route.ts:139-178`) only returns a household when the user has an ACTIVE `profile` record linked to a household linked to a property. For property owners who have a `standardSeats`/`soloSeats` record but no profile, the household returns null.

**Fix strategy (recommended):** Add a fallback path in the API that, when no profile-based household exists, queries `standardSeats`/`soloSeats` (which the route already fetches at lines 94-136) to construct a synthetic household with the seat's property. The client (`MyHomeSpace.tsx`) already handles `property: null` gracefully with "No property linked" UI, so the fix is purely server-side.

**Example fallback query** (add to /api/users/[id]/route.ts after line 178):

```typescript
// Fallback: if no profile-based household, build one from the primary standardSeat
if (!householdWithMembers && seats.length > 0) {
  const primarySeat = seats.find(s => s.isPrimaryOwner) ?? seats[0];
  householdWithMembers = {
    id: `seat-${primarySeat.platformAddress}`,
    name: primarySeat.platformAddress,
    status: 'ACTIVE',
    property: primarySeat.household, // { id, street, unit, homeImage }
    members: [], // No household members list from seat alone
  };
}
```

This satisfies the AC "MyHomeSpace correctly links user to property" without changing the client UI.

### Pattern 5: Prisma Seed Restructure (tc4)

**What:** Two seed scripts exist:

- `prisma/seed.ts` (1630 lines) — BROKEN: uses `prisma.user.upsert()` without `id` or `tenantId`. Schema requires both (`prisma/schema.prisma:993-1054`).
- `scripts/seed-drizzle.ts` (3211 lines) — WORKING: uses Drizzle with explicit `id` and `tenantId`. Wired to `pnpm db:seed`.

The `package.json` `db:seed` script runs `scripts/seed-drizzle.ts`, NOT `prisma/seed.ts`. So `pnpm db:seed` already works.

**Why tc4 still matters:** `npx prisma db seed` (the default Prisma command) uses `prisma/seed.ts` by convention. If anyone runs that command, it fails. Also, the AC says "prisma/seed.ts schema type errors" — fixing the file is the literal AC.

**Fix strategy:** Two options:

1. **Option A (recommended, minimal):** Replace `prisma/seed.ts` with a thin shim that imports and re-exports from `scripts/seed-drizzle.ts`. Preserves `npx prisma db seed` compatibility without duplicating data.
2. **Option B (consolidate):** Add a `prisma.seed` field to `package.json` pointing to `scripts/seed-drizzle.ts` so both commands resolve to the working file. Delete `prisma/seed.ts`.

Option A is safer — it leaves Prisma's expected convention intact. Option B requires updating package.json + a Prisma convention.

## Don't Hand-Roll

| Problem                      | Don't Build                                                                                    | Use Instead                                                                    | Why                                                                                                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth endpoint validation     | Custom middleware that parses `request.json()` and Zod-parses before forwarding to Better Auth | `validation-better-auth` plugin                                                | Plugin integrates with Better Auth's hook system (`before`/`after`); custom middleware would bypass internal state and break `onExistingUserSignUp`, `additionalFields`, etc. |
| Cross-tenant leakage defense | Bespoke `set_config()` calls sprinkled through every route                                     | `runWithRLS()` from `@api/db`                                                  | Centralizes `SET ROLE app_user` + 4 `set_config()` calls; easy to audit; transaction-scoped cleanup                                                                           |
| MyHomeSpace data shape fix   | New endpoint or DTO transformer                                                                | Augment existing `/api/users/[id]` route with a `standardSeats`-based fallback | The route already queries seats at lines 94-136; fallback reuses that data, no new query path                                                                                 |
| 80-route audit               | Per-file manual review of 88 routes                                                            | Grep-based + targeted file-by-file audit using a single audit script           | A scripted audit produces a CSV-like output that's easier to review and re-run                                                                                                |

**Key insight:** The 5 blockers are all places where a "do it manually" instinct would create more work. The 80-route audit (e0w) is the largest — a scripted approach produces evidence the soak can rely on.

## Common Pitfalls

### Pitfall 1: runWithRLS() inside an existing transaction (oqw)

**What goes wrong:** Calling `runWithRLS()` from inside a route that already wraps in `db.transaction()` causes nested transactions. Drizzle's `transaction()` does not nest by default — the inner call creates a savepoint, but `SET ROLE` is session-scoped (not transaction-scoped), so the outer transaction may inherit the role unintentionally.
**Why it happens:** A route helper that wraps in transaction is reused.
**How to avoid:** When wrapping a route in `runWithRLS()`, audit the route for any existing `db.transaction()` calls and either consolidate or remove them. Document the audit in a code comment.
**Warning signs:** Tests pass in dev (one connection) but fail in prod (connection pool reuses across requests).

### Pitfall 2: validation-better-auth path mismatch (ltn)

**What goes wrong:** The `path` field in the validator config is Better Auth's internal route, not the Next.js route. Using `/api/auth/sign-up/email` (Next.js path) instead of `/sign-up/email` (Better Auth internal path) silently no-ops — the plugin never matches.
**Why it happens:** The plugin docs use both conventions in different places.
**How to avoid:** Use the path relative to Better Auth's basePath. Since basePath is `/api/auth`, use `/sign-up/email`, `/sign-in/email`, etc. Add a unit test that POSTs an invalid payload to confirm 400 response.
**Warning signs:** Validation never fires; invalid payloads reach Better Auth handlers.

### Pitfall 3: Seed script not exercised before sign-off (tc4)

**What goes wrong:** Fix `prisma/seed.ts`, but don't actually run `npx prisma db seed` against a real DB to confirm. Validation passes via typecheck, but the runtime fails on a different schema mismatch (e.g., enum import).
**Why it happens:** TypeScript errors are the visible problem; runtime errors only surface during execution.
**How to avoid:** After fixing, run `npx prisma db seed` (or the import shim's target) end-to-end against a clean test DB. Document the run in the plan's SUMMARY.
**Warning signs:** TS clean, but AC verification fails on first run.

### Pitfall 4: MyHomeSpace fallback exposes cross-tenant data (cs5)

**What goes wrong:** When adding a `standardSeats` fallback, accidentally use the seat's `tenantId` instead of the requesting user's `tenantId` to look up the property. A user from tenant A could see tenant B's property details.
**Why it happens:** Both `standardSeats` and `properties` have a `tenantId` field; joining without a `tenantId` filter on `properties` leaks data.
**How to avoid:** Always include `eq(properties.tenantId, tenantId)` in the fallback query. The route already calls `withTenant()` at line 23, so `tenantId` is available.
**Warning signs:** Cross-tenant test fails; data shows up for users who shouldn't see it.

### Pitfall 5: Audit script reports false positives (e0w)

**What goes wrong:** A naive grep-based audit flags every `db.select()` call as needing a `tenantId` filter, including admin/platform cross-tenant routes that intentionally don't.
**Why it happens:** The audit doesn't know which routes are intentionally cross-tenant.
**How to avoid:** Whitelist the 8 cross-tenant routes from `docs/API_ROUTES.md` §5 (Platform Admin). For each non-whitelisted route, require a `tenantId` reference either in the route or in a called helper.
**Warning signs:** Audit flags `/api/admin/platform/tenants` as a leak; manual review shows it's correct.

### Pitfall 6: Forgetting the v1 re-export routes (e0w)

**What goes wrong:** 43 `v1/tenant/*` routes re-export from the flat canonical path. An audit that only inspects files under `src/app/api/{resource}/` misses the 51 `v1/*` files. A naive fix in a re-export won't be inherited by the canonical — it has to be in the canonical.
**Why it happens:** Re-export files look like routes but contain zero DB calls.
**How to avoid:** Audit script should follow re-exports: if `src/app/api/v1/tenant/announcements/route.ts` is `export { GET } from '@/app/api/announcements/route'`, the audit must recurse to the canonical.
**Warning signs:** Audit shows 100% pass rate on `v1/*` because all queries "look" fine (there are no queries in the re-exports).

### Pitfall 7: Validation plugin breaks Better Auth onExistingUserSignUp hook (ltn)

**What goes wrong:** The `onExistingUserSignUp` callback (`src/shared/api/auth.ts:64-73`) fires on duplicate email. If the validator plugin's `after` hook runs first and transforms the body, the callback may see a stale email.
**Why it happens:** Hook ordering: `validator` runs at the plugin layer; `databaseHooks.user.create.before/after` runs in the adapter.
**How to avoid:** Add a `before` hook to the validator that logs the body and confirms it matches expectations in dev. Order: validator.before → validator.after → databaseHooks.user.create.before → ... → databaseHooks.user.create.after.
**Warning signs:** `onExistingUserSignUp` fires for fresh signups, or fails to fire for duplicates.

## Code Examples

### Better Auth Validator Plugin (ltn) — verified pattern

```typescript
// Source: https://context7.com/daanish2003/validation-better-auth
import { validator } from 'validation-better-auth';
import { z } from 'zod';

const SignupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(12),
});

const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

plugins: [
  // ...existing plugins
  validator([
    { path: '/sign-up/email', schema: SignupSchema },
    { path: '/sign-in/email', schema: SignInSchema },
  ]),
];
```

### RLS Context Derivation (oqw) — verified existing code

```typescript
// Source: src/shared/api/db.ts:209-224
export async function getRLSContext(request: Request): Promise<RLSContext | null> {
  const { auth } = await import('@api/auth');
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return null;
  const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!user) return null;
  return {
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    isPlatformAdmin: user.isPlatformAdmin,
  };
}
```

### StandardSeat-based Property Fallback (cs5) — recommended pattern

```typescript
// Source: derived from src/app/api/users/[id]/route.ts:94-178
// Add to GET handler after line 178:

if (!householdWithMembers && seats.length > 0) {
  const primarySeat = seats.find(s => s.isPrimaryOwner) ?? seats[0];
  if (primarySeat) {
    householdWithMembers = {
      id: `seat-derived-${primarySeat.platformAddress}`,
      name: primarySeat.platformAddress,
      status: 'ACTIVE',
      property: {
        id: primarySeat.household.id,
        address: primarySeat.household.street,
        unitNumber: primarySeat.household.unit,
        type: primarySeat.platformAddress,
      },
      members: [],
    };
  }
}
```

### Prisma Seed Shim (tc4) — recommended pattern

```typescript
// prisma/seed.ts — replace broken 1630-line file with a shim:
import { main as drizzleSeed } from '../scripts/seed-drizzle';

main().catch(e => {
  console.error(e);
  process.exit(1);
});

async function main() {
  await drizzleSeed();
}
```

Note: scripts/seed-drizzle.ts uses top-level await, so it may need restructuring for the shim. Alternative: convert scripts/seed-drizzle.ts to export `seed()` function and have main() call it.

## Runtime State Inventory

| Category             | Items Found                                                                                                                   | Action Required |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Stored data          | None — Phase 43 is a code/audit/seed-fix phase, not a schema migration.                                                       | None            |
| Live service config  | None — no env vars or feature flags change.                                                                                   | None            |
| OS-registered state  | None — no cron jobs, scheduled tasks, or background workers.                                                                  | None            |
| Secrets and env vars | None — Better Auth `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` already exist; validation-better-auth doesn't add new env vars. | None            |
| Build artifacts      | None — new package `validation-better-auth` will be installed via pnpm; no special build steps.                               | None            |

**Nothing found in any category:** Verified by reading the AC + each blocker — none require runtime state changes beyond the code/config changes enumerated above.
