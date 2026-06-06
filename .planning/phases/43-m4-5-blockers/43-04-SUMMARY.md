---
phase: 43-m4-5-blockers
plan: 04
subsystem: api/security/rls
tags: [rls, defense-in-depth, drizzle, runWithRLS, app_user, postgres, admin-routes, bd-oqw]

# Dependency graph
requires:
  - phase: 43-m4-5-blockers/43-03
    provides: M4.5 audit (identified the 5 admin routes as defense-in-depth candidates)
  - phase: prisma/migrations/20260604000000_add_rls_policies
    provides: RLS policies on 15 tables (dormant until runWithRLS activates app_user)
provides:
  - 5 admin route handlers wrapped in runWithRLS(ctx, async tx => { ... })
  - new tx-aware sibling helpers getPlatformPageFlagsWithTx / setPlatformPageFlagWithTx
  - exported DbSchema type from @api/db for caller-side typing
  - defense-in-depth: even if a future refactor drops the tenantId WHERE clause, RLS policies block the query at the DB layer
affects:
  [57d (Stage C rollout to ~100 remaining routes), t78 (M6+ second-tenant onboarding), M4.5-soak]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'runWithRLS(ctx, async tx => { ... }) wrap pattern for admin routes (auth gates stay outside; only db.* queries become tx.*)'
    - 'sibling-helper pattern for tx-aware variants of existing helpers (getPlatformPageFlagsWithTx / setPlatformPageFlagWithTx; original signatures UNCHANGED for 3 other production callers outside RLS)'
    - "ctx.isPlatformAdmin substitution for in-handler db.select on users.isPlatformAdmin (uses cached value from getRLSContext's user lookup)"

key-files:
  created: []
  modified:
    - src/shared/api/db.ts (export type DbSchema)
    - src/entities/tenant/api/flags/platform-flags.ts (add getPlatformPageFlagsWithTx, setPlatformPageFlagWithTx)
    - src/app/api/admin/activity/route.ts (wrap; ctx.isPlatformAdmin substitution)
    - src/app/api/admin/board-members/route.ts (wrap; auth check uses ctx.role)
    - src/app/api/admin/maintenance-stats/route.ts (wrap; auth check uses ctx.role)
    - src/app/api/admin/urgency/route.ts (wrap; requireAnyPermission stays outside)
    - src/app/api/admin/settings/page-flags/route.ts (GET + POST wrap; uses WithTx siblings)

key-decisions:
  - 'Per-route code: db.* inside the wrap becomes tx.*, db imports retained for @api/db module re-exports (not actual db.* calls) so the per-file change is purely additive'
  - 'For board-members and maintenance-stats, replaced the auth.api.getSession + db.select(users.role) gate with getRLSContext + ctx.role check — one less DB query per request AND avoids a session-scope RLS leak (the auth-gate lookup runs as the owner role outside the wrap)'
  - 'For activity, replaced the dynamic-import of getSessionAndRole + fresh db.select(users.isPlatformAdmin) with ctx.isPlatformAdmin (cached from getRLSContext) — removes a duplicate lookup AND keeps the platform-admin path under the app_user role'
  - 'Page-flags GET had no auth check before; the new getRLSContext + runWithRLS wrap adds a 401 gate. This is a behavior change for unauthenticated requests (was 200-with-default-flags, now 401) but is necessary for the wrap to safely establish the tenant context'
  - 'Sibling-helper pattern over in-place refactor of original helpers: keeps the 3 callers of getPlatformPageFlags(tenantId) / setPlatformPageFlag(tenantId, key, value) (src/app/api/flags/route.ts:21,45; src/shared/api/gate.ts:302; platform-flags.test.ts:35,57) UNCHANGED — they intentionally run outside RLS'

patterns-established:
  - 'Pattern: runWithRLS wrap. Auth gate (requireAnyPermission / getSessionAndRole + isAdmin / ctx.role check) stays OUTSIDE the runWithRLS callback; only the body that touches tenant-scoped tables goes inside; all db.* queries inside the callback become tx.*'
  - 'Pattern: tx-aware sibling helpers. For helpers used both inside and outside RLS, keep the original signature (uses global db) UNCHANGED, and add a WithTx sibling that takes a tx parameter. The WithTx sibling internally uses tx; the 3 other production callers continue using the original'
  - 'Pattern: getRLSContext(request) returns RLSContext | null. Route returns apiUnauthorized() when null. The ctx object is then in scope inside the runWithRLS callback, so ctx.role / ctx.isPlatformAdmin can be used to gate access without re-querying the users table'

