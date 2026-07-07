# Tenant Context

> **Last updated:** 2026-06-01

## Purpose

Core multi-tenancy infrastructure. Owns tenant identity, tier hierarchy, role-based permissions, and feature gating.

## Directory

`src/entities/tenant/`

## Key Models

| Model          | Description                                     |
| -------------- | ----------------------------------------------- |
| `Tenant`       | SaaS tenant: name, slug, tier, domain, settings |
| `TenantTier`   | Tier classification for the tenant              |
| `TierLevel`    | `'core' \| 'foundation' \| 'depth'`             |
| `StandardSeat` | Household-based resident access right           |
| `SoloSeat`     | Individual resident access right                |
| `PremiumSeat`  | Agent/premium access right                      |

## Exports

- `tenantQueries` — 25+ Drizzle filter functions for tenant-scoped table queries
- `ROLE_PERMISSIONS` — centralized RBAC map (6 roles)
- `hasPermission()`, `requireRole()` — permission helpers
- `FeatureRegistry` — 30+ fine-grained feature toggles
- `TierGuard` — tier-based access control
- `PlatformPageFlags` — 15 DB-stored per-tenant page toggles

## Dependencies (Upstream)

None — this is the root context.

## Dependents (Downstream)

Every other context depends on Tenant for:

- Tenant resolution (`withTenant()`)
- Permission checks (`hasPermission()`)
- Feature gating (`isModuleEnabled()`, `hasFeature()`)
- Seat types (StandardSeat, SoloSeat, PremiumSeat)

## API Surface

No direct REST routes. Infrastructure consumed by all other contexts.

## Prisma Models

`Tenant`, `PlatformModule`, `TenantModule`, `StandardSeat`, `SoloSeat`, `PremiumSeat`

## Open Issues

- [ ] Three overlapping gating systems (Module/Feature/Flag) — see UBIQUITOUS_LANGUAGE.md C2
- [ ] Tier naming mismatch (3 technical vs 4 business tiers) — see UBIQUITOUS_LANGUAGE.md C4
