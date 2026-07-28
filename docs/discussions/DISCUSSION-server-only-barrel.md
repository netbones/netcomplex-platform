---
title: DISCUSSION: Server-Only Modules vs FSD Barrel Public API
status: current
reviewed: 2026-07-28
tags: [discussion, proposal]
audience: developer
---

# DISCUSSION: Server-Only Modules vs FSD Barrel Public API

**Status**: Open — seeking architectural advice  
**Date**: 2026-06-14  
**Trigger**: Steiger/ESLint FSD enforcement (Phase 44) introduced a policy conflict that caused build failures across ~105 files.

---

## Background: FSD Architecture and Barrel Public APIs

We use **Feature-Sliced Design (FSD)** with ESLint + Steiger enforcing boundaries:

- Each slice has a **public API barrel** (`src/entities/tenant/index.ts`) that re-exports what consumers may use.
- **Deep imports** (`@entities/tenant/api/with-tenant`) are blocked by `no-restricted-imports` in ESLint and checked by Steiger's `no-public-api-sidestep` rule.
- The canonical barrels are: `@entities/*`, `@features/*`, `@widgets/*`, `@pages/*`, `@processes/*`.

---

## The Problem: Server-Only Code Cannot Live in a Shared Barrel

Some modules are **server-only** — they import `server-only`, `next/headers`, `next/cache`, or use direct database access (`drizzle-orm` queries against the Prisma-managed schema). These modules are used by:

- API route handlers (`src/app/api/**/route.ts`)
- Server components (page.tsx, layout.tsx)
- Server-side service functions

But NOT by client components.

**The barrel is shared.** A client component importing _any_ client-safe export from a barrel (e.g., `import { ADMIN_ITEMS } from '@entities/tenant'`) causes the bundler to evaluate _all_ re-exports in the barrel's module graph, including server-only modules. When a server-only module's imports (`server-only`, `next/headers`) are evaluated in a client bundle context, the build **crashes**:

```
Error: You're importing a component that needs "server-only".
That only works in a Server Component.
```

### Concrete Example

`@entities/tenant/index.ts` (the barrel) exports ~10 client-safe things and ~8 server-only modules (`./api/base`, `./api/with-tenant`, `./api/guards`, `./api/gate/gate`, etc.).

A client component imports `ADMIN_ITEMS` (client-safe):

```ts
// src/widgets/admin/ui/AdminQuickLinksWidget.tsx ('use client')
import { ADMIN_ITEMS } from '@entities/tenant';
```

The bundler resolves `@entities/tenant/index.ts` → evaluates all `export *` and `export { }` → loads `./api/base.ts` → hits `import 'server-only'` → **crash**.

This happened for **every** entity slice that mixed server-only and client-safe exports in its barrel: `tenant`, `content`, `maintenance`, `event`, `booking`. The total blast radius was ~105 files.

### The Immediate Fix (Current State)

Server-only exports were **removed from all entity barrels**. Consumers now import them via deep imports:

```ts
// API route (server-side, safe)
import { withTenant } from '@entities/tenant/api/with-tenant';
import { getCurrentTenant } from '@entities/tenant/api/base';
import { listMaintenanceRequests } from '@entities/maintenance/services';
```

This fixes the build but **violates the FSD public API rule** — these deep imports are blocked by `no-restricted-imports`. The ESLint config was patched with a regex exception, but this is a band-aid.

---

## The Three Options

### Option A: ESLint Exceptions (Status Quo + Formalize)

**What**: Keep the current fix. Allow specific deep import paths in ESLint/Steiger for server-only modules. Document which paths are excepted and why.

**Implementation**:

- ESLint `no-restricted-imports` regex excludes `@entities/tenant/api/*`, `@entities/*/services/**`
- Steiger `no-public-api-sidestep` allow list adds the same paths
- Add an ADR documenting the policy: "Server-only modules may be imported via deep paths"

**Pros**:

- Minimal refactoring — the current 105-file fix is preserved
- Server-only and client-safe code remain cleanly separated at the module level
- No risk of accidental client-side bundling of server code

**Cons**:

- Violates FSD's principle of a single public API per slice
- The "public API" for `@entities/tenant` is now split across the barrel (client-safe) and deep paths (server-only) — a consumer must know which is which
- ESLint/Steiger configs grow with each new server-only module
- New developers may be confused about which import path to use

