---
phase: 110-page-nav-access-control
plan: '02'
subsystem: navigation
tags:
  - access-control
  - tanstack-query
  - react-hooks
  - navigation
  - focus-spaces

# Dependency graph
requires:
  - phase: 110-01
    provides: resolvePageAccess() pipeline, GET /api/access endpoint, PageAccess types
provides:
  - usePageAccess() TanStack Query hook consuming /api/access
  - useVisibleSpaces() convenience wrapper (usePageAccess + filterSpaces)
  - filterSpaces() pure filter — canonical, no auth/role parameters
  - getVisibleSpaces() deprecated shim for backward compat
  - Nav components wired to useVisibleSpaces() — zero inline auth logic
affects:
  - phase-110-page-nav-access-control (completes Phase 110)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Single-query access hook pattern: usePageAccess() → TanStack useQuery → /api/access'
    - 'Convenience-wrapper pattern: useVisibleSpaces(flags) = usePageAccess + useMemo(filterSpaces)'
    - 'Server-side access resolution with client-side pure filter sub-narrowing (never expanding)'
    - 'Deprecated shim pattern: getVisibleSpaces delegated to filterSpaces with dev-only console.warn'
    - 'Zero-auth-nav pattern: nav components import useVisibleSpaces, never check session/role'

key-files:
  created:
    - src/shared/lib/hooks/usePageAccess.ts
    - src/shared/lib/hooks/usePageAccess.test.ts
  modified:
    - src/shared/lib/hooks/index.ts
    - src/widgets/dashboard/model/spaces.ts
    - src/widgets/dashboard/ui/SpaceChrome.tsx
    - src/widgets/dashboard/ui/MobileSpaceBar.tsx

key-decisions:
  - 'filterSpaces() extracted to spaces.ts during Task 1 GREEN (needed for useVisibleSpaces)'
  - 'useVisibleSpaces(flags?) convenience wrapper reduces nav boilerplate to single call'
  - 'staleTime=0 for usePageAccess — client always refetches on mount; server ISR handles caching'
  - 'retry=1 on usePageAccess query — single retry on transient failure'
  - 'SpaceLauncher unchanged — purely presentational, receives spaces as prop'
  - 'getVisibleSpaces preserved as deprecated shim with dev-mode console.warn — Phase 2 migration will remove'

patterns-established:
  - 'usePageAccess(): unified client access hook — spaces/pages/features/agent from single TanStack query'
  - 'useVisibleSpaces(flags?): nav-oriented wrapper combining server access + client flag filtering'
  - 'filterSpaces(accessibleSpaceIds, flags): pure function — auth is server-side, this is display filtering'

requirements-completed:
  - ACCESS-02
  - ACCESS-05

# Metrics
duration: 10min
completed: 2026-06-26
---

# Phase 110 Plan 02: Client-Side Access Hook + Navigation Rewire Summary

**`usePageAccess()` TanStack Query hook wired into SpaceChrome and MobileSpaceBar, replacing scattered inline role checks with centralized server-resolved spaces — zero auth logic in nav components**

## Performance

- **Duration:** 10 min
- **Started:** 2026-06-26T19:19:34Z
- **Completed:** 2026-06-26T19:29:39Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- `usePageAccess()` TanStack Query hook fetching per-user access from `/api/access` — returns `{ spaces, pages, features, agent, isLoading, error, refetch }`
- `useVisibleSpaces(flags?)` convenience wrapper combining `usePageAccess` + `filterSpaces` into single call — used by all nav components
- `filterSpaces()` as canonical pure filter in `spaces.ts` — no auth/role parameters, just filters `SpaceId[]` by feature flags
- `getVisibleSpaces()` converted to deprecated shim delegating to `filterSpaces` with `console.warn` in dev mode
- `SpaceChrome` and `MobileSpaceBar` both use `useVisibleSpaces(ctx?.flags)` — zero inline session/role checks
- `SpaceLauncher` unchanged — purely presentational, receives `spaces: SpaceDefinition[]` as prop
- All 10 tests pass (7 `usePageAccess` + 3 `useVisibleSpaces` — TDD RED→GREEN cycle)
- Grep verifications pass: no `normalizedRole === 'PROVIDER'` in nav UI, no `getVisibleSpaces` in SpaceChrome/MobileSpaceBar

## Task Commits

Each task was committed atomically:

1. **Task 1: usePageAccess() hook — TanStack Query wrapper for /api/access** (TDD)
   - `7d331f94` — `test(110-02): add failing test for usePageAccess and useVisibleSpaces hooks` (RED — 10 tests, all fail)
   - `1ea8aa85` — `feat(110-02): implement usePageAccess and useVisibleSpaces hooks` (GREEN — 10 tests, all pass; also created `filterSpaces()` which `useVisibleSpaces` depends on)

