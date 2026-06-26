---
phase: 106-dispute-api-routes-intake-screen
plan: 03
subsystem: api
tags:
  [disputes, ai, intake-screen, csos-export, pool-lifecycle, rate-limiting, pii-sanitization, popia]

# Dependency graph
requires:
  - phase: 104-ai-provider-infrastructure-translate-migration
    provides: AI pool (checkQuota, getAiProvider, recordUsage, isAiCapabilityEnabled)
  - phase: 105-dispute-schema-entity-layer
    provides: Dispute schemas, PII sanitizer, entity barrel
provides:
  - AI frivolity screening endpoint (POST /api/disputes/intake-screen)
  - CSOS Form 2 JSON export endpoint (GET /api/disputes/[id]/csos-export)
  - Canonical AI output parser with safe defaults (parseIntakeScreenOutput)
  - IntakeScreenRequest/IntakeScreenOutput types in @entities/dispute/server barrel
affects: [dispute-intake-ui, csos-submission]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'AI pool lifecycle: checkQuota → getAiProvider → sanitize → provider.complete → recordUsage → parse → apiSuccess'
    - 'Graceful degradation: 503 on AI unavailable, safe defaults on malformed JSON, 429 on quota exhaustion'
    - 'CSOS export: 6-section JSON event log with rateLimitByKey (3/case/day) and audit logging via NOTE_ADDED DisputeEvent'
    - 'TDD route handler testing with vi.hoisted() mock state and thenable Drizzle mock pattern'

key-files:
  created:
    - src/app/api/disputes/intake-screen/route.ts — POST AI frivolity screening with full pool lifecycle
    - src/app/api/disputes/[id]/csos-export/route.ts — GET CSOS Form 2 JSON export with rate limiting
    - src/shared/lib/dispute/intake-screen-output.ts — Canonical AI output parser with Zod validation and safe defaults
    - src/app/api/disputes/__tests__/intake-screen.test.ts — 10 test scenarios for intake screen
    - src/app/api/disputes/__tests__/csos-export.test.ts — 5 test scenarios for CSOS export
  modified:
    - src/entities/dispute/index.server.ts — Added IntakeScreenRequest/IntakeScreenOutput type exports

key-decisions:
  - 'Follow translate/route.ts pool lifecycle pattern exactly — 10-step sequence: auth, rate limit, validate, tenant, capability, quota, provider, sanitize, AI call, recordUsage, parse, return'
  - 'recordUsage() called always — even on AI failure — with success/errorCode to prevent retry-spam bypass'
  - 'AI response advisory-only, never persisted — exists only in HTTP response body'
  - 'CSOS export returns JSON (not PDF) — Phase 108 wraps in formatted PDF'
  - "Complainant anonymity preserved: masked as 'Complainant' when isConfidential && !mediationAcceptedAt"

requirements-completed:
  - DISPUTE-05

# Metrics
duration: 11min
completed: 2026-06-26
---

# Phase 106 Plan 03: Intake Screen & CSOS Export Summary

**AI frivolity screening with full 10-step pool lifecycle, PII sanitization, and graceful degradation; CSOS Form 2 JSON export with 6-section structure, rate limiting (3/case/day), and audit logging as NOTE_ADDED DisputeEvent**

## Performance

- **Duration:** 11 min
- **Started:** 2026-06-26T10:32:29Z
- **Completed:** 2026-06-26T10:44:05Z
- **Tasks:** 2 (both TDD with RED → GREEN cycles)
- **Files modified:** 6

## Accomplishments

- POST /api/disputes/intake-screen with full AI pool lifecycle (checkQuota → getAiProvider → sanitizeDescriptionForAi → provider.complete → recordUsage → parseIntakeScreenOutput → apiSuccess)
- Graceful degradation at every failure point: 401 (no auth), 400 (validation), 429 (rate limit or quota), 503 (AI unavailable), safe defaults on malformed JSON
- PII sanitization via sanitizeDescriptionForAi() called before every provider.complete() call — single choke point for POPIA compliance
- recordUsage() called always — even on AI failure — with success/errorCode/durationMs/tokensUsed to prevent retry-spam bypass
- GET /api/disputes/[id]/csos-export returning structured JSON with 6 sections: parties, summary, resolutionHistory, evidence, ruling, certification
- Rate limited to 3 exports per case per day via rateLimitByKey; each export logged as NOTE_ADDED DisputeEvent
- Complainant anonymity: masked as "Complainant" when isConfidential && !mediationAcceptedAt
- 15 vitest tests passing (10 intake screen + 5 CSOS export)

