---
phase: 104-ai-provider-infrastructure-translate-migration
plan: 02
subsystem: infra
tags: [ai-pool, anthropic, openai, quota-enforcement, provider-factory]

# Dependency graph
requires:
  - phase: 104-01
    provides: 4 AI pool DB models, getTenantModule, AiCapabilityKey type
provides:
  - Quota enforcement module (pool.ts) with checkQuota/recordUsage/getOrCreateUsage
  - AiProvider interface + pool-backed factory
  - 3 provider implementations (NullProvider, AnthropicProvider, OpenAiProvider)
  - Public barrel at src/shared/api/ai/index.ts
  - Server barrel re-exports at src/shared/api/server/index.ts
affects: [104-03, 104-04, 105-dispute-schema, 106-dispute-api, 107-dispute-ui]

# Tech tracking
tech-stack:
  added:
    - '@anthropic-ai/sdk@0.106.0'
    - 'openai@6.45.0'
  patterns:
    - 'Platform pool architecture: all AI calls pass through checkQuota() → getAiProvider() → provider.complete() → recordUsage()'
    - 'NullProvider graceful degradation: returns empty, never throws when ai-provider disabled or no keys'
    - 'Pool factory pattern: getAiProvider() reads tenant module + platform env vars, constructs provider'
    - 'import server-only guard on all 6 AI module files'

key-files:
  created:
    - src/shared/api/ai/pool.ts
    - src/shared/api/ai/provider.ts
    - src/shared/api/ai/anthropic.ts
    - src/shared/api/ai/openai.ts
    - src/shared/api/ai/null-provider.ts
    - src/shared/api/ai/index.ts
  modified:
    - src/shared/api/server/index.ts
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - 'Platform pool only — no tenant key storage or encryption (per ADVISORY-017-SUPPLEMENTAL-2 G5)'
  - 'Default provider: anthropic (when both keys are present) — overridable via PLATFORM_AI_DEFAULT_PROVIDER'
  - 'Canonical model IDs: claude-haiku-4-5-20241022 (Anthropic), gpt-4o-mini (OpenAI), deepseek-chat (DeepSeek via OpenAI SDK)'
  - 'Overage policy: HARD_STOP blocks at quota; THROTTLE/SURCHARGE allow through (post-call enforcement)'
  - '80% quota notification: fire-once per month via before/after threshold check, wrapped in try/catch to never block usage recording'

patterns-established:
  - 'checkQuota + recordUsage pattern: pre-flight check → provider call → post-call recording (always, even on failure)'
  - 'getOrCreateUsage idempotent by (tenantId, billingMonth) — safe to call multiple times per request'
  - 'getPoolProviderConfig reads from process.env only, never tenant settings or DB'

requirements-completed:
  - AI-PROV-01
  - AI-PROV-02

# Metrics
duration: 8min
completed: 2026-06-25
---

# Phase 104 Plan 02: AI Provider Abstraction Layer Summary

**Quota enforcement module (pool.ts), 3 provider implementations, pool-backed factory, and barrel exports — the single choke point for all platform AI calls per ADVISORY-017-SUPPLEMENTAL-2 §5**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-25T11:48:12Z
- **Completed:** 2026-06-25T11:56:44Z
- **Tasks:** 2 (1 checkpoint gate, 2 implementation)
- **Files modified:** 9 (6 new, 3 modified)

## Accomplishments

- `pool.ts` quota enforcement module with `checkQuota()`, `recordUsage()`, `getOrCreateUsage()`, `getCurrentBillingMonth()`, and `getTierQuota()` — the single choke point for all AI calls
- `AiProvider` interface with `complete()` and `isAvailable()` methods + `AiCompletionOptions`/`AiCompletionResult` types
- 3 provider implementations: `NullProvider` (graceful degradation), `AnthropicProvider` (claude-haiku-4-5-20241022), `OpenAiProvider` (gpt-4o-mini + DeepSeek via baseURL)
- Pool-backed `getAiProvider(tenantId)` factory — reads tenant module status + platform env keys, returns appropriate provider
- `getPoolProviderConfig()` reads `PLATFORM_ANTHROPIC_KEY`/`PLATFORM_OPENAI_KEY`/`PLATFORM_AI_DEFAULT_PROVIDER` from env
- Public barrel `src/shared/api/ai/index.ts` and server barrel re-exports from `@api/server`
- `@anthropic-ai/sdk@0.106.0` and `openai@6.45.0` installed as dependencies

