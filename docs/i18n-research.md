# i18n Implementation Research

## Problem

We need internationalization (i18n) for Soralia Village to support English, Afrikaans, Xhosa, and Zulu. Current implementation is incomplete - only the Header/Footer translate, not page content.

## Approaches Tested

### Approach 1: HTTP Backend (i18next-http-backend)

Load translation JSON files from `/public/locales/` via HTTP.

**Pros:**

- Standard i18next approach
- Easy to add new languages (just add JSON files)
- No code changes needed to add translations

**Cons:**

- ❌ Failed with "namespace not yet loaded" - files loaded async after components rendered
- Requires proper Suspense handling or await loading
- More complex to get right in Next.js App Router

**Files:**

```
public/locales/
├── en/common.json, forms.json, messages.json
├── af/common.json, forms.json, messages.json
├── xh/common.json, forms.json, messages.json
└── zu/common.json, forms.json, messages.json
```

### Approach 2: Inline Resources

Hardcode translations directly in `src/lib/i18n.ts`.

**Pros:**

- ✅ Works immediately - no async loading issues
- Simple to implement

**Cons:**

- ❌ Not scalable - translations mixed with code
- Hard to maintain for large amounts of text
- Must rebuild to add/update translations

**Current state:** Only Header/Footer translate; page content still hardcoded.

---

## Approaches to Research

### A. Route-Based i18n (Recommended in Tutorial)

Move all pages under `/app/[lng]/` route with dynamic imports:

```
app/
├── [lng]/
│   ├── page.tsx          # Homepage
│   ├── directory/
│   │   └── page.tsx
│   └── locales/
│       ├── en/common.json
│       └── af/common.json
```

**How it works:**

1. `i18n/settings.ts` - define supported languages
2. `i18n/index.ts` - create instance with `resourcesToBackend`
3. `useTranslation(lng, ns)` hook - returns `t()` function
4. Language switcher navigates to `/en/...` or `/af/...`

**Resources:**

- Tutorial: https://medium.com/@givvemeee/a-way-to-support-i18n-with-your-next-js-project-a5fce4e22806

### B. Fixed HTTP Backend with Proper Suspense

Fix the async loading by:

1. Using `useSuspense: true` in i18n config
2. Wrapping app in `<Suspense>` that waits for i18n
3. Only rendering translated content after ready

### C. i18next with Static Generation

Pre-render all pages for each language:

- `/en/page` → English
- `/af/page` → Afrikaans

**Pros:** Better SEO, no client-side loading

**Cons:** More complex routing, more build time

---

## Recommendation

**Approach A (Route-Based)** seems best because:

- Native Next.js pattern
- Works well with App Router
- JSON files properly loaded via dynamic imports
- Easy to maintain - translations separate from code

## Next Steps

1. Research route-based implementation
2. Decide on final approach
3. Implement full page translations
4. Add language switcher persistence
