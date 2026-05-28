---
phase: 35-api-alignment
plan: B02
name: canonical-tRPC-router-structure
subsystem: api
tags: [tRPC, router-organization, identity-migration, canonical-structure]
requires: [35-B01]
provides: [canonical-router-directory, identity-router-relocated, listUsers-tRPC-procedure]
affects:
  - src/server/routers/
  - src/shared/api/trpc/routers.ts
  - src/entities/identity/api/router.ts
tech-stack:
  added: []
  patterns: [canonical-tRPC-router-location, router-re-export-pattern]
key-files:
  created:
    - src/server/routers/identity.ts
    - src/server/routers/index.ts
  modified:
    - src/shared/api/trpc/routers.ts
    - src/entities/identity/api/router.ts
decisions:
  - Canonical tRPC routers live in src/server/routers/ per tRPC.md §15
  - Old entity router kept as deprecated re-export shim (not deleted) to avoid breaking existing imports
  - listUsers tRPC procedure uses ctx.tenantId and ctx.role directly (tRPC context already resolves tenant and auth)
  - @server/* path alias already existed from B01 — no tsconfig changes needed
metrics:
  duration: 8m
  completed: 2026-05-28T13:47:00Z
  tasks: 2
  files_created: 2
  files_modified: 2
---

# Phase 35 Plan B02: Canonical tRPC Router Structure

**One-liner:** Established `src/server/routers/` as the canonical tRPC router directory per tRPC.md §15, relocated the identity domain router, and added `listUsers` tRPC procedure mirroring the GET /api/users REST handler.

## Objective

Migrate the identity domain's REST routes to the canonical tRPC router structure and establish `src/server/routers/` as the standard tRPC location. The governance model requires tRPC as the canonical contract layer.

## Tasks Executed

| #   | Name                                                       | Status | Commit  | Key Files                                    |
| --- | ---------------------------------------------------------- | ------ | ------- | -------------------------------------------- |
| 1   | Establish src/server/routers/ and relocate identity router | Done   | 474fdd0 | identity.ts, index.ts, routers.ts, router.ts |
| 2   | Add listUsers tRPC procedure                               | Done   | 7cdbbcb | identity.ts (264 lines added)                |

### Task 1: Establish `src/server/routers/` and relocate identity router

**What was done:**

- Created `src/server/routers/identity.ts` — identical copy of `src/entities/identity/api/router.ts` with all 12 identity procedures
- Created `src/server/routers/index.ts` — router aggregation entry point with `appRouter` export
- Updated `src/shared/api/trpc/routers.ts` — re-exports `appRouter` from `@server/routers` canonical location
- Added deprecation comment to `src/entities/identity/api/router.ts` — kept in place as backward-compat shim
- No tsconfig changes needed — `@server/*` alias already existed from B01

**Directory structure:**

```
src/server/
├── routers/
│   ├── identity.ts    (canonical identity router — 12 procedures)
│   └── index.ts       (aggregates all routers, exports appRouter)
├── openapi/
│   └── generator.ts   (from B01)
```

### Task 2: Add `listUsers` tRPC procedure

**What was done:**

- Added `listUsers: protectedProcedure` to `src/server/routers/identity.ts`
- Mirrors the query logic from `src/app/api/users/route.ts` GET handler with:
  - Pagination (page/limit with defaults 1/20, max 50)
  - Search filter (by name/email via ilike)
  - Role filter (ADMIN/BOARD/COMMITTEE/RESIDENT)
  - Directory permission check (`hasPermission(ctx.role, 'directory')`)
  - Full related data: standardSeats, soloSeats, premiumSeat, profiles
- Uses `ctx.tenantId` directly (tRPC context already resolves tenant)
- Uses `ctx.role` directly (tRPC context already resolves role)
- Excludes AGENT users, requires seat or profile (mirrors existing REST logic)
- Includes `.meta({ openapi })` with GET /identity/users path for OpenAPI spec
- REST route (`GET /api/users`) remains intact — this is additive

**Required imports added:** `premiumSeats`, `ilike`, `sql`, `SQL` type

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- [x] `src/server/routers/identity.ts` created with all 12 original procedures + listUsers
- [x] `src/server/routers/index.ts` created with appRouter export
- [x] `src/shared/api/trpc/routers.ts` re-exports from canonical location
- [x] Old `src/entities/identity/api/router.ts` has deprecation comment, kept as shim
- [x] `npx tsc --noEmit` — no errors in modified files
- [x] `grep -q "listUsers" src/server/routers/identity.ts` — procedure exists in router

## Self-Check

- [x] `test -f src/server/routers/identity.ts` → FOUND
- [x] `test -f src/server/routers/index.ts` → FOUND
- [x] `grep -q "listUsers" src/server/routers/identity.ts` → FOUND
- [x] `npx tsc --noEmit` passes for modified files
