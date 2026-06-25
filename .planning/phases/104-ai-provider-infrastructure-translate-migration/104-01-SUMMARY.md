---
phase: 104-ai-provider-infrastructure-translate-migration
plan: 01
subsystem: infra
tags: [prisma, drizzle, postgres, ai-pool, tenant-modules, entity-layer]

# Dependency graph
requires: []
provides:
  - 4 AI pool database models (PlatformAiTierQuota, AiCapabilityCost, TenantAiUsage, AiUsageEvent)
  - 2 new enums (AiOveragePolicy, AiUsageStatus)
  - Seeded tier quotas (STANDARD 50k, PREMIUM 200k, ENTERPRISE 500k)
  - Seeded capability costs (4 capabilities)
  - ai-provider PlatformModule seed entry (STANDARD tier, defaultEnabled: false)
  - getTenantModule(tenantId, moduleKey) entity-layer helper
  - isAiCapabilityEnabled(tenantId, capability) guard function
  - AiCapabilityKey type union + AI_CAPABILITY_KEYS const array
  - Barrel exports from @entities/tenant/server and @api/server
affects: [104-02, 104-03, 104-04, 105-dispute-schema, 106-dispute-api]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Drizzle import pattern for AI pool tables via @schema/* → db.ts schema object → @api/server barrel'
    - 'Entity-layer FSD pattern: ai-capabilities.ts wraps getTenantModule for capability checks'
    - 'Seed pattern: createMany with skipDuplicates for idempotent tier quota and cost seeding'

key-files:
  created:
    - prisma/schema.prisma (appended — 4 models + 2 enums)
    - prisma/migrations/20260625133302_add_ai_pool_models/migration.sql
    - src/db/schema/platform-ai-tier-quotas.ts
    - src/db/schema/ai-capability-costs.ts
    - src/db/schema/tenant-ai-usages.ts
    - src/db/schema/ai-usage-events.ts
    - src/entities/tenant/lib/modules/get-tenant-module.ts
    - src/entities/tenant/api/ai-capabilities.ts
  modified:
    - prisma/seed/modules.ts
    - src/entities/tenant/lib/modules/index.ts
    - src/entities/tenant/index.server.ts
    - src/shared/api/server/index.ts
    - src/shared/api/db.ts

key-decisions:
  - 'ENTERPRISE quota set to 500k tokens/month per resolved gate G8 (not 1M)'
  - 'OveragePolicy.HARD_STOP for STANDARD, THROTTLE for PREMIUM, SURCHARGE for ENTERPRISE'
  - 'TenantAiUsage→Tenant FK intentionally omitted — tenantId is a String identifier matched at application layer'
  - 'Drizzle generator uses pluralized table names (platformAiTierQuotas, tenantAiUsages, etc.) per prisma-generator-drizzle convention'

patterns-established:
  - 'getTenantModule follows existing assert-module-enabled.ts Drizzle query pattern (db.select().from().where(and(...)))'
  - 'AI pool tables follow existing db.ts import→schema→re-export pattern for Drizzle table registration'

requirements-completed:
  - AI-PROV-02

# Metrics
duration: 16min
completed: 2026-06-25
---

# Phase 104 Plan 01: AI Pool Database Models & Entity-Layer Foundation Summary

**4 AI pool database models, 2 enums, seeded tier quotas and capability costs, plus getTenantModule helper and AiCapabilityKey type for downstream plans**

## Performance

- **Duration:** 16 min
- **Started:** 2026-06-25T11:29:41Z
- **Completed:** 2026-06-25T11:46:06Z
- **Tasks:** 3
- **Files modified:** 17 (12 new, 5 modified)

## Accomplishments

- 4 new database tables (PlatformAiTierQuota, AiCapabilityCost, TenantAiUsage, AiUsageEvent) with 2 enums migrated to PostgreSQL
- Tier quotas seeded: STANDARD 50k/HARD_STOP, PREMIUM 200k/THROTTLE, ENTERPRISE 500k/SURCHARGE
- Capability cost estimates seeded for all 4 AI capabilities (frivolityScreen, translation, moderation, triage)
- `getTenantModule(tenantId, moduleKey)` entity-layer helper created — returns TenantModule or null
- `isAiCapabilityEnabled(tenantId, capability)` guard with `AiCapabilityKey` type union
- Drizzle schemas generated and wired into db.ts schema + server barrel

## Task Commits

Each task was committed atomically:

1. **Task 1: Add AI pool models + enums to Prisma schema, migrate, and generate** - `ae508ef5` (feat)
2. **Task 2: Seed PlatformAiTierQuota, AiCapabilityCost, and ai-provider PlatformModule** - `f7e89904` (feat)
3. **Task 3: Create getTenantModule helper + AiCapabilityKey type + barrel exports** - `91d335eb` (feat)

## Files Created/Modified

- `prisma/schema.prisma` — Appended 4 models + 2 enums at end of file
- `prisma/migrations/20260625133302_add_ai_pool_models/migration.sql` — Migration SQL (applied manually due to pre-existing shadow DB issue)
- `src/db/schema/platform-ai-tier-quotas.ts` — Drizzle-generated schema for PlatformAiTierQuota
- `src/db/schema/ai-capability-costs.ts` — Drizzle-generated schema for AiCapabilityCost
- `src/db/schema/tenant-ai-usages.ts` — Drizzle-generated schema for TenantAiUsage
- `src/db/schema/ai-usage-events.ts` — Drizzle-generated schema for AiUsageEvent
- `src/db/schema/ai-overage-policy-enum.ts` — Drizzle-generated enum
- `src/db/schema/ai-usage-status-enum.ts` — Drizzle-generated enum
- `src/db/schema/tenant-ai-usages-relations.ts` — Drizzle-generated relations
- `src/db/schema/ai-usage-events-relations.ts` — Drizzle-generated relations
- `src/entities/tenant/lib/modules/get-tenant-module.ts` — getTenantModule helper
- `src/entities/tenant/api/ai-capabilities.ts` — AiCapabilityKey type, isAiCapabilityEnabled, AiProviderModuleConfig
- `prisma/seed/modules.ts` — Added ai-provider module entry + AI pool seed blocks
- `src/entities/tenant/lib/modules/index.ts` — Added getTenantModule barrel export
- `src/entities/tenant/index.server.ts` — Added getTenantModule, isAiCapabilityEnabled, AiCapabilityKey, AiProviderModuleConfig exports
- `src/shared/api/server/index.ts` — Added 4 new Drizzle table re-exports + getTenantModule from @entities/tenant/server
- `src/shared/api/db.ts` — Added 4 new Drizzle table imports + schema object entries + re-exports

## Decisions Made

- Schema applied via direct SQL + manual migration file due to pre-existing shadow database issue (migration `20260624000000_add_user_role_and_seat_lifecycle` fails to apply cleanly to shadow DB — Role enum conflict). This is a pre-existing project condition not caused by this plan.
- `prisma migrate resolve --applied` was attempted but rolled back because the `_prisma_migrations` table was previously empty (DB synced via `prisma db push` historically). Tables exist in the database; migration SQL is committed for reference.
- All acceptance criteria verified via direct DB queries rather than `prisma migrate status` output due to the pre-existing migration tracking gap.

## Deviations from Plan

### Pre-existing Issues Encountered

**1. Prisma shadow database migration failure**

- **Found during:** Task 1 (Prisma migration)
- **Issue:** `prisma migrate dev` failed because migration `20260624000000_add_user_role_and_seat_lifecycle` cannot replay on shadow database — unsafe enum value "USER" of type "Role"
- **Fix:** Applied schema changes via direct SQL (`prisma db execute`), created migration SQL file manually, and verified table/enum existence via `psql`
- **Impact:** Pre-existing project condition. Schema changes applied correctly; migration file committed for reference.

**2. `prisma db push` blocked by pre-existing DB inconsistency**

- **Found during:** Task 1 (Prisma migration)
- **Issue:** `prisma db push` fails with "cannot drop index Property_platformAddress_key because constraint Property_platformAddress_key on table Property requires it"
- **Fix:** Bypassed `db push`, used direct SQL execution instead
- **Impact:** Pre-existing project condition. No schema changes needed to fix this.

---

**Total deviations:** 2 (both pre-existing project conditions, not caused by plan changes)
**Impact on plan:** Minimal — all 4 tables, 2 enums, and seed data exist correctly in the database. Migration SQL is committed for reference.

## Issues Encountered

- Prisma shadow database cannot replay full migration history (pre-existing, filed upstream)
- `prisma db seed` command in package.json points to `seed.ts` at root (missing file) — ran `prisma/seed/modules.ts` directly via `npx tsx`

## Threat Flags

None — no new network endpoints, auth paths, or schema changes at trust boundaries beyond what the threat model documents.

## Next Phase Readiness

- 4 AI pool tables available for downstream plans (104-02 provider factory, 104-03 admin routes, 104-04 pool.ts)
- `getTenantModule(tenantId, 'ai-provider')` ready for provider factory
- `isAiCapabilityEnabled(tenantId, capability)` ready for translate route migration and dispute intake screen
- AiCapabilityKey type and AI_CAPABILITY_KEYS const available for type-safe capability references

---

_Phase: 104-ai-provider-infrastructure-translate-migration_
_Completed: 2026-06-25_
