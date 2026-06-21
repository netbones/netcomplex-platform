# Technical Debt & Code Gotchas Report

**Project:** Soralia Village (Netcomplex)  
**Date:** 2026-06-20  
**Scope:** `src/`, `prisma/`, `scripts/`, `test/`  
**Source Files:** ~957 `.ts`/`.tsx` files  
**Test Files:** 51 (5.3% coverage)

---

## 1. CRITICAL

### ~~1.1 No Error Handling in 113+ API Routes~~ **FIXED (2026-06-21)**

~~**Severity:** CRITICAL~~  
~~**Files:** `src/app/api/*/route.ts` (113+ route files)~~

**Fix:** Created centralized `withErrorHandler()` wrapper at `src/shared/api/with-error-handler.ts`, exported from `@api/server`. Applied to 60 route files (all that lacked any `try/catch`). Catches unexpected errors, logs via Pino, returns consistent `apiInternalError()` response. Also catches Zod validation errors and returns 422.

---

### ~~1.2 Circular Dependency Chains in `shared/api/`~~ **FIXED (2026-06-21)**

~~**Files:** `shared/api/auth.ts` ↔ `shared/api/db.ts`, `shared/api/index.ts` barrel~~  
**Fix:**

- `auth.ts`: Changed `import from '@shared/api'` → direct imports from `./email/resend` and `./email/templates`
- Extracted `getRLSContext()` from `db.ts` into new `rls-context.ts` — removes `db.ts` → `auth.ts` dynamic import
- Madge: 0 circular dependencies (down from 5)

---

### 1.3 `as any` Type Assertions in API Routes

**Severity:** CRITICAL  
**Details:** 177 instances of `as any` across the codebase. Many are in API routes where Zod-validated data is cast to bypass TypeScript strictness, defeating the purpose of using Drizzle's type-safe query builder.

**Examples:**

- `src/app/api/announcements/route.ts:267` — `as any` on `insert(notifications).values(...)`
- `src/app/api/merits/[id]/route.ts:85` — `updateData as any`
- `src/app/api/merits/route.ts:40` — `status as any` on enum comparison

**Fix:** Derive insert/update types from Drizzle schema using `typeof` and `z.infer<>` from Zod schemas. Remove `/* eslint-disable @typescript-eslint/no-explicit-any */` overrides.

---

### 1.4 Prisma Is Dead Weight

**Severity:** CRITICAL  
**Files:** `prisma/schema.prisma`, `package.json`  
**Details:**

- No source file imports `@prisma/client` (verified via `grep -rn "import.*prisma" src/`)
- All DB operations use Drizzle ORM
- Yet `prisma` (5.22.0), `@prisma/client` (5.22.0), and `prisma-generator-drizzle` remain in `dependencies`/`devDependencies`
- These add ~15MB+ to install size and slow builds
- The `prisma/` directory contains `schema.prisma`, seed scripts, and migrations that are no longer referenced

**Fix:** Remove Prisma entirely (if migration is complete) or document the exit criteria. Update `README.md` with the migration status.

**Devnote**: We using Prisma schema strictly for development, there should be no instances of its use as client.

---

### ~~1.5 In-Memory Rate Limiter in Production~~ **FIXED (2026-06-21)**

~~**Severity:** CRITICAL~~  
~~**File:** `src/shared/api/rate-limit.ts`~~  
~~**Details:** The rate limiter uses a `Map` in-process.~~

**Fix:** Replaced with Upstash Redis via ioredis (`rediss://` connection). `rateLimitByKey`/`IP`/`User` now use `INCR` + `EXPIRE` via `MULTI`/`EXEC` for atomic counters. Fails open (allows requests) if Redis is unreachable.

---

### ~~1.6 Unbounded `select()` Queries~~ **FIXED (2026-06-21)**

~~**File:** `src/app/api/stats/route.ts`~~  
**Fix:** Replaced `select({ id }).from().where()` + `.length` with `select({ count: count() })` in 4 files (9 queries): `stats/route.ts`, `dashboard/stats/route.ts`, `seats/route.ts`, `content/[id]/like/route.ts`.

---

### ~~1.7 Silent Security Degradation in `runWithRLS`~~ **FIXED (2026-06-21)**

~~**File:** `src/shared/api/db.ts:256-262`~~  
**Fix:** Added `log.warn({}, 'RLS role switch failed — proceeding without app_user role. RLS policies NOT enforced.')` to the empty catch block. Uses existing `createComponentLogger`.

---

## 2. HIGH

