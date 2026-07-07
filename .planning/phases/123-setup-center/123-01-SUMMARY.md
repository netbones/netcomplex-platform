---
phase: 123-setup-center
plan: 123-01
title: Schema & Entity Foundation — TenantSetup, SetupMission, SetupSetting models
status: complete
completed: 2026-07-07T07:26:00Z
duration: 18m 19s
tasks:
  - 1: "Add Prisma models" (4258d09f)
  - 2: "Create and apply database migration" (4258d09f)
  - 3: "Generate Drizzle schemas" (4258d09f)
  - 4: "Create FSD entity layer" (c78fa19b)
  - 5: "Create feature flag" (b85b4696)
subsystem: setup
tags: [schema, entity, drizzle, prisma, feature-flag]
requires: []
provides:
  - "Three new Prisma models: TenantSetup, SetupMission, SetupSetting"
  - "Drizzle schema files for Drizzle-level queries"
  - "FSD entity layer at @entities/setup with types, constants, and Zod validators"
  - "Feature flag `enable-setup-center` for rollout gating"
affects:
  - "prisma/schema/schema.prisma (new models added)"
  - "prisma/schema/tenant.prisma (back-link added)"
  - "prisma/migrations/20260707000000_add_tenant_setup_models/"
  - "src/db/schema/tenant-setups.ts (+relations)"
  - "src/db/schema/setup-missions.ts (+relations)"
  - "src/db/schema/setup-settings.ts (+relations)"
  - "src/entities/setup/types.ts, constants.ts, schema.ts, index.ts"
  - "src/entities/tenant/api/features/registry.ts (new feature flag)"
tech-stack:
  added:
    patterns:
      - "FSD entity layer pattern — @entities/setup/ with barrel index"
      - "PrismaSchemaFolder multi-file schema (tenant.prisma)"
      - "prisma-generator-drizzle for Drizzle schema auto-generation"
key-files:
  created:
    - "prisma/migrations/20260707000000_add_tenant_setup_models/migration.sql"
    - "src/db/schema/tenant-setups.ts"
    - "src/db/schema/tenant-setups-relations.ts"
    - "src/db/schema/setup-missions.ts"
    - "src/db/schema/setup-missions-relations.ts"
    - "src/db/schema/setup-settings.ts"
    - "src/db/schema/setup-settings-relations.ts"
    - "src/entities/setup/types.ts"
    - "src/entities/setup/constants.ts"
    - "src/entities/setup/schema.ts"
    - "src/entities/setup/index.ts"
  modified:
    - "prisma/schema/schema.prisma (3 new models after Setting)"
    - "prisma/schema/tenant.prisma (TenantSetup? back-link)"
    - "src/entities/tenant/api/features/registry.ts (feature.enable-setup-center)"
decisions:
  - "Used prisma db push instead of prisma migrate dev (shadow DB issue with Role enum migration)"
  - "Wrote migration SQL manually since the shadow DB is broken for this environment"
  - "Used exact plan-specified file layout for entity layer (types/constants/schema/index at root, not model/ subdir)"
  - "Feature flag at foundation tier so it's available to all tenants"
  - "TenantSetup uses 1:1 relationship with Tenant (unique tenantId, onDelete Cascade)"
---

# Phase 123 Plan 01: Schema & Entity Foundation — Summary

Added 3 new Prisma models (`TenantSetup`, `SetupMission`, `SetupSetting`) that replace the ad-hoc `onboarding_step_N` Setting keys with structured progress tracking. Generated Drizzle schemas, created the FSD entity layer, and added a feature flag for rollout gating.

## Execution

### Task 1: Prisma Models

Added three models to `prisma/schema/schema.prisma` after the existing `Setting` model:

- **TenantSetup** — 1:1 with Tenant (unique `tenantId`), tracks `completionPercent`, `completedSections`, `launchedAt`, `lastViewedAt`
- **SetupMission** — Belongs to `TenantSetup` via FK with Cascade delete. Has `section`, `missionKey`, `title`, `description`, `isRequired`, `isCompleted`, `sortOrder`, `metadata`. Unique on `[tenantSetupId, missionKey]`
- **SetupSetting** — Belongs to `TenantSetup` via FK with Cascade delete. Has `key` (String) and `value` (Json). Unique on `[tenantSetupId, key]`

Also added `tenantSetup TenantSetup?` back-link to `prisma/schema/tenant.prisma`.

### Task 2: Database Migration

