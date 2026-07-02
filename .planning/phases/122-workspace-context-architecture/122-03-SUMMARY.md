---
phase: 122-workspace-context-architecture
plan: 03
subsystem: ui
tags: [workspace, switch-workspace, deep-link, notification, tdd, vitest, widgets, stubs]

# Dependency graph
requires:
  - phase: 122-02
    provides:
      - WorkspaceContextProvider (React Context + useState)
      - useWorkspaceContext() hook (null-while-unresolved)
      - resolveWorkspaceContext() pure resolver + WorkspaceResolveError
  - phase: 122-01
    provides:
      - WorkspaceRegistry, WorkspaceType, WorkspaceContext, WorkspaceTarget types
      - Permission type from SCOPE_LABELS
provides:
  - switchWorkspace() 5-step contract (resolve → replace → navigate → render → notify)
  - inferWorkspaceTarget() pure URL→WorkspaceTarget parser (D-07)
  - NotificationLink widget (D-07 deep-link integration)
  - widgets/workspace barrel with 4 exports (1 real + 3 stubs)
  - notifications/page.tsx wired to NotificationLink
  - 3 STUB components enabling P1a-04/05/06 parallel without barrel collision
affects:
  - p1a-04 (WorkspaceSelector — replaces stub)
  - p1a-05 (EmptyWorkspaceState — replaces stub)
  - p1a-06 (WorkspaceScopePanel — replaces stub)
  - p2 (property page — consumes switchWorkspace from any deep link)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Pattern E: switchWorkspace 5-step atomic contract (idempotency → resolve → replace → navigate → notify)'
    - 'Pattern K: next/navigation mock for Vitest (new pattern — no in-repo analog)'
    - 'Pattern I: NotificationLink deep-link consumer wrapping switchWorkspace + inferWorkspaceTarget'
    - 'Pattern C: widgets/workspace barrel-first sequencing (Steiger R-04)'
    - 'TDD: RED (3 test files, missing module) → GREEN (37 tests, 7 files)'

key-files:
  created:
    - src/features/workspace/model/switch-workspace.ts — useSwitchWorkspace() hook with 5-step contract
    - src/features/workspace/model/infer-target.ts — pure URL→WorkspaceTarget parser (C-02, D-07)
    - src/features/workspace/model/__tests__/switch-workspace.test.tsx — 6-branch + P-01/P-02/P-03 tests
    - src/features/workspace/__tests__/switch-and-navigate.test.tsx — navigate-after-setCtx ordering
    - src/features/workspace/__tests__/gate-coexistence.test.tsx — C-04 isolation (3 tests)
    - src/widgets/workspace/index.ts — public API barrel (4 exports: 1 real + 3 stubs)
    - src/widgets/workspace/ui/NotificationLink.tsx — D-07 deep-link widget
    - src/widgets/workspace/ui/__tests__/NotificationLink.test.tsx — integration test (4 tests)
    - src/widgets/workspace/ui/WorkspaceSelector.tsx — STUB (P1a-04)
    - src/widgets/workspace/ui/EmptyWorkspaceState.tsx — STUB (P1a-05)
    - src/widgets/workspace/ui/WorkspaceScopePanel.tsx — STUB (P1a-06)
  modified:
    - src/features/workspace/index.ts — barrel extended: useSwitchWorkspace, inferWorkspaceTarget
    - src/app/notifications/page.tsx — <Link> replaced with <NotificationLink> (D-07)

key-decisions:
  - 'resolveTargetDelegation helper: populates delegationId from propertyId when infer-target provides only propertyId — bridges the deep-link inference gap'
  - 'resolveDefaultHref helper: derives navigation route from resolved WorkspaceContext (PERSONAL→/dashboard, PROPERTY→/properties/<id>, etc.)'
  - 'switchWorkspace uses useDelegations() for RLS-gated delegation source (T-122-04/05)'
  - 'idempotency gate: target.workspaceId === current.workspaceId → no setCtx, no toast, optional navigate (P-02)'
  - 'Rollback invariant: setCtx never called on resolve error — prior context identity preserved (P-03)'
  - 'Pino observability: workspaceId + workspaceType + durationMs only — no PII/permissions (T-122-09)'
  - 'stubs return null with JSDoc noting replacement plan — enables Steiger public-api-presence while 04/05/06 work in parallel'

patterns-established:
  - 'next/navigation mock pattern: vi.mock with useRouter returning { push, replace, back, forward, prefetch }'
  - 'coexistence test pattern: mock upstream deps (useSession + usePageFlags), NOT the hook under test'
  - 'barrel-first widget bootstrapping: create barrel → create stubs → create real impl → replace stubs in later plans'

