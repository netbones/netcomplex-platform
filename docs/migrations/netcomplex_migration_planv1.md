---
title: NETCOMPLEX White-Label Multi-Tenant Migration Guide
status: current
reviewed: 2026-07-28
tags: [migration, database]
audience: developer
---

# NETCOMPLEX White-Label Multi-Tenant Migration Guide

**Updated & Reconciled with Current Repository State — April 2026**

---

## Executive Summary

Soralia Village is being transformed from a single-tenant community platform into NetComplex — a white-label SaaS platform hosting multiple community clients on one shared codebase. Soralia Village becomes the first and flagship tenant.

> **Key Finding: You Are Further Along Than the Original Plan Assumes**
> A repository audit found that significant multi-tenant groundwork is already in place. The original plan's Immediate phase is largely complete. This updated guide reorients around what is genuinely missing, not what has already been built.

### What Already Exists in the Repo

| File/Component                | Status                                                             |
| ----------------------------- | ------------------------------------------------------------------ |
| `tenants.ts`                  | Tenants table exists in Drizzle schema                             |
| `organizations.ts`            | Better-Auth organizations + relations wired                        |
| `features/registry.ts`        | Feature registry file already present in lib/features/             |
| `TenantProvider.tsx`          | Tenant context component in src/components/ui/                     |
| `TenantStyles.tsx`            | CSS variable injection component in place                          |
| `lib/tenant.ts`               | Tenant resolution library exists                                   |
| `admin/platform/`             | Super-admin tenant UI scaffolded at /admin/platform/[id]/features/ |
| `api/admin/platform/tenants/` | Tenant management API route exists                                 |
| Migration 20260331            | Multi-tenant migration applied                                     |

---

## 1. Architecture Overview

The architecture follows a shared-codebase, shared-database model with strong tenant isolation enforced at the middleware and query layers.

### Platform Layers

| Layer               | Description                                                                |
| ------------------- | -------------------------------------------------------------------------- |
| NetComplex Platform | app.netbones.co.za — marketing, billing, super-admin                       |
| Tenant Instances    | soralia.netbones.co.za or custom domains — isolated data + branding        |
| Data Layer          | Shared PostgreSQL via Drizzle, tenant_id / organization_id on all tables   |
| Tenant Resolution   | Middleware detects subdomain or custom domain, loads cached config         |
| Theming             | CSS variables injected at layout level for dynamic Tailwind colors + logos |
| Features            | DB-backed toggles + component registry — tenants enable/disable modules    |

### Tenant Resolution Flow

Request arrives → Middleware reads host header → Looks up tenant by slug or customDomain (Redis/Vercel KV cache) → Sets x-tenant-id and x-tenant-slug response headers → Layout reads headers and injects CSS variables → All Drizzle queries scope by tenantId.

> **Local Development — Do This First**
> Set LOCAL_TENANT_SLUG=soralia-village in .env.local. Middleware falls back to this slug in development — Soralia team works entirely unchanged. To test a new tenant: change the env var or use ngrok with a test subdomain.

---

## 2. Gaps & Issues Identified in Repository Audit

The following items were identified by comparing the original migration plan against the actual repository structure. These represent the real remaining work.

### Critical Gaps

#### 2.1 The [lng] Route Segment Is Underdeveloped

The plan places all tenant pages under [lng]/ but the actual [lng]/ folder contains only a locales/ subdirectory — no pages. All real application pages (dashboard, groups, services, etc.) live directly under src/app/ without i18n route wrapping.

> **Risk: Highest-Impact Change — Do Last**
> Moving all pages into [lng]/ touches every route and every link in the application.
> RECOMMENDATION: Defer until Phases 0-3 are stable and proven. Soralia pages stay where they are and use tenant context without the [lng]/ move for now. Define the auth route i18n strategy before any pages move.

#### 2.2 Auth Routes Outside the i18n Segment

sign-in, sign-up, and forgot-password live under (auth)/ with no [lng]/ wrapping. When pages eventually migrate, auth routes need their own resolution strategy — currently undefined. Decision required before the i18n migration begins.

#### 2.3 No Systematic API Route Tenant Enforcement

