---
phase: 42-i18n-hydration-fix
plan: 03
subsystem: i18n
tags: [react-i18next, hydration, ssr, shared-ui, components, services]

# Dependency graph
requires:
  - phase: 42-i18n-hydration-fix
    plan: 01
    provides: useSafeTranslation hook with tx() method (single source of truth for hydration-safe translations)
provides:
  - 5 shared UI components migrated to useSafeTranslation
  - Services domain page consolidated to use shared hook (local tx() helper removed)
  - Single canonical tx() implementation across the codebase
affects: [all future pages that need hydration-safe translations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Consolidation: shared useSafeTranslation is the ONLY place tx() is implemented'
    - "Future-proofing: tx() destructured in components that don't currently use t() (LocaleSelector, LocaleTabs)"

key-files:
  created: []
  modified:
    - src/shared/ui/Bookshelf.tsx
    - src/shared/ui/TagCloud.tsx
    - src/features/i18n/ui/LocaleSelector.tsx
    - src/features/service/ui/CreateListingForm.tsx
    - src/entities/directory/ui/UnifiedResidentCard.tsx
    - src/app/(tenant)/dashboard/services/[domain]/page.tsx

key-decisions:
  - 'LocaleSelector/LocaleTabs: tx kept destructured even when unused (for future i18n of button labels)'
  - 'CreateListingForm: tx kept destructured for consistency (no t() calls in JSX)'
  - 'UnifiedResidentCard: removed ternary t?-guards (no longer needed since tx() always returns fallback)'
  - 'Services page: showNewForm uses isReady (mounted+ready combined) instead of just mounted — semantically correct for hydration safety'

patterns-established:
  - 'Pattern: Single source of truth — no duplicate tx() implementations anywhere in the codebase'
  - "Pattern: Future-proofing — destructure tx() in components even when not currently used, so adding new translations doesn't require a hook change"

requirements-completed: [I18N-06, I18N-07, I18N-08]

# Metrics
duration: 15min
completed: 2026-06-03
---

# Phase 42 Plan 03: Shared UI Components + Services Page Summary

**5 shared UI components + services page migrated to useSafeTranslation — eliminates all duplicate tx() implementations; hydration-safe tx() is now the single source of truth across the codebase.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-06-03T17:35:00Z
- **Completed:** 2026-06-03T17:50:00Z
- **Tasks:** 3/3
- **Files modified:** 6

## Accomplishments

- **5 shared UI components migrated**: Bookshelf (13 tx() calls), TagCloud (1), LocaleSelector + LocaleTabs (kept destructured for future i18n), CreateListingForm (kept destructured for consistency), UnifiedResidentCard (2 calls with ternary guards removed).
- **Local tx() helper removed from services page**: The duplicate implementation (mounted state, ready check, fallback function) was deleted. The page now uses the shared `tx` from `useSafeTranslation`. This is the **last** duplicate tx() implementation in the codebase.
- **showNewForm gate uses isReady**: The services page's "new maintenance request" form was previously gated on `mounted && ...` to avoid SSR/hydration mismatches from `useSearchParams` returning null on the server. It's now gated on `isReady` (which combines mounted + ready) — semantically correct since the page should not show interactive forms until i18n is also stable.
- **No react-i18next imports remain**: All 6 migrated files use `useSafeTranslation` from `@features/i18n/model/useTranslation`. Verified via `rg "from 'react-i18next'"` returns 0 matches across the 6 files.

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate Bookshelf, TagCloud, LocaleSelector** - `2288120` (feat)
2. **Task 2: Migrate CreateListingForm and UnifiedResidentCard** - `40ceb61` (feat)
3. **Task 3: Remove local tx() from services page** - `5d7a1ea` (feat)

**Plan metadata:** (will be created when this summary is committed)

## Files Created/Modified

- `src/shared/ui/Bookshelf.tsx` - 13 `t()` calls converted to `tx()` (heading, edit/add buttons, form labels, save button, empty state)
- `src/shared/ui/TagCloud.tsx` - 1 `t()` call converted to `tx()` (the "more" label for overflow tag count)
- `src/features/i18n/ui/LocaleSelector.tsx` - `useTranslation` → `useSafeTranslation` in both `LocaleSelector` and `LocaleTabs`; `tx` kept for future i18n
- `src/features/service/ui/CreateListingForm.tsx` - `useTranslation` → `useSafeTranslation`; `tx` kept for consistency (component currently uses hardcoded English strings)
- `src/entities/directory/ui/UnifiedResidentCard.tsx` - 2 `t()` calls converted to `tx()` (owner/renter labels); ternary `t ?` guards removed
- `src/app/(tenant)/dashboard/services/[domain]/page.tsx` - Local `mounted` state, `useEffect`, and `tx()` helper removed; `showNewForm` gate uses `isReady`; `useState`/`useEffect` imports removed

## Decisions Made

- **LocaleSelector/LocaleTabs keep tx destructured**: These components render `languageNames[locale]` (imported from i18n config) rather than `t()` output. The `t` import was already unused. The migration kept `tx` destructured for future-proofing (i18n of button labels like "+ Add" in LocaleTabs).
- **CreateListingForm kept tx destructured for consistency**: The component has hardcoded English strings throughout the form fields. No `t()` calls in JSX. The `t` import was already unused. Migration kept `tx` destructured to maintain a consistent i18n pattern across the codebase.
- **Removed ternary guards in UnifiedResidentCard**: Lines 63 and 68 had `t ? t('home.owner', { defaultValue: 'Owner' }) : 'Owner'` — the `t ?` ternary was a guard for the unused `t` variable. Since `tx()` always returns the fallback when not ready, the guards are redundant. Removed for clarity.
- **showNewForm uses isReady (not just mounted)**: This is a behavioral change. The form was previously gated on `mounted` (true after first client useEffect). Now it's gated on `isReady` (mounted && ready). This is semantically correct — the form should not render before i18n is stable, ensuring breadcrumbs above have rendered with stable text first. The form itself doesn't use i18n, but the breadcrumbs do, so rendering them first prevents a brief visual flicker.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Phase 42 complete**: All 3 plans shipped (42-01, 42-02, 42-03). M4 is now 3/3 done.
- **Single source of truth for tx()**: Any future page that needs hydration-safe translations can `import { useSafeTranslation } from '@features/i18n/model/useTranslation'`.
- **Verification commands all pass**:
  - `rg "from 'react-i18next'"` returns 0 matches in 6 migrated files
  - All 6 files import `useSafeTranslation`
  - No local `tx()` helper remains in the services page
  - `pnpm typecheck` shows 57 pre-existing errors (same as baseline before my changes)
- **Manual verification recommended**: Open the services, messages, and admin domain pages in the browser, then toggle locales — confirm breadcrumb labels render with English fallback first (no flash of raw keys like "nav.home").

---

_Phase: 42-i18n-hydration-fix_
_Completed: 2026-06-03_
