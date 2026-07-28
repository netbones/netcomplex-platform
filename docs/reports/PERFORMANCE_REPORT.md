---
title: Architecture & Performance Analysis: Soralia Village
status: current
reviewed: 2026-07-28
tags: [report, analysis]
audience: developer
---

# Architecture & Performance Analysis: Soralia Village

## 1. Overall File Structure

The project follows Feature-Sliced Design (FSD) architecture enforced by Steiger + ESLint:

| Layer          | Path                | Purpose                                                                                             |
| -------------- | ------------------- | --------------------------------------------------------------------------------------------------- |
| Pages          | src/app/            | Next.js 14 App Router routes                                                                        |
| Widgets        | src/widgets/        | Composable dashboard widgets (dashboard, admin, maintenance, booking, delegation, settings)         |
| Features       | src/features/       | Reusable business logic: auth, onboarding, disputes, billing, marketplace, chat, etc.               |
| Entities       | src/entities/       | Domain models: access, tenant, user, widget, dwallet, maintenance, merit, agent, survey, delegation |
| Shared         | src/shared/         | API layer (/api), UI components (/ui), hooks (/lib/hooks), utilities                                |
| Server Routers | src/server/routers/ | tRPC router implementations (19 domain routers)                                                     |
| DB Schema      | src/db/schema/      | Drizzle ORM table definitions (100+ schema files)                                                   |
| Server DTOs    | src/server/dto/     | Data transfer objects for API responses                                                             |

### Key app routes:

- /home/ubuntupunk/Projects/soralia-village/src/app/(tenant)/ — tenant data plane (dashboard, admin, billing)
- /home/ubuntupunk/Projects/soralia-village/src/app/(platform)/ — platform control plane
- /home/ubuntupunk/Projects/soralia-village/src/app/(auth)/ — shared auth routes
- /home/ubuntupunk/Projects/soralia-village/src/app/api/ — REST API routes (100+ endpoints)
  Root Layout at src/app/layout.tsx:10 sets export const dynamic = 'force-dynamic' — turning OFF static generation for the entire app, forcing SSR on every page.

## 2. Data-Fetching Patterns

### 2a. unstable_cache — ISR Caching (3 locations)

/home/ubuntupunk/Projects/soralia-village/src/shared/api/data-fetching.ts (114 lines)

- getDashboardStats (line 11): Cached 5 min with tags STATS, MAINTENANCE, BOOKINGS, MESSAGES, NOTIFICATIONS. Fires 4 parallel fetch() calls to internal API routes.
- getStaticStats (line 66): Cached 10 min with STATS tag.
- getUserContent (line 94): Cached 2 min per-user with CONTENT tag.
  /home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/flags/platform-flags.ts (line 66):
- getPlatformPageFlags: Cached 5 min with SETTINGS tag. Critical — every /api/access call invokes this.
  /home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/provider-registration-mode.ts (line 43):
- getProviderRegistrationMode: Also cached with SETTINGS.

### 2b. REST API Routes

All located under src/app/api/. 100+ route files, each with:

- export const maxDuration = 8 (most common) or 3 (/api/stats), 5 (/api/dashboard/stats, /api/access), 15 (/api/disputes/intake-screen), 30 (/api/cron/ai-pool-rollover), 60 (/api/purge)
- export const dynamic = 'force-dynamic' on 14 routes (line at top of src/app/layout.tsx already forces this globally)

### 2c. tRPC (Primary Data Layer)

/home/ubuntupunk/Projects/soralia-village/src/app/api/trpc/[trpc]/route.ts — single catch-all handler for tRPC.

- Client config at src/app/providers.tsx:15-25: httpBatchLink, superjson transformer, staleTime of 60s
- 19 domain routers combined in src/server/routers/index.ts
- Largest routers: identity.ts (1840 lines), content.ts (1085 lines), competitions.ts (890 lines), groups.ts (611 lines), disputes.ts (605 lines)

### 2d. TanStack Query (Client-Side)

100+ usage sites across the codebase. Key patterns:

- useQuery for reads, useMutation for writes
- Stale time: 60s global default (src/app/providers.tsx:20)
- Domain-specific stale times: 0 for usePageAccess (always fresh), 5 min for useEnabledModules
- useInfiniteQuery for admin activity streams

## 3. State Management

### 3a. Zustand Stores (2 instances)

/home/ubuntupunk/Projects/soralia-village/src/entities/widget/model/widget-store.ts (370 lines, line 1):

- useWidgetStore — persist() middleware, version 5 migration
- Manages widget layouts (x, y, width, height, isCollapsed) and user widget lists per space
- Auto-save with debounce (line 91-92, 500ms) via saveToDatabase() → PATCH /api/users/[userId]
- Hydrates from server then localStorage as fallback
  /home/ubuntupunk/Projects/soralia-village/src/entities/tenant/model/gate-context-store.ts (27 lines, line 1):
- useGateContextStore — simple module flag store, hydrated from /api/gate/context

### 3b. TanStack Query (Server State)

Used pervasively as the primary server-state layer. Configured at src/app/providers.tsx:15-24.

## 4. Database Query Patterns

### 4a. Connection Pooling

/home/ubuntupunk/Projects/soralia-village/src/shared/api/db.ts (488 lines):

