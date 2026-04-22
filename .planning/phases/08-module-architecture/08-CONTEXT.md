# Phase 08 Context

## Decisions Made

### Module Registry (Priority #1)

- Two tables: `platform_modules` + `tenant_modules`
- `tier` column on `tenants` table
- `config jsonb` on `tenant_modules` for per-module overrides

### Tier Mapping

| Internal     | Notes              |
| ------------ | ------------------ |
| `standard`   | Base tier, default |
| `premium`    | Paid tier          |
| `enterprise` | Bespoke/high-cost  |

Marketing picks display labels. We stay flexible.

### Collapse TierGuard + FeatureGate

- FeatureGate reads from tables
- Tier check becomes implicit
- Middleware stays for coarse-grained route protection

### Module Availability

| Module             | Tier     | Status              |
| ------------------ | -------- | ------------------- |
| Dashboard          | Core     | Always on           |
| Directory          | Standard | Enabled             |
| Groups             | Standard | Enabled             |
| Maintenance        | Standard | Enabled             |
| Community services | Standard | Enabled             |
| Bookings           | Premium  | Module ready, gated |

## Requirements

1. `platform_modules` table + seed data
2. `tenant_modules` table
3. `tier` on tenants
4. `assertModuleEnabled()` helper
5. `requireModule()` Drizzle helper
6. Update FeatureGate
7. Migrate existing features
