---
title: NetComplex Module Architecture — Design Decisions
status: current
reviewed: 2026-07-28
tags: [steering, governance]
audience: all
---

# NetComplex Module Architecture — Design Decisions

**Date:** 2026-04-22  
**Participants:** Platform team  
**Source:** Discussion re: metasite requirements vs. current implementation

---

## Context

Reviewed the [netcomplex_modular_services_architecture](./netcomplex_modular_services_architecture.html) document alongside our current implementation. The original document proposes a four-tier model (Core, Standard, Premium, Enterprise). We agreed on flexibility around tier names while the marketing team finalizes naming.

---

## Decisions Made

### 1. Feature Flags — Keep String Constants, Add Tier Enforcement

**Current state:** Feature flags as string constants (`feature.facilityBooking`)  
**Problem:** No tier enforcement behind them

**Decision:** Keep the FEATURES pattern in `src/entities/features/registry.ts` as the canonical string key store. Add `min_tier` to `platform_modules` table for enforcement. FeatureGate continues reading string flags — the registry is the source of truth for tier-gating.

**Tier mapping:**
| Internal | Notes |
|----------|-------|
| `standard` | Base tier, default |
| `premium` | Paid tier |
| `enterprise` | Bespoke/high-cost |

Marketing picks display labels. We stay flexible.

---

### 2. Module Registry — Priority #1

**Problem:** No `platform_modules` + `tenant_modules` tables. Can't query module enablement for billing/analytics, no audit trail, no tier enforcement path.

**Decision:** Create two new tables:

```prisma
model PlatformModule {
  id             String   @id @default(cuid())
  key            String   @unique  // 'bookings', 'maintenance'
  label          String            // 'Facility Booking'
  minTier        Tier     @default(STANDARD)
  defaultEnabled Boolean @default(false)
  description    String?

  tenantModules TenantModule[]
}

model TenantModule {
  id        String   @id @default(cuid())
  tenantId  String
  moduleKey String  // FK → PlatformModule.key
  enabled   Boolean @default(false)
  config    Json?   // Per-module overrides
  enabledAt DateTime?

  tenant Tenant @relation(...)
  module PlatformModule @relation(...)
}

model Tenant {
  // ... existing fields
  tier Tier @default(STANDARD)  // Add to existing tenants table
}
```

**Tables provide:**

- Queryability: "Which tenants have bookings enabled"
- Per-module config: `"Soralia has 0 venues"`, custom labels
- Audit trail: `enabled_at` for billing, support, churn
- Tier enforcement: `min_tier` on platform_modules

---

### 3. Collapse TierGuard + FeatureGate

**Problem:** Current complexity — TierGuard for tier, FeatureGate for flags

**Decision:** Collapse into FeatureGate. Tier check becomes implicit: if module isn't in `tenant_modules` list (filtered by tenant tier), it's gated. Middleware stays for coarse-grained route protection only.

---

### 4. Config Per Tenant Module

**Decision:** Add `config jsonb` to `tenant_modules`. Stores per-module overrides without schema changes.

---

## What's NOT Changing

- FEATURES string constants — they remain canonical keys
- FeatureGate component — it reads from tables, not replacing the component
- Existing maintenance + bookings functionality — they'll use the new system
- Tenant branding/settings — stays on `tenants` table

---

## Module Availability (Current Mapping)

| Module             | Tier     | Status                              |
| ------------------ | -------- | ----------------------------------- |
| Dashboard          | Core     | Always on                           |
| Directory          | Standard | Enabled                             |
| Groups             | Standard | Enabled                             |
| Maintenance        | Standard | Enabled                             |
| Community services | Standard | Enabled                             |
| Bookings           | Premium  | Module ready, gated by feature flag |

---

## Next Steps

**Phase 08: Module Architecture Foundation**

1. Create `platform_modules` table + seed data
2. Create `tenant_modules` table
3. Add `tier` to `tenants` table
4. Create `assertModuleEnabled()` API helper
5. Create `requireModule()` Drizzle helper
6. Update FeatureGate to read from tables
7. Migrate maintenance + bookings to use new system
