# Phase 04: Content I18n — Research

**Researched:** 2026-07-01
**Domain:** Frontend locale-aware content rendering (Next.js App Router + react-i18next)
**Confidence:** HIGH

## Summary

Phase 04 is a **read-only frontend wiring phase** — no new packages, no schema changes, no new API routes. The heavy lifting (JSONB locale schema, `transformContentForLocale()` API layer, TipTap locale editor, middleware locale detection, and `I18nextProvider` in the tenant layout) was delivered across Phases 42, 45, and BD `7qkl`. The API now returns locale-resolved flat strings (`title`, `content`, `excerpt`) via `transformContentForLocale()` in all content endpoints (`/api/content`, `/api/content/[id]`, `/api/conservation`, tRPC `content.listContent`/`getContent`).

**The gap:** Most frontend pages fetching content do **not** pass a `locale` query parameter, defaulting every request to English (`'en'`). The user's active language (from `i18next` → `i18n.language` or `useLanguage().language`) is available on the client side but is not threaded through to content API calls. Additionally, two pages have now-redundant client-side JSONB key extraction helpers that should be cleaned up.

**Primary recommendation:** Wire the `locale` query parameter from the i18next runtime state into every client-side content fetch, then remove redundant client-side locale helpers on the conservation page and HomeLayer.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Locale detection (cookie → accept-language) | Middleware | — | Already delivered in `src/middleware.ts` (BD `7qkl`); sets `x-locale` header + `i18n-locale` cookie |
| Content JSONB → flat string transformation | API / Backend | — | Already delivered in `transformContentForLocale()` in content services + route handlers |
| Static UI string i18n (nav labels, button text) | Browser / Client | — | Already delivered via `react-i18next` + `useSafeTranslation` (Phase 42) + 23 widgets (Phase 45-04) |
| Frontend locale-aware content display | Browser / Client | API / Backend | **Phase 04 scope** — client passes `i18n.language` to API `?locale=` param; API handles fallback |
| Admin editing with `_raw` JSONB preservation | API / Backend | Browser / Client | Already delivered — `transformContentForLocale()` returns `_raw` alongside resolved strings |
| `[lng]` URL routing | Middleware | — | Resolved at middleware level (rewrite approach); Phase 04 consumes the `x-locale` header |

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONTENT-I18N-01 | Content card components render locale-resolved titles without client-side JSONB key extraction | API now returns flat strings — frontend pages just need to pass `?locale=` param; see §Content Display Audit below |
| CONTENT-I18N-02 | Fallback to `defaultLocale` when requested locale key is missing from JSONB | Already implemented server-side in `getLocalizedValue()` and `getLocalizedContent()` (see `src/shared/lib/i18n/config.ts`) |
| CONTENT-I18N-03 | Non-`/api/content` endpoints (e.g., `/api/conservation`) also return locale-resolved strings | `/api/conservation` already applies `transformContentForLocale()`; community-services endpoints have their own `resolveLocaleText()` helpers |

## Standard Stack

### Core (already installed — verified from package.json)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-i18next | 17.0.8 | React bindings for i18next | Already installed; provides `useTranslation` and `I18nextProvider` |
| i18next | 25.10.10 | Core i18n framework | Already installed; powers locale resolution, namespace loading |
| i18next-browser-languagedetector | 8.2.1 | Browser language detection | Already installed; detects locale from cookie/localStorage/navigator |
| i18next-http-backend | 3.0.2 | Lazy-load locale JSON files | Already installed; loads `/locales/{lng}/{ns}.json` on demand |
| @tiptap/react | 3.21.0 | Rich text editor | Already installed; used by `LocaleAwareEditor` and `RichTextRenderer` |

### No new packages needed for this phase.

**Installation:** None — zero `pnpm add` required. This phase is wiring-only.

## Package Legitimacy Audit

> No new packages are introduced in this phase. All packages listed above are already installed and verified in prior phases. Audit is N/A — skip.

**Packages removed due to SLOP verdict:** none
**Packages flagged as suspicious SUS:** none

## Architecture Patterns

### Pattern 1: Locale-Aware Client-Side Content Fetch

**What:** Every client-side `fetch('/api/content?...')` call MUST include `?locale=${activeLanguage}` where `activeLanguage` comes from `i18n.language` or `useLanguage().language`.

**When to use:** Any client component that fetches content from `/api/content/*`, `/api/conservation`, or any content-related endpoint.

