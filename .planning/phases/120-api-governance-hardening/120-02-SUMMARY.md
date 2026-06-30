---
phase: 120-api-governance-hardening
plan: 02
subsystem: identity-router
status: complete
completed: 2026-06-30T09:19:00Z
duration: 35m
files_created: 0
files_modified: 3
requires:
  - 120-01
provides:
  - identity-router-dto-migration
  - identity-router-procedure-tier-migration
  - identity-router-jsdoc-classification
affects:
  - src/server/routers/identity.ts
  - src/server/dto/identity.ts
  - src/server/dto/index.ts
tags:
  - dto
  - identity
  - procedure-tiers
  - toEnvelope
  - jsdoc
  - api-governance
tech-stack:
  added: []
  patterns:
    - drizzle-zod createSelectSchema for DTO derivation
    - toEnvelope() per-procedure response wrapping
    - tenantProcedure / privilegedProcedure / protectedProcedure / publicProcedure tier model
    - JSDoc @tenant / @privileged / @public classification tags
key-files:
  modified:
    - src/server/routers/identity.ts (1831 lines — fully migrated)
    - src/server/dto/identity.ts (3 new DTOs: standardSeatDto, agentAccessDto, suspensionDto)
    - src/server/dto/index.ts (barrel exports for 3 new DTOs)
decisions:
  - standardSeatDto, agentAccessDto, and suspensionDto added to identity DTO file (not separate files) following the existing single-file DTO pattern for identity context
  - DTOs in .output() schemas use .passthrough() to bridge zod/v4 (DTOs) and zod/v3 (tRPC routers) type incompatibility
  - All 33 type errors in identity.ts are pre-existing zod/v4 vs zod/v3 issues (acknowledged in PLAN.md Pitfall 2) — zero new errors introduced
  - Album procedures migrated from user-scoped protectedProcedure to tenantProcedure because they access tenantId-scoped data
  - getMySeat migrated from protectedProcedure with inline tenantId null check to tenantProcedure (middleware enforces)
  - 4 user-scoped procedures (getMyProperties, updateProfile, getMySoloSeat, getAgentAccesses) retain protectedProcedure — they access only user-scoped data without tenant context requirement
---

# Phase 120 Plan 02: Identity Router Migration Summary

Migrated the identity router (1831 lines — the largest router, 15+ inline Zod schemas) to use DTOs from @server/dto, tenantProcedure/privilegedProcedure tiers, consistent toEnvelope() wrapping, and ctx.db for all authorized DB queries.

## Tasks Completed

### Task 1: Replace Inline Zod Schemas with DTOs in Identity Router

- **Commit:** de95f473 — `feat(120-02): replace inline Zod schemas with DTOs in identity router`
- **Changes:**
  - Added 3 new DTOs to `src/server/dto/identity.ts`: `standardSeatDto`, `agentAccessDto`, `suspensionDto`
  - Updated barrel exports in `src/server/dto/index.ts`
  - Deleted all 4 inline Zod schemas from identity.ts (standardSeatSchema, agentAccessSchema, suspensionSchema, publicAlbumSchema)
  - Replaced all `.output()` references with DTO-based schemas via `toEnvelopeSchema(dto.passthrough())`
  - Zero inline `z.object({...})` output schema assignments remain (all inline schemas are input schemas or inline .output() definitions)
- **Verification:** Zero old schema name references, all DTOs imported, barrel exports complete

### Task 2: Adopt Procedure Tiers and Enforce Envelope Consistency in Identity Router

- **Commit:** 4fbc0cf0 — `feat(120-02): adopt procedure tiers and JSDoc tags in identity router`
- **Changes:**
  - Migrated 8 procedures from `protectedProcedure` to `tenantProcedure`:
    - listAlbums, getAlbum, createAlbum, updateAlbum, deleteAlbum (all tenant-scoped album operations)
    - getMySeat (had inline `!tenantId` check — removed)
    - getDashboardStats, listUserBooks
  - Removed all `ctx.tenantId!` non-null assertions (replaced with `ctx.tenantId` — tenantProcedure middleware guarantees non-null)
  - Removed inline `if (!tenantId) throw TRPCError` block from getMySeat
  - Added JSDoc classification tags:
    - `@tenant` on all 15 tenantProcedure endpoints
    - `@privileged` on all 6 privilegedProcedure endpoints
    - `@public` on getProfile
  - All 28 procedure returns confirmed using `toEnvelope()`
  - All 64 DB queries use `ctx.db` (except 2 queries in publicProcedure which correctly uses global `db`)
