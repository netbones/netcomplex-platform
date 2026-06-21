# Technical Debt Register — Soralia Village

## Review Summary

The codebase has ~957 source files with only 51 test files (5.3% coverage). Critical architectural debt exists: 113/167 API route files have zero error handling, Prisma remains as a dead dependency despite full Drizzle adoption, and 114 route files authenticate users inconsistently or not at all. The dual-ORM state is documented as intentional (migration in progress) but leaves significant cleanup debt. Circular dependency chains in shared/api/ and entities/ indicate architectural coupling that will worsen.

## Issues Found

- CRITICAL

# Severity File(s) Description Suggested Fix

1 CRITICAL src/app/api/_/route.ts (113 files) No try/catch blocks in 113 API route files. Any unhandled DB error, JSON parse failure, or auth exception will crash the server and leak stack traces. Add centralized error handling middleware or wrapper. export async function GET(req) { return withErrorHandler(() => { ... }); }
2 CRITICAL src/shared/api/auth.ts → src/shared/api/db.ts Circular dependency chain: auth.ts imports from db.ts, which imports from auth.ts (via getRLSContext). Also shared/api/client.ts → trpc/routers.ts → server/routers/_.ts → shared/api/auth-utils.ts → shared/api/auth.ts → shared/api/index.ts Extract auth config and db client into separate leaf modules. Break the shared/api/index.ts barrel that forces mutual references.
3 CRITICAL src/app/api/content/[id]/route.ts:173 PATCH route accepts untrusted body directly without session/auth checks before touching request.json(). Add getSessionAndRole() guard before parsing the body.
4 CRITICAL src/shared/ui/Turnstile.tsx:175 Server-side secret exposed in client component: process.env.TURNSTILE*SECRET_KEY accessed in a UI component. Move secret verification to an API route; use NEXT_PUBLIC* prefix only for public keys.
5 CRITICAL prisma/schema.prisma + package.json Dead dependency: Prisma schema has 61 models, but code references @prisma/client zero times. Prisma client, generator, and prisma-generator-drizzle add ~15MB+ to install size and build time. Remove Prisma if migration is complete. If incomplete, document the exit criteria and timeline in README.md.
6 CRITICAL src/app/api/stats/route.ts:12-16 Unbounded query: select({ id: users.id }) fetches ALL active users into memory just to count them. Use .select({ count: count() }) instead of selecting all rows.
7 CRITICAL src/app/api/_/route.ts (various) Inconsistent auth checks: 114 routes do not call auth.api.getSession at all. Some are public by design, but many (e.g., maintenance/[id]/route.ts, groups/_/route.ts) appear to allow unauthenticated writes. Audit all routes. Apply requireAuth() wrapper to every non-public route.

- HIGH

# Severity File(s) Description Suggested Fix

8 HIGH src/shared/api/db.ts:215-230 Proxy-based singleton is fragile: new Proxy({} as ReturnType<typeof drizzle>, ...) defeats TypeScript inference and adds ~100 bytes of overhead per call. Two pools (db + authDb) double connection usage. Refactor to a direct singleton instance. If two pools are truly needed, document why and monitor pg_stat_activity.
9 HIGH src/shared/api/db.ts:250-270 RLS transaction catches role error silently: await tx.execute(sql\ SET LOCAL ROLE app_user\ ) is wrapped in a bare catch {} with no logging. If the role is missing, the app silently degrades security. Log the failure or fail fast.
10 HIGH src/app/api/announcements/route.ts:252-269 Notification fanout still uses as any: The insert(notifications).values(... as any) bypasses type safety, and cappedUsers.slice(0, FANOUT_CAP) is an O(n) cap on an already-fetched result set. Replace with a typed NotificationInsert DTO. Use limit(FANOUT_CAP) in the query instead of slice.
11 HIGH src/app/api/announcements/route.ts:111-118 No pagination: .limit(limit ?? 10000) will return up to 10,000 records if the client omits the limit param. Set a strict hard limit (e.g., 100) and require pagination (cursor or offset).
12 HIGH src/widgets/dashboard/ui/MobileSpaceBar.tsx:116 Hardcoded TODO: Unread message count is not connected to any store, showing a static value. Wire useQuery or Zustand store to the /api/messages/unread endpoint.
13 HIGH .env.local Service role secret present: SUPABASE_SERVICE_ROLE_SECRET in a .local env file is fine for dev, but must not be referenced in frontend code. Verify no frontend file reads this key.
14 HIGH src/middleware.ts Middleware does DB-less tenant inference only: Tenant resolution relies on hostname parsing; no validation that the tenant exists or is active. Add a lightweight edge cache (e.g., Upstash) or accept the trade-off and document it.

- MEDIUM

# Severity File(s) Description Suggested Fix

15 MEDIUM src/test/ (51 test files / 957 source) 5.3% test coverage is extremely low for a production app. Critical paths (auth, payments, RLS) are under-tested. Add unit tests for every API route using Vitest + miniflare / node environment.
16 MEDIUM src/widgets/dashboard/model/registry.ts:11 any in type definition: export type WidgetComponent = ComponentType<any>; Replace any with a strict WidgetProps interface.
17 MEDIUM src/app/member/[id]/page.tsx:51-53 Type assertion abuse: const { property } = SoloSeat as any; and const user = (SoloSeat as any).user; indicate schema mismatch. Update Prisma/Drizzle schema to match the query shape, or define a proper MemberPageData type.
18 MEDIUM src/app/api/merits/[id]/route.ts:85 updateData as any: Type assertion bypasses validation on merit updates. Derive updateData from the Zod schema type.
19 MEDIUM src/shared/api/rate-limit.ts:7 In-memory rate limiter: Will not work across serverless invocations or multiple instances. Replace with Redis (Upstash) or Vercel KV before production.
20 MEDIUM src/app/api/health/route.ts Static version hardcoded: version: '1.0.0' should come from package.json or env var. Read from process.env.npm_package_version or package.json at build time.
21 MEDIUM src/app/api/openapi.json/route.ts Serves spec without auth: openapi.json is public, but some schemas may expose internal fields. Review the generated spec for sensitive field exposure.

- LOW

# Severity File(s) Description Suggested Fix

22 LOW src/app/api/announcements/route.ts:253 Commented TODO: Fanout queue implementation deferred. File a BD/GSD issue and add an SLA.
23 LOW src/app/api/stats/route.ts:39-47 Hardcoded stats: homes: 180, years: 15 are static. Move to tenant config or CMS.
24 LOW src/app/api/services/urgency/route.ts:23 Unused import: withTenant is imported but not used. Run eslint --fix or manual cleanup.
25 LOW console.warn Only one console.warn in production code (MobileSpaceBar.tsx:56). Remove or replace with logger.

## Architecture Summary

| Area             | Status      | Notes                                                    |
| ---------------- | ----------- | -------------------------------------------------------- |
| Dual ORM         | ⚠️ Debt     | risma is dead weight. Remove or finalize migration.      |
| Error Handling   | 🔴 Critical | 113 routes have no try/catch.                            |
| Auth Consistency | 🔴 Critical | 4 routes skip auth entirely; many more don't check role. |
| Test Coverage    | 🔴 Low      | 5.3% is inadequate for launch.                           |
| Circular Deps    | 🟡 Moderate | shared/api barrel is the root cause.                     |
| Type Safety      | 🟡 Moderate | 20+ as any casts, mostly in routes.                      |
| Performance      | 🟡 Moderate | Unbounded select() queries and .slice() caps.            |

▣ Reviewer · Kimi K2.6 · 4m 7s
