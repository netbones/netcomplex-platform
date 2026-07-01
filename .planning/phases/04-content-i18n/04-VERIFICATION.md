---
phase: 04-content-i18n
verified: 2026-07-01T18:03:00Z
status: human_needed
score: 11/11 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: 'Switch locale via LanguageSwitcher and verify content cards re-fetch in the new language'
    expected: 'Content displays in the newly selected locale — titles, excerpts, and detail content render in locale-resolved text'
    why_human: 'Requires a running dev server with real content in multiple locales in the database; grep can verify the URL parameter but not that the API returns locale-resolved content at runtime'
  - test: 'Visit news listing, dashboard widgets, and resident profiles with multiple locales enabled'
    expected: 'Content cards render correctly with locale-resolved text; no English-only fallback visible when non-English locale is selected'
    why_human: 'Visual layout verification — grep confirms the wiring but cannot verify that the rendered UI matches the expected locale-aware behavior'
---

# Phase 04: Content I18n Verification Report

**Phase Goal:** Content-displaying routes and pages respect the user's active locale — all content fetches pass `&locale=${i18n.language}`, and redundant client-side locale helpers are removed.

**Verified:** 2026-07-01T18:03:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                          | Status     | Evidence                                                                                                                                                                                                                                                                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | News listing page fetches content with `&locale=${i18n.language}` and displays locale-resolved titles/excerpts | ✓ VERIFIED | `src/app/news/page.tsx:52` — `&locale=${i18n.language}` in fetch URL; useEffect deps include `i18n.language` at line 46; test verifies fetch URL contains locale param                                                                                                                                                                                              |
| 2   | News detail page fetches content with `&locale=${i18n.language}` and displays locale-resolved content          | ✓ VERIFIED | `src/app/news/[id]/page.tsx:89` — `&locale=${i18n.language}` in fetch URL; useEffect deps include `i18n.language` at line 116; test verifies fetch URL contains locale param                                                                                                                                                                                        |
| 3   | ServicesPage fetches content with `&locale=${language}` and displays locale-resolved service listings          | ✓ VERIFIED | `src/page-modules/service/ui/ServicesPage.tsx:100` — `&locale=${i18n.language}`; useEffect deps include `i18n.language` at line 146                                                                                                                                                                                                                                 |
| 4   | Resident profile page fetches content with `&locale=${language}` for tag cloud content                         | ✓ VERIFIED | `src/app/resident/[id]/page.tsx:69` — locale prop threaded through TagCloudWidgetForUser; locale in PublicSidebarWidgets at line 479                                                                                                                                                                                                                                |
| 5   | When user switches locale via LanguageSwitcher, content re-fetches in the new language                         | ✓ VERIFIED | All useEffect dependency arrays include language/locale (news/page: `[selectedCategory, i18n.language]`, news/[id]: `[id, i18n.language]`, ServicesPage: `[i18n.language]`, UserContentWidget: `[session?.user?.id, i18n.language]`, TagCloudWidget: `[authorId, language]`, admin/content: `[language]`); news-locale test #3 verifies re-fetch on language change |
| 6   | UserContentWidget fetches content with `&locale=${language}` for the session user                              | ✓ VERIFIED | `src/widgets/dashboard/ui/UserContentWidget.tsx:44` — `&locale=${i18n.language}`; deps include `i18n.language` at line 53                                                                                                                                                                                                                                           |
| 7   | TagCloudWidget fetches content with `&locale=` for tag aggregation                                             | ✓ VERIFIED | `src/widgets/dashboard/ui/TagCloudWidget.tsx:35,37` — both API URL branches include `&locale=${language}`; deps include `language` at line 31                                                                                                                                                                                                                       |
| 8   | HomeLayer announcement titles render in user's active locale (not hardcoded 'en')                              | ✓ VERIFIED | `src/widgets/dashboard/ui/HomeLayer.tsx:54` — `resolveTitle` uses `getLocalizedValue(title, locale)` with dynamic locale from `useLanguage()` hook (line 490); no hardcoded `'en'`; 9 tests in HomeLayer-locale.test.tsx verify locale behavior                                                                                                                     |
| 9   | useAdminContent hook accepts locale parameter and passes it to API calls                                       | ✓ VERIFIED | `src/shared/lib/hooks/useAdminContent.ts:3-6` — `useAdminContent(locale?: string)`; includes locale in both `queryKey` and fetch URL                                                                                                                                                                                                                                |
| 10  | Admin content list page fetches content with `&locale=` param                                                  | ✓ VERIFIED | `src/app/(tenant)/admin/content/page.tsx:53` — `&locale=${language}`; deps include `language` at line 59                                                                                                                                                                                                                                                            |
| 11  | Conservation page uses API-returned flat strings directly — no client-side JSONB key extraction                | ✓ VERIFIED | `getLocalizedContent()` completely removed (grep returns 0 results); uses `article.title`/`article.content` directly at lines 259-260, 312-313; API already passes locale correctly at line 12                                                                                                                                                                      |

