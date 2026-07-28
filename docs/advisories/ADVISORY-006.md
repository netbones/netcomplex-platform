---
title: Balancing FSD Lint Rules with Practical Concerns
status: current
reviewed: 2026-07-28
tags: [advisory, architecture]
audience: developer
---

# Balancing FSD Lint Rules with Practical Concerns

**Date:** 2026-06-12
**Context:** Phase 44-04 @api deep-import remediation — entity barrel over-correction

## The Problem

Commit `5126147` ("resolve final lint violations") fixed ESLint `no-restricted-imports` violations by adding `schema` and `services` to entity barrel (`index.ts`) files. This was the correct mechanical fix for the lint rule, but it broke the production build.

**Why:** Entity `services/` directories contain server-only code (DB queries, `@api/server` imports). Client components that import from the entity barrel (e.g., `import { StatusBadge } from '@entities/maintenance'`) now also pull in every server-only dependency, causing Next.js to error on `server-only`, `next/cache`, `next/headers` in client bundles.

**Affected entities:** booking, maintenance, events, content — any entity where the barrel re-exports `./services` or `./api/route`.

## Root Cause

The ESLint `no-restricted-imports` rule blocks `@entities/*/*` patterns. When a server-only API route imported from `@entities/maintenance/services`, ESLint flagged it. The fix was to re-export `./services` from the barrel so the API route could use `@entities/maintenance` instead.

This is **correct for the API route** but **breaks client components** that also use the same barrel import. The barrel cannot distinguish between server and client consumers.

## Guidelines

### 1. Entity barrels must be client-safe

Entity barrels should only export:

- Types and interfaces (`model/types`)
- Constants (`model/constants`)
- Zod schemas (isomorphic)
- UI components
- Permission helpers (if client-safe)

**Do NOT** re-export from entity barrels:

- `services/` — contains server-only DB queries
- `api/` — contains server-only route handlers
- Any module importing from `@api/server`

### 2. Server-only consumers should import directly

API routes (in `src/app/api/`) that need entity service functions should import them via **relative path** to bypass the FSD deep-import rule:

```typescript
// ✅ Correct: relative import bypasses ESLint barrel requirement
import { listBookings, createBooking } from '../../../entities/booking/services';
```

```typescript
// ❌ Wrong: barrel re-export leaks server code to clients
export * from './services'; // in entities/booking/index.ts
import * as bookingService from '@entities/booking'; // in API route
```

The Steiger `no-public-api-sidestep` rule will produce a `warn`-level warning for the relative import, but this is intentional and acceptable — the entity services are by definition server-only infrastructure, not part of the entity's public API for arbitrary consumers.

### 3. Steiger/ESLint rules at `warn` are not blocking

Rules set to `warn` (like `no-public-api-sidestep`) surface architectural debt without blocking CI. When choosing between:

- A `warn` from a sidestep on a server-only import
- A broken build because server code leaks into client bundles

**Choose the broken build fix.** The `warn` is technical debt that can be resolved later with proper slice architecture (e.g., a server-only sub-barrel pattern).

### 4. Verify with `pnpm build`, not just `pnpm lint`

Lint passes don't guarantee a working build. Server-only import leaks only surface during `next build` (or `next dev`) when Next.js traces the module graph and detects `server-only`/`next/cache`/`next/headers` in client bundles.

**Always run `pnpm build`** after changing entity barrels or adding new exports to entity public APIs.

## Detection

To check if an entity barrel leaks server code:

```bash
# Show which entity barrels export server-only modules
grep -l "export.*from.*services\|export.*from.*api" src/entities/*/index.ts

# Trace server-only import chains
pnpm build 2>&1 | grep -B1 "server-only\|revalidatePath\|next/headers" | grep "\./"
```

## Related

- Phase 44-04 plan: `.planning/phases/44-m5a-hardening/44-04-PLAN.md`
- Entity barrel audit fix commit: `ee2bf36` (and subsequent fixes)
