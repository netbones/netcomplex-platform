---
phase: 123-setup-center
plan: 123-02
title: 'Setup Center API Layer — progress, missions, settings, init'
status: complete
completed: 2026-07-07T07:45:00Z
duration_seconds: 713
tasks_completed: 6
tasks_total: 6
requires: ['123-01']
provides: ['api:soralia/setup']
affects: ['src/app/api/platform/setup/', 'src/entities/setup/', 'src/app/api/platform/tenants/']
tags: ['api', 'setup-center', 'entity', 'tenant-scoped-auth']
tech-stack:
  added: []
  patterns:
    - 'Next.js App Router API routes with withErrorHandler'
    - 'Drizzle ORM chainable query pattern'
    - 'Tenant-scoped auth via session + tenant.ownerId check'
    - 'Zod validation on PATCH bodies with safeParse'
key-files:
  created:
    - src/entities/setup/api/get-setup.ts
    - src/entities/setup/api/upsert-mission.ts
    - src/entities/setup/api/upsert-setting.ts
    - src/entities/setup/api/init-setup.ts
    - src/entities/setup/__tests__/api.test.ts
    - src/app/api/platform/setup/route.ts
    - src/app/api/platform/setup/missions/route.ts
    - src/app/api/platform/setup/settings/route.ts
  modified:
    - src/entities/setup/index.ts (re-export API functions)
    - src/db/index.ts (register setup Drizzle schemas)
    - src/shared/api/server/index.ts (export setup tables)
    - src/app/api/platform/tenants/route.ts (call initTenantSetup on signup)
decisions:
  - 'Tenant-scoped auth checks session.user.id === tenant.ownerId instead of requiring platform admin'
  - 'initTenantSetup is fire-and-forget on signup — failure logs but does not block tenant creation'
  - 'Entity API functions in src/entities/setup/api/ are server-only and re-exported from barrel'
  - 'completionPercent calculation is done per-tenant-setup from all mission rows'
  - 'Missions use a stable missionKey for lookup (not numeric IDs)'
---

# Phase 123 Plan 02: Setup Center API Layer Summary

## One-Liner

Built four tenant-scoped REST API routes (progress, missions, settings, init) with reusable entity-layer Drizzle query functions, Zod validation, and 16 passing integration tests — forming the API backbone of the persistent Setup Center.

## What Was Built

### Entity-Layer API Functions (Task 5)

- **`getTenantSetup(tenantId)`** — Drizzle query returning TenantSetup + missions grouped by section (launch/populate/configure/grow)
- **`recalculateCompletionPercent(setupId)`** — recomputes 0-100 progress from `isCompleted` ratio across all missions
- **`upsertMission(setupId, missionKey, updates)`** — toggles `isCompleted`/`completedAt` on a SetupMission row and recalculates progress
- **`upsertSetupSetting(setupId, key, value)`** — upserts a single SetupSetting row (create or update)
- **`initTenantSetup(tenantId, tier)`** — creates a TenantSetup record and seeds 18 default missions from the `DEFAULT_MISSIONS` catalog in constants.ts

### API Routes (Tasks 1-4)

| Endpoint                                     | Method          | Auth         | Purpose                                                  |
| -------------------------------------------- | --------------- | ------------ | -------------------------------------------------------- |
| `/api/platform/setup?tenantId=<id>`          | GET             | Tenant owner | Returns full setup state with grouped missions           |
| `/api/platform/setup/missions`               | PATCH           | Tenant owner | Toggles `isCompleted` + recalculates `completionPercent` |
| `/api/platform/setup/settings?tenantId=<id>` | GET             | Tenant owner | Returns all setup settings as keyed record               |
| `/api/platform/setup/settings`               | PATCH           | Tenant owner | Upserts a single setting value                           |
| `/api/platform/tenants`                      | POST (modified) | None         | Calls `initTenantSetup()` after signup (fire-and-forget) |

All routes use `apiSuccess`/`apiError` envelopes, `withErrorHandler` wrappers, Zod `safeParse` for PATCH bodies, and tenant-scoped auth (checks `session.user.id === tenant.ownerId`).

### Barrel Exports

- `src/db/index.ts` — registered `tenantSetups`, `setupMissions`, `setupSettings` (and their relations) for Drizzle
- `src/shared/api/server/index.ts` — exported tables in the `@api/server` barrel
- `src/entities/setup/index.ts` — re-exports all API functions from the entity barrel

### Integration Tests (Task 6)

16 Vitest tests covering:

- Auth gates: 401 (no session), 403 (non-owner), 400 (missing query params), 422 (invalid bodies), 404 (tenant not found)
- `initTenantSetup` for all three tiers (foundation, depth, core)
- Dynamic DB mock using `vi.hoisted()` with chainable Drizzle query pattern controlled via `mocks.dbResult`

## Deviations from Plan

None — plan executed exactly as written.

## Decisions Made

1. **Tenant-scoped auth via ownerId comparison**: Routes check `session.user.id === tenant.ownerId` instead of requiring platform admin. This follows the principle of least privilege — tenant owners manage their own setup.
2. **initTenantSetup is fire-and-forget**: If setup initialization fails during signup, the error is logged but the tenant creation still succeeds. The Setup Center gracefully handles a missing TenantSetup on first access.
3. **Entity API functions are server-only**: All functions in `src/entities/setup/api/` use `import 'server-only'` — they cannot be accidentally imported into client components.
4. **Stable missionKey for lookup**: The `PATCH /missions` route uses `missionKey` (e.g., `launch.identity`) rather than auto-generated IDs, enabling deterministic lookups across tenants.

## Known Stubs

None — all functionality is fully wired.

## Threat Flags

None — no new security surfaces beyond the existing auth pattern in the project.

## Self-Check: PASSED

All 11 files verified present on disk. All 3 commits verified in git log. All 16 integration tests pass.
