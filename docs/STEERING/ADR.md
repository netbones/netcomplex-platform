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

## ADR-016: Auto-Generated OpenAPI Specification via @trpc/openapi

**Status:** Superseded

**Date:** 2026-05-14

**Superseded by:** ADR-019: Auto-Generated OpenAPI via @trpc/openapi

### Context

After attempting to use `trpc-openapi` for automatic OpenAPI generation (ADR-015), we discovered it only supports tRPC v10, while our codebase uses tRPC v11. Downgrading would cause breaking changes across the entire application due to API differences between versions.

The Android mobile app still needs OpenAPI documentation to consume our APIs, but we need a solution compatible with tRPC v11.

### Decision (Original)

Create a manual OpenAPI 3.0 specification served at `/api/openapi.json`.

**This decision has been superseded by ADR-019.** See ADR-019 for the current approach using `@trpc/openapi` for auto-generated OpenAPI 3.1 specifications from tRPC procedures.

**Related:**

- Supersedes ADR-015: Add OpenAPI Support for Mobile App Integration
- Superseded by ADR-019: Auto-Generated OpenAPI via @trpc/openapi
- ADR-011: Use tRPC for Type-Safe APIs

---

## ADR-019: Auto-Generated OpenAPI via @trpc/openapi

**Status:** Accepted

**Date:** 2026-05-28

### Context

Phase 35 (API Alignment) identified that the hand-written OpenAPI spec (ADR-016) was perenially stale — it only described one endpoint and required manual maintenance. The governance documents (API.md §3.2, tRPC.md §16) require OpenAPI specs to be generated from tRPC, not hand-written.

Previous attempts to use `trpc-openapi` (ADR-015, ADR-016) failed due to incompatibility with `@trpc/server@^11`.

### Decision

Use `@trpc/openapi@11.17.0-alpha` (the official tRPC v11 OpenAPI package) to auto-generate the OpenAPI 3.1 specification from governed tRPC procedures.

**Key implementation details:**

- `src/server/openapi/generator.ts` — TypeScript compiler-based generation via `generateOpenAPIDocument(filePath)`
- `GET /api/openapi.json` — Route serves the auto-generated spec (replaces hand-written file)
- Security scheme (Bearer JWT via Better Auth) applied to all operations
- Spec includes all 12+ identity procedures with complete Zod-derived schemas
- Redocly CI validation passes with 0 errors
- `pnpm api:generate` — CLI script writes spec to `public/openapi.json` for CI consumption

**API differences from `trpc-openapi`:**

| Aspect | trpc-openapi (v1)               | @trpc/openapi (v11)                   |
| ------ | ------------------------------- | ------------------------------------- |
| Format | OpenAPI 3.0                     | OpenAPI 3.1                           |
| Paths  | REST-style (/properties)        | tRPC-style (/identity.listProperties) |
| API    | generateOpenApiDocument(router) | generateOpenAPIDocument(filePath)     |
| Method | Runtime introspection           | TypeScript compiler analysis          |

### Consequences

**Positive:**

- Always-fresh spec — no manual maintenance
- All tRPC procedures with `.meta({ openapi })` automatically appear in the spec
- OpenAPI 3.1 supports full JSON Schema 2020-12 (better type expressiveness)
- CI validation via Redocly ensures spec stays valid
- Security scheme auto-applied to all operations

**Negative:**

- tRPC-style paths (e.g., `/identity.listProperties`) instead of REST paths (`/identity/properties`)
- OpenAPI 3.1 may not be supported by all tooling (most tools support 3.0+)
- Only identity procedures are currently covered — REST routes not yet migrated

**Mitigation:**

- `@trpc/openapi` is the official package — future tRPC versions will maintain compatibility
- OpenAPI 3.1 is backward-compatible with most 3.0 consumers
- Path transformation layer can be added if REST-style paths are required for external consumers

**Related:**

- Supersedes ADR-016: Manual OpenAPI Specification (formerly Accepted)
- ADR-015: Add OpenAPI Support for Mobile App Integration (formerly Superseded)
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

