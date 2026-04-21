# NetComplex Tier Model

> **Reference:** This document defines the multi-tenant tier system for NetComplex. See [SPEC.md](./SPEC.md) for the full technical specification.

## Overview

NetComplex uses a **module-based tier system** where subscription levels determine which functional modules a tenant can access. This approach replaces the traditional "page count" model with a more meaningful distinction based on the capabilities required by residential communities.

### Principles

1. **Functional modules** determine access - each module represents a distinct functional area (Directory, Bookings, Chat, etc.)
2. **maxPages** is retained to prevent abuse - but is a secondary constraint
3. **modules** JSONB array enables future flexibility - tenants can have custom module bundles
4. **All tenants have custom branding** - this is standard, not a tiered feature

---

## Module Definitions

| Module Key          | Display Name         | Description                                 | Default Tier |
| ------------------- | -------------------- | ------------------------------------------- | ------------ |
| `directory`         | Directory            | Resident directory with search and profiles | Foundation   |
| `news`              | News                 | Community news and announcements            | Foundation   |
| `events`            | Events               | Community events calendar                   | Foundation   |
| `groups`            | Groups               | Interest groups and memberships             | Foundation   |
| `chat`              | Chat                 | Real-time community messaging               | Foundation   |
| `resources`         | Resources            | Community library/bookshelf                 | Foundation   |
| `campaign`          | Campaign             | Campaigns like Conservation area features   | Foundation   |
| `adminBasic`        | Admin (Basic)        | Basic community administration              | Foundation   |
| `adminIntermediate` | Admin (Intermediate) | Expanded admin for growing communities      | Depth        |
| `bookings`          | Bookings             | Facility booking system                     | Depth        |
| `surveys`           | Surveys              | Community polls and surveys                 | Depth        |
| `marketplace`       | Marketplace          | Services directory                          | Depth        |
| `externalSurveys`   | External Surveys     | Third-party survey integration              | Depth        |
| `maintenance`       | Maintenance          | Maintenance request tracking                | Core         |
| `property`          | Property             | Property listings (buy/rent)                | Core         |
| `agentGateway`      | Agent Gateway        | Real estate agent management                | Core         |
| `analytics`         | Analytics            | Advanced analytics dashboard                | Core         |
| `adminAdvanced`     | Admin (Advanced)     | Full admin with analytics                   | Core         |
| `web3`              | Web3                 | Web3 Identity                               | Core         |

---

## Tier Definitions

### FOUNDATION

**Description:** Entry tier for small communities (up to 50 units)

| Property | Value                                                                      |
| -------- | -------------------------------------------------------------------------- |
| maxPages | 5                                                                          |
| Modules  | directory, news, events, groups, chat, resources, conservation, adminBasic |
| Color    | `#22C55E` (green-500)                                                      |

### DEPTH

**Description:** Growth tier for expanding communities (up to 200 units)

| Property | Value                                                                                       |
| -------- | ------------------------------------------------------------------------------------------- |
| maxPages | 15                                                                                          |
| Modules  | All Foundation modules + adminIntermediate, bookings, surveys, marketplace, externalSurveys |
| Color    | `#F59E0B` (amber-500)                                                                       |

### CORE

**Description:** Enterprise tier for large HOAs and property management companies

| Property | Value                 |
| -------- | --------------------- |
| maxPages | -1 (unlimited)        |
| Modules  | All 18 modules        |
| Color    | `#1E293B` (slate-800) |

---

## Module Access Matrix

| Module                  | Foundation | Depth | Core |
| ----------------------- | ---------- | ----- | ---- |
| Directory               | ✅         | ✅    | ✅   |
| News                    | ✅         | ✅    | ✅   |
| Events                  | ✅         | ✅    | ✅   |
| Groups                  | ✅         | ✅    | ✅   |
| Chat                    | ✅         | ✅    | ✅   |
| Resources               | ✅         | ✅    | ✅   |
| Campaign (Conservation) | ✅         | ✅    | ✅   |
| Admin (Basic)           | ✅         | ✅    | ✅   |
| Maintenance             | ✅         | ✅    | ✅   |
| Admin (Intermediate)    | ❌         | ✅    | ✅   |
| Bookings                | ❌         | ✅    | ✅   |
| Surveys                 | ❌         | ✅    | ✅   |
| Marketplace             | ❌         | ✅    | ✅   |
| External Surveys        | ❌         | ✅    | ✅   |
| Property                | ❌         | ❌    | ✅   |
| Agent Gateway           | ❌         | ❌    | ✅   |
| Analytics               | ❌         | ❌    | ✅   |
| Admin (Advanced)        | ❌         | ❌    | ✅   |
| Web3                    | ❌         | ❌    | ✅   |

---

## Implementation

### Constants Location

All tier and module constants are defined in `src/lib/constants/tiers.ts`:

```typescript
import { TIERS, MODULES, type TierLevel, type ModuleKey } from '@/lib/constants/tiers';

// Check if a module is available for a tier
function hasModuleAccess(tier: TierLevel, module: ModuleKey): boolean {
  const tierModules = TIERS[tier].modules;
  return tierModules.includes(module);
}

// Example: Check if bookings is available
const canAccessBookings = hasModuleAccess(tenantTier, 'bookings');
```

### Database Schema

The `Platform` model includes an optional `modules` JSONB field for future flexibility:

```prisma
model Platform {
  id              String   @id @default(cuid())
  name            String
  slug            String   @unique
  subscriptionTier String   @default("sprout") // sprout, grove, forest
  modules         Json?    // Custom module bundle, e.g., ["directory", "bookings", "chat"]
  // ... other fields
}
```

### Checking Module Access

```typescript
import { TIERS, hasModuleAccess } from '@/lib/constants/tiers';

export function canAccessModule(tenantTier: string, moduleKey: string): boolean {
  return hasModuleAccess(tenantTier as TierLevel, moduleKey as ModuleKey);
}

// Usage in components
const showBookings = canAccessModule(tenant.subscriptionTier, 'bookings');
```

---

## Migration Notes

### Existing Tenants

- Existing tenants with `subscriptionTier: 'sprout'` → Foundation
- Existing tenants with `subscriptionTier: 'grove'` → Depth
- Existing tenants with `subscriptionTier: 'forest'` → Core

### PremiumSeat

The `PremiumSeat.tier` field defaults to `'foundation'`:

```prisma
model PremiumSeat {
  // ...
  tier String @default("foundation")
}
```

---

## Open Questions

### Tier Naming Convention

The current tier names (Foundation, Depth, Core) may be counter-intuitive for sales and marketing purposes. Consider renaming to more intuitive names:

| Current    | Alternative Options           | Notes                              |
| ---------- | ----------------------------- | ---------------------------------- |
| Foundation | Starter, Basic, Entry         | Entry-level tier                   |
| Depth      | Growth, Professional, Plus    | Mid-tier for expanding communities |
| Core       | Enterprise, Premium, Ultimate | Full-featured tier                 |

**Pending Decision:** Should tier names be changed to be more sales-friendly? The current names are technically descriptive but may not resonate with non-technical stakeholders.

**Default Tier Note:** Currently, new tenants default to `Foundation` tier. The PremiumSeat model uses `foundation` as the default value.

---

## Related Documentation

- [SPEC.md](./SPEC.md) - Full technical specification
- [src/lib/constants/tiers.ts](../src/lib/constants/tiers.ts) - Tier constants implementation
- [src/lib/features/registry.ts](../src/lib/features/registry.ts) - Feature registry (uses tiers.ts)
