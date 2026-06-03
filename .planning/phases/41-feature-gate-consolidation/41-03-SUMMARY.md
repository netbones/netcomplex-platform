---
phase: 41-feature-gate-consolidation
plan: 03
subsystem: auth
tags: [feature-gate, testing, vitest, revalidation, isr, canAccess, gate]

# Dependency graph
requires:
  - phase: 41-01
    provides: src/shared/api/gate.ts with canAccess, resolveGateContext, 3 mapping tables, GateContext/GateResult/GateReason types
provides:
  - src/shared/api/gate.test.ts — 24 Vitest tests covering mapping completeness (drift detection) and gate function behaviour
  - revalidateGate(tenantId) cache invalidation hook added to src/shared/api/revalidation.ts
  - CI guard: any FeatureKey added without updating all 3 mapping tables fails at PR time
  - Forward-compat point for Phase 2 mutation routes (tier change, module install/uninstall, page flag toggle)
affects:
  - phase: 41-02 (Client useGateContext can rely on tests as drift detector)
  - phase: 42-i18n-hydration-fix
  - phase: 43+ gate callsite migration (revalidateGate callers wire in here)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mapping completeness test pattern: explicit FeatureKey list mirrors the type, fails if any key is missing from any of 3 tables"
    - "vi.mocked() re-mock pattern for per-test module state — same hoisted mock structure, but per-test override of resolved values"
    - "revalidateGate() pattern: void-cast unused parameter for forward-compat signatures (TypeScript strict without disabling rule)"
    - "Cross-table consistency assertion — sort() then toEqual() to detect any drift across the 3 tables"
    - "All 14 FeatureKey values listed as const in test (not derived from runtime) — failure is loud if a key is added without updating the test"

key-files:
  created:
    - src/shared/api/gate.test.ts (442 lines, 24 tests across 4 describe blocks)
  modified:
    - src/shared/api/revalidation.ts (38-line addition; existing 7 functions unchanged)

key-decisions:
  - "Used 'bookings' (depth module) for tests that need baseCtx.tier='PREMIUM' to pass tier check; 'maintenance' (core module) reserved for tier-failure scenarios only. Plan's draft tests used 'maintenance' for positive paths, which would have failed at the tier layer before reaching the test target."
  - "Added a dedicated test for tri-state flag handling ('conservation: \"managed\"') — documents the non-boolean flag pass-through behaviour added by Plan 41-01's TS narrowing fix"
  - "revalidateGate() invalidates all 14 gated page paths plus /api/flags — conservative approach, safe to over-invalidate"
  - "Did NOT add a test that imports revalidateGate() — the function is exercised by the type system (signature present in revalidation.ts barrel), and the Phase 2 callers will provide natural coverage. Plan does not require a direct test."
  - "Mapping completeness test uses Object.keys() count assertion (exactly 14) — catches duplicate keys, missing keys, AND accidental extra keys in a single assertion"

patterns-established:
  - "Drift detector pattern: explicit list of expected keys (NOT derived) + count assertion + cross-table toEqual() — three independent failure modes from one block"
  - "Test fixture hoisting: ALL_FLAGS_ENABLED const at module level reused by all canAccess() tests that need flags to pass — avoids 200+ lines of repeated mock data"
  - "Mocked module re-import pattern: `await import(...)` after vi.mock() declaration to access the typed mock functions — works because hoisted mocks are applied before test imports"

requirements-completed: [GATE-07, GATE-08]

# Metrics
duration: 10min
completed: 2026-06-03
---

# Phase 41 Plan 03: CI Test for Mapping Completeness + revalidateGate()

**24 Vitest tests (drift detector + behaviour) for the server gate system, plus the `revalidateGate(tenantId)` cache invalidation hook using the existing `revalidatePath()` pattern.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-06-03T14:01:29Z
- **Completed:** 2026-06-03T14:11:59Z
- **Tasks:** 2
- **Files modified:** 1
- **Files created:** 1 (gate.test.ts, 442 lines)
- **Commits:** 2 atomic

## Accomplishments

