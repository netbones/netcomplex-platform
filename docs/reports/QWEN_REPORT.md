---
title: Qwen Codebase Analysis Report
status: current
reviewed: 2026-07-28
tags: [audit, architecture, debt, qwen]
audience: developer
---

### Transcribed Content Preview:

### 2. Massive monolithic Prisma schema (3,500+ lines, 55+ models)

A single `schema.prisma` with 55+ models spanning auth, billing, disputes, marketplace, AI, seats, proxies, and more. No modularization. Any developer needs to understand the entire schema to work on any feature. Adding a new model risks breaking unrelated relations.

### 3. God router: merits.ts is 639 lines with all business logic in the router

tRPC routers should be thin – input validation + calling a service. This router contains 8 procedures, helper functions (`createMeritRecord`, `requireUsersPermission`, `notifyTierChange`), constants, and complex business logic (standing calculation, dispute workflows) all in one file. Same pattern in `competitions.ts` (556 lines) and `proxy-vote.router.ts` (200 lines).

### 4. Auth logic duplicated across ~304 API route handlers

`getSessionAndRole` is imported from `@shared/api` into ~304 REST API route handlers. Each handler individually checks auth, session, suspension, and permissions. Meanwhile the same **suspension logic** is also duplicated in `tRPC/server.ts` as `checkNotSuspended()`. This is 304+ nearly-identical auth boilerplate blocks with no middleware/CDI layer to eliminate duplication.

### 5. Better Auth config tightly coupled to 10 application tables

`auth.ts` directly imports `users`, `sessions`, `accounts`, `verifications`, `passkeys`, `twoFactors`, `members`, `invitations`, `organizations`, `tenants` from the Drizzle schema. The `databaseHooks.user.create` hook queries `tenants` to resolve slug-to-ID. This creates circular dependency: auth config depends on Drizzle schema $\rightarrow$ Drizzle schema is generated from Prisma schema.

### 6. No service layer – business logic lives in routers

There are entity service directories (`src/entities/*/services/`) but the tRPC routers in `src/server/routers/` bypass them and query `db` directly with business logic mixed in. `merits.ts` calculates standing, creates notifications, writes audit logs, and performs revalidation – all inside a router.

### 7. Fragmented state management

Multiple uncoordinated stores: `useTenantStore` (zustand), `useGateContextStore` (zustand), `useWidgetStore` (358 lines), plus React Context in several places. No pattern for which state belongs where, leading to duplication and stale state risks.

### 8. Three parallel API patterns with unclear boundaries

REST route handlers (`src/app/api/*/route.ts`), tRPC procedures (`src/server/routers/`), and Next.js page routes (`src/app/`) all coexist. Some features (like merits) have both REST routes (auth duplication) AND tRPC procedures. No governance on which to use when.