The repo has 35+ API routes. The plan says 'scope all Drizzle queries by tenantId' but provides no enforcement mechanism. Without a standard pattern, enforcement will be inconsistent and tenant data leakage becomes a real risk.

**Solution — create withTenant() helper:**

```typescript
// src/lib/tenant/with-tenant.ts
import { headers } from 'next/headers';

export async function withTenant() {
  const headersList = headers();
  const tenantId = headersList.get('x-tenant-id');
  const tenantSlug = headersList.get('x-tenant-slug');

  if (!tenantId || !tenantSlug) {
    throw new Error('Tenant not resolved — middleware must run first');
  }

  return { tenantId, tenantSlug };
}
```

---

## 3. Proposed Repository Structure

Items marked NEW are genuinely new additions. Items marked MOVE already exist and need relocating. Items marked EXISTING stay where they are and are built upon.

### Key Additions to src/

| Path                                   | Status                                                               |
| -------------------------------------- | -------------------------------------------------------------------- |
| `src/app/[lng]/`                       | i18n route segment — pages migrate here gradually (Phase 4, do last) |
| `src/app/admin/platform/`              | EXISTING: super-admin tenant UI — keep building here                 |
| `src/app/(auth)/`                      | EXISTING: auth routes — i18n strategy TBD                            |
| `src/components/core/`                 | NEW: Platform-wide standardised UI, design system                    |
| `src/components/tenant/`               | NEW: White-label aware components                                    |
| `src/components/custom/`               | NEW: Bespoke/client-specific slots                                   |
| `src/components/ui/TenantProvider.tsx` | EXISTING — MOVE to components/tenant/                                |
| `src/components/ui/TenantStyles.tsx`   | EXISTING — MOVE to components/tenant/                                |
| `src/components/ui/TierGuard.tsx`      | EXISTING — reconcile with FeatureGate decision                       |
| `src/lib/tenant/`                      | NEW: Expand from existing lib/tenant.ts into a folder                |
| `src/lib/tenant/with-tenant.ts`        | NEW: API route enforcement helper (critical)                         |
| `src/lib/features/tenantFeatures.ts`   | NEW: Per-tenant enabled features + config                            |

---

## 4. Component & Feature Registry

### Component Registry

Centralise in src/components/registry.ts and wire into the existing WidgetRenderer.tsx:

```typescript
// src/components/registry.ts
export const componentRegistry = {
  'dashboard.stats': { component: StatsWidget, defaultEnabled: true },
  'services.grid': { component: ServicesGrid, defaultEnabled: true },
  'dashboard.agent': { component: AgentWidget, requiredPlan: 'premium' },
  'dashboard.premium': { component: PremiumPortfolioWidget, requiredPlan: 'premium' },
  'custom.hero': { component: BespokeHeroSlot },
} as const;
```

### Feature Registry

Extend the existing src/lib/features/registry.ts — do not replace it:

```typescript
export const availableFeatures = [
  { id: 'dashboard', label: 'Dashboard', defaultEnabled: true },
  { id: 'services-marketplace', label: 'Community Services', defaultEnabled: true },
  { id: 'bookings', label: 'Bookings', defaultEnabled: false },
  { id: 'conservation', label: 'Conservation', defaultEnabled: true },
  { id: 'premium-portfolio', label: 'Premium Seats', defaultEnabled: false },
  { id: 'directory', label: 'Directory', defaultEnabled: true },
  { id: 'groups', label: 'Groups', defaultEnabled: true },
] as const;
```

### Per-Tenant Feature Storage

Store feature selections in the existing tenants table:

```typescript
enabledFeatures: json('enabled_features').$type<FeatureId[]>();
```

---

## 5. Branding & Theming

TenantStyles.tsx already exists. The work here is wiring it to dynamic values from the database rather than hardcoded Soralia defaults.

### Root Layout Integration

```typescript
const tenant = await getCurrentTenant(); // uses existing lib/tenant.ts

return (
  <html style={{
    '--primary': tenant?.primaryColor || '#3b82f6',
    '--accent':  tenant?.accentColor  || '#10b981',
  } as React.CSSProperties}>
    <body>
      <img src={tenant?.logoUrl || '/netcomplex-default-logo.svg'} alt={tenant?.name} />
      {children}
    </body>
  </html>
);
```

