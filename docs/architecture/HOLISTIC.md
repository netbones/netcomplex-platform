# NetComplex / Soralia Village — Holistic View

> **Last updated:** 2026-06-03
> **Purpose:** Living document tracking project architecture, cross-context impact, systemic risks, and progress.

---

## Domain Position

**Bounded Context:** Multi-tenant Community Management (SaaS platform)

**Core Concepts:** Tenant isolation, Module-based feature gating, Subscription tiers, Property-first identity model

**Platform State:** Actively evolving — 40 phases completed/planned, 791 TypeScript files, 150 API routes, 437 commits in the last month alone

The project spans two overlaid domains:

1. **NetComplex Platform** — Multi-tenant SaaS infrastructure (tenant provisioning, module registry, tier enforcement, platform admin)
2. **Soralia Village** — Anchor tenant (180 homes) exercising full feature surface: directory, maintenance ticketing, bookings, content, chat, competitions, surveys, events, resources

**Codebase follows Feature-Sliced Design (ADR-004):**

- `src/entities/` — 12 domain models (admin, booking, chat, content, directory, events, identity, maintenance, service, tenant, user, widget)
- `src/features/` — 15 feature modules (auth, announcements, onboarding, i18n, etc.)
- `src/widgets/` — 6 widget domains (admin, booking, chat, dashboard, maintenance, service)
- `src/shared/` — API infrastructure, UI primitives, lib utilities
- `src/server/` — tRPC routers (competitions, identity) + OpenAPI generator
- `src/app/` — 31 Next.js route segments + 40 API route directories

---

## Data Flow

```
Browser
  → Next.js Middleware (tenant resolution, auth)
    → App Router (RSC / Client components)
      → API Routes (150 REST) or tRPC (2 routers, 12+ identity procedures)
        → Auth Layer: getSessionAndRole() / withTenant() / requirePlatformAdmin()
          → Drizzle ORM (singleton via src/shared/api/db.ts Proxy)
            → Supabase PostgreSQL (tenant_id isolation on all tables)
              → Supabase Realtime (chat/messaging subscriptions)

Feature Gate: isModuleEnabled() → platform_modules + tenant_modules
Rate Limiter: in-memory Map (single-instance; Redis flagged)
Audit Logger: Pino → structured JSON
```

**Key shared infrastructure contracts:**

| Contract           | File                             | Role                                               |
| ------------------ | -------------------------------- | -------------------------------------------------- |
| API envelope       | `src/shared/api/api-response.ts` | `apiSuccess()` / `apiError()` (Phase 35 standard)  |
| Auth resolution    | `src/shared/api/auth-utils.ts`   | `getSessionAndRole()`, `requireNotSuspended()`     |
| Module gating      | `src/shared/api/feature-gate.ts` | `isModuleEnabled()` tier+module check              |
| DB singleton       | `src/shared/api/db.ts`           | Drizzle Proxy + `runWithRLS()` + `getRLSContext()` |
| Rate limiting      | `src/shared/api/rate-limit.ts`   | Per-route rate limiting                            |
| Cache invalidation | `src/shared/api/revalidation.ts` | ISR cache helpers                                  |

---

## Cross-Context Impact

### Critical Coupling Points

| Coupling Point                              | Impact if Broken                                                               |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| `tenantId` column on all 48 tables          | Cross-tenant data leakage — 3 critical leaks found and fixed in Phase 19       |
| `withTenant()` helper in API routes         | 20 routes still missing tenant filters (BD issue `e0w`)                        |
| Better Auth session → tenant context        | Auth break = total platform lockout                                            |
| RLS on 6 sensitive tables                   | Only enforced when using `runWithRLS()` — most routes use superuser connection |
| Prisma → Drizzle schema generation pipeline | Schema drift if `prisma generate` not run after migrations                     |
| Widget registry + manifest system           | Dashboard breakage if space/widget metadata out of sync                        |
| Vercel Feature Flags → module gating        | Module access breaks if flag config drifts from DB tenant_modules              |

### Blast Radius of Key Components