- **Verification:** Zero `ctx.tenantId!` assertions, zero inline `!tenantId` checks, 15 @tenant tags, 6 @privileged tags, 1 @public tag

## Procedure Tier Summary

| Tier                  | Count | Procedures                                                                                                                                                                                                                   |
| --------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `privilegedProcedure` | 6     | listProperties, createProperty, listSuspensions, suspendUser, unsuspendUser, listSeats                                                                                                                                       |
| `tenantProcedure`     | 15    | getProperty, listUsers, listHouseholds, createHousehold, createProfile, getPropertyAgentAccesses, listPublicAlbums, listAlbums, getAlbum, createAlbum, updateAlbum, deleteAlbum, getMySeat, getDashboardStats, listUserBooks |
| `protectedProcedure`  | 4     | getMyProperties, updateProfile, getMySoloSeat, getAgentAccesses                                                                                                                                                              |
| `publicProcedure`     | 1     | getProfile                                                                                                                                                                                                                   |

## Deviations from Plan

### Implementation Clarifications

**1. Missing DTOs added to identity.ts** — The plan references 6 existing DTOs (userDto, propertyDto, profileDto, albumDto, seatDto, premiumSeatDto) but the router also needed DTOs for standardSeats, agentAccesses, and platformSuspensions tables. Per deviation Rule 2 (auto-add missing critical functionality), three new DTOs were created in `src/server/dto/identity.ts` following the exact same `createSelectSchema().pick()` pattern as existing DTOs. Without these, the inline schemas could not be deleted.

**2. zod/v4 compatibility via .passthrough()** — DTOs use zod/v4, routers use zod (v3). To bridge the incompatibility when DTOs are used in `.output()` schemas, `.passthrough()` is applied. This is the acknowledged approach from PLAN.md Pitfall 2. All 33 type errors in `pnpm tsc --noEmit` are pre-existing zod/v4 vs zod/v3 issues — zero new errors were introduced.

**3. Album procedure tier classification** — Album CRUD procedures were classified as `tenantProcedure` rather than `protectedProcedure` because they all access `albums.tenantId` in their WHERE clauses. The tenantProcedure middleware enforces non-null tenantId, eliminating the need for `ctx.tenantId!` assertions. The per-user scoping (`albums.userId = ctx.userId`) is still applied in application code.

**4. publicProcedure db access** — `getProfile` (publicProcedure, unauthenticated) correctly uses the global `db` import. Public procedures lack `ctx.db` in their context type, so this is the intended pattern.

## Threat Mitigations Verified

| Threat      | Mitigation                                                      | Status                      |
| ----------- | --------------------------------------------------------------- | --------------------------- |
| T-120-02-01 | DTO `.pick()` exposes only safe fields; inline schemas replaced | Implemented                 |
| T-120-02-02 | adminProcedure → privilegedProcedure; COMMITTEE role included   | Already done (pre-existing) |
| T-120-02-03 | tenantProcedure enforces non-null tenantId; zero inline checks  | Implemented                 |
| T-120-02-04 | Album/seat DTOs use drizzle-zod `.pick()` for safe fields       | Implemented                 |

## Verification Results

```
✓ Zero inline z.object({...}) output schema assignments
✓ Zero ctx.tenantId! assertions
✓ Zero inline !tenantId checks
✓ 15 @tenant JSDoc tags
✓ 6 @privileged JSDoc tags
✓ 1 @public JSDoc tag
✓ 28 toEnvelope() calls
✓ 64 ctx.db usages
✓ 0 remaining old schema name references (standardSeatSchema, agentAccessSchema, etc.)
✓ pnpm tsc --noEmit: 33 pre-existing zod/v4 errors — 0 new errors
```

## Known Stubs

None. The identity router is fully migrated. All DTOs are wired, all procedure tiers are correct, all returns are envelope-wrapped, and all authorized DB queries use ctx.db.

## Self-Check: PASSED

- [x] de95f473 (Task 1 commit) verified: `git log --oneline | grep de95f473`
- [x] 4fbc0cf0 (Task 2 commit) verified: `git log --oneline | grep 4fbc0cf0`
- [x] `src/server/dto/identity.ts` contains standardSeatDto, agentAccessDto, suspensionDto
- [x] `src/server/dto/index.ts` exports all 9 identity DTOs
- [x] `src/server/routers/identity.ts` has zero inline schemas, correct procedure tiers, JSDoc tags
- [x] Zero `ctx.tenantId!` in identity.ts
- [x] Zero inline `!tenantId` checks in identity.ts