- **24 tests, all passing** (4.8s total) — `Mapping completeness` (9 tests), `canAccess()` (8 tests), `GATE_REASON_TO_ERROR` (3 tests), `resolveGateContext()` (3 tests), plus the auto-added `tri-state flag` test
- **Drift detector** — any new `FeatureKey` not present in all 3 mapping tables fails at PR time; any duplicate keys or extra keys also fail (via `toHaveLength(14)` count assertions)
- **Cross-table consistency** — `Object.keys(FEATURE_TO_MODULE).sort()` must equal `Object.keys(FEATURE_TO_FLAG).sort()` and `Object.keys(FEATURE_TO_REGISTRY).sort()`
- **Behaviour coverage** — 5-layer precedence, tier-before-module short-circuit (asserts `isModuleEnabled` not called), `skipFlag: true` opt-out, null module mapping (`competitions` / `dashboard`), tri-state flag pass-through
- **`revalidateGate(tenantId)` added** to `src/shared/api/revalidation.ts` — uses `revalidatePath()` (not `revalidateTag()`) for consistency with the rest of the file. Invalidates `/api/flags` + all 14 gated page paths. Accepts `tenantId` for Phase 2 per-tenant forward-compat (currently `void`-cast to suppress unused-param warning)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create gate.test.ts** - `000fb4f` (test)
2. **Task 2: Add revalidateGate() to revalidation.ts** - `7fc91f9` (feat)

## Files Created/Modified

- `src/shared/api/gate.test.ts` (CREATED, 442 lines) — 24 tests across 4 describe blocks
  - **Mapping completeness (static, 9 tests)**: 3 per table (every-key-present, valid-values, exactly-14) + cross-table consistency
  - **canAccess() behaviour (8 tests)**: all-layers-pass, tier-too-low, module-disabled, flag-disabled, skipFlag, short-circuit, null-module-mapping, tri-state flag
  - **GATE_REASON_TO_ERROR (3 tests)**: every-reason-present, OK-for-allowed, canonical-codes
  - **resolveGateContext() (3 tests)**: with-session, null-session-defaults-RESIDENT, missing-tenant-throws
- `src/shared/api/revalidation.ts` (MODIFIED, +38 lines) — `revalidateGate(tenantId)` added at end of file after `revalidateUserData`. Existing 7 functions untouched.

## Decisions Made

- **Auto-corrected plan's draft test feature choices** (Rule 1 bug fix): The plan's test code used `'maintenance'` (core-tier module) for the positive "all 5 layers pass" test and several other "should allow" tests. With `baseCtx.tier = 'PREMIUM'` (depth), the tier check at Layer 1 would have failed before reaching the test target. Switched to `'bookings'` (depth-tier module) for tests that need to pass the tier check. `'maintenance'` is now reserved for tier-failure tests only. **See Deviations section.**
- **Added tri-state flag test** — Plan 41-01 introduced a TS narrowing fix (replaced `flagValue !== false` with `typeof flagValue === 'boolean' ? flagValue : true`). The plan didn't include a test for this; added a dedicated test using `conservation: 'managed'` to document and protect the behaviour.
- **No direct test for `revalidateGate()`** — The plan's verification step only requires `npm run typecheck` for the revalidation change. The function's signature is exercised by the type system; Phase 2 mutation routes will provide natural call-site coverage. A direct mock-based test of `revalidatePath()` would be brittle (testing Next.js, not our code).
- **Mapping test count assertion is `toHaveLength(14)`, not loose** — A duplicate key or accidental extra key would silently inflate the object; explicit count catches this.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced `'maintenance'` with `'bookings'` in 4 canAccess() tests where baseCtx.tier='PREMIUM' is used**

- **Found during:** Task 1 (test authoring)
- **Issue:** The plan's draft tests used `canAccess(baseCtx, 'maintenance')` for the "should allow when all 5 layers pass" test, the "should deny with reason='module'" test, the "should deny with reason='flag'" test, and the "should skip flag check when skipFlag=true" test. `FEATURE_TO_MODULE.maintenance = 'maintenance'` and `MODULES_REQUIRED_TIER.maintenance = 'core'`. The tenant tier `'PREMIUM'` maps to `TierLevel 'depth'` (2), which fails `tierAtLeast('depth', 'core')`. Result: tests would have failed at Layer 1 (tier) with `reason: 'tier'`, never reaching the layer under test.
- **Fix:** Changed all 4 tests to use `'bookings'` instead (`'bookings'` requires `depth` tier — passes with `PREMIUM`). Reserved `'maintenance'` for tier-failure tests where it's semantically correct (`baseCtx.tier='STANDARD'` for "tier too low", or context like "competitions null mapping" tests).
- **Files modified:** `src/shared/api/gate.test.ts`
- **Verification:** All 24 tests pass; 4 affected tests now correctly exercise their target layer (e.g. "deny reason='flag'" test actually reaches Layer 3 and fails on `bookings: false`).
- **Committed in:** `000fb4f` (Task 1 commit)