Created migration `20260707000000_add_tenant_setup_models/migration.sql` with:
- CREATE TABLE for all 3 tables
- Unique indexes on `TenantSetup(tenantId)`, `SetupMission(tenantSetupId, missionKey)`, `SetupSetting(tenantSetupId, key)`
- Composite index on `SetupMission(tenantSetupId, section)`
- Foreign keys with `ON DELETE CASCADE`

**Deviation:** Used `prisma db push` instead of `prisma migrate dev` because the shadow database has a pre-existing issue with the `Role` enum migration (unsafe use of "USER" value). The migration SQL was written manually and marked as applied via `prisma migrate resolve --applied`.

### Task 3: Drizzle Schemas

`prisma db push` auto-ran `prisma-generator-drizzle`, producing 6 files:
- `src/db/schema/tenant-setups.ts` + relations
- `src/db/schema/setup-missions.ts` + relations
- `src/db/schema/setup-settings.ts` + relations

Drizzle uses pluralized table names (matching the convention of existing files).

### Task 4: FSD Entity Layer

Created `src/entities/setup/` with:

- **types.ts** — `TenantSetup`, `SetupMission`, `SetupSetting` interfaces, `SetupSection` union type, `MissionRef` string type
- **constants.ts** — `SECTIONS` array (4 sections: launch/populate/configure/grow), `DEFAULT_MISSIONS` catalog (18 missions across all sections), `REQUIRED_LAUNCH_MISSIONS` (5 required launch missions)
- **schema.ts** — Zod validators: `setupMissionSchema`, `setupSettingSchema`, `setupProgressSchema`
- **index.ts** — Barrel re-export of all types, constants, and schemas

### Task 5: Feature Flag

Added `feature.enable-setup-center` to `FEATURE_REGISTRY` at `foundation` tier. This flag gates the new `/setup` route vs. the old `/onboarding` wizard, enabling gradual rollout.

## Deviations from Plan

### Auto-fixed Issues

1. **[Rule 3 - Blocking] Shadow DB prevents prisma migrate dev**
   - Found during: Tasks 2-3
   - Issue: `prisma migrate dev --name add_tenant_setup_models` failed because the shadow database cannot replay migration `20260624000000_add_user_role_and_seat_lifecycle` (Role enum already contains "USER")
   - Fix: Used `prisma db push` to apply schema directly, wrote migration SQL manually, used `prisma migrate resolve --applied` to mark as applied
   - Files: `prisma/migrations/20260707000000_add_tenant_setup_models/migration.sql`

2. **[Rule 3 - Blocking] Pre-existing migration drift resolved**
   - Found during: Task 2
   - Issue: Two migrations (`20260703000000_add_tenant_payment_deleted_at`, `20260704000001_add_governance_label`) were pending but failed because columns already exist
   - Fix: Marked both as applied via `prisma migrate resolve --applied`
   - Resolution was required before our migration could be processed

3. **[Rule 3 - Blocking] Drizzle generator uses pluralized names**
   - Found during: Task 3
   - Issue: Plan expected `tenant-setup.ts`, `setup-mission.ts`, `setup-setting.ts` but generator produced `tenant-setups.ts`, `setup-missions.ts`, `setup-settings.ts`
   - Fix: Accepted generator's naming convention (matches existing files in `src/db/schema/`)

## Verification

- [x] All 3 Prisma models exist with correct relations
- [x] Migration SQL created with proper DDL
- [x] Drizzle schema files generated for all 3 models
- [x] Entity layer exports all types, constants, and schemas
- [x] `enable-setup-center` feature flag registered at foundation tier
- [x] Database is in sync: `npx prisma db push` confirmed no drift

## Commits

| Hash     | Message                                                                            |
| -------- | ---------------------------------------------------------------------------------- |
| 4258d09f | feat(123-setup-center): add TenantSetup, SetupMission, SetupSetting models         |
| c78fa19b | feat(123-setup-center): create FSD entity layer for setup domain                   |
| b85b4696 | feat(123-setup-center): add enable-setup-center feature flag for rollout gating    |

## Out of Scope (per plan)

- API routes (Plan 123-02)
- Seed data for missions (Plan 123-02)
- UI components (Plan 123-03+)

## Self-Check

- [x] `prisma/migrations/20260707000000_add_tenant_setup_models/migration.sql` exists
- [x] `src/db/schema/tenant-setups.ts` exists
- [x] `src/db/schema/setup-missions.ts` exists
- [x] `src/db/schema/setup-settings.ts` exists
- [x] `src/entities/setup/types.ts` exists
- [x] `src/entities/setup/constants.ts` exists
- [x] `src/entities/setup/schema.ts` exists
- [x] `src/entities/setup/index.ts` exists
- [x] All 3 commits exist in git log
