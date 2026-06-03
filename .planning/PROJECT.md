# Netcomplex — Soralia Village

## What This Is

Netcomplex is a multi-tenant community management platform. Soralia Village
is the anchor tenant — a 180-home residential community running the full
suite: maintenance ticketing, facility bookings, group chat, announcements,
events, competitions, resources, surveys, and an admin command surface for
the board and committee.

Tenants self-service onboard through a 7-step wizard, get a per-tenant
Postgres row with `ownerId`, scoped theming, branded domains, and a tier
(`standard` | `premium` | `enterprise`) that gates module access. The
platform layer (`isPlatformAdmin`) is a separate trust boundary that never
collapses into a role.

## Core Value

A resident should be able to open the dashboard, see what's actionable for
their household, file a maintenance ticket, and message a neighbour — all
without a page reload and without leaving their space (Home, Services,
Community, Messages, Admin).

## Requirements

### Validated

- ✓ Multi-tenant foundation — Tenant + TenantModule + PlatformModule tier
  gating (Phase 00)
- ✓ Tenant isolation enforcement in API routes — `withTenant()` middleware,
  `tenantId` filter on queries (Phase 01, 19)
- ✓ Admin tenant management UI (Phase 02)
- ✓ Localization (i18n) — 4 locales (en, af, xh, zu) (Phase 03)
- ✓ Widget registry alignment — manifest-driven, Map-based O(1) lookups
  (Phase 05)
- ✓ Maintenance requests CRUD + admin workflows (Phase 06)
- ✓ Facility booking (Phase 07)
- ✓ Module architecture — two-table design, tier enforcement (Phase 08)
- ✓ Real-time chat via Supabase Realtime + presence + typing (Phase 09)
- ✓ Email notifications via MailerSend (Phase 10)
- ✓ Announcements + priority + fanout (Phase 11)
- ✓ Prisma → Drizzle dual-ORM with Drizzle as query layer (Phase 11)
- ✓ Toast unification — Sonner only (Phase 18)
- ✓ Schema corrections — @@unique, ownerId, isPlatformAdmin (Phase 19)
- ✓ Self-service onboarding — signup + 5→7-step wizard + AssistSession
  (Phase 20)
- ✓ Content + Events public pages with date filtering (Phase 21)
- ✓ Page visibility flags + localized nav (Phase 22)
- ✓ Competitions + Resources as standalone models (Phase 23)
- ✓ Dashboard widgets, surveys tab, group moderation (Phase 24)
- ✓ Navigation alignment — single source of truth (Phase 26)
- ✓ Proxy consolidation (Phase 28)
- ✓ Dashboard defaults + space rename from tabs (Phase 29, 31)
- ✓ Focus Spaces (Home, Services, Community, Messages, Admin) (Phase 30)
- ✓ User suspension system + auto-unsuspend (Phase 33)
- ✓ Admin layer with command bar + activity stream (Phase 34)
- ✓ API alignment — tRPC routers, error envelope, rate limit, OpenAPI
  generation (Phase 35)
- ✓ Admin route consolidation (Phase 37)
- ✓ Space-aware layer rendering (Phase 38)
- ✓ Competition entries (Phase 39)
- ✓ Maintenance ticketing — ticket numbers, 7-status enum, handoffs
  (Phase 40)
- ✓ Feature gate consolidation — Role → Tier → Module → FeatureToggle
  (Phase 41)
- ✓ i18n hydration fix (Phase 42)
- ✓ UsersListSection refactor — 1,431 → 462 lines (Phase 32)
- ✓ Survey builder (Phase 36)

### Active

<!-- Current scope. Building toward these. -->

- [ ] **Phase 43+ architecture audit work** (from
      `docs/cleaner_react_architecture.md`, June 2026):
  - [ ] `qig` — Build shared HTTP client at `src/shared/api/client.ts`
        (auth header injection, envelope unwrap, typed responses)
  - [ ] `fpc` — Expand tRPC coverage from 2 routers to all entities
  - [ ] `9xr` — Extract pure domain helpers (`getEffectiveRole`,
        `generateTicketNumber`, permission functions) with unit tests
  - [ ] `5u2` — De-duplicate maintenance API transform logic between
        `src/app/api/maintenance/route.ts` and
        `src/entities/maintenance/api/route.ts`
  - [ ] `1ei` — Migrate widget `useEffect`+`fetch` to
        `useQuery`/`useMutation` (DashboardStats, EventsWidget,
        AdminStatsWidget, etc.)