requirements-completed: []

# Metrics
duration: 21min
completed: 2026-06-06
---

# Phase 43 Plan 04: RunWithRLS Wrap for 5 Admin Routes Summary

**5 admin API route handlers wrapped in `runWithRLS(ctx, async (tx) => ...)` so the Postgres `app_user` role + `app.tenant_id` / `app.user_id` / `app.user_role` / `app.is_platform_admin` session-local config are set before any tenant-scoped table is touched — defense-in-depth on top of `withTenant()` enforced by RLS policies at the DB layer.**

## Performance

- **Duration:** 21 min
- **Started:** 2026-06-06T11:37:52Z
- **Completed:** 2026-06-06T11:58:34Z
- **Tasks:** 3
- **Files modified:** 7 (5 admin routes + platform-flags.ts + db.ts)

## Accomplishments

- 5 admin route handlers (board-members, urgency, maintenance-stats, activity, page-flags GET+POST) now run inside `runWithRLS(ctx, async tx => { ... })`; the wrap establishes the `app_user` PG role and the 4 GUCs that RLS policies read via `current_setting('app.tenant_id')` etc.
- 4 routes (board-members, urgency, maintenance-stats, activity) had their `db.*` calls mechanically replaced with `tx.*` inside the wrap; `page-flags` delegates to NEW `getPlatformPageFlagsWithTx` / `setPlatformPageFlagWithTx` siblings (the original signatures are UNCHANGED for the 3 other production callers).
- Exported `DbSchema` from `@api/db` so caller-side helpers can type their `tx: NodePgDatabase<DbSchema>` parameter correctly.
- `pnpm typecheck` shows 0 new errors in the 7 modified files (38 pre-existing errors in unrelated test files are out of scope per the plan).
- Manual smoke test: `pnpm dev` + 5 unauthenticated curl requests to the admin routes all return `401` (not `500`) with the canonical `{"success":false,"error":{"code":"AUTH_REQUIRED"}}` envelope — the new wrap does not break the auth-gate path.
- `platform-flags.test.ts` (3 tests) passes — the original `getPlatformPageFlags(tenantId)` and `mapFlagToSettingKey` helpers still work as before; the new `WithTx` siblings are not unit-tested in this plan (they share logic with the originals, just take a `tx` param).
- BD issue `oqw` closed; `bd sync` ran cleanly.

## Task Commits

Each task was committed atomically:

1. **Task 1 step 1: tx-aware sibling helpers** - `02bee9a` (feat)
2. **Task 1 steps 2-5: wrap 4 admin routes** - `b85f176` (feat)
3. **Task 1 step 6: wrap page-flags route + smoke test** - `3e1ff71` (feat)
4. **Plan metadata: SUMMARY + BD closure** - final commit (docs)

## Files Created/Modified