## Task Commits

Each TDD task committed in RED → GREEN cycles:

1. **Task 1 RED:** `6b822113` (test) — 10 failing test scenarios for intake screen route
2. **Task 1 GREEN:** `0192b5a6` (feat) — Full intake screen route + parser library
3. **Task 2 RED:** `5771b1df` (test) — 5 failing test scenarios for CSOS export route
4. **Task 2 GREEN:** `b4818ced` (feat) — Full CSOS export route with rate limiting

## Files Created/Modified

- `src/app/api/disputes/intake-screen/route.ts` — POST handler with 10-step pool lifecycle, INTAKE_SYSTEM_PROMPT constant, estimateInputTokens/clamp/mapProviderToModel helpers
- `src/shared/lib/dispute/intake-screen-output.ts` — Canonical parser re-exporting intakeScreenOutputSchema + IntakeScreenOutput type; parseIntakeScreenOutput() wraps JSON.parse + Zod validation in try/catch with safe defaults
- `src/app/api/disputes/[id]/csos-export/route.ts` — GET handler wrapped with withErrorHandler; inline getSessionAndRole; 6-section response; rateLimitByKey (86,400s window, 3 max); NOTE_ADDED audit event
- `src/app/api/disputes/__tests__/intake-screen.test.ts` — 10 tests covering auth, validation, rate limiting, capability/quotas/provider, PII sanitization ordering, recordUsage on failure, success shape, malformed JSON defaults
- `src/app/api/disputes/__tests__/csos-export.test.ts` — 5 tests covering auth, access control (403 for non-owner), 6-section response shape, rate limit exhaustion (429), audit event logging
- `src/entities/dispute/index.server.ts` — Added IntakeScreenRequest and IntakeScreenOutput type exports (were missing from barrel)

## Decisions Made

- Followed translate/route.ts pool lifecycle pattern exactly — 10-step sequence provides consistent AI integration across the platform
- Used @entities/dispute/server barrel imports instead of deep imports (FSD compliance)
- Added missing type exports to @entities/dispute/server barrel (IntakeScreenRequest, IntakeScreenOutput) — minor gap closure from Phase 105
- CSOS export complainant name masking follows Gate G3: revealed only after mediation acceptance

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed FSD deep import violations**

- **Found during:** Task 1 GREEN commit (ESLint pre-commit hook)
- **Issue:** Route handler imported from `@entities/dispute/lib/pii-sanitizer` and `@entities/dispute/model/schemas` — restricted by FSD no-restricted-imports rules
- **Fix:** Changed imports to `@entities/dispute/server` barrel which already exported sanitizeDescriptionForAi and intakeScreenRequestSchema
- **Files modified:** `src/app/api/disputes/intake-screen/route.ts`, `src/shared/lib/dispute/intake-screen-output.ts`
- **Committed in:** 0192b5a6 (Task 1 GREEN)

**2. [Rule 3 - Blocking] Added missing type exports to dispute server barrel**

- **Found during:** Task 1 GREEN implementation
- **Issue:** `intake-screen-output.ts` needed to re-export `IntakeScreenOutput` type, but `@entities/dispute/server` only exported the schema, not the inferred type
- **Fix:** Added `type IntakeScreenRequest` and `type IntakeScreenOutput` to the barrel's re-export from `./model/schemas`
- **Files modified:** `src/entities/dispute/index.server.ts`
- **Committed in:** 5771b1df (Task 2 RED)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both deviations necessary for FSD compliance and type safety. No scope creep.

## Issues Encountered

- Pre-commit ESLint hook flagged deep FSD imports — resolved by switching to @entities/dispute/server barrel
- Test mock for Drizzle thenable pattern required iteration — evidence query needed `.where()` to return a thenable with `.limit()`/`.orderBy()` methods
- `now()` export missing from initial test mock — added to resolve vitest "No export defined" error

## User Setup Required

**External AI provider keys required.** See [106-USER-SETUP.md](./106-USER-SETUP.md) for:

- `PLATFORM_ANTHROPIC_KEY` — Anthropic Console → API Keys
- `PLATFORM_OPENAI_KEY` — OpenAI Platform → API Keys
- Both set in Vercel environment variables

## Next Phase Readiness

- Intake screen and CSOS export routes ready for integration testing
- Phase 106-04 (verification/UAT) can proceed — all 15 tests pass, all mitigations from threat model implemented
- Dispute intake UI (future phase) can consume POST /api/disputes/intake-screen for advisory frivolity screening

---

_Phase: 106-dispute-api-routes-intake-screen_
_Completed: 2026-06-26_
