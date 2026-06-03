---
phase: 42-i18n-hydration-fix
plan: 01
subsystem: i18n
tags: [react-i18next, hydration, ssr, client-components, nextjs-app-router]

# Dependency graph
requires:
  - phase: 03-content-i18n
    provides: existing i18n infrastructure (react-i18next setup, defaultLanguage export, namespace loading)
provides:
  - I18nextProvider in React context tree for all tenant route children
  - useSafeTranslation hook with hydration-safe tx(key, fallback) method
  - usePageLoading delegation to useSafeTranslation (no more local mounted state)
affects: [42-02, 42-03, all tenant pages using usePageLoading]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Hydration-safe translation: tx() returns English fallback until i18n mounted+ready'
    - 'Single source of truth: useSafeTranslation hook (replaces duplicate local tx() helpers)'
    - 'Client component layout: I18nextProvider wraps Toaster + Suspense + children'

key-files:
  created: []
  modified:
    - src/app/(tenant)/layout.tsx
    - src/features/i18n/model/useTranslation.ts
    - src/shared/lib/hooks/usePageLoading.tsx

key-decisions:
  - "Tenant layout is now a 'use client' component (required for I18nextProvider) — loses ability to be async server component but gains proper React context propagation"
  - 'useSafeTranslation keeps old useLanguage hook untouched (lighter hook for language-only operations)'
  - 'Old useTranslation export from useTranslation.ts was dead code (zero imports) — replaced, not deprecated'
  - 'usePageLoading now exposes tx() so all pages already using it get hydration-safe translations for free'
  - 'useI18nReady return shape simplified: removes mounted/ready, exposes only isReady + additionalLoading + tx'

patterns-established:
  - 'Pattern: I18nextProvider in client layouts — mirrors src/app/[lng]/platform/layout.tsx pattern (already established)'
  - 'Pattern: tx(key, fallback, options?) — fallback is always required (no undefined allowed), forcing deterministic text'
  - 'Pattern: mounted && ready → isReady — combined flag for conditional rendering'

requirements-completed: [I18N-01, I18N-02, I18N-03]

# Metrics
duration: 18min
completed: 2026-06-03
---

# Phase 42 Plan 01: i18n Hydration Foundation Summary

**I18nextProvider in tenant layout + useSafeTranslation hook with hydration-safe tx() — eliminates React hydration mismatches for tenant routes by returning deterministic English fallbacks until i18n is mounted+ready.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-06-03T17:05:00Z
- **Completed:** 2026-06-03T17:23:00Z
- **Tasks:** 3/3
- **Files modified:** 3

## Accomplishments

- **I18nextProvider in React context tree**: `src/app/(tenant)/layout.tsx` now wraps Toaster + Suspense + children in `<I18nextProvider i18n={i18n}>`, mirroring the established `src/app/[lng]/platform/layout.tsx` pattern. All tenant route children now have access to the i18n instance via React context (not just the module-scope singleton).
- **useSafeTranslation hook revived**: Replaced dead `useTranslation` export with `useSafeTranslation` — a drop-in replacement for react-i18next's `useTranslation` that adds `tx(key, fallback, options?)` for hydration-safe translations. Returns `t, tx, i18n, ready, mounted, isReady, language, changeLanguage`.
- **usePageLoading now hydration-aware**: `useI18nReady` no longer maintains its own `mounted` state — it delegates to `useSafeTranslation.isReady`. `usePageLoading` also exposes `tx()` so all pages using it can render hydration-safe breadcrumb labels without a separate import.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add I18nextProvider to tenant layout** - `0b29b8b` (feat)
2. **Task 2: Revive useSafeTranslation hook with tx() method** - `b7e2f79` (feat)
3. **Task 3: Update usePageLoading to use useSafeTranslation internally** - `4b227f1` (feat)

**Plan metadata:** (will be created when this summary is committed)

## Files Created/Modified

- `src/app/(tenant)/layout.tsx` - Converted from async server component to `'use client'` component; wraps children in I18nextProvider
- `src/features/i18n/model/useTranslation.ts` - Replaced dead `useTranslation` export with `useSafeTranslation` hook (with `tx()` method, `mounted`/`isReady` flags); preserved `useLanguage`
- `src/shared/lib/hooks/usePageLoading.tsx` - Delegates to `useSafeTranslation` for hydration checking; exposes `tx()` for hydration-safe breadcrumb labels

## Decisions Made

- **Client component for tenant layout**: I18nextProvider is a client component, so the tenant layout must be `'use client'`. The async server component pattern is incompatible with the I18nextProvider requirement. The side-effect import in `src/app/providers.tsx` (`import '@shared/lib/i18n'`) is preserved to ensure `i18n.init()` runs at module scope before any component mounts.
- **Single source of truth for tx()**: Consolidating the `tx()` logic into `useSafeTranslation` means the local `tx()` helper in the services domain page (Phase 42-03) can be removed without losing functionality. The hook is now the single implementation.
- **Return shape change for useI18nReady**: Removed `mounted` and `ready` from the return type since they're internal to `useSafeTranslation`. All existing callers (verified via `rg 'useI18nReady' src/`) only use `isReady` — no breaking changes.
- **tx() always requires fallback**: The signature `(key: string, fallback: string, options?)` makes the fallback non-optional, forcing developers to provide deterministic text for SSR/hydration passes.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Wave 2 plans (42-02, 42-03) are unblocked**: They depend on 42-01 to provide `useSafeTranslation` and the `tx()` method. Both can now execute in parallel.
- **All tenant routes now have I18nextProvider**: Server-side rendered pages can use the i18n instance via React context, not just the module-scope singleton. This is a foundation for all future i18n work in tenant routes.
- **No test changes required**: The plan did not include tests (no test file modifications). Existing tests in `src/test/` use module-scope i18n singleton and are unaffected.

---

_Phase: 42-i18n-hydration-fix_
_Completed: 2026-06-03_
