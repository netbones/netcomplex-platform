---
phase: 104-ai-provider-infrastructure-translate-migration
plan: 04
subsystem: infra
tags: [ai-pool, translate, i18n, degraded-state, env-vars]

# Dependency graph
requires:
  - phase: 104-02
    provides: pool.ts (checkQuota, recordUsage), getAiProvider, getPoolProviderConfig
  - phase: 104-03
    provides: admin routes, widget registration
provides:
  - Translate route migrated from raw fetch to AiProvider abstraction with quota enforcement
  - LocaleAwareEditor degraded state for when AI translation is unavailable
  - Platform AI pool environment variables documented in .env.example
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Complete AI callsite pattern: capability check → quota check → getAiProvider → provider.complete() → recordUsage (always)'
    - 'estimateInputTokens() with 20% buffer for monthly quota tracking (R17)'
    - 'Degraded state: catch 503/429 → set translationUnavailable → show amber warning (no pre-flight check, ponytail)'

key-files:
  created: []
  modified:
    - src/app/api/translate/route.ts (refactored — 159 lines)
    - src/features/i18n/ui/LocaleAwareEditor.tsx (241 lines, +20)
    - .env.example (+22 lines)

key-decisions:
  - 'Translate route now uses platform pool keys (PLATFORM_ANTHROPIC_KEY / PLATFORM_OPENAI_KEY) instead of per-tenant settings'
  - 'Overage policy: HARD_STOP — quota exhausted returns 429, capability disabled returns 503'
  - 'LocaleAwareEditor uses reactive degraded state (no pre-flight capability check) — ponytail MVP pattern'
  - 'referenceId omitted from translate route recordUsage (no document reference for translation calls)'

patterns-established:
  - '5-step AI route pattern: withTenant → isAiCapabilityEnabled → checkQuota → getAiProvider → complete() → recordUsage'
  - 'Post-call recordUsage always runs (success or failure) per SUPPLEMENTAL-2 §5 anti-retry-spam policy'

requirements-completed:
  - AI-PROV-03

# Metrics
duration: 7min
completed: 2026-06-25
---

# Phase 104 Plan 04: Translate Route Migration & Degraded State Summary

**Translate route refactored from raw `fetch()` to the AI provider abstraction with quota enforcement and usage recording, LocaleAwareEditor updated with "translation unavailable" degraded state, and platform AI pool environment variables documented**

## Performance

- **Duration:** 7 min
- **Started:** 2026-06-25T12:10:07Z
- **Completed:** 2026-06-25T12:17:21Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Migrated translate route from raw `fetch()` to OpenAI to the 5-step AI provider pattern: capability check → quota check → getAiProvider → provider.complete() → recordUsage()
- Added `isAiCapabilityEnabled('ai.content.translation')` gate returning 503 when AI module is disabled for the community
- Added `checkQuota()` pre-flight with HARD_STOP policy returning 429 when monthly quota is exhausted
- Added `recordUsage()` post-call recording that always runs (success or failure) to prevent retry-spam quota abuse
- Removed all `SETTINGS_KEYS.TRANSLATION_API_KEY` / `TRANSLATION_PROVIDER` reads — keys are now platform-level env vars
- Added `estimateInputTokens()` helper with 20% buffer per R17
- LocaleAwareEditor now shows amber "Translation unavailable" warning when API returns 503 or 429
- Footer shows contextual message about quota exhaustion when translation becomes unavailable
- Documented 4 new platform AI environment variables in `.env.example`

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor translate/route.ts to use getAiProvider + quota enforcement + usage recording** - `007806f6` (feat)
2. **Task 2: Update LocaleAwareEditor with AI-unavailable degraded state** - `c1ad66f8` (feat)
3. **Task 3: Document environment variables and run quality gates** - `8a12d330` (chore)

## Files Created/Modified

