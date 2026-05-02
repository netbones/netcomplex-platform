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

_More ADRs will be added as we make architectural decisions. Use the template above to propose new ADRs._
