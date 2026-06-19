# Phase 46: Provider Platform - Research

**Researched:** 2026-06-19
**Domain:** Provider economy (analytics, dashboard, registration, billing)
**Confidence:** HIGH

## Summary

Phase 46 ships the Provider Platform cluster: provider analytics (kia), provider dashboard (9e8), third-party provider registration (69c), and provider billing & subscription (4fh). The codebase already has significant provider infrastructure — a `ServiceProvider` Drizzle table, `CommunityServiceListing` with `providerId` FK, inquiry/review flows, and existing analytics routes. The gap is **provider-facing features**: providers currently have no dedicated dashboard, no registration flow, no billing, and no analytics scoped to _their_ listings rather than admin-wide analytics. The existing analytics route (`/api/community-services/analytics`) is admin-only; providers need their own scoped view.

The billing feature (4fh) is the highest-risk item. No payment processor (Stripe, etc.) exists in the codebase. The SaaS agreement references Schedule F revenue sharing and Schedule G (dWallet), but those are _platform_ revenue flows — Phase 46's billing is about _provider_ billing (providers paying the platform for listings, or residents paying providers). The PremiumModelNote.md mentions "Add billing integration (Stripe/PayPal)" as not-yet-implemented. This feature likely requires a new payment processor integration, but the scope may be narrower than full Stripe Checkout — it depends on what "billing & subscription" means in context (BD items had no descriptions retrievable).

**Primary recommendation:** Build on existing `ServiceProvider` + `CommunityServiceListing` schemas; add a `providers` dashboard space with provider-scoped widgets; gate registration behind `requireAnyPermission(['directory'])` pattern; defer Stripe integration planning until the billing scope is confirmed via discuss-phase.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- Phase 46 covers exactly 4 BD features: kia (analytics), 9e8 (dashboard), 69c (registration), 4fh (billing/subscription)
- Phase 46 is independent of Phase 45, 47, 50 (no dependencies)
- Orphan items p81.1 and rbs.1 are auto-closed (out of scope)

### Agent's Discretion

- Technical architecture for each of the 4 features
- Order/priority of implementation
- Which existing patterns to reuse vs extend

### Deferred Ideas (OUT OF SCOPE)

- Service Marketplace cluster (gtm, cp8, qx7, 4vk — Phase 50)
- dWallet (Phase 47)
- M5a hardening (Phase 44)
- M4.5 fixes (Phase 43)
  </user_constraints>

<phase_requirements>

## Phase Requirements

| ID  | Description                       | Research Support                                                                                                             |
| --- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| kia | Provider analytics                | Existing analytics route pattern at `src/app/api/community-services/analytics/route.ts`; extend with provider-scoped queries |
| 9e8 | Provider dashboard                | Existing dashboard space architecture (`spaces.ts`, `widgets.ts`); add `providers` SpaceId + ProviderLayer component         |
| 69c | Third-party provider registration | Existing `ServiceProvider` schema + `maintenance/providers` API pattern; add self-service registration flow                  |
| 4fh | Provider billing & subscription   | No existing payment infrastructure; PremiumModelNote.md references future Stripe integration; scope needs clarification      |

</phase_requirements>

## Architectural Responsibility Map

| Capability                      | Primary Tier       | Secondary Tier        | Rationale                                                                               |
| ------------------------------- | ------------------ | --------------------- | --------------------------------------------------------------------------------------- |
| Provider analytics queries      | API / Backend      | Database              | SQL aggregations over listings/inquiries/reviews tables                                 |
| Provider dashboard UI           | Browser / Client   | Frontend Server (SSR) | Widget rendering is client-side; data fetched via server components/ISR                 |
| Provider registration flow      | API / Backend      | Browser / Client      | Form is client-side, but validation, duplicate detection, and DB writes are server-side |
| Provider billing & subscription | API / Backend      | CDN / Static          | Payment processing is entirely server-side; pricing pages could be ISR/static           |
| Provider-scoped data filtering  | Database / Storage | API / Backend         | All provider queries must filter by `providerId` + `tenantId`                           |

## Standard Stack

### Core

