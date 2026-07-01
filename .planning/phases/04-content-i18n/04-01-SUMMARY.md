---
phase: 04-content-i18n
plan: 01
subsystem: i18n
tags: [i18n, locale, content-api, react-i18next, vitest]

# Dependency graph
requires: []
provides:
  - Locale-aware content fetching on 4 public-facing pages (news listing, news detail, services, resident profile)
  - Locale propagation tests for news pages (4 passing tests)
affects: [04-content-i18n]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'i18n.language destructured from existing useTranslation() — no new imports'
    - 'locale query param appended to all content-fetch URLs as &locale=${i18n.language}'
    - 'i18n.language added to useEffect dependency arrays for re-fetch on locale switch'

key-files:
  created:
    - src/app/news/__tests__/news-locale.test.tsx
  modified:
    - src/app/news/page.tsx
    - src/app/news/[id]/page.tsx
    - src/page-modules/service/ui/ServicesPage.tsx
    - src/app/resident/[id]/page.tsx

key-decisions:
  - 'Use i18n.language from existing useTranslation() hook — no new imports or wrappers needed'
  - 'Thread language as a prop through resident profile component chain (ProfileContent → PublicSidebarWidgets → TagCloudWidgetForUser)'

patterns-established:
  - 'Pattern: i18n.language threading — destructure i18n from useTranslation(), append &locale=${i18n.language} to fetch URLs, add to useEffect deps'

requirements-completed:
  - CONTENT-I18N-01
  - CONTENT-I18N-02

# Coverage metadata
coverage:
  - id: D1
    description: 'News listing page fetches content with &locale=${i18n.language} and re-fetches on locale switch'
    requirement: CONTENT-I18N-01
    verification:
      - kind: unit
        ref: "src/app/news/__tests__/news-locale.test.tsx#fetch URL includes &locale=en when i18n.language is 'en'"
        status: pass
      - kind: unit
        ref: "src/app/news/__tests__/news-locale.test.tsx#fetch URL includes &locale=af when i18n.language is 'af'"
        status: pass
      - kind: unit
        ref: 'src/app/news/__tests__/news-locale.test.tsx#re-fetches content when i18n.language changes'
        status: pass
    human_judgment: false
  - id: D2
    description: 'News detail page fetches with &locale=${i18n.language}'
    requirement: CONTENT-I18N-01
    verification:
      - kind: unit
        ref: 'src/app/news/__tests__/news-locale.test.tsx#fetches with &locale= query param'
        status: pass
    human_judgment: false
  - id: D3
    description: 'ServicesPage fetches content with &locale=${i18n.language} for service listings'
    requirement: CONTENT-I18N-02
    verification:
      - kind: manual_procedural
        ref: "grep -c 'locale=' src/page-modules/service/ui/ServicesPage.tsx"
        status: pass
    human_judgment: false
  - id: D4
    description: 'Resident profile TagCloudWidgetForUser fetches tag content with &locale=${locale}'
    requirement: CONTENT-I18N-02
    verification:
      - kind: manual_procedural
        ref: "grep -c 'locale=' src/app/resident/[id]/page.tsx"
        status: pass
    human_judgment: false

# Metrics
duration: 7min
completed: 2026-07-01
status: complete
---

# Phase 04 Plan 01: Content i18n Locale Wiring Summary

**Locale query param wired into 4 public-facing content pages with language-aware re-fetch on locale switch, verified by 4 passing locale-propagation tests**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-01T15:46:51Z
- **Completed:** 2026-07-01T15:54:47Z
- **Tasks:** 3
- **Files modified/created:** 5

## Accomplishments

- Wired `&locale=${i18n.language}` into the news listing page fetch URL with useEffect re-fetch on language change
- Wired `&locale=${i18n.language}` into the news detail page, services page, and resident profile TagCloudWidgetForUser fetch URLs with proper prop threading
- Added 4 locale propagation tests verifying fetch URLs include locale param and re-fetch triggers on language change

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire locale to news listing page** - `b9b3d658` (feat)
2. **Task 2: Wire locale to news detail, services, and resident pages** - `8b2781bf` (feat)
3. **Task 3: Add news locale propagation tests + verify all pages** - `33c4b461` (test)

**Plan metadata:** (committed with SUMMARY.md)

## Files Created/Modified

- `src/app/news/page.tsx` - Added i18n destructuring, locale param in fetch URL, i18n.language in useEffect deps
- `src/app/news/[id]/page.tsx` - Added i18n destructuring, locale param in fetch URL, i18n.language in useEffect deps
- `src/page-modules/service/ui/ServicesPage.tsx` - Added i18n destructuring, locale param in fetch URL, i18n.language in useEffect deps
- `src/app/resident/[id]/page.tsx` - Added language destructuring from useSafeTranslation, threaded locale prop through PublicSidebarWidgets → TagCloudWidgetForUser, locale param in fetch URL
- `src/app/news/__tests__/news-locale.test.tsx` (new) - 4 locale propagation tests using Vitest + React Testing Library

## Decisions Made

- Used `i18n.language` from existing `useTranslation()` hook — no new imports or wrappers needed
- Threaded `language` as a prop through the resident profile chain: `ProfileContent` → `PublicSidebarWidgets` → `TagCloudWidgetForUser`
- For the resident profile, used `language` from `useSafeTranslation()` (which returns `{ tx, language }`) rather than the `i18n.language` pattern used on pages with `useTranslation()`

## Deviations from Plan

None - plan executed exactly as written. The TDD task's RED phase was satisfied by the implementation already existing in Tasks 1-2; tests passed immediately against the wired code.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 4 success criteria met (5/5 grep checks, 4/4 tests passing, 109 existing tests still green)
- Ready for Plan 04-02 (wiring locale to admin content pages and dashboard widgets)
- Threat mitigations T-04-01 and T-04-02 accepted — no new attack surface beyond what server-side `resolveLocale()` already handles

---

## Plan Verification Results

- ✅ `grep -c 'locale=' src/app/news/page.tsx src/app/news/[id]/page.tsx` → 1, 1 (both news pages have locale param)
- ✅ `grep -c 'locale=' src/page-modules/service/ui/ServicesPage.tsx` → 1 (services page has locale param)
- ✅ `grep -c 'locale=' src/app/resident/[id]/page.tsx` → 3 (resident page has locale param + prop threading)
- ✅ `npx vitest run src/app/news/__tests__/news-locale.test.tsx` → 4/4 passing
- ✅ `npx vitest run src/shared/lib/i18n/__tests__/ src/entities/content/__tests__/` → 109/109 passing (no regressions)
- ✅ All threat mitigations (T-04-01, T-04-02) accepted per plan — server-side `resolveLocale()` handles validation

## Self-Check: PASSED

---

_Phase: 04-content-i18n_
_Completed: 2026-07-01_