---

### Option B: Separate Server-Only Public API Modules

**What**: Create dedicated server-only public API entry points. Each entity slice gets a `server.ts` barrel that is the canonical public API for server-side consumers.

**Implementation**:

```
src/entities/tenant/
├── index.ts              # Client-safe public API (current state after cleanup)
├── server.ts             # NEW: Server-only public API
│   export * from './api/with-tenant'
│   export * from './api/base'
│   export * from './api/guards'
│   export * from './api/gate/gate'
├── api/
│   ├── base.ts           # (unchanged)
│   ├── with-tenant.ts    # (unchanged)
│   └── ...
```

Consumers import from the appropriate barrel:

```ts
// API route (server)
import { withTenant, getCurrentTenant } from '@entities/tenant/server';

// Client component
import { ADMIN_ITEMS } from '@entities/tenant';
```

**ESLint/Steiger**: The `@entities/tenant/server` path becomes a recognized sub-barrel in the allow list (like `@api/server` already is — see `steiger.config.js:74`).

**Pros**:

- Clean separation of concerns — "client-safe" vs "server-only" is explicit in the import path
- No deep imports — the `server.ts` barrel is a proper public API
- Follows the precedent of `@api/server`, `@api/client`, `@api/shared` (already in the Steiger allow list)
- ESLint exceptions are centralized on a single path pattern per slice

**Cons**:

- Requires refactoring ~105 files (again) to change `@entities/tenant/api/with-tenant` → `@entities/tenant/server`
- Two "public APIs" per slice — the FSD purist may object
- Another barrel file to maintain per entity slice

---

### Option C: Split Barrels by Context (Server vs Client at the Slice Level)

**What**: Restructure entity slices so the barrel only exports things that are safe for ALL consumers. Server-only code is not re-exported from the slice's barrel at all — it's imported directly from source files or from a separate `@server/*` namespace.

**Implementation**:

- The entity barrel (`@entities/tenant/index.ts`) exports ONLY client-safe types, constants, UI components, and schema validators
- Server-only functions are consumed via `@server/*` paths (similar to how tRPC routers live in `@server/routers`)
- Alternately, server-only entity functions move to `src/server/entities/tenant.ts`:

```ts
// src/server/entities/tenant.ts
export { getCurrentTenant, getTenantById } from '@/entities/tenant/api/base';
export { withTenant, withTenantOptional } from '@/entities/tenant/api/with-tenant';
```

Consumers:

```ts
// API route
import { withTenant } from '@server/entities/tenant';
```

**Pros**:

- Cleanest separation — entity slices are purely about domain modeling, not execution context
- Server code lives in the server layer (`src/server/`) which is already established for tRPC routers
- No FSD violation — each layer has a single, pure public API

**Cons**:

- Largest refactor — moves server-only functions out of entity slices entirely
- Indirection: server-only functions are thin wrappers around entity module functions
- May create confusion about "where does entity logic live"

---

## Recommendation

**Option B** (separate `server.ts` barrels) is the most pragmatic path. It:

1. Follows an established pattern in the codebase (`@api/server`, `@api/client`, `@api/shared`)
2. Is already recognized in `steiger.config.js` (line 74: `@api/server` is in the sidestep allow list)
3. Requires moderate refactoring (~105 files, pattern-based replacement)
4. Provides a clear, discoverable API for server-side consumers

---

## Questions for the Oracle

1. Is Option B the correct long-term architectural choice, or does it create more problems than it solves?
2. Should the `server.ts` barrel pattern be extended to `@features/*` and `@widgets/*` layers as well?
3. Are there alternatives not considered here (e.g., Next.js `"use server"` directives, package.json `exports` field splitting)?
4. Given that Prisma/Drizzle database access is inherently server-only, should we adopt a broader principle: "any module importing from `@api/db` must not be re-exported from a shared barrel"?

---

## Related

- ADR-019: RLS Policies (connection-role model for `runWithRLS`)
- `steiger.config.js` — FSD rule severities and sidestep allow list
- `eslint.config.js` — `no-restricted-imports` deep import blocking
- `.planning/phases/44-m5a-hardening/44-01-PLAN.md` — Phase 44 (FSD enforcement baseline)
- BD issue: soralia-village-de8x (i18n sidestep justification precedent)