| Library                 | Version   | Purpose                 | Why Standard                                                                             |
| ----------------------- | --------- | ----------------------- | ---------------------------------------------------------------------------------------- |
| drizzle-orm             | installed | DB queries              | Project ORM — all API routes use Drizzle [VERIFIED: codebase]                            |
| @api/server barrel      | installed | Shared API helpers      | `db`, `requireAnyPermission`, `apiSuccess`, `apiError`, etc. [VERIFIED: codebase]        |
| withTenant              | installed | Tenant isolation        | `@entities/tenant/server` — all provider routes must use [VERIFIED: codebase]            |
| CommunityServiceListing | installed | Provider listing schema | Drizzle table with `providerId`, `providerType`, `status`, `rating` [VERIFIED: codebase] |
| ServiceProvider         | installed | Provider entity schema  | Drizzle table — id, tenantId, companyName, trade, isActive [VERIFIED: codebase]          |

### Supporting

| Library                   | Version   | Purpose             | When to Use                                                                                                  |
| ------------------------- | --------- | ------------------- | ------------------------------------------------------------------------------------------------------------ |
| react-hook-form + zod     | installed | Form validation     | Provider registration form, billing forms [VERIFIED: codebase]                                               |
| TanStack Query            | installed | Server state        | Dashboard widget data fetching [VERIFIED: codebase]                                                          |
| Zustand                   | installed | Client state        | Provider dashboard UI state [VERIFIED: codebase]                                                             |
| (none — no chart library) | —         | —                   | Existing analytics widget uses numeric stat cards only; add chart library only if visual charts are required |
| sonner                    | installed | Toast notifications | Mutation feedback [VERIFIED: codebase]                                                                       |

### Alternatives Considered

| Instead of                     | Could Use                    | Tradeoff                                                                                                                                                           |
| ------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| New `providers` permission key | Reuse `directory` permission | `directory` already controls community directory access; providers are a separate concern — adding a dedicated key is cleaner but requires ROLE_PERMISSIONS update |
| Stripe for billing             | Manual invoice / EFT         | SaaS agreement specifies EFT payments; Stripe adds complexity but provides webhook-based subscription management. Scope depends on 4fh requirements                |

**Installation:**

```bash
# No new packages needed for kia/9e8/69c — all built on existing stack
# For 4fh (billing), a payment library may be needed — TBD after discuss-phase
```

**Version verification:** All core libraries verified present in codebase imports. No new external packages required for 3 of 4 features.

## Package Legitimacy Audit

> No new external packages are introduced in this phase for kia/9e8/69c features. The billing feature (4fh) may require a payment library — that audit will happen in Phase 46 planning after scope is confirmed.