**Score:** 11/11 truths verified (0 behavior-unverified)

### Required Artifacts

| Artifact                                                       | Expected                                 | Status     | Details                                                                                 |
| -------------------------------------------------------------- | ---------------------------------------- | ---------- | --------------------------------------------------------------------------------------- |
| `src/app/news/page.tsx`                                        | Updated fetch with locale param          | ✓ VERIFIED | 217 lines; `&locale=${i18n.language}` at line 52; `i18n.language` in useEffect deps     |
| `src/app/news/[id]/page.tsx`                                   | Updated fetch with locale param          | ✓ VERIFIED | 238 lines; `&locale=${i18n.language}` at line 89; `i18n.language` in useEffect deps     |
| `src/page-modules/service/ui/ServicesPage.tsx`                 | Updated fetch with locale param          | ✓ VERIFIED | 520 lines; `&locale=${i18n.language}` at line 100; `i18n.language` in useEffect deps    |
| `src/app/resident/[id]/page.tsx`                               | Updated fetch with locale param          | ✓ VERIFIED | 511 lines; locale prop threaded through component hierarchy                             |
| `src/widgets/dashboard/ui/UserContentWidget.tsx`               | Updated fetch with locale param          | ✓ VERIFIED | 115 lines; `&locale=${i18n.language}`; language in deps                                 |
| `src/widgets/dashboard/ui/TagCloudWidget.tsx`                  | Added locale hook + locale param         | ✓ VERIFIED | 100 lines; `useLanguage()` hook added; locale in both API URL branches                  |
| `src/widgets/dashboard/ui/HomeLayer.tsx`                       | resolveTitle now uses dynamic locale     | ✓ VERIFIED | 626 lines; `resolveTitle` accepts locale param, uses `useLanguage()`; no hardcoded 'en' |
| `src/shared/lib/hooks/useAdminContent.ts`                      | Accepts locale param                     | ✓ VERIFIED | 9 lines; `useAdminContent(locale?: string)`; locale in queryKey + fetch                 |
| `src/app/(tenant)/admin/content/page.tsx`                      | Updated fetch with locale param          | ✓ VERIFIED | 315 lines; `&locale=${language}`; language in deps                                      |
| `src/app/conservation/page.tsx`                                | Removed getLocalizedContent helper       | ✓ VERIFIED | 399 lines; helper fully removed; uses flat `article.title`/`article.content`            |
| `src/app/news/__tests__/news-locale.test.tsx`                  | New — verifies locale propagation        | ✓ VERIFIED | 163 lines; 4 tests all passing (en/af locale params, re-fetch on change, detail page)   |
| `src/widgets/dashboard/ui/__tests__/HomeLayer-locale.test.tsx` | New — verifies locale-aware resolveTitle | ✓ VERIFIED | 99 lines; 9 tests all passing (en/af/xh/zu locales, fallback, edge cases)               |

### Key Link Verification

| From                                                        | To                                | Via                                                   | Status  | Details                                                                        |
| ----------------------------------------------------------- | --------------------------------- | ----------------------------------------------------- | ------- | ------------------------------------------------------------------------------ |
| i18n.language → fetch URL                                   | All 9 content-fetching sites      | `&locale=${i18n.language}` appended to fetch URLs     | ✓ WIRED | All 9 sites verified via grep — locale param present in every content API call |
| useEffect dependency array                                  | Component re-render               | `language`/`i18n.language` in deps                    | ✓ WIRED | All 6 useEffect calls confirmed to include language in dependency arrays       |
| HomeLayer.resolveTitle() → getLocalizedValue(title, locale) | Dynamic locale from useLanguage() | `resolveTitle(title, language)` at all call sites     | ✓ WIRED | 4 call sites updated; no hardcoded 'en' remaining                              |
| useAdminContent hook → fetch URL                            | Locale param threading            | Hook signature `useAdminContent(locale?)` → fetch URL | ✓ WIRED | Locale in both queryKey and fetch URL                                          |
| conservation/page.tsx → API flat strings                    | getLocalizedContent removal       | Direct `article.title` access                         | ✓ WIRED | Helper fully removed; API returns flat strings                                 |

### Data-Flow Trace (Level 4)

