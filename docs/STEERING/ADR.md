# Architecture Decision Records (ADR)

An Architecture Decision Record (ADR) documents a significant architectural decision made during the project lifecycle, including the context, decision, and consequences.

## Why ADRs?

- **Traceability** - Document why decisions were made
- **Onboarding** - Help new developers understand the architecture
- **History** - Prevent "we forgot why" situations
- **Debate** - Provide structured format for technical discussions

## ADR Format

Each ADR should include:

1. **Title** - Brief description of the decision
2. **Status** - Proposed, Accepted, Deprecated, or Superseded
3. **Context** - The situation driving the decision
4. **Decision** - What we decided to do
5. **Consequences** - What happens as a result (positive + negative)

## ADR Template

```markdown
# ADR-XXX: Title

## Status

[Proposed | Accepted | Deprecated | Superseded by ADR-XXX]

## Context

[Describe the problem, constraints, and any relevant background]

## Decision

[Explain what was decided and why]

## Consequences

### Positive

- [List benefits]

### Negative

- [List drawbacks, trade-offs, or technical debt]

## Related

- [Links to related ADRs or documentation]
```

---

# Project ADRs

## ADR-001: Use Next.js App Router

**Status:** Accepted

**Date:** 2024-01

### Context

We needed a modern React framework for our full-stack SPA with Server Side Rendering (SSR) capabilities, API routes, and optimized performance.

### Decision

Selected Next.js 14+ with App Router as the primary framework.

**Alternatives considered:**

- **Plain React + Vite**: Would require custom SSR solution, more setup for API routes
- **Remix**: Excellent data loading, but ecosystem smaller, less community support
- **Nuxt**: Vue-based, team expertise is React

### Consequences

**Positive:**

- Server Components reduce client bundle size
- Built-in routing with layouts
- API routes alongside pages
- ISR/SSR support for dynamic content
- Vercel deployment optimized
- Large ecosystem and community

**Negative:**

- Higher learning curve than traditional SPA
- Server/client boundary requires discipline
- Some edge cases with App Router still evolving

---

## ADR-002: Use Better Auth for Authentication

**Status:** Accepted

**Date:** 2024-02

### Context

We needed authentication with email/password, session management, and support for future OAuth providers. The solution must integrate with our Supabase database.

### Decision