### Update 2026-06-04 (BD `4a6`)

The original "6 sensitive tables" target was implemented in a loose `prisma/migrations/add_rls.sql` and a Supabase migration `enable_rls_on_sensitive_tables`. The Supabase migration never landed in the Prisma migration directory, and the loose SQL had 5 correctness bugs (wrong GUC name `app.role` vs `app.user_role`, missing `is_platform_admin` helper, no `WITH CHECK` clauses, non-idempotent `CREATE POLICY` for 30 of 32 tables, and a literal placeholder password in `CREATE ROLE`).

This ADR is **confirmed in effect** for the Phase 43 (m4-5-blockers) blocker phase, with the following refinements:

- **Scope narrowed to 15 tables:** 6 ADR-019 sensitive (user, session, account, passkey, twoFactor, profile) + 9 tables read by the 5 Phase 43 43-04 admin routes (Notification, MaintenanceRequest, Content, Survey, Event, GroupMembershipRequest, Announcement, Competition, Setting). 30 non-sensitive tables deferred to M6+ (BD `t78`).
- **Implemented in `prisma/migrations/20260604000000_add_rls_policies/migration.sql`** as a proper Prisma migration, with all 5 bugs fixed, plus a `WITH CHECK` clause on every policy, idempotent `DROP POLICY IF EXISTS` before every `CREATE POLICY`, and an `is_platform_admin()` helper for cross-tenant reads during support.
- **Connection-role model corrected.** The original `add_rls_note.md` claim _"Your DATABASE_URL in production uses app_user"_ is **wrong**. The connection uses the **owner role**; `app_user` is only active inside `runWithRLS` transactions via `SET LOCAL ROLE app_user`. Changing `DATABASE_URL` to `app_user` would break Better Auth login and `getRLSContext`. See `docs/STEERING/RLS.md` step 0.
- **Operational runbook at `docs/STEERING/RLS.md`** — single source of truth for the connection-role model, role setup, application verification, and rollback.
- **Plan at `.commandcode/plans/rls-migration.md`** — full design rationale and follow-up BD tracking.

The Stage B wiring (wrapping 5 admin routes in `runWithRLS`) is tracked in BD `oqw` and Phase 43 plan 43-04. Stages C (rollout to ~100 more routes) and M6+ (RLS on 30 more tables) are tracked in BD `57d` and `t78` respectively.

---

## ADR-020: Focus Space Architecture — Dashboard as Purpose-Built Layers

### Status

**Accepted**

### Date

2026-05

### Context

The original dashboard design used a single `DashboardPage.tsx` with client-side tab state (`DashboardTabs.tsx`). All widgets were equal in a single tab-based widget grid, with parallel resident and admin dashboards. As the feature surface grew (announcements, bookings, maintenance, chat, competitions, surveys, resources, services), the tab model broke down:

1. **Flat hierarchy** — 10+ admin tabs in a single bar, forcing users to scan linearly
2. **No spatial memory** — Tabs lack deep-linkable URLs, so users couldn't bookmark "messages" or share "services"
3. **Widget explosion** — 40+ widgets registered in a single grid, making "Add Widget" modal overwhelming
4. **Mixed interaction modes** — Read-oriented content (news, directory) mixed with action-oriented tools (maintenance, admin) in the same layout
5. **Role blindness** — Admin and resident saw the same tab structure, just with different permissions

### Decision

Replace the tab-based dashboard with a **5-space model** where each space is a full-screen, domain-scoped working environment with a purpose-built layout:

| Space ID    | Layout Type  | Interaction Mode | Key Audience |
| ----------- | ------------ | ---------------- | ------------ |
| `home`      | Widget grid  | Read (newspaper) | All          |
| `community` | Widget grid  | Read + Browse    | All          |
| `messages`  | Static Layer | Action           | All          |
| `services`  | Static Layer | Action           | All          |
| `admin`     | Static Layer | Management       | Admin/Board  |

**Key mechanisms:**