- `src/shared/api/db.ts` - Export `type DbSchema = typeof dbSchema` (the local type was previously not exported, blocking caller-side typing of the `tx: NodePgDatabase<DbSchema>` parameter on the new sibling helpers).
- `src/entities/tenant/api/flags/platform-flags.ts` - Add 2 new exported functions `getPlatformPageFlagsWithTx(tx, tenantId)` and `setPlatformPageFlagWithTx(tx, tenantId, key, value)`. Bodies are line-for-line copies of the original `getPlatformPageFlags` / `setPlatformPageFlag`, with `db.` replaced by `tx.`. Original signatures UNCHANGED.
- `src/app/api/admin/board-members/route.ts` (41 → 36 lines) - Replace `auth.api.getSession` + `db.select(users.role)` with `getRLSContext(request)` + `ctx.role` check. Wrap the body in `runWithRLS(ctx, async tx => { ... })`. All `db.*` calls inside the wrap become `tx.*`. `db` import dropped.
- `src/app/api/admin/urgency/route.ts` (120 → 130 lines) - Add `getRLSContext` + 401 gate after the existing `requireAnyPermission(['admin', 'settings'])` check (which stays outside). Wrap body in `runWithRLS(ctx, async tx => { ... })`. All 6 parallel `db.select({count: count()})` queries become `tx.select(...)`.
- `src/app/api/admin/maintenance-stats/route.ts` (144 → 140 lines) - Replace auth gate with `getRLSContext` + `ctx.role` check. Wrap body. 8 `db.select` queries inside the wrap become `tx.select`; 1 `db.select` (trendResult) becomes `tx.select`. `db` and `auth` imports dropped.
- `src/app/api/admin/activity/route.ts` (244 → 256 lines) - Add `getRLSContext` + 401 gate after `requireAnyPermission` check. Wrap body. 5 parallel domain queries + actor batch fetch become `tx.*`. **Special case:** the platform-admin cross-tenant path now uses `ctx.isPlatformAdmin` (cached from `getRLSContext`'s user lookup) INSTEAD of a dynamic-import of `getSessionAndRole()` + fresh `db.select({isPlatformAdmin: users.isPlatformAdmin})`. This removes 1 duplicate query per request and keeps the platform-admin path under the `app_user` role.
- `src/app/api/admin/settings/page-flags/route.ts` (68 → 82 lines) - GET: add `getRLSContext` + 401 gate (the original GET had no auth check; unauthenticated requests now return 401 instead of 200-with-defaults, which is the correct security posture for an admin endpoint). POST: add `getRLSContext` + 401 gate after the existing `getSessionAndRole + isAdmin` 403 check. Both handlers wrap in `runWithRLS(ctx, async tx => { ... })` and call the NEW `getPlatformPageFlagsWithTx` / `setPlatformPageFlagWithTx` siblings (NOT the originals, which would silently use the global `db` and bypass RLS).

## Decisions Made

- **Export `DbSchema` from `@api/db`** to support typed `tx: NodePgDatabase<DbSchema>` parameters on the new sibling helpers. The alternative (deriving the type from `Parameters<Parameters<typeof db.transaction>[0]>[0]`) is more invasive and harder to read; the export is a one-line change.
- **Sibling-helper pattern** (option b from the plan-checker feedback) over in-place refactor of the original `getPlatformPageFlags` / `setPlatformPageFlag`. This kept the 3 other production callers (`src/app/api/flags/route.ts:21,45`, `src/shared/api/gate.ts:302`, `src/entities/tenant/api/flags/platform-flags.test.ts:35,57`) UNCHANGED — they intentionally run outside RLS (the public tenant flag endpoint serves unauthenticated per-tenant UI; the `canAccess()` server gate runs as the privileged service role; the unit tests verify the original signature). Modifying the originals would have either broken those callers or required also wrapping them in RLS, which is out of scope for this plan.
- **`ctx.isPlatformAdmin` substitution** in `activity/route.ts` (over a fresh `db.select` lookup) — the plan explicitly called this out as a correctness fix, not just a refactor. The original code's `db.select` ran as the owner role OUTSIDE any transaction; inside the wrap, the `tx.select` would have run as `app_user` and the users table is RLS-enabled (with a `tenant_id`-scoped policy), so the lookup would have returned `[]` for a non-platform-admin querying across tenants. Using the cached `ctx.isPlatformAdmin` sidesteps that subtle bug.
- **Page-flags GET now requires auth** (was unauthenticated before). The original GET had no auth check; any unauthenticated request returned 200 with whatever `withTenant()` resolved to (the dev tenant, in dev; a 400 if no tenant resolved). The new wrap requires `getRLSContext(request)`, which needs a session, so unauthenticated requests now return 401. This is the correct security posture and is necessary for the wrap to be safe (the wrap needs the ctx to establish the tenant_id GUC). The plan acknowledged this in the page-flags route's `<action>` block.
- **3 atomic commits** instead of 1 (matches the plan's "3 task commits + 1 SUMMARY" expectation): (1) sibling helpers, (2) 4 routes using `tx.*` directly, (3) page-flags route using the WithTx siblings. Each commit is small, focused, and reviewable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `getRLSContext(request)` returns null when no session — added `apiUnauthorized` 401 gate before the wrap, NOT after**

- **Found during:** Task 1 step 2 (board-members refactor)
- **Issue:** The plan's refactor pattern shows `getRLSContext(request)` + `if (!ctx) return apiUnauthorized();` placed INSIDE the `runWithRLS` callback in some example snippets, but `ctx` is needed as the FIRST argument to `runWithRLS`, so the null check MUST happen BEFORE opening the transaction. Without the early return, `runWithRLS(null, ...)` would crash on the first `set_config('app.user_id', ${ctx.userId})` call.
- **Fix:** Placed the `getRLSContext` + 401 gate OUTSIDE the `runWithRLS` callback (BEFORE the `return runWithRLS(ctx, async tx => { ... })` call), as the plan's primary example shows.
- **Files modified:** All 5 admin routes
- **Verification:** Smoke test: 5 unauthenticated curls all return 401 with the canonical `AUTH_REQUIRED` envelope. If the gate were misplaced, the routes would return 500 (TypeError on `ctx.userId`).
- **Committed in:** `b85f176`, `3e1ff71` (covered by both wrap commits)

**2. [Rule 2 - Missing Critical] `DbSchema` type was not exported from `@api/db`**

- **Found during:** Task 1 step 1 (adding sibling helpers)
- **Issue:** The plan's "interfaces" section anticipated this and said "If the existing type export name differs, use whatever name is exported from `@api/db`". `DbSchema` was defined locally (`type DbSchema = typeof dbSchema;`) but not exported, so the sibling helpers' `tx: NodePgDatabase<DbSchema>` parameter could not be typed.
- **Fix:** Added `export` to the `type DbSchema = typeof dbSchema;` declaration in `src/shared/api/db.ts:157`. One-line change, no runtime effect.
- **Files modified:** `src/shared/api/db.ts`
- **Verification:** `pnpm typecheck` after the change shows the new sibling helpers type correctly.
- **Committed in:** `02bee9a` (sibling helpers commit)

**3. [Rule 2 - Missing Critical] `board-members` and `maintenance-stats` route auth checks needed adaptation**

- **Found during:** Task 1 step 2 (board-members refactor)
- **Issue:** The plan's refactor pattern example uses `requireAnyPermission(['admin', 'settings'])` as the existing pattern. The board-members and maintenance-stats routes use a DIFFERENT pattern (`auth.api.getSession` + `db.select(users.role)` + role-list check). Mechanically applying the plan's pattern would have left the old `db.select(users.role)` call outside the wrap, which is fine (it runs as the owner role) but it's a duplicate lookup of data already on `ctx`.
- **Fix:** Used `getRLSContext(request)` for BOTH the auth gate AND the RLS context. After the 401 null check, the role check becomes `if (!['BOARD', 'ADMIN'].includes(ctx.role)) return apiForbidden();`. This removes the duplicate `db.select(users.role)` call and uses the cached value from `getRLSContext`'s user lookup. Same pattern applied to maintenance-stats. Activity's special case is handled separately (it uses `requireAnyPermission`, not the role-list check).
- **Files modified:** `board-members/route.ts`, `maintenance-stats/route.ts`
- **Verification:** Manual code review: the 5-line auth-gate block (`session = await auth.api.getSession(...)` + `if (!session?.user?.id) return apiUnauthorized()` + `[currentUser] = await db.select(users.role)` + `if (!currentUser || !['BOARD', 'ADMIN'].includes(...)) return apiForbidden()`) is replaced with 2 lines (`const ctx = await getRLSContext(request);` + `if (!ctx) return apiUnauthorized();` + `if (!['BOARD', 'ADMIN'].includes(ctx.role)) return apiForbidden();`). Net -1 DB query per request.
- **Committed in:** `b85f176`

**4. [Rule 3 - Blocking] Dropped unused `db` / `auth` imports after refactor**

- **Found during:** Task 1 step 2 (board-members refactor)
- **Issue:** After replacing the `db.select(users.role)` auth-gate lookup with `ctx.role`, the `db` and `auth` imports in `board-members` and `maintenance-stats` were no longer used. TypeScript strict mode + ESLint `no-unused-vars` would flag them.
- **Fix:** Removed the unused imports: `import { auth } from '@api/auth'` and `db` from `@api/db` (in `maintenance-stats`); `auth` and `db` from `board-members`. The `apiError` import was also dropped from `board-members` (only `apiForbidden` is used in the new flow).
- **Files modified:** `board-members/route.ts`, `maintenance-stats/route.ts`
- **Verification:** `pnpm typecheck` clean.
- **Committed in:** `b85f176`

**5. [Rule 2 - Missing Critical] Pre-existing line-ending / GFM table-formatting drift in `docs/SECURITY_AUDIT_M4.5.md` left uncommitted**

- **Found during:** Task 0 audit (pre-execution)
- **Issue:** `git status` at task start showed `docs/SECURITY_AUDIT_M4.5.md` as modified (~166 line diff, all whitespace / GFM table-rendering differences). This was leftover from when the worktree was created; the file is the 43-03 audit report, not a 43-04 file.
- **Fix:** Did NOT commit it. Per AGENTS.md, the orchestrator owns the worktree's state and the scope of this plan is the 5 admin routes + `platform-flags.ts` + `db.ts` (the 6 files explicitly listed in the plan's `files_modified` frontmatter). The audit-doc drift is out of scope and is the orchestrator's concern.
- **Files modified:** None (deliberately left as ` M docs/SECURITY_AUDIT_M4.5.md` in the worktree for the orchestrator to review).
- **Verification:** `git status --short` after all 3 task commits shows the audit-doc still as unstaged modified.
- **Committed in:** Not committed.

---

**Total deviations:** 5 auto-fixed (1 bug, 3 missing critical, 1 blocking)
**Impact on plan:** All auto-fixes necessary for correctness, type safety, or to avoid leaving the worktree in an inconsistent state. No scope creep.

## Issues Encountered

- The vitest test runner doesn't honor the `--` path filter (`pnpm test:run -- <path>`) — it always runs the full suite. To run just the platform-flags tests, the correct syntax is `pnpm test:run <path>` (no `--`). Confirmed in the main checkout (3 tests pass for `platform-flags.test.ts`).
- The full test suite has 23 pre-existing failures in unrelated test files (events.test.ts missing `eventAttendees` mock; bookings.test.ts auth state issue; resources.test.ts 401 vs 403 error-code mismatch; etc.). These are NOT in the 5 admin routes I modified and are out of scope per the plan.
- The dev server's varlock runtime reports missing `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars (the worktree's `.env` doesn't have them). The dev server still compiles and serves requests — the varlock warnings don't block route compilation. The 5x 401 smoke test still works correctly because the routes short-circuit at the auth gate before any DB connection is needed.
- No valid session cookie is available in the worktree (`playwright/.auth/soralia.json` doesn't exist; `BA_SESSION_COOKIE` env var is not set; manual login via `POST /api/auth/sign-in/email` would require a known test user). The optional 200-path test was therefore SKIPPED per the plan's documented fallback. The 7-day M4.5 production soak will exercise the happy path end-to-end with real sessions.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The 5 admin routes now have DB-layer tenant isolation. A future refactor that drops a `tenantId` WHERE clause will fail with a Postgres RLS error (returns 500), not silently leak cross-tenant data.
- The 14 other tenant-scoped tables in the `prisma/migrations/20260604000000_add_rls_policies` migration scope (sensitive tables: `user`, `session`, `account`, `passkey`, `twoFactor`, `profile`; admin-route tables: `Notification`, `MaintenanceRequest`, `Content`, `Survey`, `Event`, `GroupMembershipRequest`, `Announcement`, `Competition`, `Setting`) are now live for any code that wraps them in `runWithRLS`. Per `docs/STEERING/RLS.md` Stage C, the remaining ~100 tenant-scoped routes (BD `57d`) can be wrapped one family at a time, highest-privilege-leak-risk first.
- BD `oqw` is closed; `bd sync` succeeded; the 7-day M4.5 production soak is unblocked on this defense-in-depth wrap.
- The sibling-helper pattern (option b) established in this plan is the template for the Stage C rollout: when wrapping a route that calls an existing helper, keep the original helper UNCHANGED and add a `WithTx` sibling, rather than modifying the original in place (which would break the 3 other callers of that helper).

---

_Phase: 43-m4-5-blockers_
_Completed: 2026-06-06_