- [ ] **Phase 35 follow-up**: Community Merits & Standing System (`2at`) —
      behaviour tracking (merit / warning / infraction), standing tiers
      (Gold/Silver/Bronze/Probation), admin dashboard, resident badge
- [ ] **i18n for all pages** (`l23`, `0f7`) — Tiptap content localization,
      database-backed translations
- [ ] **MyHomeSpace property linking bug** (`cs5`) — user has property
      (183 Pagoda Rd) but link not reflected in UI
- [ ] **OTP-based password reset** — upgrade from link to 6-digit OTP via
      `better-auth emailOTP` plugin

### Out of Scope

- **Preact in production** — listed in AGENTS.md but currently shipped as
  React. Re-evaluate if bundle size or TipTap/charts/maps compatibility
  friction appears.
- **Server components for dashboard** — attempted before and failed
  (`fso`). On hold.
- **External API consumers at scale** — `k3h` OpenAPI spec consumer
  verification pending; small pilot only.
- **Multi-instance rate limiting** — current in-memory Map store
  (single-instance); Redis upgrade only when multi-instance deployment is
  actually needed.
- **Plugin/extension system for 3rd-party modules** — flagged in
  `docs/REPORT.md` for future; not now.
- **Event sourcing / CQRS** — flagged in `docs/REPORT.md` for high-write
  areas; only if volume justifies.
- **Casino-grade RBAC** (CASL, permissions table) — current role +
  permission model is sufficient at current scale.

## Context

### Technical environment

- **Frontend**: Next.js 14 (App Router) + Preact, TypeScript strict,
  Tailwind CSS, React Hook Form + Zod, TanStack Query, Zustand
- **Backend**: Next.js route handlers + tRPC, Pino logging, Drizzle
  queries (edge-compatible), Prisma for schema/migrations
- **Auth**: Better Auth with email/password + OTP (planned) + passkey
  (planned), org-style tenant scoping via `Tenant.ownerId`
- **Database**: PostgreSQL via Supabase, real-time via Supabase Realtime
  on `Message` table
- **Commerce / API**: UCP & AP2 (planned), OpenAPI generated from tRPC
- **Deployment**: Vercel + Vercel Feature Flags, edge runtime for hot
  paths
- **Package manager**: pnpm

### Codebase structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Login, register, password reset
│   ├── (dashboard)/        # Protected dashboard
│   ├── (public)/           # Public pages
│   └── api/                # REST route handlers (transitional to tRPC)
├── entities/               # Domain models (one folder per entity)
│   ├── tenant/             # Multi-tenancy
│   ├── maintenance/        # Maintenance requests
│   ├── booking/            # Facility bookings
│   ├── chat/               # Real-time messaging
│   ├── user/               # User model + roles
│   └── ...
├── features/               # User-facing features
├── widgets/                # Composition components
├── page-modules/           # Page-level modules
├── shared/                 # Shared infrastructure
│   ├── api/                # Drizzle, tRPC helpers, client SDK
│   ├── lib/                # Hooks, utilities
│   └── ui/                 # Shared UI primitives
└── server/
    └── routers/            # tRPC routers (canonical)
