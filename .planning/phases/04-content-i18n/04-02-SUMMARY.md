---
phase: 04-content-i18n
plan: 02
subsystem: i18n
tags: [react-i18next, locale, dashboard, admin, content-api, vitest]

# Dependency graph
requires:
  - phase: 04-content-i18n
    plan: 01
    provides: Server-side content API locale transformation (transformContentForLocale, resolveLocale)
provides:
  - Dashboard widgets now pass `&locale=` in content API fetch URLs
  - HomeLayer resolveTitle uses dynamic locale from useLanguage (not hardcoded 'en')
  - useAdminContent hook accepts locale parameter, admin content page wires it
  - Client-side getLocalizedContent helper removed from conservation page
affects: [dashboard, admin-content, conservation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'useLanguage() hook for non-translation locale access in widgets'
    - '&locale= query param threading from client to content API'

key-files:
  created:
    - src/widgets/dashboard/ui/__tests__/HomeLayer-locale.test.tsx (9 tests for locale-aware resolveTitle)
  modified:
    - src/widgets/dashboard/ui/UserContentWidget.tsx (added i18n.language to fetch URL)
    - src/widgets/dashboard/ui/TagCloudWidget.tsx (added useLanguage hook, locale in API URLs)
    - src/widgets/dashboard/ui/HomeLayer.tsx (dynamic locale in resolveTitle, useLanguage hook)
    - src/shared/lib/hooks/useAdminContent.ts (locale param on hook)
    - src/app/(tenant)/admin/content/page.tsx (useLanguage + locale in fetch)
    - src/app/conservation/page.tsx (removed getLocalizedContent helper)

key-decisions:
  - 'useLanguage() hook chosen over useTranslation() for widgets that only need locale (lighter dependency)'
  - 'resolveTitle reuses getLocalizedValue — no new locale resolution logic, single source of truth'
  - 'getLocalizedContent removed because API now returns flat strings via transformContentForLocale (Plan 04-01)'
  - 'language prop threaded through UrgencyZone/ActivityZone to reach resolveTitle call sites'

patterns-established:
  - 'Dashboard widget locale pattern: useLanguage() → &locale=${language} in fetch URL → language in useEffect deps'
  - 'Admin page locale pattern: useLanguage() → &locale=${language} in fetch → language in useEffect deps'

requirements-completed:
  - CONTENT-I18N-01
  - CONTENT-I18N-03

# Coverage metadata
coverage:
  - id: D1
    description: 'Dashboard widgets (UserContentWidget, TagCloudWidget, HomeLayer) fetch content with &locale= query param'
    requirement: CONTENT-I18N-01
    verification:
      - kind: integration
        ref: "grep -c 'locale=' src/widgets/dashboard/ui/UserContentWidget.tsx src/widgets/dashboard/ui/TagCloudWidget.tsx"
        status: pass
      - kind: unit
        ref: 'src/widgets/dashboard/ui/__tests__/HomeLayer-locale.test.tsx#HomeLayer resolveTitle with dynamic locale'
        status: pass
    human_judgment: false
  - id: D2
    description: 'Admin content pages (useAdminContent, admin/content/page) pass locale param to API'
    requirement: CONTENT-I18N-03
    verification:
      - kind: integration
        ref: "grep -c 'locale=' src/shared/lib/hooks/useAdminContent.ts src/app/(tenant)/admin/content/page.tsx"
        status: pass
    human_judgment: false
  - id: D3
    description: 'getLocalizedContent helper removed from conservation page (API returns flat strings)'
    requirement: CONTENT-I18N-03
    verification:
      - kind: integration
        ref: "grep -c 'getLocalizedContent' src/app/conservation/page.tsx"
        status: pass
    human_judgment: false

# Metrics
duration: 9min
completed: 2026-07-01
status: complete
---

# Phase 4 Plan 2: Client-Side Locale Wiring Summary

**Wired locale query parameter into 5 dashboard/admin content-fetch sites and removed redundant client-side JSONB extraction in the conservation page.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-01T15:47:19Z
- **Completed:** 2026-07-01T15:57:16Z
- **Tasks:** 3
- **Files modified:** 7 (6 modified, 1 created)

## Accomplishments

- Dashboard widgets (UserContentWidget, TagCloudWidget) now pass `&locale=${language}` in content API fetch URLs
- HomeLayer `resolveTitle` uses dynamic locale from `useLanguage()` hook instead of hardcoded `'en'`
- `useAdminContent` hook accepts optional locale parameter; admin content list page wires it via `useLanguage()`
- `getLocalizedContent()` client-side helper removed from conservation page — API now returns flat strings (Plan 04-01)
- 9 new Vitest tests verify `resolveTitle` locale behavior across en/af/xh/zu, fallbacks, and plain string passthrough

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire locale to dashboard widgets** — `d6d22142` (feat)
2. **Task 2: Wire locale to admin content + remove redundant helpers** — `b39c4086` (feat)
3. **Task 3: Add HomeLayer locale tests + verify all changes** — `58f9c509` (test)

## Files Created/Modified

- `src/widgets/dashboard/ui/UserContentWidget.tsx` — Added `i18n.language` to fetch URL + useEffect deps
- `src/widgets/dashboard/ui/TagCloudWidget.tsx` — Added `useLanguage` hook, `&locale=${language}` in both API URL branches
- `src/widgets/dashboard/ui/HomeLayer.tsx` — `resolveTitle` now accepts locale param; `useLanguage` hook wired; call sites updated
- `src/shared/lib/hooks/useAdminContent.ts` — Added locale param; updated queryKey + fetch URL
- `src/app/(tenant)/admin/content/page.tsx` — Added `useLanguage` hook; `&locale=${language}` in fetch URL
- `src/app/conservation/page.tsx` — Removed `getLocalizedContent` function; inlined flat string access
- `src/widgets/dashboard/ui/__tests__/HomeLayer-locale.test.tsx` — New file: 9 tests for locale-aware resolveTitle

## Decisions Made

- Used `useLanguage()` hook (from `useSafeTranslation`) instead of `useTranslation()` for widgets that only need the locale string — lighter dependency, avoids pulling in translation functions
- `resolveTitle` delegates to `getLocalizedValue` (same as before) — no new locale resolution logic, maintains single source of truth in `@shared/lib/i18n/config`
- Removed `getLocalizedContent` entirely rather than refactoring — the API now returns flat strings per Plan 04-01's `transformContentForLocale`, making client-side JSONB key extraction redundant
- Threaded `language` prop through `UrgencyZone` and `ActivityZone` to reach `resolveTitle` call sites — minimal interface change, no architectural impact

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 04-02 completes the Phase 04 locale wiring
- Phase 04 is now complete — both plans shipped:
  - Plan 04-01: Server-side content API locale transformation
  - Plan 04-02: Client-side locale wiring to all dashboard/admin content-fetching sites
- All 6 success criteria verified passing
- Existing i18n tests (15) remain green
- Threat mitigation T-04-04 verified: `_raw` field access in admin content editor preserved

---

_Phase: 04-content-i18n_
_Completed: 2026-07-01_
