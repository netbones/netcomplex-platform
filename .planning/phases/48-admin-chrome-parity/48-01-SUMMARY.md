---
phase: 48-admin-chrome-parity
plan: 01
subsystem: dashboard
tags: [nextjs, layout, app-router, client-component, refactor, admin-chrome]

# Dependency graph
requires: []
provides:
  - SpaceChrome client component mountable by any tenant layout
  - getActiveSpaceId helper exported from model layer (unit-tested)
  - SpaceDefinition.href field (single source of truth for space URLs)
  - SpaceLauncher and MobileSpaceBar consume space.href (no inline ternaries)
affects:
  - plan 48-02 (will mount SpaceChrome in admin/layout.tsx and shrink dashboard/layout.tsx)
  - All 27 admin sub-pages (transitively — they get chrome in 48-02)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Extract-and-share layout chrome via a client component (Approach 1 from research)
    - Co-locate the route with the href in the model (Pattern 2 from research)
    - Centralize active-space derivation in the model for unit-testability (Pattern 3)

key-files:
  created:
    - src/widgets/dashboard/ui/SpaceChrome.tsx (84 lines, client component)
    - src/widgets/dashboard/model/active-space.test.ts (16 vitest cases)
    - src/widgets/dashboard/model/spaces.test.ts (6 vitest assertions)
  modified:
    - src/widgets/dashboard/model/spaces.ts (added href field + getActiveSpaceId export)
    - src/widgets/dashboard/ui/SpaceLauncher.tsx (line 36: space.href)
    - src/widgets/dashboard/ui/MobileSpaceBar.tsx (isActive + href use space.href/SPACES)

key-decisions:
  - 'Chose Approach 1 (shared client component) over Approach 2 (route group restructure) — zero file moves, zero URL changes, lowest mechanical risk'
  - "Tightened getActiveSpaceId return type from `string` to `SpaceId | 'home'` — all existing call sites already treat the return value as one of those 5 IDs, so this is non-breaking"
  - "Used `pathname === '/admin' || pathname.startsWith('/admin/')` for the admin prefix check — explicitly requires '/' delimiter to guard against /adminusers false positives"
  - 'Kept the local getActiveSpaceId copy in (tenant)/dashboard/layout.tsx untouched — plan 48-02 will delete it when that layout shrinks to consume SpaceChrome'

patterns-established:
  - "Pattern: extract layout chrome into a 'use client' component when two sibling route segments need the same shell"
  - 'Pattern: co-locate canonical href with SpaceDefinition so consumers never construct URLs inline'
  - 'Pattern: export pure derivation functions (getActiveSpaceId) from the model layer so they can be unit-tested without a React render'

requirements-completed: [ADMIN-CHROME-03]

# Metrics
duration: 10min
completed: 2026-06-04
---

# Phase 48 Plan 01: Admin Chrome Parity — Extract Summary

**SpaceChrome client component + href registry + getActiveSpaceId helper, foundation for sharing dashboard chrome between `/dashboard/*` and `/admin/*`**

## Performance

- **Duration:** 10 min
- **Started:** 2026-06-04T12:44:35Z
- **Completed:** 2026-06-04T12:54:32Z
- **Tasks:** 2 (1 TDD + 1 auto; 3 atomic commits)
- **Files modified:** 3 created, 3 modified

## Accomplishments

- New `SpaceChrome` client component (84 lines) is mountable by any tenant layout — foundation for plan 48-02 to share chrome between `(tenant)/dashboard/layout.tsx` and a new `(tenant)/admin/layout.tsx`.
- Exported `getActiveSpaceId(pathname)` helper from the model layer with full unit-test coverage — recognizes both canonical `/admin/*` and legacy `/dashboard/<slug>` paths.
- `SpaceDefinition.href` is now a required field — single source of truth for sidebar/mobile hrefs; eliminates inline ternaries in two consumer components.
- All 22 new tests pass; `pnpm typecheck` is clean for the modified files (pre-existing API test errors in `src/test/*` are out of scope).

## Task Commits

Each task was committed atomically (TDD plan produced 3 commits: RED → GREEN → consumer refactor):

1. **Task 1 (TDD RED): add failing tests** - `96519ad` (test)
2. **Task 1 (TDD GREEN): add href + getActiveSpaceId** - `e8fcf40` (feat)
3. **Task 2: extract SpaceChrome + update consumers** - `8b7f729` (feat)

**Plan metadata:** pending (this commit)

_Note: TDD tasks produce 2+ commits (RED → GREEN) — the 3rd commit covers the non-TDD UI refactor._

## Files Created/Modified