Ensure tailwind.config.cjs references CSS variables for primary and accent so Tailwind utilities pick up dynamic tenant theming.

---

## 6. Revised Migration Phases

The original phase ordering has been revised based on the repository audit. Highest-risk changes are deferred; foundational work is front-loaded.

| Phase                 | Timing               | Key Tasks                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 0 Foundation    | This week (do first) | 1. Set LOCAL_TENANT_SLUG=soralia-village in .env.local — unblocks Soralia dev immediately 2. Create withTenant() helper in src/lib/tenant/with-tenant.ts 3. Seed Soralia Village as tenant #1 with all features enabled and current branding values 4. Decide TierGuard vs FeatureGate — document the decision before building 5. Decide /admin/platform/ vs /platform/ — pick one canonical super-admin surface |
| Phase 1 Enforcement   | Week 1-2             | 1. Audit all 35+ API routes — apply withTenant() to each 2. Wire CSS variables to tenant DB values in TenantStyles.tsx 3. Move TenantProvider and TenantStyles into src/components/tenant/ 4. Build or reconcile FeatureGate — wrap toggleable routes and nav items 5. Consolidate duplicate locale files to one canonical location                                                                              |
| Phase 2 Admin UI      | Week 2-4             | 1. Build tenant admin UI at /admin/platform/ for feature assignment + branding upload 2. Add data migration script to back-populate tenant records for existing data 3. Build feature toggle interface — what features each tenant can enable                                                                                                                                                                    |
| Phase 3 Second Tenant | TBD                  | 1. Onboard second tenant (not Soralia) 2. Enable RLS on tenant-scoped tables 3. Test complete tenant isolation 4. Verify custom domain setup flow                                                                                                                                                                                                                                                                |

---

## 7. Security & Best Practices

> **Non-Negotiable Before Second Tenant Onboarding**
> All items below must be in place before any tenant other than Soralia is onboarded. A data leak between tenants is a critical incident — enforce these systematically.

### Tenant Isolation Rules

1. Never trust client-provided tenant IDs — always resolve from middleware headers set server-side.
2. withTenant() must be called at the top of every API route handler — no exceptions.
3. All Drizzle queries must include a tenantId where clause — use query helper wrappers to enforce this pattern.
4. Verify tenant membership via Better-Auth organization plugin on all authenticated actions.
5. Cache tenant config aggressively (Redis/Vercel KV) but invalidate on branding or feature changes.

### Row Level Security (RLS)

Enable RLS on all tenant-scoped tables as a defense-in-depth measure. Even if application-layer scoping has a bug, RLS prevents cross-tenant data access at the database level. Implement in Phase 3 alongside second-tenant onboarding.

### Custom Domains

Use the Vercel API to add custom domains programmatically when tenants configure their own domain. Validate domain ownership before activating. Ensure middleware handles the full custom domain lookup path, not just subdomain patterns.

---

## 8. Local Development Workflow

| Item                | Workflow                                                                   |
| ------------------- | -------------------------------------------------------------------------- |
| Default tenant      | Set LOCAL_TENANT_SLUG=soralia-village in .env.local                        |
| Soralia development | No change to existing workflow — middleware resolves Soralia automatically |
| Test new tenant     | Change env var to new slug, or use ngrok with a test subdomain             |
| Feature testing     | Use admin UI at /admin/platform/ to toggle features per tenant             |
| DB seeding          | Run seed script — ensure Soralia exists as tenant #1 before any dev work   |

---

## 9. Ongoing Development Conventions

1. New features go into core/ or lib/features/ — never hardcoded to a specific tenant.
2. Tenant-specific content goes through slot-based custom sections or MDX in DB — never as code branches.
3. All new API routes must call withTenant() as their first operation.
4. All new Drizzle queries must be scoped by tenantId — use the shared query helper wrappers.
5. Component moves follow the mapping table in Section 3 — migrate on contact, not in bulk.
6. The [lng]/ route migration is out of scope until Phases 0-3 are complete and proven.

---

_NetComplex Migration Guide — Updated April 2026 — Internal Use Only_