Selected [Better Auth](https://better-auth.com/) as the authentication library.

**Alternatives considered:**

- **NextAuth.js (Auth.js)**: Good but slower development, fewer plugins
- **Supabase Auth**: Tied closely to Supabase, less flexibility
- **Clerk**: Good but paid for team features, less control
- **Custom auth**: Security risks, time-consuming

### Consequences

**Positive:**

- TypeScript-first with excellent type safety
- Plugin system for OAuth, email/password, 2FA
- Works with any database (using our Prisma/Drizzle adapter)
- Active development, good documentation
- Session management built-in

**Negative:**

- Newer library (less battle-tested than NextAuth)
- Some plugins require paid plans

---

## ADR-003: Dual ORM Strategy - Prisma + Drizzle

**Status:** Accepted

**Date:** 2024-03

### Context

We needed database access with type safety. Prisma provides great DX but has issues with edge runtimes. Drizzle is lighter and edge-compatible but less mature.

### Decision

Use **both Prisma and Drizzle** with Prisma as the primary schema definition and Drizzle for queries.

**Schema approach:**

- Prisma `schema.prisma` is the single source of truth
- Drizzle schema auto-generated from Prisma (`prisma generate`)
- Drizzle used for all runtime queries (edge-compatible)

**Alternatives considered:**

- **Prisma only**: Not edge-compatible, heavier runtime
- **Drizzle only**: Less mature DX, schema management harder
- **Knex/Query Builder**: More boilerplate, less type safety

### Consequences

**Positive:**

- Edge runtime support via Drizzle
- Prisma Studio for debugging during development
- Type safety throughout
- Migration management via Prisma
- Best of both worlds approach

**Negative:**

- Dual setup requires maintenance
- Must generate Drizzle schema after Prisma changes
- Slight complexity increase

---

## ADR-004: Feature-Based Directory Structure (FSD)

**Status:** Accepted

**Date:** 2024-01

### Context

We needed a maintainable code organization that scales with project growth and keeps related code together.

### Decision

Adopted **Feature-Sliced Design (FSD)** with these layers:

```
src/
├── app/              # Next.js pages/routes
├── entities/         # Domain models and business logic
├── features/         # Feature-specific modules
├── widgets/          # Reusable UI components
├── page-modules/     # Page-level components
├── shared/           # Shared utilities and UI
└── processes/        # Business workflows
```

**Alternatives considered:**

- **Layered by type** (`components/`, `hooks/`, `utils/`): Scales poorly, logic scattered
- **Domain-driven**: Good but requires deep domain expertise upfront
- **Monolithic components**: Hard to extract later

### Consequences

**Positive:**

- Clear boundaries between layers
- Easy to find code by feature
- Good for large team collaboration
- Promotes reusability via widgets/features
- Scales well with project growth

**Negative:**

- Learning curve for new developers
- Some redundancy between layers possible
- Requires discipline to maintain boundaries

---

## ADR-005: Use Vercel for Deployment

**Status:** Accepted

**Date:** 2024-01

### Context

We needed a deployment platform optimized for Next.js with minimal configuration, supporting ISR, edge functions, and feature flags.

### Decision

Deploy to **Vercel** with the official Next.js integration.

**Alternatives considered:**

- **Self-hosted (Docker)**: More control, higher operational cost
- **AWS Amplify**: Good but less optimized for Next.js
- **Netlify**: Good, but Vercel has better Next.js integration and edge features
- **Railway/Render**: Good for prototypes, less enterprise features

### Consequences

**Positive:**

- Zero-config Next.js deployment
- ISR and edge middleware support
- Vercel Feature Flags integration
- Analytics and monitoring built-in
- Automatic preview deployments

**Negative:**

- Costs scale with usage
- Vendor lock-in to some extent
- Cold starts on free tier

---

## ADR-006: Use Supabase for Database & Real-time

**Status:** Accepted

**Date:** 2024-01

### Context

We needed a managed PostgreSQL database with built-in real-time subscriptions for chat functionality.

### Decision

Use **Supabase** as the backend-as-a-service platform.

**Alternatives considered:**

- **PlanetScale**: MySQL not PostgreSQL, no real-time
- **Neon**: Good but less mature, less features
- **Railway/RDS**: More operational overhead, no real-time built-in
- **CockroachDB**: Overkill for our scale

### Consequences

**Positive:**

- Managed PostgreSQL with good free tier
- Built-in real-time subscriptions
- Row Level Security (RLS) for additional security
- Dashboard for database management
- Good TypeScript SDK

**Negative:**

- Less control than raw PostgreSQL
- Some features require paid plans
- EU data residency requires paid plan

---

## ADR-007: Use TanStack Query for Server State

**Status:** Accepted

**Date:** 2024-02

### Context

We needed client-side data fetching with caching, invalidation, and optimistic updates.

### Decision

Use **TanStack Query (React Query)** for server state management.

**Alternatives considered:**

- **SWR**: Good but less features than TanStack Query
- **Apollo Client**: Overkill for our needs, complex
- **Redux Toolkit Query**: Good but adds Redux dependency
- **useEffect + context**: Manual, error-prone

### Consequences

**Positive:**

- Excellent caching with configurable stale time
- Optimistic updates support
- Background refetching
- DevTools for debugging
- Hooks-based API

**Negative:**

- Additional dependency
- Learning curve for team
- Overkill for simple fetches

---

## ADR-008: Use TypeScript Strict Mode

**Status:** Accepted

**Date:** 2024-01

### Context

We needed strong type safety to prevent runtime errors and improve maintainability.

### Decision

Enable **strict TypeScript** with `noImplicitAny` and `strict: true`.

### Consequences

**Positive:**

- Catches errors at compile time
- Better IDE support and refactoring
- Self-documenting code
- Fewer runtime type errors

**Negative:**

- More initial development time
- May require `any` casts in edge cases
- Learning curve for less experienced devs

---

## ADR-009: Use React Hook Form + Zod for Forms

**Status:** Accepted

**Date:** 2024-02

### Context

We needed form handling with validation, type safety, and good user experience.

### Decision

Use **React Hook Form** for form state with **Zod** for schema validation.

**Alternatives considered:**

- **Formik**: Older, more boilerplate, slower
- **UI library forms**: Vendor lock-in, less flexible
- **Raw HTML forms**: Hard to manage complex state

### Consequences

**Positive:**

- Type-safe schema with Zod
- Minimal re-renders
- Easy integration with UI components
- Great validation DX

**Negative:**

- Additional learning curve
- Schema needs sync with backend validation

---

## ADR-010: Use Tailwind CSS

**Status:** Accepted

**Date:** 2024-01

### Context

We needed a utility-first CSS framework for rapid UI development with consistent styling.

### Decision

Use **Tailwind CSS** with our custom design tokens.

**Alternatives considered:**

- **CSS Modules**: Good but more code, harder to maintain
- **Styled Components**: Runtime overhead, larger bundles
- **CSS-in-JS (Emotion)**: Similar to styled-components
- **Sass**: Good but requires build step, no utility classes

### Consequences

**Positive:**

- Rapid development with utility classes
- Consistent design system via config
- No runtime overhead (zero-runtime)
- Easy to create responsive designs
- Good integration with Next.js

**Negative:**

- Class name clutter in JSX
- Can lead to inconsistent patterns without discipline
- Learning curve for utility classes

---

## ADR-011: Use tRPC for Type-Safe APIs

**Status:** Accepted

**Date:** 2024-02

### Context

We wanted end-to-end type safety between frontend and backend API without manual type definitions.

### Decision

Use **tRPC** for internal API communication.

**Alternatives considered:**

- **REST with code generation**: Good but requires more setup
- **GraphQL**: Overkill for our use case, more complexity
- **Plain REST**: Loses type safety benefit
- **Server Actions**: Good but less mature than tRPC

### Consequences

**Positive:**

- Full type safety without code generation
- Easy to add endpoints
- Great developer experience
- Integrates well with TanStack Query

**Negative:**

- Requires more setup than REST
- Less visual debugging than REST
- Vendor to tRPC ecosystem

---

## ADR-012: Use Vercel Feature Flags

**Status:** Accepted

**Date:** 2024-03

### Context

We needed a way to ship features incrementally, test in production, and control feature access per tenant/tier.

### Decision

Use **Vercel Feature Flags** for gradual rollouts and tenant-specific features.

**Alternatives considered:**

- **LaunchDarkly**: Good but expensive for our scale
- **PostHog**: Good for analytics + flags
- **Unleash**: Self-hosted option, more setup
- **Environment variables**: Too coarse-grained, requires deploys

### Consequences

**Positive:**

- Deployless feature toggles
- Gradual rollouts with percentage splits
- Per-user targeting
- Integration with Vercel dashboard
- A/B testing support

**Negative:**

- Only works with Vercel deployment
- Can create technical debt if not cleaned up
- Requires discipline to remove old flags

---

## ADR-013: Migrate from React Context to Zustand

**Status:** Accepted

**Date:** 2026-05

### Context

Our application was experiencing build failures with Next.js 16 and React 19 due to React Context compatibility issues during server-side rendering. The original React Context implementation was causing `TypeError: createContext is not a function` errors during build-time page data collection.

### Decision

Migrated all application state management from React Context to **Zustand**, a lightweight state management library. This included:

- Converting tenant context to Zustand store
- Converting toast notifications to Zustand store
- Removing all React Context providers from the application
- Maintaining the same API surface for components using the state

**Alternatives considered:**

- **Redux Toolkit**: More boilerplate, larger bundle size, learning curve
- **Recoil**: Meta-specific, smaller ecosystem, less mature
- **Jotai**: Good alternative, but Zustand has better TypeScript support
- **Keep React Context**: Would prevent upgrading to React 19/Next.js 16

### Consequences

**Positive:**

- Resolved Next.js 16 + React 19 compatibility issues
- Smaller bundle size (no React Context overhead)
- Better TypeScript support and developer experience
- Simpler API than React Context
- No provider wrapping required
- Better performance (no context re-renders on unrelated state changes)

**Negative:**

- Learning curve for team members unfamiliar with Zustand
- Migration effort required to convert existing Context usage
- Potential for state management complexity if not properly structured

---

## ADR-014: Downgrade Next.js to Resolve React 19 Compatibility

**Status:** Accepted

**Date:** 2026-05

### Context

After migrating from React Context to Zustand, we encountered persistent build failures with Next.js 16.2.1 and React 19.2.4. The error `TypeError: createContext is not a function` was occurring during build-time prerendering of API routes, specifically during "Collecting page data" phase.

Despite eliminating all React Context from application code, the error persisted, indicating it was a framework-level compatibility issue between Next.js 16 and React 19.

### Decision

Downgraded Next.js from **16.2.1** to **15.5.18** to ensure stable compatibility with React 19.2.4.

**Key changes made:**

- Updated `package.json` to use Next.js `^15.5.18`
- Removed incompatible `--webpack` flag from build script
- Cleaned up `next.config.js` experimental options
- Added CSS module type declarations

**Alternatives considered:**

- **Wait for Next.js 16.x fixes**: Would delay React 19 adoption indefinitely
- **Downgrade React to 18**: Would lose React 19 features and future compatibility
- **Use webpack flag**: Didn't resolve the underlying compatibility issue
- **Custom webpack config**: Complex workaround, maintenance burden

### Consequences

**Positive:**

- Immediate resolution of build failures
- Stable production builds with React 19
- Maintains access to modern React features
- Reliable deployment pipeline
- No complex workarounds needed

**Negative:**

- Cannot use Next.js 16 features (Turbopack by default, new caching APIs)
- May need to upgrade again when Next.js 16 + React 19 compatibility is fully resolved
- Missing some performance optimizations available in Next.js 16

## Related

- ADR-013: Required Zustand migration to eliminate React Context
- ADR-001: Original Next.js App Router decision

---

## ADR-015: Add OpenAPI Support for Mobile App Integration

**Status:** Superseded by ADR-016

**Date:** 2026-05

### Context

Our Android mobile app needs to consume API endpoints, but tRPC is primarily designed for TypeScript-to-TypeScript communication. While we have both tRPC and REST API routes, we need a standardized way to expose our API to external clients with proper OpenAPI documentation.

### Decision

~~Implement OpenAPI spec generation using `trpc-openapi` to create REST-compatible endpoints from our tRPC procedures.~~

**Note:** This approach was superseded when we discovered `trpc-openapi` only supports tRPC v10, while our codebase uses v11.

### Consequences

**Positive:**

- Identified the need for OpenAPI documentation early

**Negative:**

- `trpc-openapi` incompatibility with tRPC v11
- Downgrading to v10 would cause breaking changes across the codebase

**Related:**

- Superseded by ADR-016: Manual OpenAPI Specification

---

## ADR-016: Manual OpenAPI Specification

**Status:** Accepted

**Date:** 2026-05-14

### Context

After attempting to use `trpc-openapi` for automatic OpenAPI generation (ADR-015), we discovered it only supports tRPC v10, while our codebase uses tRPC v11. Downgrading would cause breaking changes across the entire application due to API differences between versions.

The Android mobile app still needs OpenAPI documentation to consume our APIs, but we need a solution compatible with tRPC v11.

### Decision

Create a manual OpenAPI 3.0 specification served at `/api/openapi.json`. The specification:

- Is hand-written and maintained as code
- Documents tRPC endpoints in OpenAPI format
- Includes proper schemas, security definitions, and error responses
- Passes OpenAPI validation with zero warnings
- Uses production URL (not localhost) in server definitions

**Implementation:**

```typescript
// src/app/api/openapi.json/route.ts
const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Soralia Village API',
    version: '1.0.0',
    license: { name: 'Proprietary' },
  },
  paths: {
    /* manual endpoint definitions */
  },
};
```

**Alternatives considered:**

1. **Downgrade to tRPC v10**: Would cause breaking changes, incompatible with v11 features
2. **Wait for trpc-openapi v11 support**: No timeline, blocks mobile app development
3. **Use community forks**: All tested forks also require tRPC v10
4. **GraphQL**: Overkill, adds unnecessary complexity

### Consequences

**Positive:**

- Compatible with tRPC v11 - no breaking changes
- Full control over API documentation
- Passes OpenAPI validation (redocly lint)
- Can be incrementally expanded as needed
- No dependency on unmaintained packages

**Negative:**

- Manual maintenance required when APIs change
- No automatic sync between tRPC procedures and OpenAPI spec
- Requires discipline to keep documentation updated
- More verbose than automatic generation

**Mitigation:**

- Document OpenAPI update process in AGENTS.md
- Add OpenAPI validation to CI/CD pipeline
- Review OpenAPI spec during API changes

**Related:**

- Supersedes ADR-015: Add OpenAPI Support for Mobile App Integration
- ADR-011: Use tRPC for Type-Safe APIs

---

## ADR-017: Property-First Architecture — Separate Asset from Occupancy

**Status:** Accepted

**Date:** 2026-05

### Context

The original schema used a single `Household` table that conflated two distinct concepts:
the **physical asset** (street, unit, platform address, home image) and the **social
occupancy** (who lives there, when they moved in/out, occupancy type). This caused
semantic confusion for multi-tenant scenarios — a property management company in Cape
Town and a residential community in Johannesburg should not both be shoehorned into
"household" semantics.

Additionally, the frontend directory components expected `household` keys while the
database schema and API had already migrated to `property` as the fundamental building
block, causing a data structure mismatch that broke the resident directory display.

### Decision

Adopt **Property** as the permanent, foundational entity representing the physical
asset, with **Household** representing temporal occupancy records.

**Property (The Asset):**

- Permanent identity that never changes (`platformAddress`, e.g. `unit101@soralia.org`)
- Contains physical location (`street`, `unit`), `tenantId`, `ownerId`, `homeImage`
- One Property has many Households (historical occupancy records)
- One Property has one **Active** Household (current occupancy)
- HOA rights (voting, resolutions, financials) are tied to Property ownership

**Household (The Occupancy):**

- Temporal — bounded by `moveInDate` / `moveOutDate`
- Contains `propertyId` (FK), `occupancyType` (`OWNER_OCCUPIED`, `RENTAL`, `VACANT`)
- Community participation rights (chat, bookings, maintenance) are tied to active Household
- Profiles (residents) link to Household, not directly to Property

**API Response Convention:**

- All API endpoints return `property` (not `household`) for standardSeats and soloSeats
- Frontend types and components must use `property` key consistently
- Profiles carry `householdId` (FK string), not a nested property object

**Alternatives considered:**

- **Keep Household as single entity**: Simpler but conflates asset and occupancy, breaks
  multi-property investor scenarios, misrepresents HOA legal structure
- **Rename Household to Property only**: Loses the temporal occupancy tracking needed
  for tenant turnover history

### Consequences

**Positive:**

- Accurately models real-world legal and social structure of communities
- Supports multi-property investors (Premium tier) with portfolio management
- Stable identity — Property never changes even as occupants turnover
- Clear separation of HOA rights (Property) vs community participation (Household)
- Enables historical occupancy tracking per unit

**Negative:**

- Requires dual-table joins for most queries (Property + Household)
- Frontend types must be kept in sync with API's `property` key convention
- Migration complexity when converting existing household data
- Additional cognitive load for developers to understand the distinction

## Related

- `docs/architecture/PROPERTY_HOUSEHOLD_MODEL.md` — Detailed Property vs. Household model
- `docs/plans/PROPERTY_MIGRATION_PLAN.md` — Migration implementation plan

---

## ADR-018: Unify on Sonner for Toast Notifications

**Status:** Accepted

**Date:** 2026-05

### Context

Three competing toast systems existed in the codebase: Sonner (used directly and via `useApiToast` wrapper), a custom Zustand `ToastProvider` with `useToast` hook, and the `useApiToast` hook for API operations. This caused dual rendering (Sonner toasts at top-right + Zustand toasts at bottom-right), inconsistent features, and maintenance burden.

### Decision

**Sonner** is the single toast notification system. `useApiToast` remains as the preferred hook for API operations (adds retry, server logging, promise handling). The Zustand toast system is removed entirely.

**Alternatives considered:**

- **Keep Zustand toast**: Would maintain dual rendering, inconsistent UX, higher maintenance
- **Keep both with unified API**: More abstraction layer, unnecessary complexity
- **Switch entirely to useApiToast**: Loses direct `toast.*` call flexibility for non-API toasts

### Consequences

**Positive:**

- Single rendering engine — toasts only appear at top-right
- Consistent API across all toast call sites (`toast.success`, `toast.error`, etc.)
- `useApiToast` provides retry/logging for API operations
- Reduced bundle size (no Zustand toast store, no ToastProvider component)
- Simpler mental model for developers

**Negative:**

- Zustand toast's duplicate prevention lost (Sonner doesn't dedup by default — acceptable trade-off)
- Migration effort for remaining `useToast()` call sites

