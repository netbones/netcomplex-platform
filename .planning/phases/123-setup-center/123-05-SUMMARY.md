---
phase: 123-setup-center
plan: '123-05'
title: 'Configure & Grow Sections — optional module toggles + pure recommendation engine'
status: complete
completed: 2026-07-07T10:54:15Z
duration_seconds: 519
tasks_completed: 6
tasks_total: 6
subsystem: setup
tags: [setup-center, recommendations, configure, grow, module-toggles, pure-function]
requires:
  - plan: '123-04'
    provides: 'LaunchSection, PopulateSection, useAutoSaveSetting hook'
  - plan: '123-02'
    provides: 'API routes: GET/PATCH settings, PATCH missions, GET setup'
provides:
  - 'ConfigureSection: 7 tier-gated module toggles (maintenance, bookings, dWallet, surveys, competitions, achievements, marketplace)'
  - 'ContextualPrompts: progressive disclosure banners when module enabled but not configured'
  - 'getRecommendations(): pure function recommendation engine — 13 catalog entries, tier-aware, population-gated'
  - 'GrowSection: dynamic recommendation cards with Complete/Skip/Learn More actions'
  - '52 tests: 24 engine unit + 14 ConfigureSection + 14 GrowSection'
affects:
  - 'src/features/setup/ui/sections/'
  - 'src/features/setup/ui/ContextualPrompts.tsx'
  - 'src/features/setup/model/recommendations.ts'
  - 'src/features/setup/model/__tests__/'
  - 'src/features/setup/__tests__/'
tech-stack:
  added: []
  patterns:
    - 'Pure function recommendation engine: no API calls, no DB queries, no side effects'
    - 'Tier-gated module visibility via TIER_INDEX comparison table'
    - 'Session-local skip tracking with persistence callback for durable dismiss'
    - 'Recommendation card UI with priority badges (High Priority/Recommended/Optional)'
key-files:
  created:
    - src/features/setup/ui/sections/ConfigureSection.tsx
    - src/features/setup/ui/sections/GrowSection.tsx
    - src/features/setup/ui/ContextualPrompts.tsx
    - src/features/setup/model/recommendations.ts
    - src/features/setup/model/__tests__/recommendations.test.ts
    - src/features/setup/__tests__/ConfigureSection.test.tsx
    - src/features/setup/__tests__/GrowSection.test.tsx
  modified: []
decisions:
  - "Configure modules defined locally in ConfigureSection rather than polluting global MODULES — non-standard modules (dWallet, competitions, achievements) don't belong in the shared tier module registry yet"
  - 'Recommendation engine takes all state via RecommendationInput interface — makes it trivially testable with 24 unit tests, zero mocking needed'
  - 'GrowSection skip uses session-local Set + settings persistence callback — avoids premature network round-trips while ensuring durability via parent component'
coverage:
  - id: D1
    description: 'ConfigureSection with 7 tier-gated module toggles (maintenance, bookings, dWallet, surveys, competitions, achievements, marketplace)'
    verification:
      - kind: unit
        ref: 'src/features/setup/__tests__/ConfigureSection.test.tsx#renders depth-tier module toggles'
        status: pass
      - kind: unit
        ref: 'src/features/setup/__tests__/ConfigureSection.test.tsx#renders core-tier module toggles (all modules visible)'
        status: pass
      - kind: unit
        ref: 'src/features/setup/__tests__/ConfigureSection.test.tsx#does not show maintenance toggle on foundation tier'
        status: pass
    human_judgment: false
  - id: D2
    description: 'ContextualPrompts: progressive disclosure banners when module enabled but not configured, with dismiss persistence'
    verification:
      - kind: unit
        ref: 'src/features/setup/__tests__/ConfigureSection.test.tsx#shows configure links for enabled modules'
        status: pass
    human_judgment: true
    rationale: 'ContextualPrompts component needs integration testing with real module state changes — unit tests for the parent ConfigureSection verify module links but the prompts themselves require multi-component coordination'
  - id: D3
    description: 'getRecommendations(): pure function — 13 catalog entries, tier-aware, population-gated, priority-sorted'
    verification:
      - kind: unit
        ref: 'src/features/setup/model/__tests__/recommendations.test.ts#foundation tier (no premium)'
        status: pass
      - kind: unit
        ref: 'src/features/setup/model/__tests__/recommendations.test.ts#population < 5 recommends invite'
        status: pass
      - kind: unit
        ref: 'src/features/setup/model/__tests__/recommendations.test.ts#bookings enabled but not configured'
        status: pass
      - kind: unit
        ref: 'src/features/setup/model/__tests__/recommendations.test.ts#results sorted by priority'
        status: pass
    human_judgment: false
  - id: D4
    description: 'GrowSection: dynamic recommendation cards with Complete/Skip/Learn More, priority badges, empty state'
    verification:
      - kind: unit
        ref: 'src/features/setup/__tests__/GrowSection.test.tsx#renders recommendation cards for incomplete launch'
        status: pass
      - kind: unit
        ref: 'src/features/setup/__tests__/GrowSection.test.tsx#calls onComplete when Complete clicked'
        status: pass
      - kind: unit
        ref: 'src/features/setup/__tests__/GrowSection.test.tsx#hides skipped recommendations'
        status: pass
      - kind: unit
        ref: 'src/features/setup/__tests__/GrowSection.test.tsx#shows benefits panel when Learn More clicked'
        status: pass
    human_judgment: false
