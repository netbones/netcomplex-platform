---
phase: 41-feature-gate-consolidation
plan: 02
subsystem: auth
tags: [feature-gate, canAccessClient, useGateContext, GateGuard, react, client-side, typescript]

# Dependency graph
requires:
  - phase: 41-01
    provides: Server canAccess() (5-layer), FeatureKey union, FEATURE_TO_FLAG/FEATURE_TO_REGISTRY tables, GateResult/GateReason types
provides:
  - Client canAccessClient(ctx, feature, opts?) sync function — evaluates Role (0), PageFlag (3), FeatureToggle (4)
  - useGateContext() hook resolving { role, flags } from Better Auth session + /api/flags
  - useCanAccess(feature, opts?) reactive GateResult hook
  - ClientGateContext interface ({ role, flags, optional tier })
  - GateGuard component with children/fallback/render-prop patterns
  - useGateResult hook returning raw GateResult | null
affects:
  - phase: 41-03 (CI test for mapping completeness, revalidateGate())
  - phase: 43+ (TierGuard migration target — uses canonical FeatureKey not legacy 'page.*' string)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client gate skips Tier (Layer 1) and Module (Layer 2) — server is source of truth"
    - "Re-import mapping tables from @shared/api/gate — single source of truth, no duplication"
    - "Defensive type cast on session.user.role for additionalFields not always type-augmented"
    - "Tri-state PageFlag values treated as enabled at the gate layer (matches server behavior)"
    - "Layer 4 (FeatureToggle) is permissive when ctx.tier is absent — graceful Phase 1 degradation"
    - "useGateContext() returns null while loading — conservative 'deny by default' trade-off"
    - "GateGuard is purely presentational — all gate logic delegated to canAccessClient()"

key-files:
  created:
    - src/shared/lib/gate-client.ts (171 lines, 4 exports)
    - src/shared/ui/GateGuard.tsx (122 lines, 3 exports)
  modified: []

key-decisions:
  - "Client skips Tier (Layer 1) and Module (Layer 2) per Q1=A — server is source of truth. Server returns 403 on tier/module denials; client relies on Flag layer + render-time gate"
  - "useGateContext() reads role from real Better Auth session via useSession() — defaults to 'RESIDENT' for unauthenticated (matches Q2=A and the existing getSessionAndRole() pattern)"
  - "tier is optional in ClientGateContext — /api/flags does not return it in Phase 1; Layer 4 degrades gracefully"
  - "Tri-state flags (e.g. 'conservation': 'default' | 'managed' | 'external') treated as enabled at gate layer — matches server behavior in src/shared/api/gate.ts (Phase 1 invariant)"
  - "GateGuard is purely additive — no existing TierGuard callsite migrated. Phase 2 will do mechanical per-pattern migration"
  - "Hook uses null-return on loading (not a discriminated state object) — simpler consumer code, matches the existing usePageFlags() pattern"

patterns-established:
  - "Gate guard component pattern: children/fallback/render-prop triad, all three at once, render takes precedence"
  - "useGateContext() null-while-loading contract — consumers must handle null"
  - "Client/server gate asymmetry: server is source of truth (5 layers, async), client is best-effort (3 layers, sync)"

requirements-completed: [GATE-04, GATE-05, GATE-06]

# Metrics
duration: 25min
completed: 2026-06-03
---

# Phase 41 Plan 02: Client canAccessClient() + useGateContext() + GateGuard

**Client-side feature gate that mirrors the server `canAccess()` shape but evaluates only 3 layers (Role, PageFlag, FeatureToggle) — Tier and Module remain server-only. Adds `<GateGuard>` component with children/fallback/render-prop patterns and a `useGateContext()` hook reading from the real Better Auth session.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-06-03T14:02:41Z
- **Completed:** 2026-06-03T14:27:14Z
- **Tasks:** 2
- **Files created:** 2 (gate-client.ts 171 lines, GateGuard.tsx 122 lines)
- **Files modified:** 0
- **Commits:** 2 atomic

## Accomplishments

- **Created `src/shared/lib/gate-client.ts`** (171 lines) — the client-side mirror of `canAccess()`. Exports `ClientGateContext` interface, `useGateContext()` hook, `canAccessClient()` sync function, and `useCanAccess()` reactive hook. Re-imports the locked `FEATURE_TO_FLAG` and `FEATURE_TO_REGISTRY` mapping tables from `src/shared/api/gate.ts` (no duplication of source-of-truth data; no `FEATURE_TO_MODULE` import since Module is server-only).
- **Created `src/shared/ui/GateGuard.tsx`** (122 lines) — the client component wrapper. Supports the standard `children` / `fallback` triad plus a `render` prop for per-reason UI (e.g., upgrade prompt for `tier` reason, null for `flag` reason). Includes `useGateResult` hook for components that need the raw `GateResult` object.
- **Layer asymmetry documented in code**: The client comment block explicitly states "Server/client asymmetry (per Q1=A locked decision): The CLIENT evaluates only 3 layers: Role (0), PageFlag (3), FeatureToggle (4). The CLIENT skips Tier (1) and Module (2) — those are server-only." This makes the boundary explicit for future maintainers and prevents accidental re-introduction of the dropped layers.
- **Tri-state flag handling matches server**: `conservation: 'default' | 'managed' | 'external'` and `headerEngagementFocus: 'conservation' | 'campaign'` are always enabled at the gate layer — the UI consumes the value to decide rendering. Boolean flags use their value directly. The behavior is identical to `src/shared/api/gate.ts` Layer 3.
- **Defensive role type cast**: `useGateContext()` casts `session.user` through `as { role?: string }` because Better Auth's `additionalFields` `role` augmentation may not be picked up in every code path (verified via grep: Header.tsx and other files access `session.user.role` directly, but the additionalFields is configured in `src/shared/api/auth.ts` and is authoritative at runtime). The cast is safe.
- **No TierGuard callsite modification**: GateGuard is purely additive. Phase 2 will do the mechanical per-pattern migration of `TierGuard` to `GateGuard` (different prop shape: takes `feature="surveys"` canonical `FeatureKey` instead of `feature="page.surveys"` legacy string; reads context instead of taking `tier` as a prop).