### Migration

- Remove `src/shared/ui/Toast.tsx`
- Remove `ToastProvider` from `src/app/providers.tsx`
- Migrate admin/users page from `useToast()` to direct `toast.*` calls
- Remove dead `useToast` import from sign-up page

## ADR-019: Focused RLS on Sensitive Tables + Application-Layer Audit

### Status

Accepted

### Context

A Supabase Security Advisor audit revealed 47 of 48 tables have RLS disabled, exposing data to the `anon` and `authenticated` roles. The existing authorization model is entirely application-layer: every API route manually checks session validity, user roles via `hasPermission()`, and tenant isolation via `withTenant()` + `eq(table.tenantId, tenantId)` filters.

The app uses a single privileged Postgres connection (`DATABASE_URL` as superuser), which bypasses RLS by default. A cross-tenant data leakage audit of all 80 API routes found 3 critical leaks (fixed) and 20 medium-severity routes missing tenant filters.

### Decision

1. **RLS on 6 sensitive tables**: Enable RLS + create policies on `user`, `session`, `account`, `passkey`, `twoFactor`, and `profile` — the tables containing PII and auth credentials. Policies enforce tenant isolation, own-data scoping, and role-based access using `current_setting('app.*')` variables.

2. **`app_user` role + `SET ROLE`**: Created a dedicated `app_user` database role. The `runWithRLS()` transaction helper does `SET ROLE app_user` + `set_config()` so RLS is actually enforced. Routes using `runWithRLS()` get DB-level defense; routes using plain `db.*` retain current superuser behavior.