```

### Known issues / tech debt

- **ID strategy inconsistency** — mix of `@default(cuid())`,
  `@default(uuid())`, and plain `String @id`. Standardize when convenient.
- **Soft deletes missing** — many entities lack `deletedAt`. Required for
  compliance/audit in residential communities.
- **RLS not yet enforced on all chat models** — Supabase policies + Drizzle
  where clauses needed.
- **REST sprawl** — 236+ raw `fetch('/api/...')` call sites in client code;
  migration to shared HTTP client + tRPC is open work (`qig`, `fpc`).
- **Widget useEffect+fetch patterns** — 30+ inline patterns; need migration
  to `useQuery`/`useMutation` (`1ei`).
- **POPIA compliance** — South Africa tenant requires monitoring of
  Supabase region for data residency.

### Recent audit (June 2026)

`docs/cleaner_react_architecture.md` and `docs/REPORT.md` cover the
8-chapter architecture audit and the high-level architecture review
respectively. The audit produced 5 new BD issues
(`qig`, `fpc`, `9xr`, `5u2`, `1ei`) and identified the shared HTTP client
as the unblocking dependency for chapters 2, 3, and downstream refactors.

## Constraints

- **Multi-tenancy**: Every query touching tenant data must use
  `withTenant()` middleware and `tenantId` filter. No exceptions. Cross-tenant
  data leakage is a P0 security bug.
- **No `any`**: TypeScript strict. Use `interface` for object shapes, generics
  for reusable components.
- **200-line component cap**: Split larger components into smaller, focused
  pieces. Container/Presentational pattern.
- **GSD worktree isolation**: All GSD phase execution MUST happen inside a
  dedicated git worktree (see AGENTS.md "Git Worktree Isolation"). Never
  execute a GSD phase in the main working directory.
- **AGENTS.md / docs/STEERING/ is source of truth**: SPEC.md, PRD.md,
  ADR.md, GUIDE.md, TDD.md, API.md — update when making decisions in those
  domains.
- **Prisma owns schema, Drizzle owns queries**: Define models in
  `prisma/schema.prisma`, run `prisma migrate dev` to evolve, run
  `prisma generate` to sync the Drizzle schema. Use Drizzle via
  `src/lib/db.ts` for all queries.
- **ISR over SSR**: Use `unstable_cache` with tags for cacheable reads.
  Use `revalidatePath` or revalidation utilities after mutations.
- **pushing is mandatory**: `git push` is required before session end.
  `git status` must show "up to date with origin".
- **POPIA**: South Africa data residency. Monitor Supabase region.
- **Vercel edge runtime**: Hot paths (chat, notifications, dashboard stats)
  must remain edge-compatible.

## Key Decisions

| Decision                                                                                             | Rationale                                                                                                                                                                                                         | Outcome                                           |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Prisma for schema/migrations + Drizzle for queries                                                   | Prisma's tooling is best-in-class; Drizzle is edge-compatible. Belt and braces.                                                                                                                                   | ✓ Pragmatic. Works well in practice.              |
| Multi-tenancy via `Tenant` row + `ownerId` + per-tenant `customDomain`                               | Self-service + white-label. `ownerId` makes ownership verifiable.                                                                                                                                                 | ✓ Good. Multi-tenant model solid.                 |
| `isPlatformAdmin` flag on user, never a Role enum value                                              | Trust boundary separation. Platform admin is structurally different from tenant-resident roles.                                                                                                                   | ✓ Good. Clean separation.                         |
| Two-table module design (`platform_modules` + `tenant_modules`)                                      | Tier-based defaults + per-tenant overrides. Single source of truth at each layer.                                                                                                                                 | ✓ Good. FeatureGate reads cleanly.                |
| tRPC for internal API, OpenAPI for external                                                          | Internal callers benefit from end-to-end types; external integrators need OpenAPI.                                                                                                                                | ✓ Good. Phase 35 brought this online.             |
| Hybrid feature gating — Tier (server) + Module (server) + FeatureToggle (client)                     | Server is source of truth; client is advisory.                                                                                                                                                                    | ✓ Good. Phase 41 closed gaps.                     |
| Better Auth over Clerk/Auth0                                                                         | Self-hostable, no per-MAU pricing, fine-grained Better Auth plugin ecosystem.                                                                                                                                     | ✓ Good. No regrets.                               |
| Supabase for Postgres + Realtime + Storage                                                           | One vendor, edge-friendly, RLS support.                                                                                                                                                                           | ✓ Good. Realtime chat works well.                 |
| Supabase Realtime on `Message` only                                                                  | Other surfaces don't need it yet.                                                                                                                                                                                 | ✓ Good. YAGNI.                                    |
| `unstable_cache` + tags for ISR                                                                      | Static-leaning content (directory, resources, events) cached aggressively; user-specific data 2–5 min.                                                                                                            | ✓ Good. Working as designed.                      |
| Sonner for toasts, Zustand toast removed                                                             | One toast system. `useApiToast` retained for API operations.                                                                                                                                                      | ✓ Good. Phase 18 closure.                         |
| Drizzle transactions for atomic suspend/unsuspend                                                    | Both ops succeed or fail together.                                                                                                                                                                                | ✓ Good.                                           |
| Auto-unsuspension on next API request                                                                | No cron job needed for MVP.                                                                                                                                                                                       | ✓ Good. Simpler ops.                              |
| Restructure dashboard from tabs to "Spaces"                                                          | Tabs were a model mismatch — they conflated navigation with layout. Spaces: Home, Services, Community, Messages, Admin.                                                                                           | ✓ Good. Phase 30+31 successfully migrated.        |
| `NEXT_PUBLIC_FOCUS_SPACES` feature flag rollout                                                      | Build alongside tabs, toggle, remove tabs later.                                                                                                                                                                  | ✓ Good. Phase 31 removed the flag and tabs.       |
| 5 spaces: Home, Services (merges Maintenance), Community, Messages, Admin                            | Tabs were a model mismatch. Spaces: Home (property + profile), Services (maintenance + bookings), Community (content + competitions + resources), Messages (chat + announcements), Admin (admin command surface). | ✓ Good. Aligns with how residents actually think. |
| Hybrid module gating — core spaces always visible, optional spaces auto-hide                         | Home/Messages/Admin are core; Services/Community hide when all their feature flags disabled.                                                                                                                      | ✓ Good. UX feels natural.                         |
| Inlined `TAB_TO_SPACE_MAP` in widget-store.ts (not external file)                                    | Post-Phase 31 the mapping is the canonical layout; external file added indirection.                                                                                                                               | ✓ Good.                                           |
| Server-wins-on-conflict for widget hydration                                                         | DB layout overrides localStorage on mount.                                                                                                                                                                        | ✓ Good. Phase 27 closure.                         |
| API response envelope: `apiSuccess(data)` + `apiError(code, status, message)`                        | Replaces ad-hoc `NextResponse.json()` in governed routes.                                                                                                                                                         | ✓ Good. Phase 35 alignment.                       |
| Canonical tRPC routers in `src/server/routers/`, old entity router kept as deprecated re-export shim | Smooth migration, no callsite breakage.                                                                                                                                                                           | ✓ Good.                                           |
| `trpc-openapi` rejected in favor of `@trpc/openapi`                                                  | trpc-openapi requires `@trpc/server@^10` (incompatible with tRPC v11).                                                                                                                                            | ✓ Good.                                           |
| `Entity-owned schema.ts` files in `src/entities/*/schema.ts`, re-exported from shared                | Avoids duplication during transition.                                                                                                                                                                             | ✓ Good.                                           |
| Rate limiting: in-memory Map for MVP                                                                 | Single-instance production. Redis upgrade flagged for multi-instance.                                                                                                                                             | ⚠️ Revisit when multi-instance.                   |
| Standardize on cuid2 or uuid (deferred)                                                              | Mix of cuid/uuid/string IDs is fragile in multi-tenant queries.                                                                                                                                                   | — Pending. Open work.                             |
| Soft deletes (`deletedAt`) deferred                                                                  | Compliance/audit need exists but feature work has higher priority.                                                                                                                                                | ⚠️ Revisit.                                       |
| GSD phase execution in dedicated git worktree                                                        | Prevents collisions with working tree during phase execution. (AGENTS.md update, 2026-06-03)                                                                                                                      | — Pending. Mandate established.                   |

---

_Last updated: 2026-06-03 after GSD health check (E002 PROJECT.md missing)
and AGENTS.md git worktree isolation mandate. Phase 36 complete,
verification pending; Phase 37–42 complete; architecture audit queued._
