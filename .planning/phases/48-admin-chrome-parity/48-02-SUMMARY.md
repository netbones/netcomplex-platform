---
phase: 48-admin-chrome-parity
plan: 02
subsystem: dashboard
tags: [nextjs, layout, app-router, client-component, refactor, admin-chrome]

# Dependency graph
requires:
  - phase: 48-01
    provides: SpaceChrome client component + getActiveSpaceId export + SPACES.href registry
provides:
  - Shrunk (tenant)/dashboard/layout.tsx from 67 lines to 7 lines (90% reduction)
  - Wave 1 consumption-side validation: SpaceChrome is byte-equivalent to inline chrome
  - Foundation for plan 48-03 to create the new (tenant)/admin/layout.tsx with identical chrome
affects:
  - plan 48-03 (will create admin/layout.tsx that imports the same SpaceChrome)
  - All /dashboard/* routes (transitively — chrome is now centralized)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Consume the shared client chrome: layout file = import + one-line JSX return'
    - "Plan-48-01's getActiveSpaceId contract verified — legacy /dashboard/admin still resolves to 'admin' space"

key-files:
  created: []
  modified:
    - src/app/(tenant)/dashboard/layout.tsx (67 → 7 lines)

key-decisions:
  - "Layout file still uses 'use client' — the client boundary is preserved because SpaceChrome is itself a client component (mounting a client component from a server layout would force a re-render boundary)"
  - "Kept React.ReactNode type without an explicit React import — the project's existing pattern (e.g. (tenant)/dashboard/[space]/layout.tsx) relies on @types/react providing the global React namespace; this matches the rest of the codebase"
  - "Removed local getActiveSpaceId helper without a temporary shim — SpaceChrome imports the model-layer getActiveSpaceId (16 vitest cases) so the active-space derivation is unit-tested and the layout doesn't need a duplicate"

patterns-established:
  - "Pattern: thin tenant layout = 'use client' + import SpaceChrome + one-line JSX return — no chrome state, no chrome hooks"
  - 'Pattern: when a layout is reduced to one component mount, delete ALL its own imports of state/hooks/utilities that the child owns — never leave dead imports behind'

requirements-completed: [ADMIN-CHROME-05]

# Metrics
duration: 3min
completed: 2026-06-04
---

# Phase 48 Plan 02: Admin Chrome Parity — Dashboard Layout Refactor Summary

**Dashboard layout shrunk from 67 to 7 lines by consuming the shared `SpaceChrome` component; byte-equivalent chrome preserved on all `/dashboard/*` routes**

## Performance

- **Duration:** 3 min
- **Started:** 2026-06-04T13:06:31Z
- **Completed:** 2026-06-04T13:09:17Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- `src/app/(tenant)/dashboard/layout.tsx` is now a 7-line thin client layout that mounts `<SpaceChrome>{children}</SpaceChrome>` — down from 67 lines of inline chrome logic.
- All chrome state (collapsed sidebar, pathname, session, flags) and active-space derivation (the new `getActiveSpaceId` from Plan 48-01) are encapsulated inside `SpaceChrome`.
- Wave 1 consumption-side validation passed: the refactor is a pure shrink with zero behavior change. The legacy `/dashboard/admin` route still resolves to the `admin` space via the `/dashboard/<slug>` branch in `getActiveSpaceId`, and the canonical `/admin/*` route resolves via the new `/admin` prefix branch.
- All 22 unit tests in `src/widgets/dashboard/model/` still pass (16 for `getActiveSpaceId` + 6 for `SPACES.href` registry).
- `pnpm typecheck` is clean for the modified file (pre-existing errors in `src/test/*` are out of scope per the 48-01-SUMMARY).

## Task Commits

1. **Task 1: Refactor dashboard/layout.tsx to consume SpaceChrome** - `aff5a77` (refactor)

**Plan metadata:** pending (this commit)

## Files Created/Modified

- `src/app/(tenant)/dashboard/layout.tsx` — 67 lines → 7 lines. Single import: `SpaceChrome` from `@widgets/dashboard/ui/SpaceChrome`. No other imports remain (useState, usePathname, authClient, usePageFlags, ErrorBoundary, SpaceLauncher, MobileSpaceBar, getVisibleSpaces, resolveSpace — all deleted). The local `getActiveSpaceId` helper at the bottom of the file is also removed (now lives in the model layer).

## Decisions Made

- **Kept the layout as a client component (`'use client';`):** Even though it now just mounts another client component, removing the directive would force a server→client boundary at the layout level and could change the hydration boundary semantics for the chrome. The orchestrator's plan explicitly required keeping the directive.
- **No temporary shim for the local `getActiveSpaceId`:** The 16 vitest cases in `active-space.test.ts` (Plan 48-01) cover the same derivation surface as the deleted local helper, so the layout is safe to drop it without an interim bridge.
- **No eslint-disable or `@ts-expect-error` directives needed:** The trimmed layout's `React.ReactNode` type works because `@types/react` provides the global `React` namespace — same pattern as the sibling `dashboard/[space]/layout.tsx`. No new lint issues.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Pre-existing typecheck errors in `src/shared/api/api-response.ts`, `src/test/api/auth.test.ts`, `src/test/api/invitations.test.ts`, `src/test/auth-forms.test.tsx`, `src/test/auth-routes.test.ts`, and `src/test/ui-components.test.tsx` are all unrelated to the dashboard chrome refactor and were documented as out-of-scope in the 48-01-SUMMARY.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Plan 48-03 can now:

1. Create `src/app/(tenant)/admin/layout.tsx` as a 7-line thin client layout that renders `<SpaceChrome>{children}</SpaceChrome>` — symmetric to the refactored dashboard layout.
2. Verify all 27 admin sub-pages (`/admin/users`, `/admin/maintenance`, `/admin/content`, etc.) render with the shared chrome (sidebar + main + mobile bar).
3. The new admin layout benefits from the same `getActiveSpaceId` admin-prefix branch — `/admin` and `/admin/<domain>` both resolve to the `admin` space for sidebar highlighting.

No blockers. The `SpaceChrome` consumption contract is proven by this refactor (byte-equivalent behavior with a 90% line reduction), so Plan 48-03 can replicate the pattern with confidence.

---

_Phase: 48-admin-chrome-parity_
_Completed: 2026-06-04_

## Self-Check: PASSED

- `src/app/(tenant)/dashboard/layout.tsx` exists at 7 lines (≤12 requirement satisfied)
- File contains exactly one import: `SpaceChrome` from `@widgets/dashboard/ui/SpaceChrome`
- No local `getActiveSpaceId` helper remains in the file
- `pnpm vitest run src/widgets/dashboard/model/` exits 0 (22/22 tests pass — includes 16 `getActiveSpaceId` cases from Plan 48-01)
- `pnpm typecheck` shows no new errors in the plan-touched file (pre-existing errors in `src/test/*` are out of scope)
- Commit `aff5a77` found in `git log --oneline`
- No edits to any file outside `src/app/(tenant)/dashboard/layout.tsx`
- No file deletions in the commit