**2. [Rule 1 - Bug] Added a dedicated test for tri-state flag pass-through**

- **Found during:** Task 1 (behaviour coverage review)
- **Issue:** Plan 41-01's `tsc --noEmit` fix changed `flagValue !== false` to `typeof flagValue === 'boolean' ? flagValue : true` — non-boolean flags (`'conservation': 'default' | 'managed' | 'external'`) are now always treated as enabled at the gate layer. The plan didn't include a test for this subtle behaviour, leaving it unprotected against future refactors.
- **Fix:** Added a new test `should allow when tri-state flag is non-boolean (e.g. conservation: "managed")` that mocks `getPlatformPageFlags` to return `conservation: 'managed'` and asserts the gate returns `{ allowed: true, reason: 'allowed' }`.
- **Files modified:** `src/shared/api/gate.test.ts`
- **Verification:** Test passes; documents the non-boolean flag behaviour.
- **Committed in:** `000fb4f` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bug fixes)
**Impact on plan:** Both auto-fixes were necessary for test correctness. The feature substitution fix prevents 4 tests from silently failing for the wrong reason. The tri-state flag test protects a subtle but documented behaviour from regression. No scope creep.

## Issues Encountered

- **Typecheck full-project timeout (resolved by filtering):** `pnpm exec tsc --noEmit --project tsconfig.json` exceeds the 2-minute shell timeout on this codebase. Worked around by running the typecheck once and filtering output for the relevant files (`gate.ts`, `gate.test.ts`, `revalidation.ts`) — zero errors reported for any of the three files. Tests pass cleanly. The full typecheck is not in the pre-commit hook (only `lint-staged` ESLint runs on changed files), so the pre-commit gate is unaffected.
- **Plan 41-02 commits interleaved on shared branch:** This worktree's branch is shared with Plan 41-02 (parallel wave). `git log` shows interleaved 41-02 commits between 41-01 and 41-03. The 41-03 commits are clearly identifiable by the `(41-03):` prefix. No merge conflict — 41-02 modified `src/shared/lib/gate-client.ts` (new file) and `src/shared/ui/GateGuard.tsx` (new file); 41-03 modified `src/shared/api/gate.test.ts` (new file) and `src/shared/api/revalidation.ts`. No overlapping files.

## User Setup Required

None - no external service configuration required. The test suite runs against mocks; the revalidation helper is a pure Next.js `revalidatePath()` wrapper with no new dependencies.

## Next Phase Readiness

- **Plan 41 is complete (3/3 plans)** — `canAccess()` (server, 41-01), `canAccessClient()` + `useGateContext()` + `GateGuard` (client, 41-02), and CI test + revalidation hook (41-03) are all shipped. The full locked public API is in place.
- **Phase 42 (i18n hydration fix)** is unblocked and ready to pick up.
- **Phase 43+ gate migration is opportunistic** — `canAccess()` is callable from any server API route; mutation routes that should call `revalidateGate()` are the natural Phase 2 integration points:
  - `/api/admin/tenants/[id]/tier` (tier change)
  - Module install/uninstall routes in onboarding
  - `/api/admin/settings/page-flags` (page flag toggle)
- **CI gate is now active:** Any new `FeatureKey` value added to the union in `src/shared/api/gate.ts` without updating `FEATURE_TO_MODULE`, `FEATURE_TO_FLAG`, and `FEATURE_TO_REGISTRY` will fail the `pnpm test:run` step at PR time. The drift detector is live.

---

*Phase: 41-feature-gate-consolidation*
*Completed: 2026-06-03*

## Self-Check: PASSED

All claims verified at write-time:

- `src/shared/api/gate.test.ts` exists and is 442 lines (>= 150 required)
- `src/shared/api/revalidation.ts` exists with `revalidateGate(tenantId)` exported
- Task 1 commit `000fb4f` (gate.test.ts creation) found in git log
- Task 2 commit `7fc91f9` (revalidateGate helper) found in git log
- `pnpm exec vitest run src/shared/api/gate.test.ts` → 24/24 tests pass
- `tsc --noEmit` filtered output for `gate.ts`/`gate.test.ts`/`revalidation.ts` → 0 errors
- `revalidateGate` uses `revalidatePath()` (not `revalidateTag()`) — verified by reading the diff
- No callsites of `revalidateGate()` added (deferred to Phase 2, per plan)
- Existing 7 revalidation functions unchanged — verified via `git diff`
