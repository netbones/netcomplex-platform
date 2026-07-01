# Phase 04: Content I18n - Context

**Gathered:** 2026-07-01
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers **frontend content locale responsiveness** — ensuring all content-displaying routes and pages respect the user's active locale setting. No new UI components, pages, or visual elements are created. The scope is exclusively wiring: adding `&locale=${i18n.language}` parameters to content-fetching calls and removing redundant client-side locale resolution helpers that duplicate what the API already handles.

**In scope:**

- Wire existing content-fetching pages/widgets to pass locale parameter to API calls
- Remove redundant client-side `getLocalizedContent()` / `resolveTitle()` helpers
- Verify content renders correctly across all supported locales
- All routes and pages comply with existing UI patterns — no visual design changes

**Out of scope:**

- New UI components, pages, or visual elements
- Schema changes (already delivered in Phases 42/45)
- Middleware/locale detection (already delivered in BD `7qkl`)
- API locale transformation (already delivered — `transformContentForLocale()`)
- Static UI string i18n (already handled via react-i18next + `public/locales/`)

</domain>

<decisions>
## Implementation Decisions

### Pattern Compliance

- All route pages use existing patterns — no new component patterns, no new page layouts
- Locale parameter follows existing `URLSearchParams` construction patterns in the codebase
- Locale source: `useTranslation().i18n.language` (react-i18next) or the middleware `x-locale` header

### Wiring Approach

- Add `&locale=${i18n.language}` to all content `fetch()` / API calls in client components
- Remove dead code: `getLocalizedContent()` in conservation page, `resolveTitle()` in HomeLayer
- No new packages — react-i18next, i18next, and all supporting libraries already installed and configured

### Locale Resolution

- API already resolves locale server-side via `resolveLocale()` with `'en'` fallback
- Frontend must pass the user's active locale to receive resolved content
- No client-side locale resolution — that's the API's job

### the agent's Discretion

- Exact implementation pattern per page (whether to modify a hook vs inline fetch)
- Test strategy details (integration vs unit tests for locale propagation)
- Whether to batch related pages into a single plan or separate plans

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Artifacts

- `.planning/phases/04-content-i18n/04-RESEARCH.md` — Full audit of 10 content-fetching sites, API analysis, dead-code identification
- `.planning/phases/04-content-i18n/04-UI-SPEC.md` — Design system contract (wiring-only, no new surfaces)
- `.planning/phases/04-content-i18n/04-01-PLAN.md` — Existing plan (updated 2026-06-30 with current scope)

### Requirements

- `.planning/REQUIREMENTS.md` — CONTENT-I18N-01, CONTENT-I18N-02, CONTENT-I18N-03

### Project Standards

- `AGENTS.md` — React best practices, component conventions, FSD architecture

</canonical_refs>

<specifics>
## Specific Ideas

### Nine Content-Fetching Sites Affected (from RESEARCH.md)

1. `/news/page.tsx` — News listing
2. `/news/[id]/page.tsx` — News article detail
3. `ServicesPage.tsx` — Services listing
4. `/resident/[id]/page.tsx` — Resident profile
   5-9. Dashboard widgets and admin views

**Excluded:** `/unit/[id]/page.tsx` fetches `/api/households/${id}` (not `/api/content`) — out of scope for content-i18n phase.

### Redundant Helpers to Remove

- `getLocalizedContent()` in conservation page (does `field[i18n.language] || field.en`)
- `resolveTitle()` in HomeLayer (hardcoded to `'en'`)

### Implementation Pattern

```typescript
// Before
fetch('/api/content?...');
// After
fetch(`/api/content?...&locale=${i18n.language}`);
```

</specifics>

<deferred>
## Deferred Ideas

- Static UI string i18n audit — navigation labels, button text, form labels (already handled via react-i18next)
- Cookie name unification (middleware sets `i18n-locale`, i18next reads `i18next`) — architectural decision outside Phase 04 scope
- Cross-browser locale persistence testing
- RTL language support (Arabic, Hebrew) — not in current locale set

</deferred>

---

_Phase: 04-content-i18n_
_Context gathered: 2026-07-01_