3. **`getRLSContext()` helper**: Derives user context (userId, tenantId, role, isPlatformAdmin) from a Next.js request, providing a one-call setup for wrapping routes in `runWithRLS()`.

4. **Phased adoption**: Critical fixes applied immediately (3 routes). Remaining 20 routes tracked as separate issue for incremental fixes. `runWithRLS()` wrapping handled as a separate phase.

5. **No full RLS**: Deliberately not implementing RLS on all 47 tables. The application-layer auth is robust for most tables, and the maintenance burden of mirroring complex permission logic in SQL policies outweighs the incremental benefit.

### Consequences

**Positive:**

- Defense-in-depth for the most sensitive tables (PII, auth credentials)
- Clear, version-controlled policy definitions
- Infrastructure ready for future non-superuser connection patterns
- Audit fixed 3 real cross-tenant data leaks

**Negative:**

- Routes not yet wrapped in `runWithRLS()` bypass RLS (only app-layer auth)
- `app_user` role maintenance — must keep default privileges in sync with schema changes
- Policy logic partially duplicates app-layer permission checks
- `runWithRLS()` introduces a transaction wrapping cost per request

### Key Files

- `src/shared/api/db.ts` — `runWithRLS()`, `getRLSContext()`
- Supabase migration `enable_rls_on_sensitive_tables` — RLS policies + `app_user` role
- `src/app/api/admin/board-members/route.ts` — fixed cross-tenant leak
- `src/app/api/admin/maintenance-stats/route.ts` — fixed cross-tenant leak
- `src/app/api/surveys/route.ts` — fixed cross-tenant leak

---

_More ADRs will be added as we make architectural decisions. Use the template above to propose new ADRs._