| Package    | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
| ---------- | -------- | --- | --------- | ----------- | ------- | ----------- |
| (none new) | —        | —   | —         | —           | —       | —           |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
Resident Browser                Provider Browser              Admin Browser
     │                               │                             │
     │  GET /community-services      │  GET /api/providers/*       │  GET /api/community-services/analytics
     │  (browse listings)            │  (provider dashboard)       │  (admin analytics)
     ▼                               ▼                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Next.js App Router (Vercel)                          │
│                                                                         │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │ /api/         │  │ /api/providers/  │  │ /api/community-services/ │  │
│  │ maintenance/  │  │ dashboard        │  │ analytics (existing)     │  │
│  │ providers     │  │ analytics        │  │ listings (existing)      │  │
│  │ (existing)    │  │ register         │  │ provider/inquiries       │  │
│  │               │  │ billing          │  │ (existing)               │  │
│  └──────┬───────┘  └────────┬─────────┘  └────────────┬─────────────┘  │
│         │                   │                          │                │
│         ▼                   ▼                          ▼                │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              Auth Layer (withTenant + requireAnyPermission)       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│         │                   │                          │                │
│         ▼                   ▼                          ▼                │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              Drizzle ORM → PostgreSQL (Supabase)                   │  │
│  │                                                                   │  │
│  │  serviceProviders  │  communityServiceListings  │  inquiries     │  │
│  │  communityServiceReviews  │  bookings  │  (new: providerBilling)│  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── providers/                    # NEW — provider-facing API
│   │   │   ├── dashboard/route.ts        # Provider dashboard data
│   │   │   ├── analytics/route.ts        # Provider-scoped analytics
│   │   │   ├── register/route.ts         # Self-service registration
│   │   │   └── billing/                  # Billing endpoints (4fh)
│   │   └── community-services/           # EXISTING — extends for provider context
│   └── (tenant)/dashboard/providers/     # NEW — providers space page
├── widgets/dashboard/
│   ├── model/spaces.ts                   # MODIFY — add 'providers' SpaceId
│   ├── model/widgets.ts                  # MODIFY — add provider widgets
│   └── ui/ProvidersLayer.tsx             # NEW — provider dashboard layer
├── entities/
│   └── provider/                         # NEW — provider FSD entity slice
│       ├── model/types.ts                # Provider types
│       └── api/                          # Provider API hooks
└── db/schema/
    ├── service-providers.ts              # EXISTING — may need extension
    └── (possibly) provider-subscriptions.ts  # NEW — if billing needs schema
```

### Pattern 1: Provider-Scoped API Route (extends existing maintenance pattern)

**What:** API route that returns data scoped to the authenticated provider
**When to use:** Provider dashboard, provider analytics, provider inquiry management
**Example:**

```typescript
// Source: Derived from src/app/api/maintenance/providers/[id]/route.ts + community-services/provider pattern
import {
  db,
  serviceProviders,
  communityServiceListings,
  requireAnyPermission,
  apiSuccess,
  apiError,
} from '@api/server';
import { withTenant } from '@entities/tenant/server';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(request: Request) {
  const authError = await requireAnyPermission(['providers']); // NEW permission key
  if (authError) return authError;

  const { tenantId } = await withTenant();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return apiError('Unauthorized', 401);

  // All queries MUST filter by both providerId AND tenantId
  const [provider] = await db
    .select()
    .from(serviceProviders)
    .where(and(eq(serviceProviders.id, session.user.id), eq(serviceProviders.tenantId, tenantId)))
    .limit(1);

  // ... provider-scoped analytics queries
}
```

### Pattern 2: Dashboard Space Registration (extends existing space architecture)

**What:** Add a new 'providers' dashboard space with provider-specific widgets
**When to use:** Provider dashboard (9e8)
**Example:**

```typescript
// Source: Derived from src/widgets/dashboard/model/spaces.ts pattern
// In spaces.ts, add to SPACE_SLUGS and SpaceDefinition:
{
  id: 'providers',
  name: { en: 'Providers', af: 'Verskaffers' },
  icon: BriefcaseIcon,
  description: { en: 'Manage your provider listings and analytics' },
  defaultWidgets: ['provider-overview', 'provider-inquiries', 'provider-analytics'],
  requiredPermission: 'providers', // gates entire space
}
```

### Pattern 3: Self-Service Provider Registration (new flow)

**What:** Third-party providers register themselves without admin creation
**When to use:** Provider registration (69c)
**Example:**

```typescript
// Source: New pattern, following maintenance/providers/route.ts structure
export async function POST(request: Request) {
  const authError = await requireAnyPermission(['directory']); // or 'providers'
  if (authError) return authError;
  const { tenantId } = await withTenant();

  const body = await request.json();
  // Zod validation of companyName, contactName, phone, email, trade
  // Duplicate detection by companyName+tenantId
  // Create ServiceProvider record
  // Optionally create a draft CommunityServiceListing
  const [provider] = await db
    .insert(serviceProviders)
    .values({
      id: generateId(),
      tenantId,
      companyName: body.companyName,
      // ... other fields
      isActive: true, // or false if moderation required
    })
    .returning();

  return apiSuccess(provider);
}
```

### Anti-Patterns to Avoid

- **Admin-scoped analytics for providers:** The existing `/api/community-services/analytics` does admin-level queries (all providers, all listings). Provider analytics MUST filter to `providerId = session.user.id`. Never reuse the admin endpoint — service accounts or role checks will leak cross-provider data.
- **Direct providerId = userId assumption:** Currently `communityServiceListings.providerId` stores `userId` (evidenced by left joins to `users` table). The `ServiceProvider` table uses its own `id`. These are DIFFERENT — a listing's `providerId` may be a `userId`, not a `serviceProviders.id`. Resolve this mapping before building provider dashboard queries.
- **Skipping tenant isolation:** Every provider query MUST include `tenantId` filter. `withTenant()` alone is not sufficient — the query WHERE clause must also include `eq(table.tenantId, tenantId)`.

## Don't Hand-Roll

| Problem                | Don't Build          | Use Instead                                         | Why                                                     |
| ---------------------- | -------------------- | --------------------------------------------------- | ------------------------------------------------------- |
| Date-range aggregation | Custom date math     | Existing period-switch pattern from analytics route | Already handles 7d/30d/90d/all with correct date math   |
| Auth + tenant gating   | Custom middleware    | `requireAnyPermission` + `withTenant`               | Battle-tested in 20+ existing routes                    |
| Widget registration    | Custom widget system | Existing `widgets.ts` registry                      | Supports lazy-loading, space assignment, feature gating |
| Form validation        | Manual validation    | React Hook Form + Zod resolver                      | Existing pattern in all forms                           |
| Toast notifications    | Custom alerts        | Sonner (already installed)                          | Standard project-wide toast system                      |

**Key insight:** This phase is primarily composition of existing patterns, not new infrastructure. The dashboard space system, API auth pattern, and Drizzle query patterns are all battle-tested. The only novel work is provider-scoped filtering and the billing feature.

## Runtime State Inventory

> This is not a rename/refactor phase — skip detailed inventory. However, note:

| Category            | Items Found                                   | Action Required                                                         |
| ------------------- | --------------------------------------------- | ----------------------------------------------------------------------- |
| Stored data         | `serviceProviders` table already exists in DB | Schema extension only — no migration of existing data                   |
| OS-registered state | None                                          | —                                                                       |
| Secrets/env vars    | No Stripe API keys exist                      | 4fh may require `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` etc. — TBD |
| Build artifacts     | None affected                                 | —                                                                       |

## Common Pitfalls

### Pitfall 1: providerId Ambiguity (RESOLVED)

**What goes wrong:** `CommunityServiceListing.providerId` stores a `userId`, not a `serviceProviders.id`. But `ServiceProvider.id` is its own PK. If provider dashboard queries join on the wrong ID, you get empty results or cross-provider data leaks.
**Why it happens:** Two different "provider" concepts exist — the `ServiceProvider` entity (company record with its own id) and the `providerId` field on listings (the `users.id` of the user who created the listing). **Verified by seed data:** `providerId: 'user-mike-johnson'`, `providerId: 'user-cape-plumbing'` — all are user IDs with `user-` prefix.
**How to avoid:** Provider dashboard queries should: (1) Get `session.user.id` → that IS the `providerId` on listings. (2) To get the `ServiceProvider` company record, join: `serviceProviders` where `serviceProviders.email = users.email` or add a `userId` FK column to `ServiceProvider`. Currently there's no direct FK link between `serviceProviders.id` and `communityServiceListings.providerId`.
**Warning signs:** Provider dashboard shows zero listings when listings exist.

### Pitfall 2: Permission Key Missing

**What goes wrong:** Provider routes use `requireAnyPermission(['providers'])` but `providers` key doesn't exist in `ROLE_PERMISSIONS`. All provider routes return 403.
**Why it happens:** Adding the permission key requires updating `src/shared/lib/permissions.ts` and mapping which roles get it.
**How to avoid:** Add `providers` to `ROLE_PERMISSIONS` mapping FIRST, before any route that uses it. Test that RESIDENT/ADMIN/BOARD roles get the key as intended.
**Warning signs:** All provider API calls return 403 Forbidden.

### Pitfall 3: Billing Scope Creep

**What goes wrong:** 4fh "billing & subscription" expands to full Stripe integration with webhooks, subscription lifecycle, invoice generation — consuming the entire phase budget.
**Why it happens:** Billing is deceptively complex. The SaaS agreement suggests EFT payments, not credit card. PremiumModelNote.md lists "Stripe/PayPal" as future work without spec.
**How to avoid:** Confirm the exact scope of 4fh in discuss-phase. If it's just "provider subscription tier tracking in DB" (no real payment processing), it's 2-3 tables + admin UI. If it's Stripe Checkout, it's 2-3 weeks alone.
**Warning signs:** Phase plan has more billing tasks than the other 3 features combined.

### Pitfall 4: Cross-Tenant Data Leak in Analytics

**What goes wrong:** Provider analytics query filters by `providerId` but not `tenantId`. In a multi-tenant system, a provider could see data from other tenants.
**Why it happens:** `withTenant()` extracts tenantId but doesn't automatically apply it to queries — developers must add it to WHERE clauses.
**How to avoid:** Every Drizzle query must include `eq(table.tenantId, tenantId)` in the WHERE clause. Audit all provider-scoped routes.
**Warning signs:** Analytics numbers are unexpectedly high (summed across tenants).

## Code Examples

### Provider-Scoped Analytics Query (kia)

```typescript
// Source: Derived from src/app/api/community-services/analytics/route.ts + provider inquiry pattern
const [myListingsCount] = await db
  .select({ count: sql<number>`count(*)` })
  .from(communityServiceListings)
  .where(
    and(
      eq(communityServiceListings.providerId, providerId),
      eq(communityServiceListings.tenantId, tenantId),
      eq(communityServiceListings.isPublished, true)
    )
  );
```

### Dashboard Space Addition (9e8)

```typescript
// Source: Derived from src/widgets/dashboard/model/spaces.ts
// Add to SPACE_SLUGS:
'providers' as SpaceId
// Add to spaces array:
{ id: 'providers', name: 'Providers', icon: Briefcase, widgets: [...] }
```

### Provider Registration with Duplicate Check (69c)

```typescript
// Source: Derived from src/app/api/maintenance/providers/route.ts + withTenant pattern
const [existing] = await db
  .select({ id: serviceProviders.id })
  .from(serviceProviders)
  .where(
    and(
      eq(serviceProviders.companyName, body.companyName),
      eq(serviceProviders.tenantId, tenantId),
      sql`${serviceProviders.deletedAt} IS NULL`
    )
  )
  .limit(1);

if (existing) return apiError('Provider already registered', 409);
```

## State of the Art

| Old Approach               | Current Approach                                       | When Changed | Impact                                                               |
| -------------------------- | ------------------------------------------------------ | ------------ | -------------------------------------------------------------------- |
| Maintenance-only providers | Community Service Listing + ServiceProvider dual model | M3 era       | Providers now have richer entity model than maintenance module alone |
| Admin-only analytics       | Period-based analytics with admin role check           | M3 era       | Pattern exists but needs provider-scoped variant                     |

**Deprecated/outdated:**

- The `ServiceProvider` interface in `src/entities/maintenance/model/types.ts` (line 50-58) is a TypeScript interface, not a Drizzle table. It duplicates the schema definition. Prefer the Drizzle table type for new provider routes.

## Assumptions Log

| #   | Claim                                                                                                                                | Section                     | Risk if Wrong                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- | ------------------------------------------------------------------------------------------------------- |
| A1  | No chart library is installed; analytics uses numeric stat cards                                                                     | Standard Stack / Supporting | If visual charts needed for kia, must add a chart library — adds dependency and bundle size             |
| A2  | Provider billing (4fh) is "provider subscription tier tracking" not "full Stripe integration"                                        | Common Pitfalls             | If full Stripe is needed, phase scope doubles; must confirm in discuss-phase                            |
| A3  | `CommunityServiceListing.providerId` equals `users.id` (the provider's user ID) — VERIFIED by seed data showing `user-` prefixed IDs | Pitfall 1                   | Resolved: providerId = userId, NOT serviceProviders.id. Dashboard queries must join through users table |
| A4  | A `providers` permission key should be added to `ROLE_PERMISSIONS`                                                                   | Patterns / Pitfalls         | Could reuse `directory` key instead if provider access maps 1:1 to directory access                     |
| A5  | BD items kia/9e8/69c/4fh have no detailed descriptions available                                                                     | Phase Requirements          | Scope may differ from inferred meanings; confirm in discuss-phase                                       |

## Open Questions

1. **What is the exact scope of 4fh (billing & subscription)?**
   - What we know: No payment processor exists; PremiumModelNote.md mentions Stripe/PayPal as future; SaaS agreement mentions EFT payments
   - What's unclear: Is this provider-tier management in DB only, or does it require a payment gateway?
   - Recommendation: Confirm in discuss-phase; scope as DB schema + admin UI for MVP, flag Stripe as follow-up

2. **Is `CommunityServiceListing.providerId` a `users.id` or a `serviceProviders.id`?**
   - What we know: The provider inquiries route does `eq(communityServiceListings.providerId, session.user.id)` — suggests it's `users.id`
   - What's unclear: The `ServiceProvider` table has its own `id` field; are these the same value?
   - Recommendation: Check seed data and verify the relationship before building dashboard queries

3. **Should provider registration require admin approval?**
   - What we know: `ServiceProvider.isActive` defaults to `true`; `CommunityServiceListing.status` has 'DRAFT' and 'PENDING_REVIEW' values
   - What's unclear: Does self-service registration go live immediately or need moderation?
   - Recommendation: Confirm in discuss-phase; implementation supports either via `isActive` flag

4. **Which roles get the `providers` permission?**
   - What we know: Current permissions map RESIDENT→directory/bookings, ADMIN/BOARD→all, STAFF→subset
   - What's unclear: Should residents see provider dashboard? Or only users linked to a ServiceProvider record?
   - Recommendation: Add `providers` key to ROLE_PERMISSIONS; give to ADMIN/BOARD by default; RESIDENT only if they have an active ServiceProvider record (check at space level)

## Environment Availability

| Dependency            | Required By     | Available | Version                           | Fallback                         |
| --------------------- | --------------- | --------- | --------------------------------- | -------------------------------- |
| Node.js               | Runtime         | ✓         | (check with `node --version`)     | —                                |
| pnpm                  | Package manager | ✓         | (project uses pnpm per AGENTS.md) | —                                |
| PostgreSQL (Supabase) | Data layer      | ✓         | Via DATABASE_URL                  | —                                |
| Stripe SDK            | 4fh billing     | ✗         | —                                 | Defer; use DB-only tier tracking |
| Vercel Feature Flags  | Feature gating  | ✓         | Installed                         | —                                |

**Missing dependencies with no fallback:**

- Stripe SDK — only needed if 4fh requires payment processing; defer until scope confirmed

**Missing dependencies with fallback:**

- None for kia/9e8/69c — all features build on existing stack

## Validation Architecture

> `workflow.nyquist_validation` is explicitly `false` in `.planning/config.json` — skip this section.

## Security Domain

### Applicable ASVS Categories

| ASVS Category         | Applies | Standard Control                                                                      |
| --------------------- | ------- | ------------------------------------------------------------------------------------- |
| V2 Authentication     | yes     | Better Auth session + `requireAnyPermission`                                          |
| V3 Session Management | yes     | Better Auth session handling                                                          |
| V4 Access Control     | yes     | `requireAnyPermission(['providers'])` + `withTenant()` — tenant isolation is critical |
| V5 Input Validation   | yes     | Zod schemas for all provider input (registration, billing)                            |
| V6 Cryptography       | no      | No custom crypto needed                                                               |

### Known Threat Patterns for Provider Platform Stack

| Pattern                                | STRIDE                 | Standard Mitigation                                                                               |
| -------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------- |
| Cross-tenant provider data access      | Information Disclosure | `withTenant()` + explicit `tenantId` filter on every query                                        |
| Provider enumeration                   | Information Disclosure | Rate limit registration endpoint; don't leak existence in error messages                          |
| Self-registration privilege escalation | Elevation of Privilege | `isActive` flag requires admin approval if moderation enabled; `requireNotSuspended`              |
| Billing data tampering                 | Tampering              | Server-side validation of all billing mutations; webhook signature verification (if Stripe added) |

## Sources

### Primary (HIGH confidence)

- Codebase grep/Read — service-providers.ts, community-service-listings.ts, analytics/route.ts, spaces.ts, widgets.ts, permissions.ts, auth-utils.ts, db.ts barrel exports
- AGENTS.md — project conventions, tech stack, coding standards
- 46-CONTEXT.md — phase scope, BD sources, dependencies

### Secondary (MEDIUM confidence)

- PremiumModelNote.md — billing plans, Stripe references
- SaaS License Agreement (v6) — Schedule F revenue sharing references
- BRAND.md — "Trusted Providers" branding context

### Tertiary (LOW confidence)

- None — all findings are from codebase inspection

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries verified present in codebase
- Architecture: HIGH — patterns derived from existing working routes and dashboard architecture
- Pitfalls: HIGH — providerId ambiguity verified by code inspection; billing scope uncertainty is honestly flagged
- Security: HIGH — tenant isolation and auth patterns are battle-tested

**Research date:** 2026-06-19
**Valid until:** 2026-07-19 (stable — no fast-moving dependencies)