duration: 8min
requirements-completed: []
---

# Phase 123 Plan 05: Configure & Grow Sections — Summary

**Built the Configure section with 7 tier-gated module toggles, progressive disclosure prompts for newly-enabled modules, a pure-function recommendation engine with 13 catalog entries, and the Grow section with dynamic recommendation cards — 52 tests (24 engine + 28 component) all passing, bringing total setup test suite to 80 tests across 6 files.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-07T08:45:36Z
- **Completed:** 2026-07-07T10:54:15Z
- **Tasks:** 6
- **Files created:** 7

## Accomplishments

- **ConfigureSection** with 7 module toggles: maintenance (core-only), bookings, dWallet, surveys, competitions, achievements, marketplace (all depth+). Foundation tier sees upgrade prompt instead of locked modules. Each toggle persists via `useAutoSaveSetting` and shows configure links when enabled.
- **ContextualPrompts** progressive disclosure: when a module is enabled but its sub-configuration is incomplete, shows a blue banner with "Configure" (links to admin page) and "Dismiss" (persists via SetupSetting).
- **getRecommendations()** pure function engine: takes `RecommendationInput` (setup, tier, missions, settings), returns `RecommendedMission[]` sorted by priority. 13 catalog entries covering launch, populate, configure, and grow missions. Tier-aware — foundation tenants never see premium recommendations. Fully stateless and testable.
- **GrowSection** UI: renders recommendation cards with Complete/Skip/Learn More actions. Skip hides via session-local state + persistence callback. Learn More toggles benefits panel. Priority badges: ⭐ High Priority, Recommended, Optional. Empty state when fully configured.
- **52 new tests** (24 engine unit + 14 ConfigureSection + 14 GrowSection), all passing. Full setup test suite: 80 tests across 6 files.

## Task Commits

Each task was committed atomically:

1. **Task 1: ConfigureSection** — `24b649a4` (feat)
2. **Task 2: ContextualPrompts** — `31a159cf` (feat)
3. **Task 3: Recommendation engine** — `3c50363e` (feat)
4. **Task 4: Engine unit tests** — `c3de3769` (test)
5. **Task 5: GrowSection** — `25b75329` (feat)
6. **Task 6: Component tests** — `60de789e` (test)

## Files Created

- `src/features/setup/ui/sections/ConfigureSection.tsx` — 7 tier-gated module toggles with configure links
- `src/features/setup/ui/sections/GrowSection.tsx` — Dynamic recommendation cards with Complete/Skip/Learn More
- `src/features/setup/ui/ContextualPrompts.tsx` — Progressive disclosure banners for enabled-but-unconfigured modules
- `src/features/setup/model/recommendations.ts` — Pure function recommendation engine (13 catalog entries)
- `src/features/setup/model/__tests__/recommendations.test.ts` — 24 unit tests covering all rule branches
- `src/features/setup/__tests__/ConfigureSection.test.tsx` — 14 component tests
- `src/features/setup/__tests__/GrowSection.test.tsx` — 14 component tests

## Decisions Made

1. **Configure modules defined locally** rather than in the global MODULES registry — dWallet, competitions, and achievements aren't standard ModuleKey entries and shouldn't pollute the shared tier module system until they mature.
2. **Recommendation engine is a pure function** — all state comes in via `RecommendationInput`, all output goes out via return value. Zero mocking needed for tests. This is the key architectural decision: recommendations aren't tied to any framework, database, or API.
3. **GrowSection skip uses session-local Set + persistence callback** — skip state is tracked in component state for instant UI response, with an `onSkip` callback for the parent to persist via SetupSetting. This avoids premature network round-trips while ensuring dismiss durability.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

One test fix: two tier-gating tests in the recommendation engine initially failed because they used the default 0% completion percent, which triggers the "low completion" rule that filters out non-launch recommendations. Fixed by setting completion percent to 80% in those tests and pre-completing launch missions. Both tests now pass.

## User Setup Required

None — no external service configuration required. All files are UI components and a pure function.

## Next Phase Readiness

- ConfigureSection and GrowSection are complete, tested, and ready for Integration into SetupCenter.tsx in Plan 123-06.
- ContextualPrompts is ready to be mounted alongside ConfigureSection to provide progressive disclosure.
- The recommendation engine is pure and doesn't require any API — just wire it into GrowSection's props and it works.

---

## Self-Check: PASSED

- 7/7 created files exist on disk
- 6/6 commit hashes verified in git log
- 80/80 tests passing across 6 test files

---

_Phase: 123-setup-center_
_Completed: 2026-07-07_