2. **Task 2: Refactor getVisibleSpaces to pure filter + wire nav components to usePageAccess**
   - `f02fe6e3` — `feat(110-02): refactor nav to usePageAccess, convert getVisibleSpaces to deprecated shim` (71 lines removed, 36 added — clean auth removal from nav)

## Files Created/Modified

- `src/shared/lib/hooks/usePageAccess.ts` — usePageAccess() and useVisibleSpaces() hooks (115 lines)
- `src/shared/lib/hooks/usePageAccess.test.ts` — 10 tests (353 lines)
- `src/shared/lib/hooks/index.ts` — Barrel re-export of usePageAccess, useVisibleSpaces, PageAccessResult type
- `src/widgets/dashboard/model/spaces.ts` — filterSpaces() pure filter added, getVisibleSpaces() deprecated shim preserved
- `src/widgets/dashboard/ui/SpaceChrome.tsx` — Switched from `getVisibleSpaces(role, flags)` to `useVisibleSpaces(ctx?.flags)`; removed session role derivation
- `src/widgets/dashboard/ui/MobileSpaceBar.tsx` — Same switch; removed `session?.user?.role` reference; removed `useSession` import

## Decisions Made

- **filterSpaces() extracted during Task 1 GREEN (not in plan order):** The plan listed filterSpaces in Task 2, but `useVisibleSpaces` needed it in Task 1. Created in commit `1ea8aa85` alongside the hooks — no architectural impact, just an ordering adjustment
- **staleTime=0 on usePageAccess:** Always refetch on mount — server ISR cache (`max-age=30`) handles response caching; client wants fresh data per mount (role-switch scenarios)
- **retry=1 (not 3):** Single retry on transient `/api/access` failure — aggressive retry on an access endpoint is unnecessary
- **useVisibleSpaces(flags?) nullable flags:** Nav components call `useVisibleSpaces(ctx?.flags)` — graceful degradation when `useGateContext()` returns `null` during loading
- **getVisibleSpaces preserved:** The deprecated shim exists for any caller not yet migrated (e.g., potential widget-level consumers). Phase 2 migration will remove it. `console.warn` fires only in dev mode to avoid production noise
- **SpaceLauncher unchanged:** Already a pure presentational component receiving `SpaceDefinition[]` as prop — no auth logic to remove

## Deviations from Plan

None — plan executed exactly as written with one ordering refinement (filterSpaces created in Task 1 GREEN instead of Task 2, because useVisibleSpaces needed it — zero behavioral impact).

## Deferred Items

- **Task 3 (checkpoint:human-verify):** Not executed — this is a human verification checkpoint requiring a live dev server to verify space visibility per role/provider status. The checkpoint verifies: RESIDENT sees Home/Services/Community/Messages; ADMIN sees all + Admin; PROVIDER with record sees Providers + Messages; PROVIDER without record sees only Messages; mobile bar mirrors desktop.
- **ACCESS-OVERVIEW.md:** Plan output section calls for `docs/architecture/ACCESS-OVERVIEW.md` — deferred to post-SUMMARY creation (separate commit).

## Known Stubs

- **`getVisibleSpaces()` deprecated shim** (`spaces.ts:225-245`): Preserved for backward compat with callers not yet migrated to `useVisibleSpaces()`. Will be removed in Phase 2 migration. Not a real stub — fully functional backward-compat shim
- **Agent gateway (`usePageAccess().agent`):** The hook returns `agent: null` for all current callers — the agent field is a stub for D-09 (future agent gateway). Server returns `{ scope: [], expiresAt: null }` when `?caller=agent`. Not a gap — intentional extension point per Plan 110-01

## Threat Flags

None — all STRIDE threats (T-110-06 through T-110-09) are mitigated per plan: query enabled only with session, staleTime=0, filter sub-narrows only (never expands), TanStack Query deduplication.

## Issues Encountered

None — all typechecks and lint passed without errors.

## User Setup Required

None — no external service configuration required. The `/api/access` endpoint was built in Plan 110-01 and the hooks consume it client-side.

## Next Phase Readiness

- Phase 110 is complete with both plans shipped (110-01: server endpoint + resolver; 110-02: client hook + nav rewire)
- The human-verify checkpoint (Task 3) needs a live dev server to confirm visual correctness across role/provider states
- `docs/architecture/ACCESS-OVERVIEW.md` should be created per plan output section
- Stale `getVisibleSpaces` callers can be found via: `grep -rn "getVisibleSpaces" src/widgets/ src/shared/lib/ --include='*.ts' --include='*.tsx' | grep -v deprecated | grep -v '//.*getVisibleSpaces'`

---

_Phase: 110-page-nav-access-control_
_Completed: 2026-06-26_
