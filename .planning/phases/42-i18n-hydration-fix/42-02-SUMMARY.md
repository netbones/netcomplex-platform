---
phase: 42-i18n-hydration-fix
plan: 02
subsystem: i18n
tags: [react-i18next, hydration, ssr, tenant-pages, breadcrumbs]

# Dependency graph
requires:
  - phase: 42-i18n-hydration-fix
    plan: 01
    provides: useSafeTranslation hook with tx() method for hydration-safe translations
provides:
  - Messages domain page with hydration-safe breadcrumb labels
  - Admin domain page with hydration-safe breadcrumb labels
affects: [42-03, all tenant pages that need hydration-safe translations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "tx() with namespace option: tx(key, fallback, { ns: 'namespace' }) for non-default namespaces"
    - 'Compute fallback once: domainLabelFallback extracted to avoid duplicate logic in 2-3 tx() calls'

key-files:
  created: []
  modified:
    - src/app/(tenant)/dashboard/messages/[domain]/page.tsx
    - src/app/(tenant)/dashboard/admin/[domain]/page.tsx

key-decisions:
  - "Load multiple namespaces upfront: useSafeTranslation(['common', 'messages']) ensures namespace is requested on first render (not lazy-loaded after hydration)"
  - 'Computed domainLabelFallback once: avoids 2-3 duplicate charAt(0).toUpperCase() + slice(1) computations'
  - "Empty domain description handling: domainDef?.description ?? '' fallback for descriptionKey tx() call"
  - "Admin domains.back fallback: 'Back to Admin' (specific to admin context, not 'Back to Messages')"

patterns-established:
  - 'Pattern: tx(key, fallback, { ns }) for namespace-specific translations'
  - 'Pattern: Pre-compute dynamic fallbacks in component body for reuse across multiple tx() calls'

requirements-completed: [I18N-04, I18N-05]

# Metrics
duration: 8min
completed: 2026-06-03
---

# Phase 42 Plan 02: High-Risk Pages Migration Summary

**Messages and admin domain pages migrated to useSafeTranslation + tx() — all 14 visible-text t() calls converted to hydration-safe tx(key, fallback) with English fallbacks.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-03T17:25:00Z
- **Completed:** 2026-06-03T17:33:00Z
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments

- **Messages domain page migrated**: All 9 `t()` calls in `src/app/(tenant)/dashboard/messages/[domain]/page.tsx` converted to `tx()` with English fallbacks. Breadcrumb labels (Home, Dashboard, Messages) and dynamic domain labels now render deterministic English on SSR + first client render, then swap to translated text on subsequent renders.
- **Admin domain page migrated**: All 6 `t()` calls in `src/app/(tenant)/dashboard/admin/[domain]/page.tsx` converted to `tx()` with English fallbacks. Same hydration-safe pattern for breadcrumb labels (Home, Dashboard, Admin) and domain-specific content.
- **Multi-namespace loading**: Both pages now request `['common', '<namespace>']` upfront via `useSafeTranslation()`, ensuring the namespace is loaded on first render (not lazy-loaded after hydration, which would cause the very mismatch we're trying to prevent).

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate messages domain page to useSafeTranslation** - `5b899b6` (feat)
2. **Task 2: Migrate admin domain page to useSafeTranslation** - `8effc04` (feat)

**Plan metadata:** (will be created when this summary is committed)

## Files Created/Modified

- `src/app/(tenant)/dashboard/messages/[domain]/page.tsx` - All visible text uses `tx(key, fallback, { ns })`; pre-computes `domainLabelFallback`
- `src/app/(tenant)/dashboard/admin/[domain]/page.tsx` - All visible text uses `tx(key, fallback, { ns })`; pre-computes `domainLabelFallback`; `domains.back` fallback is "Back to Admin" (specific to admin context)

## Decisions Made

- **Pre-compute `domainLabelFallback`**: Both pages had 2-3 tx() calls that used `domainDef.id.charAt(0).toUpperCase() + domainDef.id.slice(1)` as the fallback. Extracted this to a single `const` to avoid duplication and improve readability.
- **Namespace loading strategy**: `useSafeTranslation(['common', '<namespace>'])` loads both namespaces upfront. This matches the existing pattern in the services page (Phase 42-03 will consolidate this). Lazy loading would defeat the purpose of hydration-safe rendering.
- **Empty description handling**: For the `descriptionKey` tx() call, used `domainDef?.description ?? ''` as the fallback — this preserves the original behavior where `domainDef` could be undefined and the description would render as empty string.
- **Admin back link fallback**: Used `'Back to Admin'` (not `'Back to Messages'`) as the fallback for `domains.back` in the admin page — this is a different `t()` key namespace and the English text is admin-specific.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Wave 2 plan 42-03 unblocked**: It depends on 42-01 (which is complete) for the `useSafeTranslation` hook. The shared UI components and services page can now be migrated.
- **Pages verified**: No bare `t()` calls remain in the two high-risk pages. No `react-i18next` imports remain. Both pages import `useSafeTranslation` from the shared hook location.
- **No regressions**: Existing widget rendering (WidgetRenderer, ErrorBoundary, UsersListSection) is unchanged. Only the i18n layer was migrated.

---

_Phase: 42-i18n-hydration-fix_
_Completed: 2026-06-03_