- **Spaces registry** (`src/widgets/dashboard/model/spaces.ts`): Declarative `SPACES` map defining each space's icon, label, role gate, feature flag dependency, and allowed widgets. Visibility computed by `getVisibleSpaces(role, flags)`.
- **Static Layers** (`AdminLayer`, `ServicesLayer`, `MessagesLayer`): Purpose-built React components with CommandBar (reactive CTAs) + Domain Grid (sub-launcher with icon cards) — no generic DnD widget grid. Optimized for action-oriented workflows.
- **Widget Grid Spaces** (`SpaceLayout`): DnD widget grid retained for `home` and `community` where personalization matters.
- **Deep-linkable routes**: `/dashboard`, `/dashboard/services`, `/dashboard/community`, `/dashboard/messages`, `/dashboard/admin` — each URL-scoped to its space.
- **Navigation**: Desktop `SpaceLauncher` sidebar (collapsible icon+label) + mobile `MobileSpaceBar` (5-slot bottom nav with overflow guard).
- **Widget manifests**: Each widget declares `spaces: SpaceId[]` in its manifest, so `AddWidgetModal` filters to the current space.
- **Per-space layouts**: Dashboard layout persisted as `{ [spaceId]: LayoutItem[] }` instead of flat `LayoutItem[]`.

**Alternatives considered:**

- **Keep tabs with categories/groups**: Would still suffer from flat hierarchy, no deep links
- **Single scrollable mega-page**: Performance issues, impossible navigation
- **Shell-based micro-frontends**: Over-engineering for our team size and scale
- **Static sidebar + dynamic content**: Closest alternative, but lacks the purpose-built nature of Layers

### Consequences

**Positive:**

- Deep-linkable spaces — users can bookmark and share specific dashboard areas
- Spatial memory — each space has a distinct visual identity and layout
- Role-sensitive visibility — admin space hidden from residents, community auto-hides when all sub-features are off
- Widget-to-space association — reduces "Add Widget" noise by 60% (only relevant widgets shown per space)
- Purpose-built Layers — AdminLayer includes activity stream + urgency badges, ServicesLayer has service-specific CTAs
- Mobile-friendly — bottom nav bar works naturally on phones
- Clear migration path from old tab code — Phase 31 (tab removal) was completed after Phase 30

**Negative:**

- More components to maintain (4 Layers + SpaceLayout + 3 SubLaunchers + 3 CommandBars)
- Widget registry now requires `spaces` field — every new widget must declare its space membership
- Legacy `admin/page.tsx` exists alongside new `dashboard/admin` route — dual maintenance until full migration
- Domain definitions (SubLaunchers) must be kept in sync with actual feature modules
- i18n label keys required for each space in addition to each widget

### Key Files

- `src/widgets/dashboard/model/spaces.ts` — Space definitions, visibility logic
- `src/widgets/dashboard/model/registry.ts` — WidgetRegistry with space-aware registration
- `src/widgets/dashboard/ui/HomeLayer.tsx` — Read-oriented home layout
- `src/widgets/dashboard/ui/MessagesLayer.tsx` — Message domain layer
- `src/widgets/dashboard/ui/ServicesLayer.tsx` — Service domain layer
- `src/widgets/dashboard/ui/AdminLayer.tsx` — Admin management layer
- `src/widgets/dashboard/ui/SpaceLayout.tsx` — Generic DnD widget grid
- `src/widgets/dashboard/ui/SpaceLauncher.tsx` — Desktop sidebar navigation
- `src/widgets/dashboard/ui/MobileSpaceBar.tsx` — Mobile bottom navigation
- `docs/architecture/DASHBOARD-PHASE-B-DISCUSSION.md` — Original design discussion

---

## ADR-021: Dual-API Governance — tRPC as Canonical Internal Contract + REST for External Surface

### Status

**Accepted**

### Date

2026-05

### Context

The project needed to serve two distinct API consumers:

1. **Internal frontend** (Next.js app) — needs type-safe, rapid iteration, co-located with backend
2. **External clients** (Android mobile app, third-party integrations) — needs stable, documented, RESTful endpoints