| Component    | File                                        | Blast Radius                             |
| ------------ | ------------------------------------------- | ---------------------------------------- |
| DB singleton | `src/shared/api/db.ts`                      | ALL data access; single point of failure |
| Middleware   | `src/middleware.ts`                         | Tenant resolution for every request      |
| Auth utils   | `src/shared/api/auth-utils.ts`              | Every protected route                    |
| Widget store | `src/entities/widget/model/widget-store.ts` | All dashboard layouts across all spaces  |
| Feature gate | `src/shared/api/feature-gate.ts`            | Module access for every tenant           |

---

## Temporal View

### Current Position

- **Phase:** 40-maintenance-ticketing
- **Status:** 3/4 plans complete → next: 40-04 (user tracking + HomeLayer integration + seed data)
- **Last updated:** 2026-06-01

### Velocity

- ~437 commits in May 2026
- 30+ phases completed

### Recently Completed (Last 2 Weeks)

- Phase 39: Competition entries (model, tRPC router, public UI, admin UI)
- Phase 40 plans 01-03: Maintenance ticketing schema, API, admin UI
- BD issue `e0w` closed: all routes now enforce `withTenant()`
- BD issue `22a` created + fixed: pool config (`max: 1`, timeouts) added to Drizzle singleton

### Planned but Not Yet Started

| Phase      | Goal                                          | Status            |
| ---------- | --------------------------------------------- | ----------------- |
| 31         | Dashboard tab removal (cleanup from Phase 30) | Planning complete |
| 33 plan 02 | User suspension frontend                      | Planning complete |
| 36         | Survey builder (Google Forms-like)            | Planned (4 waves) |
| 38         | Space layers (ServicesLayer + MessagesLayer)  | Planning complete |

### Open GAPS

| ID     | Title                                                           | Severity         | Status  |
| ------ | --------------------------------------------------------------- | ---------------- | ------- |
| GAP-04 | MobileMenu lowercase `'board'` bug                              | P1 (minor)       | Partial |
| GAP-08 | Missing visibility badge on resource cards                      | P2 (minor)       | Partial |
| GAP-09 | Self-service signup NOT atomic                                  | P2 (significant) | Closed  |
| GAP-11 | Missing widget registrations (competitions, resources, surveys) | P3               | Open    |

### Open BD Issues (22 remaining)

| ID        | Priority | Title                             |
| --------- | -------- | --------------------------------- |
| `cs5`     | P2       | MyHomeSpace property not linked   |
| `oqw`     | P3       | Wrap API routes with runWithRLS() |
| `l23`     | P2       | Epic: i18n for all pages          |
| `tc4`     | P3       | seed.ts type errors               |
| + 18 more | P3-P4    | Phase 4/5 features, backlog items |

---

## Key Insights

### Hidden Dependencies

1. **Dual ORM drift** — Prisma is schema source-of-truth but Drizzle is the query layer. If someone edits a Drizzle schema directly without updating Prisma, the next `prisma generate` will silently overwrite it. The generation pipeline is the hidden contract.
2. **Superuser DB connection** — Most routes use the privileged `DATABASE_URL` connection, bypassing RLS. Only routes explicitly wrapped in `runWithRLS()` get DB-level defense. The security model is primarily application-layer.
3. **In-memory rate limiter** — Works for single-instance Vercel but will silently fail to rate-limit across multiple instances. Redis upgrade is flagged but not implemented.
4. **tRPC vs REST split** — Only 2 tRPC routers exist (identity, competitions). 150 REST routes remain. The API governance docs prescribe tRPC for internal APIs, but the migration is incremental. Dual API surface adds maintenance burden.
5. **Widget space architecture is mid-migration** — Phase 30 (Focus Spaces) is complete, but ~Phase 31 (tab removal)~ and Phase 38 (purpose-built layers) are not. Old tab code coexists with new space code.

### Systemic Risks

