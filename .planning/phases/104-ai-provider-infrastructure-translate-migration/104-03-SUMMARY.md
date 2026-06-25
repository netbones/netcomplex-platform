---
phase: 104-ai-provider-infrastructure-translate-migration
plan: 03
subsystem: infra
tags: [ai-pool, admin-api, cron, widget, platform-admin]

# Dependency graph
requires:
  - phase: 104-02
    provides: pool.ts (checkQuota, recordUsage, getOrCreateUsage), getAiProvider, getPoolProviderConfig
  - phase: 104-01
    provides: 4 AI pool DB models, tenant module helper, AiCapabilityKey types
provides:
  - 6 platform admin API routes for AI pool management (quotas, usage, override, costs, status)
  - Monthly cron rollover route for billing month settlement
  - admin-ai-usage tenant widget with feature breakdown and usage bar
  - Feature barrel at @features/ai-provider
affects: [104-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Platform admin route pattern: requirePlatformAdmin guard + manual try/catch (matching tenants/route.ts)'
    - 'Tenant widget pattern: lazy import from @features/ai-provider barrel, featureFlag gating'
    - 'Cron route: CRON_SECRET header verification, maxDuration=30 for longer jobs'

key-files:
  created:
    - src/app/api/admin/platform/ai-pool/quotas/route.ts
    - src/app/api/admin/platform/ai-pool/usage/route.ts
    - src/app/api/admin/platform/ai-pool/usage/[tenantId]/route.ts
    - src/app/api/admin/platform/ai-pool/override/route.ts
    - src/app/api/admin/platform/ai-pool/costs/route.ts
    - src/app/api/admin/platform/ai-pool/status/route.ts
    - src/app/api/cron/ai-pool-rollover/route.ts
    - src/features/ai-provider/index.ts
    - src/features/ai-provider/ui/admin-ai-usage-widget.tsx
  modified:
    - src/shared/api/server/index.ts
    - src/widgets/dashboard/model/widgets.ts

key-decisions:
  - 'getPoolProviderConfig, getCurrentBillingMonth added to @api/server barrel for FSD import compliance'
  - 'Audit action reused SETTINGS_CHANGED for AI_POOL_OVERRIDE (AI_POOL_OVERRIDE not in AuditAction union yet)'
  - 'Widget accepts tenantId as optional prop with TODO for dashboard shell context plumbing'

patterns-established:
  - 'Platform admin routes all follow same guard pattern as /platform/tenants'
  - 'Status route returns booleans only — never key prefixes or values'

requirements-completed:
  - AI-PROV-01
  - AI-PROV-02

# Metrics
duration: 7min
completed: 2026-06-25
---

# Phase 104 Plan 03: AI Pool Admin Routes, Cron, and Tenant Widget Summary

**6 platform admin API routes, monthly cron rollover, and admin-ai-usage tenant widget — the admin surface and automation layer for the platform AI pool**

## Performance

- **Duration:** 7 min
- **Started:** 2026-06-25T12:00:17Z
- **Completed:** 2026-06-25T12:07:47Z
- **Tasks:** 3
- **Files modified:** 11 (9 new, 2 modified)

## Accomplishments

- 6 platform admin API routes with requirePlatformAdmin guards: quotas (GET/PATCH), usage (GET), usage/[tenantId] (GET), override (POST), costs (GET/PATCH), status (GET)
- Monthly cron rollover route at /api/cron/ai-pool-rollover with CRON_SECRET header verification — settles previous month's ACTIVE records
- admin-ai-usage tenant widget with progress bar, feature breakdown, and role-based gating (admin/board only)
- Feature barrel at @features/ai-provider with lazy import pattern
- Widget registered in widgets.ts with featureFlag: 'ai-provider'

## Task Commits

Each task was committed atomically:

1. **Task 1: Create 6 platform admin AI pool API routes** - `fd11d7b0` (feat)
2. **Task 2: Create monthly cron rollover route** - `7eb0251e` (feat)
3. **Task 3: Create admin-ai-usage tenant widget + register in widgets.ts** - `b0e60996` (feat)

## Files Created/Modified

- `src/app/api/admin/platform/ai-pool/quotas/route.ts` — GET (list all tier quotas) + PATCH (update quota with tier validation)
- `src/app/api/admin/platform/ai-pool/usage/route.ts` — GET all tenant usage for billing month, joined with tenants, sorted by usage descending
- `src/app/api/admin/platform/ai-pool/usage/[tenantId]/route.ts` — GET single tenant usage + last 100 events
- `src/app/api/admin/platform/ai-pool/override/route.ts` — POST custom quota for a tenant with audit logging
- `src/app/api/admin/platform/ai-pool/costs/route.ts` — GET (list capability costs) + PATCH (update cost)
- `src/app/api/admin/platform/ai-pool/status/route.ts` — GET provider connectivity (booleans only, no keys)
- `src/app/api/cron/ai-pool-rollover/route.ts` — POST monthly SETTLE with CRON_SECRET verification, maxDuration=30
- `src/features/ai-provider/index.ts` — Feature barrel exporting AdminAiUsageWidget
- `src/features/ai-provider/ui/admin-ai-usage-widget.tsx` — Client component with loading/error/data states, progress bar, feature breakdown
- `src/shared/api/server/index.ts` — Added getPoolProviderConfig + getCurrentBillingMonth to barrel
- `src/widgets/dashboard/model/widgets.ts` — Added admin-ai-usage registration + Sparkles icon import

## Decisions Made

- `getPoolProviderConfig` and `getCurrentBillingMonth` added to `@api/server` barrel to comply with FSD no-restricted-imports rule (routes under `src/app/api/` cannot import from `@shared/api/ai` directly)
- Override audit log uses existing `SETTINGS_CHANGED` AuditAction since `AI_POOL_OVERRIDE` is not in the AuditAction type union yet
- Widget accepts `tenantId` as optional prop with TODO for future dashboard shell context plumbing — MVP renders skeleton if no tenantId provided
- Status route returns `{ anthropicConfigured, openaiConfigured, defaultProvider }` — all booleans or null, never key values

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] FSD restricted imports — added barrel exports to @api/server**