tRPC (ADR-011) was adopted for its end-to-end type safety without code generation. However, tRPC is fundamentally TypeScript-to-TypeScript — external non-TS clients cannot consume tRPC procedures directly. The existing 150+ REST API routes (`src/app/api/*`) had grown organically alongside tRPC, creating a dual API surface with inconsistent governance.

Phase 30 identified that the REST routes had drifted: some used `apiSuccess()` envelope, others returned raw data; some had `withTenant()` guards, others didn't; OpenAPI documentation was stale (ADR-016). API.md prescribed tRPC for internal APIs but didn't resolve the dual-surface tension.

### Decision

Adopt a **dual-API model** with clear ownership boundaries:

**tRPC (Canonical Internal Contract):**

- Single source of truth for internal API contracts
- Auto-generates OpenAPI 3.1 spec via `@trpc/openapi` (Phase 35, ADR-019)
- All new feature development starts with tRPC procedures
- Migrate REST routes to tRPC incrementally (Phase B tracked in BD issue `fpc`)
- TanStack Query integration via auto-generated hooks (no manual `fetch` wrappers)

**REST (Legacy + External Surface):**

- Existing 150+ routes maintained for backward compatibility
- Required to use `apiSuccess()`/`apiError()` envelope (Phase 35 standard)
- Required to use `withTenant()` for tenant isolation
- No new REST routes for internal features — migrate to tRPC instead
- External-facing REST endpoints documented via tRPC-generated OpenAPI spec

**Governance rules:**

| Surface         | Transport | Contract Source                        | Stability                    | Consumers                  |
| --------------- | --------- | -------------------------------------- | ---------------------------- | -------------------------- |
| Internal domain | tRPC      | Zod schemas in procedures              | Can evolve with features     | Next.js frontend           |
| External API    | REST      | OpenAPI 3.1 (auto-generated from tRPC) | Stable, versioned            | Android app, third parties |
| Legacy REST     | REST      | Manual route handlers                  | Maintained, no new additions | Existing frontend code     |

**Alternatives considered:**

- **Migrate all REST to tRPC immediately**: Blocking for mobile app timeline, too many routes (150+) to migrate at once
- **Migrate all tRPC to REST**: Loses end-to-end type safety, degrades developer experience
- **GraphQL layer**: Over-engineering for our scale, adds GraphQL runtime + schema management
- **Single REST with code generation**: Requires OpenAPI-first workflow, slower iteration for internal features

### Consequences

**Positive:**

- Best of both worlds — tRPC for internal velocity, REST for external compatibility
- OpenAPI spec auto-generated from governed tRPC procedures (ADR-019) — always fresh, never stale
- Gradual migration path — no big-bang rewrite of 150+ routes
- tRPC procedures provide canonical types that inform REST response shapes
- External consumers get stable, versioned, documented REST endpoints
- New features ship faster via tRPC without waiting for REST governance review

**Negative:**

- Dual surface to maintain — cognitive load for developers to know "which API to use when"
- Migration of 150+ REST routes to tRPC is a long tail (BD issue `fpc`)
- REST routes may still drift from tRPC canonical types during migration
- tRPC OpenAPI paths use tRPC-style naming (`identity.listProperties`) not REST paths (`/identity/properties`)
- External consumers must consume OpenAPI 3.1 (not all tools support it)
- Requires discipline to prevent new REST routes from being added for internal features

### Key Files

- `docs/STEERING/API.md` — API Governance Standard
- `docs/STEERING/tRPC.md` — tRPC best practices
- `src/server/routers/` — 2 tRPC routers (identity, competitions), target for expansion
- `src/server/openapi/generator.ts` — `@trpc/openapi` auto-generation
- `src/app/api/*` — 150+ REST routes (legacy, no new additions for internal features)
- `src/shared/api/api-response.ts` — `apiSuccess()`/`apiError()` envelope standard

## ADR-020: Server-Only Modules Use `server.ts` Sub-Barrels in FSD Slices

### Status

Accepted (2026-06-14)

### Context