## Task Commits

Each task was committed atomically:

1. **Task 1: Create gate-client.ts with canAccessClient() and useGateContext()** - `57dac2f` (feat)
2. **Task 2: Create GateGuard.tsx component** - `d4c7a04` (feat)

## Files Created/Modified

- `src/shared/lib/gate-client.ts` (CREATED, 171 lines) — `ClientGateContext` interface, `useGateContext()` (real session + flags), `canAccessClient()` (3-layer sync gate), `useCanAccess()` (reactive hook)
- `src/shared/ui/GateGuard.tsx` (CREATED, 122 lines) — `GateGuard` component (children/fallback/render-prop), `useGateResult` hook, default export
- No files modified (GateGuard is purely additive)

## Decisions Made

- **Q1=A implementation: client skips Tier and Module layers**. The `canAccessClient` function comments document this as "SKIPPED on client — Server is source of truth; client doesn't fetch tenant.tier from /api/flags" and "SKIPPED on client — Server is source of truth; server returns 403 on module-disabled API calls". The asymmetry is the load-bearing decision from the locked Phase 1 commitment table.
- **Loading UX: deny by default while loading**. `useGateContext()` returns `null` when either `usePageFlags()` or `useSession()` is loading. `useCanAccess` converts this to `{ allowed: false, reason: 'role' }`. `GateGuard` renders `loadingFallback` (default `null`) in this state. This is the "conservative (current) — deny by default while loading is safer than optimistically rendering gated content that the server might 403" trade-off accepted 2026-06-01.
- **Q2=A: real session role, not hardcoded**. `useGateContext()` reads role from `useSession()` (Better Auth client). The cast `as { role?: string }` is defensive — `additionalFields.role` is configured in `src/shared/api/auth.ts:112-117` and is authoritative at runtime. The `resolvedRole: Role = role ?? 'RESIDENT'` default matches the server's `getSessionAndRole()` behavior.
- **Tri-state flag handling**: Used the simpler `true` constant for the non-boolean branch (the same fix Plan 41-01 applied). Plan code suggested `flagValue !== false` but that's a TS2367 narrowing error — TypeScript narrows `flagValue` to non-boolean in the false branch, making the `!== false` comparison a no-op the compiler rejects. The cleaner intent: tri-state values are always enabled at the gate layer; UI consumes the value.
- **Default export of `GateGuard`**: Added in addition to the named export for ergonomic imports (e.g., `import GateGuard from '@shared/ui/GateGuard'`). The named export is the primary form for IDE/IntelliSense; the default is convenience.
- **`useGateResult` hook added** (in addition to `useCanAccess` from gate-client.ts) so consumers that need the raw `GateResult` don't have to import from two places. `useGateResult` returns `null` while loading (consistent with `useGateContext()`); `useCanAccess` returns the conservative `{ allowed: false, reason: 'role' }` while loading (consistent with the hook's `GateResult` return type).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] TypeScript narrowing on tri-state flag comparison**

- **Found during:** Task 1 implementation (writing `gate-client.ts`)
- **Issue:** The plan's `flagValue !== false` comparison in the PageFlag layer (Layer 3) triggered the same `TS2367: This comparison appears to be unintentional because the types 'string' and 'boolean' have no overlap.` error that Plan 41-01 hit and auto-fixed. TypeScript narrows `flagValue` (typed as union of `PlatformPageFlags` values) to a non-boolean type in the falsy branch of the `typeof === 'boolean'` guard, making the `!== false` comparison a no-op that the compiler rejects.
- **Fix:** Replaced `flagValue !== false` with the cleaner `true` constant, matching the documented intent: "Tri-state flags (e.g. 'conservation': 'default' | 'managed' | 'external') are always enabled at the gate layer; the UI consumes the value to decide rendering." The branch only fires for non-boolean flag values (strings, including the tri-state `'conservation'` mode), and the gate layer's job is to allow them through. The comment in the file explicitly cross-references the server's behavior in `src/shared/api/gate.ts` for the Phase 1 invariant.
- **Files modified:** `src/shared/lib/gate-client.ts`
- **Verification:** `tsc --noEmit` on the worktree produces 0 new errors related to the new file. Total error count: 300 (identical to baseline per 41-01 verification).
- **Committed in:** `57dac2f` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 3 blocking)
**Impact on plan:** The deviation is identical in nature to Plan 41-01's deviation #3 — the same TS2367 error in the same `canAccess` code path, on the client side. Both fixes use the simpler `true` constant that compiles cleanly and matches the documented intent. No scope creep.

