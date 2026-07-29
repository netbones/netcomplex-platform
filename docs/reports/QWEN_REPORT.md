---
title: Qwen Codebase Analysis Report
status: current
reviewed: 2026-07-29
tags: [audit, architecture, debt, qwen]
audience: developer
---

### Transcribed Content Preview:

### 2. Massive monolithic Prisma schema (3,500+ lines, 55+ models)

A single `schema.prisma` with 55+ models spanning auth, billing, disputes, marketplace, AI, seats, proxies, and more. No modularization. Any developer needs to understand the entire schema to work on any feature. Adding a new model risks breaking unrelated relations.

### 3. God router: merits.ts is 639 lines with all business logic in the router ✅

tRPC routers should be thin – input validation + calling a service. This router contained 8 procedures, helper functions (`createMeritRecord`, `requireUsersPermission`, `notifyTierChange`), constants, and complex business logic (standing calculation, dispute workflows) all in one file. Same pattern in `competitions.ts` (556 lines).

✅ Fixed: `merits.ts` (639→240) and `competitions.ts` (914→310) — logic extracted to `entities/{merit,competition}/services/`. `proxy-vote.router.ts` was already thin (153 lines, delegates to services).

### 4. Auth logic duplicated across ~304 API route handlers ✅

`getSessionAndRole` is imported from `@shared/api` into ~304 REST API route handlers. Each handler individually checks auth, session, suspension, and permissions. Meanwhile the same **suspension logic** is also duplicated in `tRPC/server.ts` as `checkNotSuspended()`. This is 304+ nearly-identical auth boilerplate blocks with no middleware/CDI layer to eliminate duplication.

✅ Fixed: Unified auth behind `requireAuth(request, options?)` in `src/shared/api/auth-utils.ts`. Single call returns `{ success: false, response }` (401/403) or `{ success: true, data: { userId, role, tenantId, session, suspension } }`. Internally delegates to the shared `checkUserSuspension()` function — same code path as tRPC's `checkNotSuspended`, eliminating duplication between REST and tPC.

**Migrated:** 71 of 76 routes from `getSessionAndRole` + `guardSuspension` + manual `hasPermission` + `assertModuleEnabled` to `requireAuth(request, { permission?, module? })`. 5 routes intentionally left on `getSessionAndRole` (use optional-auth pattern; require an `optionalAuth()` helper — see Followups).

| Directory                                                                                                                                                                                            | Routes migrated |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `resources/`, `bookings/`, `events/`, `surveys/`, `messages/`, `conversations/`, `settings/`                                                                                                         | 7               |
| `competitions/`, `content/`, `achievements/`, `invitations/`, `providers/legal/`, `user/albums/public/`                                                                                              | 7               |
| `disputes/` (9 files), `groups/` (3), `surveys/[id]/` (8), `tenants/[id]/modules/`, `v1/tenant/dwallet/` (10), `conversations/find/`                                                                 | 22              |
| `admin/` (22), `maintenance/` (7), `resources/[id]/`, `settings/[key]/`, `users/` (2), `achievements/progress/`, `translate/`, `gate/context/`, `agent/tokens/` (2), `access/` (partial — POST only) | 35              |

**Pattern applied:**

```typescript
// Before — 4-7 lines per handler
const authData = await getSessionAndRole(request);
if (!authData) return apiUnauthorized();
const guard = guardSuspension(authData);
if (guard) return guard;
if (!hasPermission(authData.role, 'admin')) return apiForbidden();
const featureCheck = await assertModuleEnabled('settings');
if (featureCheck) return featureCheck;

// After — 2 lines
const auth = await requireAuth(request, { permission: 'admin', module: 'settings' });
if (!auth.success) return auth.response;
```

**Commits:** `c9d08be3`, `9b3dfa3d`, `ab717376`, `5d3d5dc8`, `f3f24321` (5 commits on `dev`).

**Test mocks updated:** 14 test files migrated to mock `@/shared/api/auth-utils` directly via `vi.mock('@/shared/api/auth-utils', ...)`. Added `createLogger` to `@shared/lib` mocks (resolves `auth → resend.ts → createLogger` chain).

**Followups:**

- Add `optionalAuth()` helper for the 5 routes that use non-rejecting session lookup (`access/`, `providers/legal` GET, `resources/` GET × 2, `users/` GET).
- Apply the same pattern to remaining ~228 GET/POST handlers in `src/app/api/**` not covered by this migration.
- Consider an `auth-middleware` layer that runs `requireAuth` once and exposes `auth.data` on a request-scoped object — eliminates the per-handler 2-line check entirely.

### 5. Better Auth config tightly coupled to 10 application tables

`auth.ts` directly imports `users`, `sessions`, `accounts`, `verifications`, `passkeys`, `twoFactors`, `members`, `invitations`, `organizations`, `tenants` from the Drizzle schema. The `databaseHooks.user.create` hook queries `tenants` to resolve slug-to-ID. This creates circular dependency: auth config depends on Drizzle schema. Drizzle schema is generated from Prisma schema.

### 6. No service layer – business logic lives in routers ✅ (duplicate of #3)

There are entity service directories (`src/entities/*/services/`) but the tRPC routers in `src/server/routers/` bypass them and query `db` directly with business logic mixed in. `merits.ts` calculates standing, creates notifications, writes audit logs, and performs revalidation – all inside a router.

✅ Same fix as #3: `merits.ts` and `competitions.ts` now delegate to `entities/*/services/`.

### 7. Fragmented state management

Multiple uncoordinated stores: `useTenantStore` (zustand), `useGateContextStore` (zustand), `useWidgetStore` (358 lines), plus React Context in several places. No pattern for which state belongs where, leading to duplication and stale state risks.

### 8. Three parallel API patterns with unclear boundaries

REST route handlers (`src/app/api/*/route.ts`), tRPC procedures (`src/server/routers/`), and Next.js page routes (`src/app/`) all coexist. Some features (like merits) have both REST routes (auth duplication) AND tRPC procedures. No governance on which to use when.