- **Found during:** Task 1 (commit hook)
- **Issue:** Route files importing from `@shared/api/ai` or `@shared/api/ai/pool` triggered ESLint `no-restricted-imports` rule. FSD boundaries prevent deep imports from `@shared` in route files.
- **Fix:** Added `getPoolProviderConfig` and `getCurrentBillingMonth` to `src/shared/api/server/index.ts` barrel. Updated all route imports to use `@api/server`.
- **Files modified:** `src/shared/api/server/index.ts`, `status/route.ts`, `usage/route.ts`, `usage/[tenantId]/route.ts`, `override/route.ts`
- **Committed in:** `fd11d7b0` (part of Task 1 commit)

**2. [Rule 1 - Bug] Unused variable warnings — 10 warnings across 6 route files**

- **Found during:** Task 1 (commit hook — ESLint)
- **Issue:** Catch block `error` variables unused, `and` import unused in usage route, destructured `updated`/`created` unused in override route
- **Fix:** Removed unused catch variables (`catch` without parameter), removed unused `and` import, removed unused destructuring
- **Files modified:** All 6 route files
- **Committed in:** `fd11d7b0` (part of Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both auto-fixes necessary for code to pass pre-commit hooks. No scope creep.

## Issues Encountered

None.

## Known Stubs

- **Widget tenantId prop:** `AdminAiUsageWidget` accepts `tenantId` as optional prop. When not provided, renders skeleton text. The dashboard shell context plumbing for tenantId is a separate concern — tracked as a TODO in the widget file.
- **Override audit action:** Uses `SETTINGS_CHANGED` instead of `AI_POOL_OVERRIDE` because the `AuditAction` type union does not include it. Future: add `AI_POOL_OVERRIDE` to the union when audit log schema is extended.

## Threat Flags

None — threat model items T-104-09 through T-104-13 are all mitigated as specified:

- T-104-09: CRON_SECRET verified in cron route
- T-104-10: requirePlatformAdmin on all 6 admin route handlers
- T-104-11: Status route returns booleans only — grep confirmed 0 key leaks
- T-104-12: Input validation on quotas (tier enum, monthlyTokens range) and override (tenantId string, customTokens > 0)
- T-104-13: Widget permissions restrict to admin + board — RESIDENT cannot see it

## Next Phase Readiness

- All 6 platform admin routes operational — callable by downstream plans
- Cron rollover ready for Vercel cron job configuration (deploy: set CRON_SECRET env var, configure cron trigger)
- admin-ai-usage widget registered and importable — gated behind ai-provider feature flag
- Ready for 104-04 (translate route migration to AI pool)

---

_Phase: 104-ai-provider-infrastructure-translate-migration_
_Completed: 2026-06-25_