**Example:**
```typescript
'use client';

import { useLanguage } from '@shared/lib/hooks/useSafeTranslation';

function MyContentComponent() {
  const { language } = useLanguage();

  useEffect(() => {
    fetch(`/api/content?published=true&locale=${language}`)
      .then(r => r.json())
      .then(body => setContent(body?.data ?? body ?? []));
  }, [language]);
}
```

**Alternative (for components already using useTranslation):**
```typescript
const { i18n } = useTranslation('common');
// use i18n.language
```

### Pattern 2: Removing Redundant Client-Side Locale Resolution

**What:** Pages that previously did their own JSONB key extraction (`field[i18n.language] || field.en`) can now rely on the API returning flat strings. Remove local `getLocalizedContent()` helpers.

**Example (before — conservation/page.tsx):**
```typescript
const getLocalizedContent = (field: Record<string, string> | string | null | undefined): string => {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field[i18n.language] || field.en || '';
};
// usage: {getLocalizedContent(article.title) || article.title}
```

**Example (after):**
```typescript
// API now returns flat strings — use directly
// usage: {article.title}
```

### Pattern 3: Content API Request with x-locale Header (Server Components)

**What:** Server components can pass locale via the request header approach. The middleware already sets `x-locale` on incoming requests, and the `Content/[id]` GET handler reads it via `request.headers.get('x-locale')`.

**When to use:** Server components that need to fetch content before rendering (e.g., statically generated pages).

**Example:**
```typescript
// Server component — x-locale header already set by middleware
// /api/content/[id] reads it automatically
const response = await fetch(`/api/content/${id}`, {
  headers: { 'x-locale': locale },
});
```

### Anti-Patterns to Avoid

- **Hardcoded 'en' locale:** `fetch('/api/content?published=true')` without `&locale=` — always defaults to English. Use `i18n.language` from the runtime.
- **Client-side JSONB key extraction:** `content.title[i18n.language] || content.title.en` — API now returns flat strings; this pattern is redundant and fragile.
- **Using `useTranslation` when only language is needed:** `useTranslation` triggers namespace loading; use lighter `useLanguage()` hook for language-only operations.
- **Direct `fetch` in useEffect without locale dependency array:** Locale changes should trigger re-fetch; add `language` to dependency arrays.

## Content Display Audit — Frontend Pages Requiring Locale Param

### High Priority (public-facing content display)

| # | File | Current Fetch | Locale Passed? | Fix |
|---|------|--------------|----------------|-----|
| 1 | `src/app/news/page.tsx:51` | `/api/content?published=true` | ❌ No — always 'en' | Add `&locale=${i18n.language}` |
| 2 | `src/app/news/[id]/page.tsx:89` | `/api/content/${id}?published=true` | ❌ No | Add `&locale=${i18n.language}` |
| 3 | `src/page-modules/service/ui/ServicesPage.tsx:100` | `/api/content?category=SERVICES&published=true` | ❌ No | Add `&locale=${language}` |
| 4 | `src/app/resident/[id]/page.tsx:68` | `/api/content?authorId=${userId}&published=true` | ❌ No | Add `&locale=${i18n.language}` |
| 5 | `src/app/unit/[id]/page.tsx` | `@shared/api/data-fetching.ts` → `/api/content?authorId=` | ❌ No | Add `&locale=` param |

### Medium Priority (dashboard widgets, admin views)

| # | File | Current Fetch | Locale Passed? | Fix |
|---|------|--------------|----------------|-----|
| 6 | `src/widgets/dashboard/ui/UserContentWidget.tsx:44` | `/api/content?authorId=${session.user.id}` | ❌ No | Add `&locale=${language}` |
| 7 | `src/widgets/dashboard/ui/TagCloudWidget.tsx:33` | `/api/content?authorId=${authorId}` | ❌ No | Add `&locale=${language}` |
| 8 | `src/widgets/dashboard/ui/HomeLayer.tsx:53` | `resolveTitle()` with hardcoded `'en'` | ❌ Hardcoded 'en' | Pass actual locale to `getLocalizedValue(title, locale)` |
| 9 | `src/shared/lib/hooks/useAdminContent.ts:6` | `/api/content` | ❌ No | Add `locale` parameter support |
| 10 | `src/app/(tenant)/admin/content/page.tsx:51` | `/api/content` | ❌ No | Add `&locale=` param |

### Already Correct