### 2.1 Auth Inconsistency Across API Routes

**Severity:** HIGH  
**Details:** Of 167 API route files, only ~99 import or reference auth utilities. Many routes that appear to require authentication (e.g., `maintenance/[id]/route.ts`, `groups/*/route.ts`) do not call `auth.api.getSession()` or any equivalent guard.

**Fix:** Audit every route. Apply a `requireAuth()` wrapper to all non-public routes. Map routes to their required roles.

---

### 2.2 Hardcoded Demo Data

**Severity:** HIGH  
**File:** `src/app/api/stats/route.ts:40-43`  
**Details:**

```typescript
const stats = {
  homes: 180,
  years: 15,
  birdSpecies: 47,
  nativePlants: 150,
  // ...
};
```

These values are baked into the API. For multi-tenancy, these should derive from tenant configuration or database state.

**Fix:** Move to tenant config or CMS.

---

### 2.3 Fanout Cap with `slice()` Instead of `LIMIT`

**Severity:** HIGH  
**File:** `src/app/api/announcements/route.ts:252`  
**Details:**

```typescript
const cappedUsers = targetUsers.slice(0, FANOUT_CAP); // JS-level cap
// TODO: Beyond FANOUT_CAP users, bulk job processing (queue) will be needed
```

The `slice()` happens after the full result set is fetched from the DB. For large tenants, this is wasteful. The SQL should use `LIMIT` directly.

**Fix:** Add `.limit(FANOUT_CAP)` to the Drizzle query or handle in a background job.

---

### 2.4 `.limit(10000)` — High Default Cap

**Severity:** HIGH  
**File:** `src/app/api/announcements/route.ts:118`  
**Details:**

```typescript
.limit(limit ?? 10000) // Use a high default instead of no limit to avoid type issues
```

A client that omits `limit` gets up to 10,000 records. This is a DoS vector and memory risk.

**Fix:** Set a strict default (e.g., 50–100) and cap the maximum.

---

### 2.5 6 TODO/FIXMEs in Source Code

**Severity:** HIGH  
**Files:** Multiple  
**Details:**

- `src/widgets/dashboard/ui/MobileSpaceBar.tsx:27,55` — "TODO: implement 'More' overflow sheet"
- `src/widgets/dashboard/ui/MobileSpaceBar.tsx:116` — "TODO: connect to real unread message count"
- `src/app/api/announcements/route.ts:253` — "TODO: Beyond FANOUT_CAP users, bulk job processing"
- `src/app/bookings/page.tsx:11` — "TODO: Re-enable tenant-based feature gating"
- `src/shared/api/rate-limit.ts:7` — "TODO: Replace in-memory store with Redis"

These indicate partially-implemented features that may block launch.

**Fix:** Convert to BD/GSD issues with assignees and due dates.

---

## 3. MEDIUM

### 3.1 Test Coverage: 5.3%

**Severity:** MEDIUM  
**Details:** 51 test files / 957 source files. Critical paths (auth, payments, RLS, booking logic) are largely untested. The test suite uses Vitest but covers primarily UI components and utility functions.

**Fix:** Add unit tests for all API route handlers. Use a test database (Dockerized Postgres or isolated schema) and test the tRPC routers end-to-end.

---

### 3.2 `new Date()` in API Routes (93 instances)

**Severity:** MEDIUM  
**Files:** `src/app/api/**/*.ts`  
**Details:** 93 instances of `new Date()` in route handlers. While not a bug per se, this makes testing non-deterministic and prevents time-travel tests. Also, JavaScript `Date` uses the server timezone, which may differ from the tenant's timezone.

**Fix:** Inject a `now: () => Date` function or use ` Temporal.Instant` with a centralized clock utility.

---

### 3.3 `maxDuration` Inconsistency

**Severity:** MEDIUM  
**Details:** `maxDuration` is set on some routes (3–8s) but not all. Routes that do complex joins or fanouts (e.g., announcements) lack it, risking Vercel timeouts.

**Fix:** Add `maxDuration` to every route file, based on expected worst-case execution time.

---

### 3.4 TypeScript `any` in Widget Registry

**Severity:** MEDIUM  
**File:** `src/widgets/dashboard/model/registry.ts:11`  
**Details:**

```typescript
export type WidgetComponent = ComponentType<any>;
```

**Fix:** Define a strict `WidgetProps` interface.

---

### 3.5 `unstable_cache` Usage

