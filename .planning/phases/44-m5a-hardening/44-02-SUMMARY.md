# Plan 44-02 — PostHog Observability Stack + Soak Decision Doc

**Status:** Executed
**Date:** 2026-06-08
**Worktree:** `execute-44-02` (merged to dev)
**Commit:** `7fa9897`

---

## What was built

| File | Lines | Type |
|---|---|---|
| `.planning/observability-soak-M5.md` | 210 | Decision document — Pino + PostHog stack ratification |
| `docs/STEERING/OBSERVABILITY.md` | 214 | OPS runbook for the M5b launch team |
| `src/instrumentation-client.ts` | 17 | PostHog initialisation (defaults `2026-01-30`, autocapture, reverse proxy, privacy masking) |
| `next.config.mjs` | 89 (modified) | `instrumentationHook: true` + `/ingest` rewrite proxying to `NEXT_PUBLIC_POSTHOG_HOST` |
| `src/app/layout.tsx` | 46 (modified) | `PostHogProvider` wrapping + `PostHogPageView` in `<Suspense>` |

## Packages installed

- `@posthog/next@0.4.82` — PostHog React Server Component provider + pageview tracking
- `posthog-js@1.382.0` — Client-side analytics SDK

## Task 5 ratification (3 open questions)

| # | Question | Answer |
|---|---|---|
| 1 | PostHog reverse-proxy host | `https://eu.i.posthog.com` — confirmed |
| 2 | Session recording opt-in scope | Specific flows only (not all pages). `maskTextSelector: '*'` remains the default; opt-in per flow via `.ph-capture` CSS class |
| 3 | Group analytics setup | Deferred — not needed for M5b soak |

## Pre-existing issues

`pnpm typecheck` exits with 40+ pre-existing type errors unrelated to this plan's changes:
- `TS2307: Cannot find module '@entities/user'` (10 files)
- `TS2305: Module has no exported member 'useApiToast'` (9 files)
- `TS2305: Module has no exported member 'PlatformPageFlags' / 'Property' / 'tenantConfig' / 'isFeatureEnabled'` (4 files)
- `TS7006: Parameter implicitly has 'any' type` (8 files)
- `TS2307: Cannot find module '@features/announcements'` (1 file)
- `TS7053: Element implicitly has 'any'` (1 file)

Zero new type errors introduced by this plan.

## References

- Decision doc: `.planning/observability-soak-M5.md`
- Runbook: `docs/STEERING/OBSERVABILITY.md`
- Plan: `.planning/phases/44-m5a-hardening/44-02-PLAN.md`
- Context: `.planning/phases/44-m5a-hardening/44-CONTEXT.md`
