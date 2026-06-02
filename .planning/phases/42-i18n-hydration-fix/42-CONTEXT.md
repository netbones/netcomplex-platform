# Phase 42: i18n Hydration Fix — Context

## Problem

Tenant pages (`/app/(tenant)/`) have no `I18nextProvider` in their layout tree. The root `providers.tsx` only does a side-effect import (`import '@shared/lib/i18n'`), which initializes i18n at module scope but does NOT wrap children in React context. Only `src/app/[lng]/platform/layout.tsx` uses `<I18nextProvider>`.

Because translations load asynchronously via `i18next-http-backend`, `t()` returns raw keys on the server render but translated text on the client after JSON fetches complete — causing React hydration mismatches wherever `t()` output is rendered without guards.

## Current Mitigations (Fragmented)

| Pattern                          | Files Using It                | Problem                                                |
| -------------------------------- | ----------------------------- | ------------------------------------------------------ |
| `usePageLoading` hook            | ~20 page-level components     | Full-page loading skeleton — overkill for simple pages |
| `tx(key, fallback)` local helper | 1 file (services domain page) | Not reusable, defined inline                           |
| `if (!ready) return null`        | 4 marketing components        | Causes layout shift                                    |
| `mounted` + `ready` guards       | ~5 shared UI components       | Ad-hoc, inconsistent                                   |
| Dead `useTranslation` hook       | 0 files (dead code)           | Already provides `isReady` but nobody uses it          |

## Unguarded Files (Hydration Risk)

**HIGH RISK — pages rendering `t()` in Breadcrumbs:**

- `src/app/(tenant)/dashboard/messages/[domain]/page.tsx`
- `src/app/(tenant)/dashboard/admin/[domain]/page.tsx`

**MEDIUM RISK — shared UI:**

- `src/shared/ui/Bookshelf.tsx`
- `src/shared/ui/TagCloud.tsx`
- `src/features/i18n/ui/LocaleSelector.tsx`
- `src/features/service/ui/CreateListingForm.tsx`
- `src/entities/directory/ui/UnifiedResidentCard.tsx`

**LOWER RISK — 37 widget files** (rendered inside guarded pages via `usePageLoading`, but themselves unprotected)

## Architecture Decision

Full fix approach — two layers:

### Layer 1: I18nextProvider in Tenant Layout

Add `<I18nextProvider i18n={i18n}>` to `src/app/(tenant)/layout.tsx` — mirrors the pattern already working in `src/app/[lng]/platform/layout.tsx`.

### Layer 2: Reusable `useSafeTranslation` Hook

Revive the dead hook at `src/features/i18n/model/useTranslation.ts` — add `tx(key, fallback, options?)` method, add `mounted` state, make it a drop-in replacement for `useTranslation()` from react-i18next. Then migrate high-risk files.

## Key Files

- `src/app/(tenant)/layout.tsx` — needs I18nextProvider (currently just Toaster + Suspense)
- `src/app/providers.tsx` — side-effect import only, no I18nextProvider
- `src/features/i18n/model/useTranslation.ts` — dead hook, to be revived
- `src/shared/lib/hooks/usePageLoading.tsx` — existing guard hook (will use useSafeTranslation internally)
- `src/shared/lib/i18n.ts` — i18n init with HttpBackend
- `src/shared/lib/i18n-config.ts` — 15 namespaces, 4 languages

## Constraints

- Must remain backward-compatible — existing `useTranslation()` calls from react-i18next keep working
- `useSafeTranslation` is opt-in — migrate files incrementally
- Widget batch migration is a follow-up (lower risk, not blocking)
- No `suppressHydrationWarning` — it's a band-aid, not a fix