requirements-completed:
  - WS-03

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: 'switchWorkspace() 5-step contract — resolve, atomic replace, navigate, render, notify (WS-03, C-01)'
    requirement: WS-03
    verification:
      - kind: unit
        ref: 'src/features/workspace/model/__tests__/switch-workspace.test.tsx — 6 branches: success atomic replace (P-01), idempotent no-op (P-02), REVOKED rollback (P-03), registry_miss rollback, expired rollback, network error rollback'
        status: pass
      - kind: integration
        ref: 'src/features/workspace/__tests__/switch-and-navigate.test.tsx — navigate after setCtx + options.href + no navigate on failure'
        status: pass
      - kind: integration
        ref: "src/features/workspace/__tests__/gate-coexistence.test.tsx — C-04 isolation: workspace switch doesn't mutate GateContext"
        status: pass
    human_judgment: false
  - id: D2
    description: 'inferWorkspaceTarget() — pure URL parser (C-02, D-07)'
    verification:
      - kind: unit
        ref: "infer-target.ts — pure function, no 'use client', returns null for unrecognized links"
        status: pass
    human_judgment: false
  - id: D3
    description: 'NotificationLink widget + notifications page wiring (D-07 deep-link integration)'
    verification:
      - kind: integration
        ref: 'src/widgets/workspace/ui/__tests__/NotificationLink.test.tsx — click → switchWorkspace + navigate; resolve failure → no navigate; className passthrough; unrecognized path fallthrough'
        status: pass
      - kind: manual_procedural
        ref: 'notifications/page.tsx:128 — NotificationLink wired at notification.link click target'
        status: pass
    human_judgment: true
    rationale: 'In-app deep-link navigation behavior (visual confirmation of workspace switch + toast on real notifications page) requires a running app with real session + delegations — not testable in unit/integration tests alone. The human-verify checkpoint at the end of this plan covers this.'
  - id: D4
    description: 'widgets/workspace barrel + 3 STUB components (enables P1a-04/05/06 parallel)'
    verification:
      - kind: unit
        ref: 'widgets/workspace/index.ts — exports all 4 widgets; 3 stubs return null'
        status: pass
    human_judgment: false

# Metrics
duration: 14 min
completed: 2026-07-02
status: complete
---

# Phase 122 Plan 03: Atomic Workspace Switching + Deep-Link Integration Summary

**switchWorkspace() 5-step contract (resolve→replace→navigate→render→notify), deep-link NotificationLink widget, 3 STUB components enabling parallel wave 4**

## Performance

- **Duration:** 14 min
- **Started:** 2026-07-02T06:45:05Z
- **Completed:** 2026-07-02T06:59:38Z
- **Tasks:** 3
- **Files modified:** 13 (11 created, 2 modified)

## Accomplishments

- switchWorkspace() 5-step contract implemented with idempotency (P-02), atomic replace (P-01), and rollback (P-03) — the heart of WS-03
- inferWorkspaceTarget() pure URL parser maps /properties/<id>, /provider/_, /owner/_, /dashboard to WorkspaceTarget (C-02, D-07)
- NotificationLink widget wraps notification links with automatic workspace switching, toast, and rollback on unauthorized access (T-122-08)
- notifications/page.tsx wired to NotificationLink — clicking a notification deep link auto-switches workspace
- widgets/workspace barrel + 3 STUB components committed before wave 4 starts — enables parallel execution of P1a-04/05/06 without barrel collision (Steiger R-04)
- Pino observability: switchWorkspace logs workspaceId + workspaceType + durationMs only — no PII/permissions (T-122-09)
- GateContext coexistence verified: switching workspace does NOT mutate GateContext role/flags and vice versa (C-04)

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — failing switchWorkspace tests** — `e83585a6` (test)
   - 3 test files: 6-branch switch, switch-and-navigate, gate-coexistence
2. **Task 2: GREEN — implement switchWorkspace + inferWorkspaceTarget** — `c2a052d4` (feat)
   - switch-workspace.ts, infer-target.ts, barrel extension
3. **Task 3: NotificationLink + widgets barrel + stubs + notifications wiring** — `6a11014e` (feat)
   - NotificationLink widget, 3 stubs, barrel, notifications page wiring, test

**Plan metadata:** SUMMARY.md committed below.

## Files Created/Modified

### Created (11 files)