1. ~~**20 routes without tenant filters** (`e0w`) — real cross-tenant data leakage risk in production~~
2. ~~**Non-atomic signup** (GAP-09) — user creation without tenant+role creates orphaned accounts~~ Resolved by Phase 20: `POST /api/platform/tenants` atomically creates tenant + user + ADMIN role in a single transaction.
3. **Single Drizzle connection** — ~~no connection pooling, no retry logic; Supabase connection limits could be hit under load~~ Fixed in BD issue `22a`: pool now configured with `max: 1`, `idleTimeoutMillis: 10000`, `connectionTimeoutMillis: 5000`. Retry deferred to Supabase pooler layer. 4.~~**No automated schema drift detection** — Prisma→Drizzle generation is manual; CI doesn't verify generated schemas match source~~ 8ffb071
   155: 5. **ADVISORY-014-P1:** Better Auth admin plugin uses `adminUserIds` whitelist. Adding new platform admins requires code change + deploy until Phase 2 (`isPlatformAdmin` bridge) is implemented. Tracked for resolution.

### Opportunities

1. ~~**Phase 31 (tab removal)** would eliminate 1,500 lines of dead code and simplify the widget architecture~~
2. **tRPC migration** — Only 2 tRPC routers exist vs 150 REST routes. Tracked in BD issue `fpc` (P2, M5a). Prerequisite shared HTTP client in `qig` (P2, M5a)
3. **RLS expansion** — Most routes use the superuser connection bypassing RLS. `runWithRLS()` wraps provide DB-level defense but are only used in a few places. Tracked in BD issue `oqw` (P3, security)
4. **Redis rate limiter** is a small change with outsized production safety impact

### Missing Documentation

- [x] ✅ `docs/CONTEXT_MAP.md` — bounded contexts and their relationships (created 2026-06-01)
- [x] ✅ `docs/UBIQUITOUS_LANGUAGE.md` — canonical terminology (created 2026-06-01)
- [x] ✅ `docs/contexts/*.md` — per-entity ownership contracts (12 contexts, created 2026-06-01)
- ADRs are well-maintained (21 entries) — Focus Space architecture (ADR-020) and Dual-API governance (ADR-021) added

---

## Recommended Reading

| File                                        | Why                                              |
| ------------------------------------------- | ------------------------------------------------ |
| `.planning/STATE.md`                        | All architectural decisions and current position |
| `.planning/ROADMAP.md`                      | Full phase history and planned work              |
| `.planning/GAPS.md`                         | Verified open issues with exact file references  |
| `docs/STEERING/ADR.md`                      | 19 architecture decisions with rationale         |
| `src/shared/api/db.ts`                      | Database singleton + RLS helpers (critical path) |
| `src/shared/api/auth-utils.ts`              | Auth resolution used by every protected route    |
| `src/entities/widget/model/widget-store.ts` | Dashboard state management                       |
| `src/middleware.ts`                         | Tenant resolution + auth guard for all requests  |

---

## Progress Log

| Date       | Update                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-01 | Initial holistic view created                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-06-01 | Created CONTEXT_MAP.md (12 bounded contexts, cross-cutting concerns, relationship patterns)                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-06-01 | Created UBIQUITOUS_LANGUAGE.md (50+ domain terms, 7 conflict resolutions, decision log)                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-06-01 | Created docs/contexts/ with 12 per-entity CONTEXT.md files (tenant, user, directory, maintenance, booking, chat, content, events, service, widget, admin, competitions)                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-06-01 | Evaluated feature gate consolidation proposal (GATE_DISCUSSION + GATE_ADDENDUM) — created docs/GATE_PLAN.md with 3-phase migration (foundation → incremental → cleanup) for the 5-layer precedence model                                                                                                                                                                                                                                                                                                                                    |
| 2026-06-03 | Audited route-level withTenant() coverage across all 157 API routes. Found 1 remaining gap (`resources/[id]/download/route.ts`) — fixed in `dda6589` (merged `06fceed`). 90 tenant-scoped routes use `withTenant()`; 67 non-tenant routes fall into 7 documented categories (public, platform admin, auth, webhook, etc.). Route registry at `docs/API_ROUTES.md` (157 routes enumerated). Created BD issue `22a` — added pool config to Drizzle singleton. **e0w remains in_progress** to track the recommended systematic 80-route audit. |
| 2026-06-03 | Updated GAP-09 from Open → Closed (resolved by Phase 20). Updated HOLISTIC.md GAPS table and systemic risks to match.                                                                                                                                                                                                                                                                                                                                                                                                                       |
