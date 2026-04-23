---
phase: 08-module-architecture
plan: 01
subsystem: modules
tags: [module-architecture, tier-enforcement, feature-gate]
dependency_graph:
  requires: []
  provides:
    - PlatformModule schema (database + drizzle)
    - TenantModule schema (database + drizzle)
    - assertModuleEnabled API helper
    - FeatureGate component (updated)
  affects:
    - Tenant model (added tier + modules columns)
success_criteria:
  - platform_modules table with 14 modules seeded
  - tenant_modules table for per-tenant overrides
  - tier enforcement at API level (STANDARD < PREMIUM < ENTERPRISE)
  - FeatureGate reads module state from database
tech_stack:
  - Drizzle ORM for module queries
  - Tier enum: STANDARD, PREMIUM, ENTERPRISE
  - React Query for client-side module state
key_files:
  created:
    - src/lib/modules/assert-module-enabled.ts
    - src/lib/modules/require-module.ts
    - src/lib/modules/index.ts
    - src/app/api/tenants/[id]/modules/route.ts
    - src/shared/api/tenant/use-enabled-modules.ts
  modified:
    - src/shared/api/tenant/types.ts (added tier, modules, TenantModuleConfig)
    - src/shared/api/tenant/base.ts (toTenant includes tier)
    - src/shared/api/db.ts (exports platformModules, tenantModules)
    - src/components/tenant/FeatureGate.tsx (uses module system)
    - prisma/seed/modules.ts (fixed tier typing)
decisions:
  - TIER_ORDER: STANDARD=1, PREMIUM=2, ENTERPRISE=3
  - Modules inherit enabled from platform default if no tenant override
  - FeatureGate fetches modules via API endpoint
metrics:
  duration: ~30 minutes
  completed_date: '2026-04-22'
---

# Phase 08 Plan 01: Module Architecture Summary

## Overview

Established NetComplex module architecture with:

- PlatformModule + TenantModule tables
- Tier-based enforcement (STANDARD → PREMIUM → ENTERPRISE)
- FeatureGate component updated to read from database
- API helpers for module enforcement

## Completed Tasks

### 1. Database Schema

- `PlatformModule` table with `minTier` and `defaultEnabled` columns
- `TenantModule` table for per-tenant overrides with `config` jsonb
- `Tier` enum in Prisma schema

### 2. Seeding

- 14 platform modules seeded to database:
  - Core (4): dashboard, auth, notifications, settings
  - Standard (5): directory, groups, maintenance, community-services, content
  - Premium (3): bookings, premium-seats, property-listings
  - Enterprise (2): agent-marketplace, white-label

### 3. Client-Side

- `Tenant` type updated with `tier` and `modules` fields
- `FeatureGate` component now reads module state from API
- `useModuleEnabled` hook for checking specific modules

### 4. Server-Side

- `/api/tenants/[id]/modules` endpoint for fetching enabled modules
- `assertModuleEnabled()` for API route enforcement
- `tierSatisfies()` helper for Drizzle queries

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Export] Added platformModules + tenantModules to db.ts**

- Found during: TypeScript compilation
- Issue: Module schemas not exported from `@api/db`
- Fix: Added imports and exports to db.ts
- Files modified: src/shared/api/db.ts
- Commit: See git log

**2. [Rule 1 - Type Error] Fixed Tier enum in seed script**

- Found during: TypeScript compilation
- Issue: minTier typed as string instead of Tier enum
- Fix: Used const assertion + tierMap record
- Files modified: prisma/seed/modules.ts

**3. [Rule 1 - Missing Property] Added tier to createTenant calls**

- Found during: TypeScript compilation
- Issue: createTenant missing required `tier` property
- Fix: Added `tier: 'STANDARD'` to all createTenant calls
- Files modified:
  - src/app/api/platform/tenants/route.ts
  - src/app/api/admin/platform/tenants/route.ts

## Auth Gates

None - No authentication issues encountered.

## Key Decisions

1. **Tier Hierarchy**: STANDARD (1) → PREMIUM (2) → ENTERPRISE (3)
2. **Default Behavior**: Modules inherit `defaultEnabled` from platform if no tenant override
3. **API Design**: FeatureGate fetches modules via `/api/tenants/[id]/modules`

## Files Created

| Path                                           | Purpose                           |
| ---------------------------------------------- | --------------------------------- |
| `src/lib/modules/assert-module-enabled.ts`     | API helper for module enforcement |
| `src/lib/modules/require-module.ts`            | Drizzle helper functions          |
| `src/lib/modules/index.ts`                     | Barrel export                     |
| `src/app/api/tenants/[id]/modules/route.ts`    | Modules API endpoint              |
| `src/shared/api/tenant/use-enabled-modules.ts` | React Query hooks                 |

## Files Modified

| Path                                    | Change                                               |
| --------------------------------------- | ---------------------------------------------------- |
| `prisma/schema.prisma`                  | Added Tier enum, PlatformModule, TenantModule models |
| `prisma/seed/modules.ts`                | Fixed Tier typing                                    |
| `src/shared/api/tenant/types.ts`        | Added `tier`, `modules`, `TenantModuleConfig`        |
| `src/shared/api/tenant/base.ts`         | toTenant includes tier + modules                     |
| `src/shared/api/db.ts`                  | Exports platformModules, tenantModules               |
| `src/components/tenant/FeatureGate.tsx` | Uses module system                                   |

## Database State

```
Table: PlatformModule (14 rows)
├── Core: dashboard, auth, notifications, settings
├── Standard: directory, groups, maintenance, community-services, content
├── Premium: bookings, premium-seats, property-listings
└── Enterprise: agent-marketplace, white-label

Table: TenantModule (0 rows - ready for per-tenant overrides)
```

## Usage Examples

### API Route Enforcement

```typescript
import { assertModuleEnabled } from '@/lib/modules/assert-module-enabled';

export async function POST(request: Request) {
  await assertModuleEnabled(tenantId, 'maintenance');
  // ... handler logic
}
```

### FeatureGate Component

```tsx
import { FeatureGate } from '@/components/tenant/FeatureGate';

<FeatureGate module="bookings" fallback={<UpgradePrompt />}>
  <BookingPage />
</FeatureGate>;
```

### Check Module Enabled

```typescript
import { useModuleEnabled } from '@api/tenant/use-enabled-modules';

const { isEnabled } = useModuleEnabled(tenantId, 'maintenance');
```

---

## Self-Check: PASSED

- [x] TypeScript compiles without errors
- [x] ESLint passes (warnings only)
- [x] PlatformModule table exists with 14 rows
- [x] TenantModule table exists (empty)
- [x] All new files created and staged
- [x] FeatureGate updated