- `src/features/workspace/model/switch-workspace.ts` — useSwitchWorkspace() hook with 5-step contract
- `src/features/workspace/model/infer-target.ts` — pure URL→WorkspaceTarget parser
- `src/features/workspace/model/__tests__/switch-workspace.test.tsx` — 6-branch TDD tests
- `src/features/workspace/__tests__/switch-and-navigate.test.tsx` — navigation ordering test
- `src/features/workspace/__tests__/gate-coexistence.test.tsx` — C-04 isolation test
- `src/widgets/workspace/index.ts` — public barrel (4 exports)
- `src/widgets/workspace/ui/NotificationLink.tsx` — D-07 deep-link widget
- `src/widgets/workspace/ui/__tests__/NotificationLink.test.tsx` — integration test
- `src/widgets/workspace/ui/WorkspaceSelector.tsx` — STUB (P1a-04)
- `src/widgets/workspace/ui/EmptyWorkspaceState.tsx` — STUB (P1a-05)
- `src/widgets/workspace/ui/WorkspaceScopePanel.tsx` — STUB (P1a-06)

### Modified (2 files)

- `src/features/workspace/index.ts` — barrel extended: useSwitchWorkspace + inferWorkspaceTarget
- `src/app/notifications/page.tsx` — Link replaced with NotificationLink

## Decisions Made

- resolveTargetDelegation helper bridges the gap between inferWorkspaceTarget (returns propertyId) and resolveWorkspaceContext (needs delegationId) — added to switch-workspace.ts
- resolveDefaultHref helper derives navigation route from resolved context (PERSONAL→/dashboard, PROPERTY→/properties/<id>)
- NotificationLink prevents default navigation on workspace-aware targets, falls through to plain Link for unrecognized paths
- Stubs return null (not JSX.Empty) for zero-cost placeholder — Steiger public-api-presence satisfied

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] React.createElement TypeScript TS2769 errors in test wrappers**

- **Found during:** Task 2 (GREEN implementation)
- **Issue:** `React.createElement(WorkspaceContextProvider, { initial: ... }, children)` caused TS2769 overload errors because WorkspaceContextProviderProps requires `children` in the props type
- **Fix:** Converted test wrappers from `React.createElement` to JSX (`<WorkspaceContextProvider initial={...}>{children}</WorkspaceContextProvider>`)
- **Files modified:** switch-workspace.test.tsx, switch-and-navigate.test.tsx, gate-coexistence.test.tsx
- **Verification:** `npx tsc --noEmit` — zero errors for workspace files
- **Committed in:** c2a052d4 (Task 2 commit)

**2. [Rule 3 - Blocking] Deep-link delegation resolution gap**

- **Found during:** Task 3 (NotificationLink test)
- **Issue:** `inferWorkspaceTarget` returns `{ propertyId }` without `delegationId`, but `resolveWorkspaceContext` requires `delegationId` for PROPERTY resolution — causing registry_miss on all deep-link switches
- **Fix:** Added `resolveTargetDelegation()` helper to switch-workspace.ts that matches `propertyId` against `useDelegations()` list to populate `delegationId`
- **Files modified:** src/features/workspace/model/switch-workspace.ts
- **Verification:** NotificationLink test passes — clicking /properties/prop-14-palm navigates correctly
- **Committed in:** 6a11014e (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary for functionality. No scope creep.

## Issues Encountered

None — plan executed with standard deviation protocol.

## Known Stubs

The following stub components are intentionally empty placeholders to be replaced by later plans:

| Stub                | File                                             | Line | Reason                           |
| ------------------- | ------------------------------------------------ | ---- | -------------------------------- |
| WorkspaceSelector   | src/widgets/workspace/ui/WorkspaceSelector.tsx   | 10   | Replaced in P1a-04 (plan 122-04) |
| EmptyWorkspaceState | src/widgets/workspace/ui/EmptyWorkspaceState.tsx | 9    | Replaced in P1a-05 (plan 122-05) |
| WorkspaceScopePanel | src/widgets/workspace/ui/WorkspaceScopePanel.tsx | 9    | Replaced in P1a-06 (plan 122-06) |

Each stub returns `null` and carries a JSDoc note identifying its replacement plan. These are designed to be replaced in-place by the parallel wave 4 plans without touching the barrel file.

## Threat Flags

None — all security-relevant surfaces covered by the plan's threat model (T-122-08 through T-122-11). No new endpoints, auth paths, or schema changes introduced.

## Next Phase Readiness

- Ready for P1a-04 (WorkspaceSelector), P1a-05 (EmptyWorkspaceState), P1a-06 (WorkspaceScopePanel) — all 3 stubs are in place
- switchWorkspace is fully functional and callable from any component
- NotificationLink D-07 integration is wired and test-verified
- widgets/workspace barrel prevents same-wave files_modified overlap with wave 4 plans

---

_Phase: 122-workspace-context-architecture_
_Completed: 2026-07-02_