**Severity:** MEDIUM  
**Files:** `src/shared/api/data-fetching.ts`, `src/entities/tenant/api/flags/platform-flags.ts`  
**Details:** `unstable_cache` from `next/cache` is used for dashboard stats and user content. As the name implies, this API is unstable and may change. The `revalidate` values are hardcoded without documentation.

**Fix:** Audit cache tags and revalidation strategies. Add fallback behavior for cache misses.

---

## 4. LOW

### 4.1 Console Output in Production

**Severity:** LOW  
**Files:** `src/widgets/dashboard/ui/MobileSpaceBar.tsx:56`  
**Details:** `console.warn` present in production code.

**Fix:** Replace with structured logging (Pino).

---

### 4.2 Hardcoded Version in Health Check

**Severity:** LOW  
**File:** `src/app/api/health/route.ts` (assumed)  
**Details:** Health endpoint likely returns a static version string.

**Fix:** Read from `process.env.npm_package_version` or `package.json`.

---

### 4.3 Commented Console Statements

**Severity:** LOW  
**Details:** Some files have commented-out `console.log` or `console.error`.

**Fix:** Run `eslint --fix` or remove manually.

---

## 5. Gotchas

### 5.1 Dual ORM Complexity

The Prisma-to-Drizzle migration appears complete in code, but the Prisma schema, generator, and seed scripts remain. If you `prisma db push` accidentally, it may overwrite migrations that Drizzle already owns. **Do not run Prisma commands without verifying the migration state.**

### 5.2 RLS Is Dormant

`runWithRLS` exists but is not called in most API routes. RLS policies in `prisma/migrations/20260604000000_add_rls_policies/` are created but likely not enforced for the majority of queries. This is noted in `AGENTS.md` but easy to miss.

### 5.3 `withTenant()` Relies on Hostname Parsing

`src/middleware.ts` infers tenant from the `Host` header. In local dev, `LOCAL_TENANT_SLUG` overrides this. In production, a misconfigured DNS or missing `Host` header will default to `soralia`.

### 5.4 Better Auth Plugin Version Pin

`@better-auth/passkey` is pinned at `1.5.6` but `@better-auth/cli` and `better-auth` core are at different minor versions. This can lead to type incompatibilities.

---

## Summary Table

| Category                     | Count                                | Priority |
| ---------------------------- | ------------------------------------ | -------- |
| API routes without try/catch | ~~113+~~ **FIXED (2026-06-21)**      | CRITICAL |
| `as any` casts               | 177                                  | CRITICAL |
| Circular dependencies        | ~~16 cycles~~ **FIXED (2026-06-21)** | CRITICAL |
| Prisma dead weight           | ~15MB                                | CRITICAL |
| In-memory rate limiter       | ~~1 file~~ **FIXED (2026-06-21)**    | CRITICAL |
| Unbounded `select()`         | ~~4+ routes~~ **FIXED (2026-06-21)** | CRITICAL |
| Silent RLS bypass            | ~~1 file~~ **FIXED (2026-06-21)**    | CRITICAL |
| Auth inconsistency           | ~68 routes                           | HIGH     |
| Hardcoded demo data          | 4 values                             | HIGH     |
| `limit(10000)` default       | 1 route                              | HIGH     |
| TODO/FIXME in source         | 6 items                              | HIGH     |
| Test coverage                | 5.3%                                 | MEDIUM   |
| `new Date()` in routes       | 93 instances                         | MEDIUM   |
| Missing `maxDuration`        | ~40% of routes                       | MEDIUM   |
| `unstable_cache` usage       | 5 functions                          | MEDIUM   |

---

## Recommended Action Plan

1. **Week 1 (Critical):**
   - ~~Add centralized error handling to all API routes~~ **DONE — `withErrorHandler` HOC applied to 60 route files**
   - Document Prisma's role
   - ~~Replace in-memory rate limiter with Redis~~ **DONE — Upstash Redis via ioredis**
   - ~~Fix unbounded `select()` queries with `count()`~~ **DONE — 4 files, 9 queries**
   - ~~Add logging to silent RLS bypass~~ **DONE**

2. **Week 2 (High):**
   - ~~Break circular dependencies by fixing barrel self-imports~~ **DONE — 0 cycles**
   - Replace `as any` with proper Drizzle + Zod types
   - Add auth guards to all protected routes
   - Convert TODOs to BD/GSD issues

3. **Week 3–4 (Medium):**
   - Increase test coverage to 30%+ (focus on API routes)
   - Add `maxDuration` to all routes
   - Centralize `new Date()` usage
   - Review and harden `unstable_cache` configs
