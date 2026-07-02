---
phase: 122-workspace-context-architecture
plan: 02
subsystem: ui
tags: [workspace, react-context, resolver, tdd, vitest, fsd, features]

# Dependency graph
requires:
  - phase: 122-01
    provides:
      - WorkspaceRegistry with 5 types, pure helpers
      - WorkspaceType, WorkspaceDefinition, WorkspaceContext, WorkspaceTarget types
      - Permission type from SCOPE_LABELS
      - entities/workspace barrel
provides:
  - WorkspaceContextProvider (React Context + useState — C-01 atomic replace)
  - useWorkspaceContext() hook (null-while-unresolved — RESEARCH §2.2)
  - resolveWorkspaceContext() pure resolver (Pattern G — no React, no hooks)
  - WorkspaceResolveError with typed code enum
  - Universal mount in src/app/providers.tsx (Pattern F)
affects:
  - p1a-3 (switchWorkspace — consumes setter context)
  - p1a-4 (hierarchical selector — consumes useWorkspaceContext)
  - p1a-5 (empty states — renders based on WorkspaceContext)
  - p1a-6 (scope panel — displays current context)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Pattern D: React Context + useState for atomic replace (no Zustand for WorkspaceContext)'
    - "Pattern G: Pure resolver function — no 'use client', no hooks, testable in isolation"
    - 'Pattern C: Selective barrel export — setter context NOT leaked (T-122-06)'
    - 'Pattern F: Provider insertion after TooltipProvider wrapping Toaster + children'
    - 'TDD: RED (3 test files, missing modules) → GREEN (21 passing tests)'

key-files:
  created:
    - src/features/workspace/model/resolve-workspace-context.ts — pure resolver + WorkspaceResolveError
    - src/features/workspace/model/workspace-context.tsx — React provider + useWorkspaceContext + internal setter
    - src/features/workspace/index.ts — selective public barrel (Pattern C)
    - src/features/workspace/model/__tests__/resolve-workspace-context.test.ts — 12 resolver tests
    - src/features/workspace/model/__tests__/workspace-context.test.tsx — 6 context/hook tests
    - src/features/workspace/__tests__/provider-integration.test.tsx — 3 integration tests
  modified:
    - src/app/providers.tsx — WorkspaceContextProvider mounted after TooltipProvider

key-decisions:
  - 'React Context + useState for WorkspaceContext (not Zustand) — atomic replace via setState, destroyed on unmount (D-08)'
  - 'Internal setter context NOT exported through public barrel — only switchWorkspace (P1a-03) accesses it (T-122-06)'
  - 'PERSONAL workspace derived from session alone, no delegations needed — owned permissions hardcoded'
  - 'PROPERTY permissions are server-authoritative from delegation.permissions (T-122-05)'
  - 'PROVIDER/OWNER throw not_implemented (D-03 P2 deferral), AUTOMATION throws forbidden (D-11)'
  - 'Universal mount in providers.tsx, not (tenant)/layout.tsx — /notifications lives outside (tenant)'

patterns-established:
  - "Pure resolver pattern: no 'use client', no React, no hooks — callable from anywhere, testable in isolation"
  - 'Dual-context pattern: public read-only context + internal setter context — mutation gated behind switchWorkspace'
  - 'Selective barrel: re-export only public API (provider, hook, resolver, error, types) — NOT the setter'

requirements-completed:
  - WS-02

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: 'WorkspaceContextProvider with useWorkspaceContext() hook — atomic replace via useState (C-01), null-while-unresolved (mirrors useGateContext)'
    requirement: WS-02
    verification:
      - kind: unit
        ref: 'src/features/workspace/model/__tests__/workspace-context.test.tsx — 6 tests: null outside provider, initial value, null default, P-04 unmount+remount (3 initials), fresh mount with different initial'
        status: pass
      - kind: integration
        ref: 'src/features/workspace/__tests__/provider-integration.test.tsx — 3 tests: null initial, provided initial, atomic replace via setter'
        status: pass
    human_judgment: false
  - id: D2
    description: 'resolveWorkspaceContext() pure resolver — PERSONAL, PROPERTY with ACTIVE/REVOKED/EXPIRED guards, PROVIDER/OWNER not_implemented, AUTOMATION forbidden'
    requirement: WS-02
    verification:
      - kind: unit
        ref: 'src/features/workspace/model/__tests__/resolve-workspace-context.test.ts — 12 tests: PERSONAL (session only, ignores delegations, P-05 lightweight), PROPERTY (ACTIVE, REVOKED, EXPIRED, PENDING, registry_miss), PROVIDER not_implemented, OWNER not_implemented, AUTOMATION forbidden'
        status: pass
    human_judgment: false
  - id: D3
    description: 'Universal mount in src/app/providers.tsx — after TooltipProvider, wrapping Toaster and children'
    requirement: WS-02
    verification:
      - kind: other
        ref: "rg 'WorkspaceContextProvider' src/app/providers.tsx → 1 import + 1 JSX element; typecheck clean; NO_SCHEMA_CHANGES"
        status: pass
    human_judgment: true
    rationale: 'Provider mount has no automated integration test — requires human verification that app boots on /dashboard and /notifications with nav/toasts unchanged'

# Metrics
duration: 12 min
completed: 2026-07-02
status: complete
---

# Phase 122 Plan 02: WorkspaceContext Abstraction (WS-02) Summary

**React Context provider + useWorkspaceContext() hook + pure resolver — universally mounted in providers.tsx, 21 tests passing, TDD-validated (RED→GREEN)**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-02T08:30:00Z
- **Completed:** 2026-07-02T08:42:00Z
- **Tasks:** 3
- **Files modified:** 7 (6 created + 1 modified)