Phase 44 introduced strict FSD boundary enforcement via Steiger and ESLint `no-restricted-imports`. During enforcement, a latent architectural fault was exposed: entity slice barrels (`index.ts`) were re-exporting server-only modules (which import `server-only`, `next/headers`, `next/cache`, or `@api/db`) alongside client-safe exports. When a client component imported any client-safe export from the barrel, Next.js's bundler evaluated the entire barrel's module graph — including server-only modules — causing a hard build crash.

The affected slices: `@entities/tenant`, `@entities/content`, `@entities/maintenance`, `@entities/event`, `@entities/booking`. The immediate fix (removing server-only exports from barrels and allowing deep imports via ESLint exceptions) resolved the build but violated the FSD principle that all consumers must import through public API barrels, not through internal file paths.

The root cause is structural: `server-only` is a build-time execution-context marker, not an FSD layer boundary. A single barrel cannot safely serve both client and server execution contexts.

### Decision

**Each entity slice that contains server-only exports must provide a `server.ts` sub-barrel.** This is the same pattern already established at the `shared/api` level (`@api/server`, `@api/client`, `@api/shared` — see Steiger allow list at `steiger.config.js:74`).

#### Barrel Structure (per affected slice)

```
src/entities/<slice>/
├── index.ts        # Client-safe public API (types, constants, UI, schemas)
├── server.ts       # Server-only public API (DB operations, guards, tenant resolution)
├── api/
├── model/
├── ui/
└── ...
```

#### Import Patterns

```ts
// ✅ Server component / API route
import { withTenant, getCurrentTenant } from '@entities/tenant/server';

// ✅ Client component (unchanged)
import { ADMIN_ITEMS, TenantProvider } from '@entities/tenant';

// ❌ Deep import — blocked by no-restricted-imports
import { withTenant } from '@entities/tenant/api/with-tenant';
```

### Architectural Principle

> **Any module that directly imports from `@api/db`, `next/headers`, `next/cache`, or `server-only` must not be re-exported from a slice's default barrel (`index.ts`). It must be re-exported exclusively from a `server.ts` sub-barrel.**

This rule closes the _category_ of failure, not just the current instances, and is statically enforceable.

### Scope

- **Entity slices**: `server.ts` is required for slices with server-only exports. Not pre-emptively stamped across all slices.
- **Feature slices**: Adopt the same pattern if and when a feature contains server-only exports.
- **Widget slices**: Never use `server.ts`. Widgets are UI-layer consumers. If a widget needs server data, it receives it via props from a Server Component parent.

### Consequences

#### Positive

- FSD public API principle is preserved — consumers always import from a barrel, never from internal files
- Server-only and client-safe code are cleanly separated at the barrel level
- Precedent already exists (`@api/server`, `@api/client`, `@api/shared`)
- The pattern is discoverable — `@entities/<slice>/server` is self-documenting
- Statically enforceable via ESLint (or future custom Steiger rule)

### Negative

- Two recognized import paths per affected slice (`index.ts` and `server.ts`) — small increase in cognitive load
- Requires ~105 files to use `@entities/<slice>/server` instead of deep paths, but the migration is mechanical (find-replace)
- New developers must learn the `server.ts` convention

### Client-Side Constraint (added 2026-06-23)

**Client modules (`'use client'`) must never import from `@entities/*/server` barrels.** The bundler evaluates the entire barrel's module graph — not just the named export — and will include server-side dependencies (`ioredis`, `next/headers`, `server-only`, `dns`) in the client bundle, causing a hard build crash.

This means the `@entities/*/server` barrel is a one-way door: server components and API routes may import from it safely, but any value import (including constants and mapping tables) from the server barrel into a client module will fail the build.

#### Failure Case (2026-06-23)

`f4eb9894` (ADR-020 migration) changed the client gate module's imports from `@entities/tenant` → `@entities/tenant/server` because `FEATURE_TO_FLAG` and `FEATURE_TO_REGISTRY` were defined in `gate.ts` alongside server-only functions. This pulled `ioredis` → `dns` into the client bundle. The error was dormant until `406d099b` migrated `Footer.tsx` to `useGateContext()`, which activated the chain.