- `src/widgets/dashboard/model/spaces.ts` — added `href: string` to `SpaceDefinition` (5 SPACES entries populated); added exported `getActiveSpaceId(pathname)` with admin-prefix branch
- `src/widgets/dashboard/model/active-space.test.ts` — 16 vitest cases for `getActiveSpaceId` (empty, dashboard slugs, legacy back-compat, canonical /admin prefix, /adminusers false-positive guard)
- `src/widgets/dashboard/model/spaces.test.ts` — 6 vitest assertions for `SPACES.href` registry
- `src/widgets/dashboard/ui/SpaceChrome.tsx` — NEW (84 lines), `'use client'`, holds collapsed state + pathname/session/flags hooks, renders SpaceLauncher + passthrough `<main>` + MobileSpaceBar inside ErrorBoundary
- `src/widgets/dashboard/ui/SpaceLauncher.tsx` — line 36: `const href = space.href` (replaces inline ternary)
- `src/widgets/dashboard/ui/MobileSpaceBar.tsx` — `isActive` helper now uses `SPACES[spaceId].href`; href uses `space.href`; SPACES added to model import

## Decisions Made

- **Approach 1 (shared client component) over Approach 2 (route group restructure):** Zero file moves, zero URL changes, lowest mechanical risk. Plan 48-02 will simply create a 6-line `admin/layout.tsx` that renders `<SpaceChrome>`.
- **Tightened `getActiveSpaceId` return type from `string` to `SpaceId | 'home'`:** All existing call sites already treat the return value as one of those 5 IDs, so the type narrowing is non-breaking and surfaces future contract violations.
- **Used `pathname === '/admin' || pathname.startsWith('/admin/')` for the admin prefix check:** Explicitly requires the `/` delimiter to guard against the `/adminusers` false positive. 16th vitest case locks this in.
- **Kept the local `getActiveSpaceId` copy in `(tenant)/dashboard/layout.tsx` untouched:** Plan 48-02 will delete it when that layout shrinks to a 10-line `SpaceChrome` consumer. Both files can co-exist during the Wave 1 → Wave 2 transition without breaking the build.
- **Used `resolved.id` (not `slug` cast) in `getActiveSpaceId` return:** Avoids a TypeScript narrowing issue where `if (resolveSpace(slug))` does not narrow the input parameter's type. Returning the resolved definition's `.id` keeps the return type clean.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed TypeScript narrowing in `getActiveSpaceId`**

- **Found during:** Task 1 GREEN phase (writing `getActiveSpaceId` body)
- **Issue:** The plan's suggested implementation `return slug` doesn't compile — `if (resolveSpace(slug))` does not narrow the input `slug: string` to `SpaceId`, and the function's return type is `SpaceId | 'home'`. A direct `as SpaceId` cast on `slug` works but is fragile (TypeScript can still complain on stricter configs).
- **Fix:** Refactored to `const resolved = resolveSpace(slug); if (resolved) { return resolved.id; }` — the resolved definition is already typed as `SpaceDefinition` so `.id` is statically `SpaceId`. No cast needed, no behavior change.
- **Files modified:** `src/widgets/dashboard/model/spaces.ts`
- **Verification:** `pnpm vitest run` on the 16 `getActiveSpaceId` cases passes; `pnpm typecheck` is clean for `spaces.ts`
- **Committed in:** `e8fcf40` (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Zero behavior change. The plan's spec (16 test cases) is satisfied exactly; the type-narrowing refactor is an implementation detail invisible to callers.

## Issues Encountered

None — the plan executed as written. Pre-existing typecheck errors in `src/test/auth-routes.test.ts`, `src/test/auth-forms.test.tsx`, `src/test/ui-components.test.tsx`, and `src/test/api/events.test.ts` are out of scope (they predate this plan and are unrelated to the dashboard chrome).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Plan 48-02 can now:

1. Create `src/app/(tenant)/admin/layout.tsx` (6-line client component) that renders `<SpaceChrome>{children}</SpaceChrome>`.
2. Shrink `src/app/(tenant)/dashboard/layout.tsx` from 67 lines to ~10 lines by deleting the local `getActiveSpaceId` and inline JSX, and rendering `<SpaceChrome>` instead.
3. Verify all 27 admin sub-pages render with the shared chrome.

No blockers. The new `SpaceChrome` is byte-equivalent to the existing `dashboard/layout.tsx` body, so `/dashboard/*` behavior is preserved.

---

_Phase: 48-admin-chrome-parity_
_Completed: 2026-06-04_

## Self-Check: PASSED

- All 7 expected files exist on disk (1 SUMMARY, 3 created, 3 modified)
- All 3 task commit hashes (96519ad, e8fcf40, 8b7f729) found in `git log --oneline --all`
- `pnpm vitest run` on the 2 new test files: 22/22 tests pass
- `pnpm typecheck` is clean for all 6 modified/created files
- All 5 SPACES entries have `href: string` populated
- `SpaceChrome` is exported (count = 1)
- `SpaceLauncher.tsx` line 36 contains `space.href` (no ternary)
- `MobileSpaceBar.tsx` line ~70 contains `space.href` (no ternary)