| Artifact              | Data Variable                   | Source                                                                  | Produces Real Data                                                    | Status    |
| --------------------- | ------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------- | --------- |
| news/page.tsx         | `content` state                 | `/api/content?published=true&locale=${i18n.language}`                   | API returns locale-resolved strings via `transformContentForLocale()` | ✓ FLOWING |
| news/[id]/page.tsx    | `post` state                    | `/api/content/${id}?published=true&locale=${i18n.language}`             | API returns locale-resolved strings                                   | ✓ FLOWING |
| ServicesPage.tsx      | Content from fetch              | `/api/content?category=SERVICES&published=true&locale=${i18n.language}` | API returns locale-resolved strings                                   | ✓ FLOWING |
| UserContentWidget.tsx | Content from fetch              | `/api/content?authorId=${session.user.id}&locale=${i18n.language}`      | API returns locale-resolved strings                                   | ✓ FLOWING |
| HomeLayer.tsx         | `resolveTitle(title, language)` | `getLocalizedValue()` from `@shared/lib/i18n/config`                    | Uses existing locale-aware function with dynamic locale               | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior                                               | Command                                                                         | Result         | Status |
| ------------------------------------------------------ | ------------------------------------------------------------------------------- | -------------- | ------ |
| News page locale prop: fetch URL includes `&locale=en` | `npx vitest run src/app/news/__tests__/news-locale.test.tsx`                    | 4/4 passed     | ✓ PASS |
| HomeLayer resolveTitle with dynamic locale             | `npx vitest run src/widgets/dashboard/ui/__tests__/HomeLayer-locale.test.tsx`   | 9/9 passed     | ✓ PASS |
| Existing i18n tests still pass                         | `npx vitest run src/shared/lib/i18n/__tests__/ src/entities/content/__tests__/` | 109/109 passed | ✓ PASS |

### Probe Execution

No probes defined for this phase (wiring-only, no migration or CLI tooling). Step 7c: SKIPPED.

### Requirements Coverage

| Requirement     | Source Plan  | Description                                                                                    | Status      | Evidence                                                                                                                                                             |
| --------------- | ------------ | ---------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CONTENT-I18N-01 | 04-01, 04-02 | Content card components render locale-resolved titles without client-side JSONB key extraction | ✓ SATISFIED | All 9 content-fetching sites pass `&locale=` param; client-side `getLocalizedContent()` removed; `resolveTitle` uses dynamic locale                                  |
| CONTENT-I18N-02 | 04-01        | Fallback to `defaultLocale` when requested locale key is missing from JSONB                    | ✓ SATISFIED | Server-side fallback already implemented in `getLocalizedValue()` (verified in existing 17 tests); client now correctly passes locale to invoke server-side fallback |
| CONTENT-I18N-03 | 04-02        | Non-`/api/content` endpoints also return locale-resolved strings                               | ✓ SATISFIED | Conservation page wired (`/api/conservation?locale=`); admin content wired; existing conservation tests verify locale transformation                                 |

### Anti-Patterns Found

| File   | Line | Pattern | Severity | Impact                                                                                                                                               |
| ------ | ---- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| (none) | —    | —       | —        | All Phase 04 modified files are clean — no TBD/FIXME/TODO/PLACEHOLDER markers, no `console.log` stubs, no hardcoded empty returns in production code |

### Human Verification Required

#### 1. Locale Switching Visual Confirmation

**Test:** Switch locale via LanguageSwitcher in the UI while viewing content pages (news listing, news detail, services, conservation), then switch again.
**Expected:** Content cards and detail pages re-fetch and render titles, excerpts, and body content in the newly selected locale. No English-only fallback visible when a non-English locale (af, xh, zu) is selected.
**Why human:** Requires a running dev server with real content in multiple locales in the database. grep confirms the URL parameter is wired but cannot verify that the API returns locale-resolved content and the UI renders it correctly at runtime.

#### 2. Content Card Rendering Across Pages

**Test:** Visit news listing, dashboard widgets (UserContentWidget, TagCloudWidget, HomeLayer), and resident profiles with multiple locales enabled.
**Expected:** Content cards render correctly with locale-resolved text across all supported locales (en, af, xh, zu). HomeLayer announcement titles render in the user's active locale. Admin content list displays locale-resolved titles.
**Why human:** Visual layout verification. grep confirms the wiring but cannot verify that the rendered UI matches the expected locale-aware behavior across different page layouts and component states.

### Gaps Summary

No gaps found. All 11 must-have truths verified through codebase evidence and automated tests. The phase goal — wiring `&locale=` into all content-fetching sites and removing redundant client-side locale helpers — is fully achieved.

Two human verification items are surfaced for visual confirmation of locale switching and content card rendering, as these require a running server with locale-populated content.

---

_Verified: 2026-07-01T18:03:00Z_
_Verifier: the agent (gsd-verifier)_