#### Resolution Pattern (2026-06-23)

When a client module needs types or constants that originated in a server module:

1. Extract the pure types and constants into a **new, clean module** (e.g., `gate/mappings.ts`) with zero server dependencies (only `type` imports from `@shared/lib`)
2. The server module imports and re-exports from the clean module
3. The client module imports directly from the clean module (deep import, requires ESLint override)
4. The server barrel splits its exports: types/constants from the clean module, functions from the server module

```
src/entities/tenant/api/gate/
├── mappings.ts      # Types + constants — zero server deps, client-safe
├── gate.ts          # Server functions — imports/re-exports from mappings
└── ...
```

#### Static Enforcement

This constraint is not yet statically enforceable (ESLint `no-restricted-imports` can block deep imports, but cannot distinguish `'use client'` from server modules). The `server.ts` barrel pattern relies on developer discipline: if a symbol is needed by client code, it must live in a client-safe location before being consumed.

### Related

- `docs/discussions/DISCUSSION-server-only-barrel.md` — problem framing and option analysis
- `docs/advisories/ADVISORY-008.md` — implementation plan and execution checklist
- `steiger.config.js:62-86` — `no-public-api-sidestep` allow list including `@api/server`
- `eslint.config.js:19-61` — `no-restricted-imports` deep import blocking
- Phase 44 (M5A hardening): FSD enforcement baseline
- BD issue `de8x`: i18n sidestep precedent
- BD issue `soralia-village-1eh`: C2 gating migration — triggered the client-side constraint discovery
- Commit `f4eb9894`: introduced the violation (ADR-020 migration switched client gate to server barrel)
- Commit `ba82bdc8`: resolution — extracted `gate/mappings.ts` clean module

### Key Files

- `src/entities/tenant/server.ts`
- `src/entities/content/server.ts`
- `src/entities/maintenance/server.ts`
- `src/entities/event/server.ts`
- `src/entities/booking/server.ts`

---

## ADR-022: USER as Pre-Admission Staging Role

### Status

Proposed

### Date

2026-06-23

### Context

Better Auth hardcodes `role: 'user'` on every sign-up, but the PostgreSQL `Role` enum had no `USER` value. The workaround in `auth.ts` overrode this to `RESIDENT`, making the default semantically incorrect — a freshly registered account not yet admitted to any community is not a resident.

Three related issues needed resolution:

1. **No pre-admission state in the role enum** — `user.role @default(RESIDENT)` conflated "not yet placed" with "placed as a community resident." Every sign-up immediately became `RESIDENT`, regardless of future admission path.
2. **No role lifecycle model** — There was no defined path from sign-up through admission hooks to a meaningful community role (`RESIDENT`, `PROVIDER`, `AGENT`, etc.). The `Invitation.role` field encoded the target role but no code acted on it at acceptance time.
3. **Provider identity model undefined** — Providers needed a platform account and verification pipeline, but the relationship between their `user` record and the `ServiceProvider` table was undocumented. The quick-fix override meant providers signed up as residents.

### Decision

`USER` is added to the `Role` enum as the canonical pre-admission staging role — the lowest-privilege value representing "authenticated via Better Auth, no community context assigned yet." All community roles (`RESIDENT`, `PROVIDER`, `AGENT`, etc.) are reached only via explicit admission hooks.

The lifecycle is:

```
Sign-up (any path) → USER
     ├─ Invitation accepted (resident/board/committee) → target role from Invitation.role
     ├─ Provider registration + admin approved → PROVIDER
     └─ Agent onboarding + AgentAccess granted → AGENT
```

`USER` accounts have no seat, no community access. The gate is implemented via seat-absence: any route requiring community context checks for a valid seat record. No new permission layer is required.

### Alternatives Considered

- **Keep workaround (`RESIDENT` override)**: Quick fix but semantically wrong. Rejected because it makes all future role-audit work harder — every filter that checks for RESIDENT would need to be revisited.
- **Remove the `role` column from the `user` table entirely**: Not viable — Better Auth's schema requires it, and role-based access control depends on it.
- **Role-set model (multiple roles per user)**: Overengineered for current needs. Deferred until dual-role users (resident + provider) become a real case.