| # | File | Pattern | Status |
|---|------|---------|--------|
| A | `src/app/conservation/page.tsx:12` | `/api/conservation?locale=${i18n.language}` | ✅ Correctly passes locale |
| B | `src/app/api/content/[id]/route.ts:84` | Reads `x-locale` header + query param | ✅ Server-side correct |
| C | `src/app/api/content/route.ts:76` | Reads `locale` query param → `resolveLocale()` | ✅ Server-side correct |

## Redundant Client-Side Locale Helpers to Remove

| # | File | Helper | Fix |
|---|------|--------|-----|
| 1 | `src/app/conservation/page.tsx:47-53` | `getLocalizedContent()` — does `field[i18n.language] \|\| field.en \|\| ''` | Remove helper; use `article.title` / `article.content` directly (API returns flat strings now) |
| 2 | `src/widgets/dashboard/ui/HomeLayer.tsx:51-54` | `resolveTitle()` — uses `getLocalizedValue(title, 'en')` with hardcoded `'en'` | Replace with locale-aware version; get locale from `useLanguage()` |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Client-side locale detection | Manual `navigator.language` parsing | `i18next.language` or `useLanguage().language` | Already configured with cookie → localStorage → navigator detection order; adding manual detection creates divergent behavior |
| Content JSONB extraction on client | `field[i18n.language] \|\| field.en` | Server-side `transformContentForLocale()` | Already implemented; client-side extraction is redundant and fragile |
| Passing locale via custom cookie/prop | New cookie-propagation mechanism | `i18n.language` from existing i18next runtime | i18next is the single source of truth for active locale; threading locale through custom channels creates desync risk |
| Building a `useLocaleContent` hook | Custom hook wrapping `fetch` with locale | Pass `language` to existing fetch calls | This phase is wiring-only; a new abstraction is unnecessary scope given the simple pattern required |

## Runtime State Inventory

> This is NOT a rename/refactor/migration phase. Skip — no runtime state affected.

## Common Pitfalls

### Pitfall 1: i18next Cookie Name Mismatch

**What goes wrong:** The middleware sets `i18n-locale` cookie but i18next's `i18next-browser-languagedetector` reads `i18next` cookie (configured at `lookupCookie: 'i18next'` in `src/shared/lib/i18n/index.ts:46`). These are different cookies. An API call that uses `x-locale` header and a UI element that uses `i18n.language` may read from different sources, creating a brief mismatch.

**Why it happens:** Two separate detection chains — middleware (cookie → accept-language → 'en' setting `x-locale` header) and i18next (querystring → cookie → localStorage → navigator → htmlTag).

**How to avoid:** For content display, always use `i18n.language` from i18next (not `x-locale` header) since that's the runtime the user's LanguageSwitcher controls. The API already handles `x-locale` header correctly for server-side. On the client side, pass `i18n.language` explicitly as `?locale=` param — this is the most reliable source on the client.

**Warning signs:** Content displayed in English even though user switched language — check console for which locale value is being passed.

### Pitfall 2: useEffect Missing Locale Dependency

**What goes wrong:** A `useEffect` fetches content on mount but doesn't include `language` in its dependency array. When the user switches languages via the LanguageSwitcher, the content doesn't re-fetch.

**Why it happens:** `useEffect(() => { fetchContent(); }, [])` — empty dependency array means the effect runs once on mount and never again.

**How to avoid:** Include `language` in the dependency array: `useEffect(() => { fetchContent(); }, [language])`. If the component uses `selectedCategory` or other filters, include those too: `[language, selectedCategory]`.

**Warning signs:** Content cards show old language after user switches locale via LanguageSwitcher.

### Pitfall 3: Breaking `_raw` Admin Editing

**What goes wrong:** The admin content edit page (`src/app/(tenant)/admin/content/[id]/page.tsx:56-66`) reads `content._raw.title` to rebuild the JSONB form data. If the API response drops `_raw`, the admin editor loses locale data.

**Why it happens:** `transformContentForLocale()` in the shared service (`src/entities/content/services/index.ts:145-149`) already includes `_raw`. But the inline version in `src/app/api/content/[id]/route.ts:33-74` also includes `_raw` (lines 68-72). Both are correct. However, a future change to the API response shape could accidentally drop `_raw`.

**How to avoid:** Do NOT modify the `transformContentForLocale` return shape in this phase. The `_raw` field is load-bearing for admin editing. Add a test to protect it.

**Warning signs:** Admin edit page shows "Untitled" instead of actual content after saving — check whether `_raw` is present in API response.

## Code Examples

