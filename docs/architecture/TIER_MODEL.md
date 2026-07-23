# NetComplex Tier Model

## Overview

NetComplex uses a **capability-based tier system** where subscription levels determine which functional modules a tenant can access, how many residents they can support, what storage and API rate limits apply, and which premium features are available.

### Principles

1. **Functional modules** determine access — each module represents a distinct functional area (Directory, Bookings, Maintenance, etc.)
2. **User caps** replace page caps — tenants pay for resident capacity, not page count
3. **Storage and API limits** scale with tier — resource impact drives the pricing, not arbitrary feature count
4. **Optional addenda** — dWallet is available on Foundation+ as an optional data-rights protocol addendum
5. **Soft caps for trial adoption** — announcement, survey, and event counts are soft-capped to drive early engagement; hard storage and API limits prevent abuse

---

## Tier Definitions

### CORE

**Description:** Entry tier for small communities (up to 50 residents, 500 MB storage)

| Property  | Value                                                                                                                                        |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| maxUsers  | 50                                                                                                                                           |
| storageGB | 0.5                                                                                                                                          |
| Modules   | directory, news, events, groups, chat, resources, conservation, education, adminBasic, bookings (free), surveys (basic), maintenance (basic) |
| Limits    | 5 announcements, 5 surveys, 10 events, 1,000 API requests/day                                                                                |
| Color     | `#22C55E`                                                                                                                                    |

### FOUNDATION

**Description:** Growth tier for expanding communities (up to 200 residents, 5 GB storage)

| Property  | Value                                                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| maxUsers  | 200                                                                                                                                |
| storageGB | 5                                                                                                                                  |
| Modules   | All CORE modules + adminIntermediate, surveysAdvanced (builder), marketplace, externalSurveys, merits, dWallet (optional addendum) |
| Limits    | 20 announcements, 20 surveys, 50 events, 5,000 API requests/day                                                                    |
| Color     | `#F59E0B`                                                                                                                          |

### PRO-MAX (ENTERPRISE)

**Description:** Enterprise tier for large HOAs and property management companies (unlimited users, 50 GB storage)

| Property  | Value                                                                                                           |
| --------- | --------------------------------------------------------------------------------------------------------------- |
| maxUsers  | Unlimited                                                                                                       |
| storageGB | 50                                                                                                              |
| Modules   | All FOUNDATION modules + maintenanceTicketing (full workflow), property, agentGateway, analytics, adminAdvanced |
| Limits    | Unlimited announcements, surveys, events, and API requests                                                      |
| Color     | `#1E293B`                                                                                                       |

---

## Module Access Matrix

| Module                | CORE | FOUNDATION  | PRO-MAX |
| --------------------- | ---- | ----------- | ------- |
| Directory             | ✅   | ✅          | ✅      |
| News                  | ✅   | ✅          | ✅      |
| Events                | ✅   | ✅          | ✅      |
| Groups                | ✅   | ✅          | ✅      |
| Chat                  | ✅   | ✅          | ✅      |
| Resources             | ✅   | ✅          | ✅      |
| Conservation          | ✅   | ✅          | ✅      |
| Education Portal      | ✅   | ✅          | ✅      |
| Admin (Basic)         | ✅   | ✅          | ✅      |
| Bookings (free)       | ✅   | ✅          | ✅      |
| Surveys (basic)       | ✅   | ✅          | ✅      |
| Maintenance (basic)   | ✅   | ✅          | ✅      |
| Admin (Intermediate)  | ❌   | ✅          | ✅      |
| Surveys Advanced      | ❌   | ✅          | ✅      |
| Marketplace           | ❌   | ✅          | ✅      |
| External Surveys      | ❌   | ✅          | ✅      |
| Community Merits      | ❌   | ✅          | ✅      |
| dWallet (addendum)    | ❌   | ✅ (opt-in) | ✅      |
| Maintenance Ticketing | ❌   | ❌          | ✅      |
| Property Listings     | ❌   | ❌          | ✅      |
| Agent Gateway         | ❌   | ❌          | ✅      |
| Analytics             | ❌   | ❌          | ✅      |
| Admin (Advanced)      | ❌   | ❌          | ✅      |

---

## Resource Caps

| Resource             | CORE      | FOUNDATION | PRO-MAX   |
| -------------------- | --------- | ---------- | --------- |
| Max users            | 50        | 200        | Unlimited |
| Storage              | 500 MB    | 5 GB       | 50 GB     |
| Active announcements | 5 (soft)  | 20 (soft)  | Unlimited |
| Active surveys       | 5 (soft)  | 20 (soft)  | Unlimited |
| Future events        | 10 (soft) | 50 (soft)  | Unlimited |
| API requests/day     | 1,000     | 5,000      | Unlimited |

> **Soft caps** trigger a dashboard warning but do not block creation.  
> **Hard caps** (users, storage, API) return 403 when exceeded.

---

## Implementation

### Constants Location

All tier and module constants are defined in `src/shared/lib/constants/tiers.ts`:

```typescript
import { TIERS, MODULES, type TierLevel, type ModuleKey } from '@/lib/constants/tiers';
```

### Feature Registry

The feature registry at `src/entities/tenant/api/features/registry.ts` maps pages, features, and widgets to tiers:

```typescript
import { TIERS, MODULES, type TierLevel } from '@shared/lib';
```

### Gate Mappings

The gate layer at `src/entities/tenant/api/gate/mappings.ts` maps `FeatureKey` → module / flag / registry entry for the 5-layer `canAccess()` pipeline.

---

## dWallet: Optional Addendum

dWallet is a Foundation-tier **optional addendum** — tenants on the Foundation plan or above may opt into the data-rights protocol by signing the SaaS agreement addendum. Additional revenue-sharing streams are available on higher tiers.

- **Foundation**: Core dWallet (data consent, basic revenue share)
- **Pro-Max**: Additional revenue streams and premium data pricing

---

## Migration Notes

### Legacy Fields

The following DB columns are retained for backward compatibility but are no longer actively enforced:

- `tenants.maxPages` — replaced by `maxUsers` + `storageGB` + soft caps
- `tenants.subscriptionTier` — legacy string, replaced by `tenants.tier` enum

### Seed Data

Seeded billing plans reference `maxUsers` and `storageGB` from the tier definitions. The billing foundation (Phase 46.1) reads tier caps from `TIERS`.

---

## Related Documentation

- [SPEC.md](./SPEC.md) — Full technical specification
- [src/shared/lib/constants/tiers.ts](../src/shared/lib/constants/tiers.ts) — Tier constants implementation
- [src/entities/tenant/api/features/registry.ts](../src/entities/tenant/api/features/registry.ts) — Feature registry
- [src/entities/tenant/api/gate/mappings.ts](../src/entities/tenant/api/gate/mappings.ts) — Gate mapping tables (used by canAccess)
- [docs/architecture/DWALLET_SPEC.md](./DWALLET_SPEC.md) — dWallet specification