### Consequences

#### Positive

- Semantically correct sign-up state — `USER` means "authenticated, unplaced"
- No workaround override needed in `auth.ts` — Better Auth's `'user'` maps naturally to `USER` via the enum
- Admission hooks become the single place where community roles are assigned
- Provider identity model is documented: `User` record + `PROVIDER` role + `ServiceProvider` row

#### Negative

- Any code that assumes `role !== ADMIN` implies a valid community member must be audited (G5 discovery)
- Existing code uses `|| 'RESIDENT'` as a fallback in 50+ call sites. While `USER` is truthy (won't trigger the fallback), these users will have minimal permissions until admitted
- Provider stub creation (Phase 3B) is deferred — `ServiceProvider` has no `userId` FK, requiring schema follow-up

### Verification

- [x] `prisma migrate status` shows no drift after migration
- [x] New sign-up creates `user.role = USER` (via auth.ts hook `role: 'USER'`)
- [x] Invitation acceptance promotes `USER` to the role encoded in the invitation (non-PROVIDER paths)
- [x] Provider stub creation + approval pipeline (deferred — needs `ServiceProvider.userId` FK)
- [x] `Property.platformAddress` has `@unique` constraint
- [x] Seat tables have `status` and `archivedAt` columns
- [x] Cross-table address guard function exists and is called in seat-creation paths

### Related

- ADVISORY-015: Full execution plan with role lifecycle, provider admission, address hardening
- BD `5z3g`: Define USER role + role lifecycle
- `src/db/schema/role-enum.ts`: Drizzle `roleEnum` definition
- `src/shared/api/auth.ts`: Better Auth configuration and database hooks
- `src/app/api/invitations/accept/route.ts`: Admission hook (non-PROVIDER role promotion)

### Key Files

- `prisma/schema.prisma` — `enum Role { USER, ... }`, `@default(USER)` on user.role, `@unique` on Property.platformAddress, `SeatStatus` enum, seat lifecycle fields
- `prisma/migrations/20260624000000_add_user_role_and_seat_lifecycle/migration.sql`
- `src/shared/api/auth.ts:131,214` — `additionalFields.role.defaultValue` and hook override both set to `'USER'`
- `src/app/api/invitations/accept/route.ts:73-86` — Admission hook guards `user.role === 'USER'` before promoting
- `src/app/api/providers/dashboard/route.ts:38-41` — Suspended provider gate

**22.1 — `PROBATION` is the canonical initial `ProviderVerificationStatus`**

No code path creates a `PENDING` verification row. The `PENDING` enum value is vestigial — it exists as a schema default on the model definition but `createProviderStub` explicitly sets `PROBATION`. Future engineers must not create code paths targeting `PENDING` as an initial state. The enum value should be removed in a future cleanup once confirmed no production rows carry it.

**22.2 — Due diligence and activation are intentionally separate gates**

The `due-diligence` PATCH endpoint reviews documentation and may set `status=VERIFIED` when all items are approved, but it does **not** set `isActive` or promote `user.role`. Activation requires an explicit admin decision via `approve` or `verify`. This separation provides a clear audit boundary: paperwork review is distinct from access grant.

**22.3 — Two activation routes exist by design**

`approve` (gated to ADMIN/BOARD) and `verify` (gated to `providers` permission) implement the same transaction pattern. Both are valid activation points — `verify` is the broader-permission path for cases where a non-board staff member completes verification. The `details.method` field in the audit log distinguishes them. A future `activateProvider()` shared service should be extracted to eliminate the duplication risk (GAP-5).

**22.4 — Suspension does not change `user.role`**

## A suspended provider retains `role: PROVIDER` in the `user` table. Access is blocked entirely through `requireProviderAccess()` checking `verification.isSuspended`. This is intentional — role is an identity classification, not a live access token. Reinstatement restores access without requiring a role re-grant.

_More ADRs will be added as we make architectural decisions. Use the template above to propose new ADRs._

---