- Drizzle ORM with node-postgres Pool
- Two separate Pools: db (app queries) and authDb (Better Auth) — to avoid concurrent-query deprecation warnings (line 307-316)
- Pool config (line 38-42): max: 10, idleTimeoutMillis: 10000, connectionTimeoutMillis: 5000
- RLS-aware transactions via runWithRLS() (line 336-358): Sets app.user_id, app.tenant_id, app.user_role, app.is_platform_admin session variables for Postgres RLS policies
- 100+ table imports — all Drizzle schema tables are re-exported from this file

### 4b. Multi-Tenancy

/home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/base.ts (235 lines):

- getTenantBySlug(), getTenantById() — simple single-row Drizzle queries
- getCurrentTenant() — reads x-tenant-id/x-tenant-slug from headers, falls back to LOCAL_TENANT_SLUG
- NOTE: unstable_cache import is commented out (line 19) — tenant resolution is NOT cached
  /home/ubuntupunk/Projects/soralia-village/src/entities/tenant/api/with-tenant.ts (51 lines):
- Every API route calls this, doing a DB query per request if tenant-slug doesn't resolve to cached ID

### 4c. Drizzle Schema Location

drizzle.config.ts points to ./src/db/schema/\*.ts — 100+ schema files.

## 5. Component Structure & Heavy Components

### 5a. Largest Dashboard Widgets

The dashboard has a widget-based architecture with a DnD grid (SpaceLayout):
Component Lines
HomeLayer.tsx 626
PremiumPortfolioWidget.tsx 442
TabbedProfile.tsx 400
AdminActivityStream.tsx 396
AdminCommandBar.tsx 365
MyAlbumWidget.tsx 341
ServicesLayer.tsx 327
CommunityGraphWidget.tsx 327
ServicesCommandBar.tsx 308
AgentWidget.tsx 278
SpaceLayout.tsx 260
HomeLayer.tsx (626 lines) is the heaviest — fires multiple fetch() calls for announcements, maintenance items, events, and messages on client mount (lines 10-19, fetchJson helper). No batch/parallel optimization.

### 5b. Nested Suspense Boundaries

Root layout at src/app/layout.tsx wraps children in <Suspense fallback={null}> — minimal loading strategy.

### 5c. Client Component Prevalence

100+ files marked 'use client' — virtually all pages are client-rendered. Combined with force-dynamic on the root layout, this means the app is essentially fully CSR/SSR with no static pages.

## 6. Performance Configurations

### 6a. next.config.mjs (/home/ubuntupunk/Projects/soralia-village/next.config.mjs)

- reactStrictMode: true (line 10)
- serverExternalPackages: ['pino', 'ioredis'] (line 15) — avoids bundling Pino workers
- images.dangerouslyAllowSVG: true (line 26) with remote patterns for 5 domains
- Custom Cache-Control headers (line 62-83): /api/stats → 5min, /api/content → 3min
- PostHog rewrite for /ingest/:path\* (line 87-92)
- Commented out: cacheComponents: true for PPR (line 22) — noted as incompatible with force-dynamic

### 6b. Middleware (src/middleware.ts, 270 lines)

- Multi-tenant host-based routing (platform vs tenant plane)
- CORS handling for API routes
- Locale detection (cookie → accept-language → default)
- x-request-id generation via crypto.randomUUID()
- x-plane and x-tenant-slug header injection
- Static asset bypass (line 160): skips \_next, static, and files with extensions

### 6c. maxDuration Settings

96 API routes set maxDuration — ranging from 3s (/api/stats) to 60s (/api/purge).

## 7. ISR / Revalidation Patterns

### 7a. Central Revalidation File

/home/ubuntupunk/Projects/soralia-village/src/shared/api/revalidation.ts (132 lines):

- CACHE_TAGS constant (line 12): stats, maintenance, bookings, messages, notifications, content, groups, users, conversations, settings
- Domain-specific revalidation functions:
- revalidateDashboard() (line 28): 6 revalidatePath() calls
- revalidateDirectory() (line 41): 3 calls
- revalidateContent() (line 50): 3 calls
- revalidateConversations() (line 59): 3 calls
- revalidateAdminChanges() (line 71): chains dashboard + directory + content + admin paths
- revalidateUserData() (line 90): per-user paths
- revalidateGate() (line 110): 14 revalidatePath() calls covering all gated pages

  ### 7b. revalidateTag Usage

  Used in admin settings routes:

- src/app/api/admin/settings/hero-carousel/route.ts:87
- src/app/api/admin/settings/page-flags/route.ts:105,173
- src/app/api/admin/tenant/provider-registration-mode/route.ts:78
- src/app/api/admin/services-config/route.ts:87

# Performance-Critical Areas Summary

1.  No static pages — force-dynamic on root layout means 0% static generation. Every page is SSR or CSR.
2.  Every API route calls withTenant() — which does a DB query for tenant lookup (not cached).
3.  /api/access called on every navigation — resolves role, provider, suspension, flags, and agent scope (393-line resolver). Cached only 30s client-side.
4.  tRPC context creation (src/shared/api/trpc/server.ts:21-61) does a session lookup + DB query for role/tenantId on every tRPC call.
5.  HomeLayer widget fires 4+ unbatched fetch() calls on mount.
6.  Widget store auto-saves to DB on every layout change with 500ms debounce.
7.  100+ client components — vast majority of the UI is client-rendered.
8.  Large tRPC routers — identity.ts at 1840 lines is a monolith that should be split.
9.  DB pool at max: 10 with connectionTimeoutMillis: 5000 — adequate but tight under concurrency for a force-dynamic app.
10. unstable_cache used in only 3 places — most data fetching goes through tRPC or raw fetch() with no server-side caching.