## Task Commits

Each task was committed atomically:

1. **Task 2: Install SDKs and create pool.ts quota enforcement module** - `99086fa9` (feat)
2. **Task 3: Create provider implementations + pool-backed factory + barrels** - `28b4d9a2` (feat)

**Auth gate cleared:** Task 1 (package legitimacy checkpoint) — human-approved before SDK installation.

## Files Created/Modified

- `src/shared/api/ai/pool.ts` — Quota enforcement: checkQuota, recordUsage, getOrCreateUsage, getCurrentBillingMonth, getTierQuota, getCapabilityCost + 80% quota warning notifications
- `src/shared/api/ai/provider.ts` — AiProvider interface + AiCompletionOptions/Result types + pool-backed getAiProvider factory + getPoolProviderConfig
- `src/shared/api/ai/anthropic.ts` — AnthropicProvider using @anthropic-ai/sdk (claude-haiku-4-5-20241022)
- `src/shared/api/ai/openai.ts` — OpenAiProvider using openai SDK (gpt-4o-mini, also serves DeepSeek via baseURL)
- `src/shared/api/ai/null-provider.ts` — NullProvider — always returns empty, never throws
- `src/shared/api/ai/index.ts` — Public barrel: all pool + provider exports + entity-layer type re-exports
- `src/shared/api/server/index.ts` — Added AI module re-exports (getAiProvider, isAiCapabilityEnabled, checkQuota, recordUsage + types)
- `package.json` — Added @anthropic-ai/sdk and openai dependencies
- `pnpm-lock.yaml` — Updated lockfile

## Decisions Made

- Platform pool only — no tenant key storage, encryption, or Setting table reads (per G5 resolution)
- `getOrCreateUsage()` snapshots tier quota on first call of month; mid-month tier changes apply next billing period
- `recordUsage()` always runs post-call (success or failure) to prevent retry-spam quota abuse
- 80% notification queries ADMIN + BOARD role users, wrapped in try/catch to never block usage recording
- `import 'server-only'` on all 6 AI module files — env var reads and DB access must never leak to client bundles

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added server-only to barrel index.ts**

- **Found during:** Task 3 (verification)
- **Issue:** Plan verification expected `import 'server-only'` in all 6 files but index.ts (re-export barrel) was missing it
- **Fix:** Added `import 'server-only'` at top of `src/shared/api/ai/index.ts`
- **Files modified:** `src/shared/api/ai/index.ts`
- **Committed in:** `28b4d9a2` (part of Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minimal — single line addition for consistency. No scope creep.

## Issues Encountered

None.

## Authentication Gates

**Task 1 — SDK package legitimacy checkpoint:** User verified `@anthropic-ai/sdk` and `openai` as legitimate official packages before installation. Approved and proceeded.

## Known Stubs

None — all functions are fully implemented. `AnthropicProvider` does not implement JSON mode (`jsonMode` option is handled at the callsite level, not the provider level, per ponytail annotation).

## Threat Flags

None — threat model items T-104-04 through T-104-SC are all mitigated as specified in the plan.

## Next Phase Readiness

- `checkQuota()`, `recordUsage()`, and `getAiProvider()` are callable by downstream plans (104-03 admin routes, 104-04 translate migration)
- 3 provider implementations ready for integration testing against live API keys
- Barrel exports available from both `@shared/api/ai` and `@api/server`
- AI-PROV-01 and AI-PROV-02 requirements satisfied

---

_Phase: 104-ai-provider-infrastructure-translate-migration_
_Completed: 2026-06-25_