- `src/app/api/translate/route.ts` — Refactored from 143 to 159 lines. Replaced raw `fetch()` to OpenAI with 5-step AI provider pattern. Added capability check, quota enforcement, usage recording. Removed drizzle-orm `eq` import and SETTINGS_KEYS reads. Added `estimateInputTokens()` helper.
- `src/features/i18n/ui/LocaleAwareEditor.tsx` — 228→241 lines (+20). Added `translationUnavailable` state, 503/429 detection in catch block, amber warning text near translate dropdown, contextual footer message.
- `.env.example` — +22 lines. Added Platform AI Pool section with PLATFORM_ANTHROPIC_KEY, PLATFORM_OPENAI_KEY, PLATFORM_AI_DEFAULT_PROVIDER, CRON_SECRET. Documented AI_SETTINGS_ENCRYPTION_KEY as removed per SUPPLEMENTAL-2 §1.

## Decisions Made

- Translate route now uses platform pool keys instead of per-tenant `Setting` table reads — follows the G5 resolution (platform pool only)
- Overage policy is HARD_STOP — quota exhausted returns 429, capability disabled returns 503
- `estimateInputTokens()` uses `text.length * 0.27 * 1.2` with 20% buffer — rough but sufficient for monthly quota tracking
- LocaleAwareEditor uses reactive degraded state — shows warning after first failure, no pre-flight capability check (ponytail MVP pattern)
- `referenceId` omitted from translate route's `recordUsage()` call (no document reference for translation calls)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `referenceId: null` type error in recordUsage call**

- **Found during:** Task 1 (write)
- **Issue:** Plan specified `referenceId: null` but `PoolCallOptions.referenceId` is typed as `string | undefined`, not `string | null`
- **Fix:** Omitted `referenceId` field entirely (defaults to `undefined`). Added comment documenting why.
- **Files modified:** `src/app/api/translate/route.ts`
- **Committed in:** `007806f6` (part of Task 1 commit)

**2. [Rule 1 - Bug] Fixed `const res` scoping in LocaleAwareEditor catch block**

- **Found during:** Task 2 (implementation)
- **Issue:** Plan assumed `const res` declared inside `try` block would be accessible in `catch` block — JavaScript `const` is block-scoped
- **Fix:** Moved `res` declaration to `let res: Response | undefined` before the `try` block with null guard (`res && ...`) in catch
- **Files modified:** `src/features/i18n/ui/LocaleAwareEditor.tsx`
- **Committed in:** `c1ad66f8` (part of Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both auto-fixes necessary for TypeScript compilation. No scope creep.

## Issues Encountered

None.

## Known Stubs

None — all functions are fully implemented. `estimateInputTokens()` is a rough approximation (not exact token counting) but this is by design per R17.

## Threat Flags

None — threat model items T-104-14 through T-104-17 are all mitigated as specified:

- T-104-14 (DoS — no per-user rate limiting): `accept` disposition — quota is per-tenant per-month. Individual user DoS would exhaust tenant quota quickly.
- T-104-15 (Info Disclosure — .env.example documents keys): `accept` disposition — template only, actual keys in Vercel encrypted env vars.
- T-104-16 (Repudiation — no opt-out for failures): `mitigate` disposition — recordUsage always called (success + errorCode for audit).
- T-104-17 (Info Disclosure — error messages): `accept` disposition — error messages are generic, no API keys or internal details in client responses.

## Next Phase Readiness

- Translate route is the first real consumer of the AI provider abstraction — validates the 5-step pattern works end-to-end
- LocaleAwareEditor handles AI-unavailable state gracefully — ready for production
- Platform env vars documented — ready for Vercel encrypted env var configuration
- Phase 104 is now complete: 4 plans shipped, all downstream phases (105–107 dispute system) can consume the AI provider layer
- AI-PROV-01 (schema + entity), AI-PROV-02 (providers + pool), AI-PROV-03 (translate migration) all satisfied

---

_Phase: 104-ai-provider-infrastructure-translate-migration_
_Completed: 2026-06-25_