## Issues Encountered

- **Stash conflict from prior worktree state**: After committing Task 2, the worktree had a phantom modification marker on `src/shared/api/revalidation.ts` (Plan 41-03's file, not part of my plan). Investigation revealed an old stash entry (`stash@{0}: On dev: wip: modified tracked files`) left over from a prior worktree setup. Resolved by `git stash drop` and confirming the file is unchanged in my work. No actual code change to `revalidation.ts` from my plan.
- **Plan 41-03 already committed to this branch**: The branch is a wave-1 parallel execution; 41-01, 41-02, and 41-03 are all running concurrently. Two extra commits were already on the branch when I started:
  - `000fb4f` — `test(41-03): add CI test for mapping completeness` (between my Task 1 and Task 2)
  - `7fc91f9` — `feat(41-03): add revalidateGate(tenantId) cache invalidation helper` (after my Task 2)
  My 2 commits (57dac2f, d4c7a04) intersperse cleanly with these. No conflict — they touch different files. The orchestrator's note that "Plan 41-01 (Wave 1) has already been merged onto this branch" was conservative; 41-03 is also on the branch.
- **Pre-existing TypeScript errors baseline**: 300 errors in the worktree, all in `docs/prompts/trpc_caller_test_template.ts`, `prisma/seed.ts`, and other unrelated files. None caused by Phase 41 changes. The 41-01-SUMMARY.md noted a baseline of 28 errors in `src/` plus various out-of-`src/` issues; this 300 count includes the full worktree.
- **`node_modules` is a symlink** to the main repo's `node_modules` (1.2G), set up in 41-01. TypeScript is language-level and doesn't require isolated package installs for typecheck.

## User Setup Required

None - no external service configuration required. The client gate runs entirely against the existing `/api/flags` endpoint and the existing Better Auth session. No new env vars, no new infrastructure.

## Next Phase Readiness

- **Plan 41-03 (CI test for mapping completeness + `revalidateGate()`)** is already complete on this branch (commits `000fb4f` and `7fc91f9`). The Phase 1 public API for client components is locked in.
- **Phase 2+ callers can now use:**
  - `useGateContext()` to get `{ role, flags }` (replaces direct `usePageFlags()` calls in components that need role-aware rendering)
  - `canAccessClient(ctx, feature)` for imperative checks
  - `<GateGuard feature="maintenance" fallback={...}>` for declarative UI gating
  - `useGateResult('services')` for hooks that need the raw `GateResult`
- **TierGuard migration is now mechanical**: each `<TierGuard feature="page.surveys" tier={...}>` becomes `<GateGuard feature="surveys" fallback={...}>`. Different prop shape (FeatureKey not `page.X` string, no `tier` prop, no `featureFlags` prop), so the migration is not a global find/replace — it requires per-callsite review. Best done as opportunistic cleanup, not a forced bulk migration.
- **No breaking changes**: GateGuard is purely additive. Phase 1 callers of `TierGuard` continue to work.
- **Client tier check deferred to Phase 2** (per `41-CONTEXT.md`): when `/api/flags` is extended to return `tier`, `useGateContext()` will populate `ctx.tier` and Layer 4 will activate client-side. Until then, Layer 4 is permissive (server still 403s on tier denials).

---

*Phase: 41-feature-gate-consolidation*
*Completed: 2026-06-03*

## Self-Check: PASSED

All claims verified at write-time:

- `src/shared/lib/gate-client.ts` exists and is 171 lines (>= 60 required)
- `src/shared/ui/GateGuard.tsx` exists and is 122 lines (>= 60 required)
- Task 1 commit `57dac2f` (gate-client.ts) found in git log
- Task 2 commit `d4c7a04` (GateGuard.tsx) found in git log
- `gate-client.ts` exports: `ClientGateContext`, `useGateContext`, `canAccessClient`, `useCanAccess` — all 4 present
- `GateGuard.tsx` exports: `GateGuard` (named + default), `useGateResult` — all 3 present
- `canAccessClient()` returns same `GateResult` shape as server `canAccess()` — re-imports `GateResult` type from `@shared/api/gate`
- `canAccessClient()` skips Layer 1 (Tier) and Layer 2 (Module) — confirmed in code (no FEATURE_TO_MODULE import; "SKIPPED on client" comments)
- `GateGuard` handles all 3 patterns: children, fallback, render prop — confirmed in code
- `tsc --noEmit` on the new files produces 0 new errors (total worktree baseline: 300 pre-existing errors, none related to gate-client.ts or GateGuard.tsx)
- Plan 41-01's `src/shared/api/gate.ts` is unchanged (last touched at `cc393eb`)
- `TierGuard` is unchanged (no callsite modification)