## Accomplishments

- Pure `resolveWorkspaceContext()` resolver with 12 tests covering all 5 workspace types — PERSONAL from session, PROPERTY with delegation lookup + status/expiry guards, PROVIDER/OWNER `not_implemented` (D-03 P2 deferral), AUTOMATION `forbidden` (D-11)
- `WorkspaceContextProvider` using React `useState` for atomic replace (C-01) with separate internal setter context (T-122-06) — NO Zustand for WorkspaceContext itself (D-08 honored)
- `useWorkspaceContext()` hook returning `WorkspaceContext | null` — mirrors `useGateContext()` null-while-unresolved convention (RESEARCH §2.2)
- Selective barrel export: only `WorkspaceContextProvider`, `useWorkspaceContext`, `resolveWorkspaceContext`, `WorkspaceResolveError`, and re-exported types — internal setter NOT leaked (T-122-06 verified)
- Universal mount in `src/app/providers.tsx` after `TooltipProvider`, wrapping both `Toaster` and `{children}` — ensures `/notifications` (outside `(tenant)` route group) can consume context (Pattern F)
- No schema changes confirmed — frontend-only feature

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — failing resolver + context + provider integration tests** — `06317ef1` (test)
2. **Task 2: GREEN — implement pure resolver + WorkspaceContext provider/hook** — `1aeca31a` (feat)
3. **Task 3: Mount WorkspaceContextProvider in src/app/providers.tsx** — `27293bb5` (feat)

_TDD discipline: RED (test) → GREEN (feat) → mount (feat) with 21/21 passing tests._

## Files Created/Modified

- `src/features/workspace/index.ts` — Selective public barrel (Pattern C — no setter export)
- `src/features/workspace/model/workspace-context.tsx` — React Context provider + useWorkspaceContext hook + internal setter
- `src/features/workspace/model/resolve-workspace-context.ts` — Pure resolver + WorkspaceResolveError class
- `src/features/workspace/model/__tests__/resolve-workspace-context.test.ts` — 12 resolver unit tests
- `src/features/workspace/model/__tests__/workspace-context.test.tsx` — 6 context/hook unit tests
- `src/features/workspace/__tests__/provider-integration.test.tsx` — 3 integration tests
- `src/app/providers.tsx` — Modified to mount WorkspaceContextProvider (Pattern F insertion)

## Decisions Made

- React Context + `useState` (not Zustand) for WorkspaceContext — `useState` provides atomic replace (C-01) and is destroyed on unmount (D-08 uncached), which Zustand's persistent store would violate
- Internal setter context pattern — `WorkspaceContextSetterCtx` created but NOT exported through public barrel; only `switchWorkspace` (P1a-03) will access it (T-122-06 mitigation)
- `resolveWorkspaceContext()` placed in `features/workspace/model/` as a pure function (no React, no `'use client'`) — testable in isolation without rendering
- PERSONAL workspace permissions hardcoded as `['profile:read', 'settings:manage']` — owned by user, not delegation-derived
- Test files initially used `React.createElement` which caused TS2769 type mismatches with the provider interface — switched to JSX wrappers during GREEN phase (Rule 1 auto-fix)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TS2769 type errors in test files — React.createElement mismatches**

- **Found during:** Task 2 (GREEN implementation)
- **Issue:** Test files used `React.createElement(WorkspaceContextProvider, null, children)` which caused TypeScript error TS2769 (no overload matches) because `null` props don't match `WorkspaceContextProviderProps`. Similarly, `React.createElement(WorkspaceContextProvider, { initial }, children)` had type issues with the props shape.
- **Fix:** Rewrote all test wrapper components to use JSX syntax (`<WorkspaceContextProvider>`), which resolves prop types correctly through the JSX compiler
- **Files modified:** `src/features/workspace/model/__tests__/workspace-context.test.tsx`, `src/features/workspace/__tests__/provider-integration.test.tsx`
- **Verification:** All 21 tests continue to pass; scoped typecheck on source files is clean
- **Committed in:** `1aeca31a` (Task 2 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Test implementation detail only — no production code changes needed. Plan intent fully preserved.

## Issues Encountered

- None

## Known Stubs

- `resolveWorkspaceContext()` throws `not_implemented` for PROVIDER and OWNER targets — these workspace types are deferred to P2 per D-03 incremental ship. The error is handled by `switchWorkspace` in P1a-03 via a toast.
- `WorkspaceContextProvider` mounts with `initial` defaulting to `null` — context will be unresolved until `switchWorkspace` (P1a-03) is called. This is by design — no page has wired `switchWorkspace` yet.
- No `useDelegations()` integration in the resolver — the resolver is a pure function that accepts `DelegationListItem[]` as input. The caller (`switchWorkspace` in P1a-03) is responsible for fetching delegations via `useDelegations()` and passing them to the resolver.

## Threat Flags

None — all threat mitigations (T-122-04 through T-122-SC) are implemented as designed.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- WS-02 satisfied: WorkspaceContext abstraction exists and is universally mounted
- C-01 honored: provider uses `useState` (atomic replace, no Zustand)
- D-08 honored: unmount/remount yields initial value (P-04 property test GREEN)
- D-03 honored: PROVIDER/OWNER resolver throws `not_implemented`
- C-04 honored: provider does NOT import or branch on `Role`; GateContext coexists
- Resolver is pure and testable in isolation (precondition for P1a-03)
- Ready for Plan 03 (switchWorkspace) — context provider, hook, and resolver all available via `@features/workspace`

---

_Phase: 122-workspace-context-architecture_
_Completed: 2026-07-02_