### Adding locale to a content fetch (news/page.tsx)

```typescript
// Source: codebase research — verified pattern
import { useTranslation } from 'react-i18next';

export default function NewsPage() {
  const { i18n } = useTranslation(['common', 'news']);

  const fetchContent = async () => {
    try {
      const res = await fetch(
        `/api/content?published=true&locale=${i18n.language}${categoryParam}`
      );
      // ... rest unchanged
    }
  };
}
```

### Cleaning up redundant locale helper (conservation/page.tsx)

```typescript
// Source: codebase research — verified pattern
// BEFORE (lines 47-53 in current code):
const getLocalizedContent = (field) => {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field[i18n.language] || field.en || '';
};

// AFTER — API now returns flat strings:
// Remove getLocalizedContent entirely.
// Replace {getLocalizedContent(article.title) || article.title}
// with {article.title}
```

### Using `useLanguage()` for Content API calls

```typescript
// Source: codebase research — src/shared/lib/hooks/useSafeTranslation.ts:55-76
import { useLanguage } from '@shared/lib/hooks/useSafeTranslation';

function UserContentWidget() {
  const { language } = useLanguage();

  useEffect(() => {
    fetch(`/api/content?authorId=${userId}&locale=${language}`)
      .then(r => r.json())
      .then(body => setContent(body?.data ?? body ?? []));
  }, [userId, language]);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side JSONB key extraction (`title.en`, `title.af`) | Server-side `transformContentForLocale()` returns flat strings | BD `7qkl` (2026-06-30) | Client code simplified; no need to know JSONB shape |
| No locale on content API calls | `?locale=${lang}` added, API handles `resolveLocale()` | BD `7qkl` (2026-06-30) | Content displayed in user's language |
| `getLocalizedContent()` local helpers on pages | Direct string display from API | Phase 04 (this phase) | Removes redundant code; single source of truth |
| `HomeLayer.resolveTitle()` with hardcoded `'en'` | Locale-aware `resolveTitle()` using `i18n.language` | Phase 04 (this phase) | Announcement titles rendered in user's language |

**Deprecated/outdated:**
- Client-side `field[i18n.language] || field.en || ''` pattern — API now returns flat strings
- Local `getLocalizedContent()` helpers duplicating API logic
- Fetching content without `locale` param — defaults to English-only display

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The i18next runtime (`i18n.language`) is always in sync with the middleware-set `x-locale` header for client-side rendering | Common Pitfalls | LOW — both resolve from the same `i18n-locale` cookie set by middleware, but detection chains differ slightly (middleware: cookie → accept-language; i18next: querystring → cookie → localStorage → navigator → htmlTag). Any desync would be visible as content in wrong language. |
| A2 | All content pages use client components with `useTranslation` or `useLanguage` available | Content Display Audit | LOW — every audited page (`/news`, `/news/[id]`, `/conservation`, `/resident/[id]`, `ServicesPage`, `UserContentWidget`, `HomeLayer`) is a `'use client'` component with `useTranslation` or `Better Auth` session hook already imported |
| A3 | The `_raw` field in API responses is present in all content endpoints | Architecture Patterns | LOW — verified in both the entity service (`services/index.ts:145-149`) and the inline route handler (`route.ts:68-72`). Tests confirm presence at `entities/content/__tests__/groups.test.ts:321-348`. |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | — | — |
| pnpm | Package manager | ✓ | — | — |
| Next.js | Framework | ✓ | 14 (App Router) | — |
| react-i18next | Locale bindings | ✓ | 17.0.8 | — |
| i18next | Core i18n | ✓ | 25.10.10 | — |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:** none

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (already configured) |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONTENT-I18N-01 | Content cards render locale-resolved strings without client-side JSONB extraction | Integration / Smoke | `npx vitest run --reporter=verbose src/entities/content/__tests__/` | ✅ Existing tests cover `transformContentForLocale` + `resolveLocale` |
| CONTENT-I18N-02 | Fallback to `defaultLocale` when locale key missing | Unit | `npx vitest run src/shared/lib/i18n/__tests__/content-i18n.test.ts` | ✅ Existing — 17 tests covering `getLocalizedValue` and `getContentLocales` |
| CONTENT-I18N-03 | Non-/api/content endpoints return locale-resolved strings | Integration | `npx vitest run src/app/api/conservation/__tests__/conservation.test.ts` | ✅ Existing — `conservation.test.ts` tests locale transformation |

### Wave 0 Gaps

- [ ] `src/app/news/__tests__/` — No tests for news page locale-aware fetching (Wave 0 needed)
- [ ] `src/widgets/dashboard/ui/__tests__/HomeLayer-locale.test.tsx` — No test for `resolveTitle()` locale-aware behavior (Wave 0 needed)
- [ ] No test for `UserContentWidget` passing locale parameter — manual verification needed post-implementation

### Sampling Rate

- **Per task commit:** `npx vitest run src/shared/lib/i18n/__tests__/ --reporter=verbose` (< 1s)
- **Per wave merge:** `npx vitest run --reporter=verbose src/entities/content/__tests__/ src/shared/lib/i18n/__tests__/ src/app/api/conservation/__tests__/` (< 3s)
- **Phase gate:** `pnpm typecheck && npx vitest run` — all passing before `/gsd-verify-work`

## Security Domain

> Content display is read-only — no new auth surface, no new routes, no data mutation. Security domain is minimal for this phase.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | No | Not applicable — read-only display phase |
| V3 Session Management | No | Not applicable |
| V4 Access Control | No | Not applicable — API routes already enforce access control |
| V5 Input Validation | Yes | The `locale` query parameter is validated by `resolveLocale()` server-side (white-list against `supportedLanguages`); unsupported locales fall back to `defaultLanguage` ('en') |
| V6 Cryptography | No | Not applicable |

### Known Threat Patterns for Next.js + react-i18next

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Locale injection via query param | Tampering | `resolveLocale()` validates against `supportedLanguages` whitelist; invalid input → fallback to 'en' |
| XSS via locale-resolved content | Information Disclosure | Content is sanitized at render time (existing `sanitizeHtml` in `UserContentWidget`); `RichTextRenderer` renders only known TipTap node types |
| Information leakage via locale header | Information Disclosure | Middleware sets `x-locale` header on all requests — existing behavior, not introduced by this phase |

## Sources

### Primary (HIGH confidence — verified in codebase)

- `prisma/schema.prisma:695-728` — Content model with `title Json`, `content Json`, `excerpt Json?`, `defaultLocale String @default("en")`
- `src/entities/content/services/index.ts` — `resolveLocale()`, `transformContentForLocale()`, `listContent()`, `createContent()`
- `src/entities/content/__tests__/groups.test.ts:202-349` — 349-line test file covering `resolveLocale` (8 tests) and `transformContentForLocale` (4 tests)
- `src/shared/lib/i18n/config.ts` — `getLocalizedValue()`, `getLocalizedContent()`, `supportedLanguages`, `defaultLanguage`
- `src/shared/lib/i18n/__tests__/content-i18n.test.ts` — 17 tests covering locale resolution edge cases
- `src/shared/lib/hooks/useSafeTranslation.ts` — `useSafeTranslation()`, `useLanguage()` hooks
- `src/middleware.ts:124-144` — `detectLocale()` — cookie → accept-language → 'en'
- `src/app/api/content/route.ts:66-94` — GET handler applies `transformContentForLocale()`
- `src/app/api/content/[id]/route.ts:33-174` — inline `transformContentForLocale()` for single-item GET with `_raw` preservation
- `src/app/api/conservation/route.ts` — `transformContentForLocale()` applied, reads `x-locale` header
- `src/server/routers/content.ts:209-315` — tRPC `listContent` and `getContent` with locale transformation
- `src/app/(tenant)/layout.tsx` — `I18nextProvider` wrapping tenant routes
- `src/shared/lib/i18n/index.ts` — i18next initialization with 4 languages, 17 namespaces

### Secondary (MEDIUM confidence — web/cited)

- [CITED: npmjs.com/package/react-i18next] — react-i18next 17.0.8 API documentation
- [CITED: npmjs.com/package/i18next] — i18next 25.10.10 configuration reference
- [CITED: npmjs.com/package/i18next-browser-languagedetector] — detection order and cookie configuration

### Tertiary (LOW confidence — assumed)

- None — all findings verified against the codebase.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all existing packages verified against `package.json` and npm registry
- Architecture: HIGH — verified through 20+ file reads across the codebase
- Content display audit: HIGH — every page fetching content was traced from `fetch()` call to API handler
- Pitfalls: MEDIUM — identified from code review; actual runtime behavior may reveal additional edge cases

**Research date:** 2026-07-01
**Valid until:** 2026-08-01 (30 days — stable i18n infrastructure, no breaking changes expected in react-i18next or i18next within this window)
