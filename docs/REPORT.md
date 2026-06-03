**High-Level Architecture Review: Netcomplex (as of June 2026)**

I've reviewed the current **Prisma schema**, project tree, and supporting docs (AGENTS.md, etc.). Here's a structured **architectural health check** as your high-level consultant.

### 1. Strengths (You're Doing Well)

- **Multi-Tenancy Foundation** is solid: `Tenant` + `TenantModule` + `PlatformModule` pattern with per-tenant config/branding (`customDomain`, colors, CSS) and tiering.
- **Modular Feature Enablement**: `PlatformModule` / `TenantModule` + `featureFlags` + `use-enabled-modules` is excellent for SaaS scalability.
- **Domain Coverage**: Strong models for core community features (Maintenance, Bookings, Events, Groups, Content, Competitions, Community Services, Surveys, Resources, Chat).
- **Identity & Seats**: Sophisticated premium/standard/solo seat model + agent access + household/profile separation — good for monetization and property management.
- **ORM Hybrid**: Prisma for schema/migrations + Drizzle for queries (edge-compatible) is pragmatic.
- **Next.js App Router** + tRPC + Zod alignment is modern and type-safe.

### 2. Critical Observations & Risks

#### **Schema & Data Model Concerns**

- **ID Strategy Inconsistency**: Mix of `@default(cuid())`, `@default(uuid())`, and plain `String @id`.
  - **Recommendation**: Standardize on `cuid2` or `uuid` everywhere for predictability, especially in multi-tenant queries and public URLs.
- **Row Level Security (RLS) Comments**: Several models (Conversation, ConversationParticipant, Message) note RLS setup needed. Ensure Supabase policies + tenant-scoped queries in Drizzle are fully implemented.
- **TenantId Everywhere**: Good, but verify **all** queries are properly scoped via `with-tenant.ts` / tenant context. This is a common leak point in multi-tenant systems.
- **Json Fields Overuse**: `modules`, `featureFlags`, `config` — fine for flexibility, but watch for schema drift. Consider extracting high-frequency configs into proper columns later.
- **Soft Deletes Missing**: Many entities lack `deletedAt`. Critical for compliance/audit in residential communities.

#### **Architecture & Scalability**

- **API Surface**: Heavy use of REST API routes (`/api/...`) alongside tRPC.
  - **Risk**: Potential duplication/maintenance burden.
  - **Advice**: Use tRPC as primary internal contract. Keep REST/OpenAPI mainly for external integrations (agents, public embeds).
- **Widget + Dashboard System**: Looks mature (draggable widgets, spaces, registry). Ensure `react-rnd` + state persistence doesn't cause hydration/performance issues on mobile.
- **Preact Adoption**: Noted in AGENTS.md. Verify all dependencies (especially TipTap, charts, maps) are fully compatible. If bundle size or compatibility friction appears, reconsider.

#### **Performance & Deployment (Vercel + Supabase)**

- **Edge Readiness**: Good intent with Drizzle, but confirm all hot paths (chat, notifications, dashboard stats) are edge-compatible.
- **ISR / Caching Strategy**: You have revalidation utilities — excellent. Prioritize aggressive `unstable_cache` + tags for public content (resources, events, directory).
- **Real-time**: Supabase Realtime on Messages is good. Ensure presence/typing indicators scale for larger tenants.

#### **Security & Compliance**

- **AssistSession** model suggests support staff access — ensure strong scoping, audit logging, and revocation.
- **Suspensions & PlatformAdmin**: Good. Add more granular RBAC if not already (e.g., via CASL or custom permissions table).
- **Data Residency**: South Africa (Cape Town) tenant — monitor Supabase region choice for compliance (POPIA).

### 3. Recommended Priorities (Next 3-6 Months)

1. **Schema Stabilization** (High)
   - Standardize IDs
   - Add `deletedAt` + soft delete helpers
   - Audit all tenant-scoped queries for leaks
   - Complete RLS on chat models

2. **Modularity & Extensibility**
   - Formalize module registry more strongly (you already have good patterns in `src/entities/tenant`)
   - Consider a plugin/extension system for future 3rd-party modules

3. **Observability & Operations**
   - Centralized audit logging (you have some)
   - Better error boundaries + monitoring (Vercel + Sentry?)
   - Usage analytics per tenant/module

4. **Long-term Architectural Bets**
   - **Domain-Driven Design**: Current entities folder is a good start. Push towards clearer bounded contexts (e.g., `PropertyManagement`, `CommunityEngagement`, `Marketplace`).
   - **Event Sourcing / CQRS** consideration for high-write areas (Maintenance history, Competition entries) — but only if volume justifies.
   - White-label readiness: Custom domains + theming is there — test thoroughly with multiple tenants.

### Quick Wins I Notice in Structure

- Excellent documentation culture (docs/, STEERING/, contexts/).
- Strong testing setup (vitest + api tests).
- Component organization is thoughtful (entities/, features/, widgets/, page-modules/).

**Overall Assessment**: The architecture is **mature for an MVP-to-Scale phase**. You're past the chaotic startup stage and into "professional SaaS platform" territory. Main risks are around **consistency** (IDs, scoping, soft deletes) and **operational maturity** (RLS, monitoring, audit).

Would you like me to:

- Dive deeper into a specific domain (e.g., Maintenance, Chat, Multi-tenancy)?
- Help design a specific refactor (e.g., ID standardization migration)?
- Review a particular file or proposed feature?

Happy to zoom in.
