---
phase: 105-dispute-schema-entity-layer
plan: 02
subsystem: dispute
tags: [dispute, entity, FSD, typescript, drizzle, tailwind, badge, lifecycle, state-machine]

# Dependency graph
requires:
  - phase: 105-01
    provides: Prisma schema (6 models, 5 enums), Drizzle generated schemas, migration applied
provides:
  - TypeScript DTOs for DisputeCase, DisputeEvent, DisputeMessage, DisputeEvidence, DisputeNotification
  - Label maps (STATUS_LABELS, CATEGORY_LABELS, SEVERITY_LABELS, RESPONDENT_LABELS, EVENT_TYPE_LABELS)
  - Lifecycle state machine with VALID_TRANSITIONS + canTransition + isTerminalStatus
  - Reference number generator (DSP-YYYY-NNNN pattern)
  - 3 UI badge components (DisputeStatusBadge, DisputeCategoryBadge, SeverityIndicator)
  - Client-safe barrel (index.ts) and server-only barrel (index.server.ts)
  - 6 Drizzle dispute tables wired into db.ts schema and @api/server barrel exports
affects:
  - phase-106-dispute-api (API routes will import DTOs from @entities/dispute)
  - phase-107-dispute-intake (Intake wizard uses UI badges + lifecycle)
  - phase-108-dispute-csos (CSOS export uses reference generator)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - FSD entity layer with client/server barrel split (index.ts / index.server.ts)
    - DTO pattern: ISO string dates (not Date objects) for portable API contracts
    - String literal union types mirroring Prisma enum values
    - Pure function lifecycle state machine (no server deps)
    - Vitest TDD with RED/GREEN commit pairs
    - Tailwind inline badge components with color-coded status groups

key-files:
  created:
    - src/entities/dispute/model/types.ts — DisputeCaseDTO + 4 sub-entity DTOs, 5 enum unions
    - src/entities/dispute/model/constants.ts — 5 label maps + 3 const arrays
    - src/entities/dispute/model/lifecycle.ts — VALID_TRANSITIONS + canTransition + isTerminalStatus
    - src/entities/dispute/api/reference.ts — generateDisputeReference (server-only)
    - src/entities/dispute/index.ts — Client-safe barrel
    - src/entities/dispute/index.server.ts — Server-only barrel
    - src/entities/dispute/ui/DisputeStatusBadge.tsx — 11-status color-coded badge
    - src/entities/dispute/ui/DisputeCategoryBadge.tsx — 11-category border badge
    - src/entities/dispute/ui/SeverityIndicator.tsx — 4-segment severity bar
    - src/entities/dispute/model/__tests__/entity.test.ts — 22 tests for entity layer
    - src/entities/dispute/ui/__tests__/badges.test.tsx — 13 tests for UI components
  modified:
    - src/shared/api/db.ts — 6 dispute table imports + dbSchema entries + re-exports
    - src/shared/api/server/index.ts — 6 dispute table re-exports

key-decisions:
  - 'DTO dates use ISO strings, not Date objects — follows Phase 35 API alignment pattern for portable API contracts'
  - 'Used disputeEvidences (plural) instead of disputeEvidence (singular) to match Drizzle generator export name'
  - 'Lifecycle state machine uses pure functions (no server deps) — client-safe, importable anywhere'
  - 'Steiger typo-in-layer-name for api/ segment is pre-existing (also affects tenant entity) — not a new violation'
  - "generateDisputeReference marked server-only with import 'server-only' — never leaks to client bundle per T-105-07"

patterns-established:
  - "Dispute entity follows FSD barrel split: index.ts (client-safe) vs index.server.ts (server-only with import 'server-only')"
  - 'TDD RED/GREEN pairs for each implementation task — 2 RED commits, 2 GREEN commits, 1 auto task commit'
  - 'Tailwind badge color map pattern: Record<Enum, string> with class name templates'

requirements-completed:
  - DISPUTE-02

# Metrics
duration: 16min
completed: 2026-06-26
---

# Phase 105 Plan 02: Dispute Entity Layer Summary

**Dispute entity layer with 5 DTOs, 8 label maps, lifecycle state machine, reference generator, 3 UI badges, and 6 Drizzle table barrel wirings — 35 passing tests, zero dispute-related type errors**

## Performance

- **Duration:** 16 min
- **Started:** 2026-06-26T06:51:18Z
- **Completed:** 2026-06-26T07:07:48Z
- **Tasks:** 3
- **Files modified:** 13 (11 created, 2 modified)

## Accomplishments

- Created `src/entities/dispute/` entity layer with FSD-compliant client/server barrel split
- 5 TypeScript DTOs (DisputeCaseDTO, DisputeEventDTO, DisputeMessageDTO, DisputeEvidenceDTO, DisputeNotificationDTO) with ISO string dates
- 5 string literal union types mirroring Prisma enums
- 8 label maps (STATUS_LABELS 11 entries, CATEGORY_LABELS 11, SEVERITY_LABELS 4, RESPONDENT_LABELS 4, EVENT_TYPE_LABELS 15, plus 3 const arrays)
- Lifecycle state machine with VALID_TRANSITIONS covering all 11 statuses, canTransition() and isTerminalStatus()
- Reference number generator producing DSP-YYYY-NNNN pattern with per-tenant per-year sequencing
- 3 UI badge components: DisputeStatusBadge (color-coded by status group), DisputeCategoryBadge (neutral border), SeverityIndicator (4-segment intensity bar)
- 6 Drizzle tables wired into shared db.ts schema object and @api/server barrel exports

## Task Commits

1. **Task 1 (TDD RED):** `29f5038a` — test(105-02): add failing tests for dispute entity layer
2. **Task 1 (TDD GREEN):** `c4121c79` — feat(105-02): implement dispute entity layer — types, constants, lifecycle, reference generator
3. **Task 2 (TDD RED):** `5fc4cd15` — test(105-02): add failing tests for dispute UI badge components
4. **Task 2 (TDD GREEN):** `f3bfb78b` — feat(105-02): implement dispute UI badge components
5. **Task 3 (auto):** `c5266c87` — feat(105-02): wire Drizzle dispute tables into db.ts and @api/server barrel

## Files Created/Modified

- `src/entities/dispute/model/types.ts` — 5 enum unions + 5 DTO interfaces
- `src/entities/dispute/model/constants.ts` — 5 Record label maps + 3 const arrays (as const)
- `src/entities/dispute/model/lifecycle.ts` — VALID_TRANSITIONS, canTransition(), isTerminalStatus()
- `src/entities/dispute/api/reference.ts` — generateDisputeReference() with import 'server-only'
- `src/entities/dispute/index.ts` — Client-safe barrel (types, constants, lifecycle, UI components)
- `src/entities/dispute/index.server.ts` — Server-only barrel (generateDisputeReference)
- `src/entities/dispute/ui/DisputeStatusBadge.tsx` — 11-status color-coded badge
- `src/entities/dispute/ui/DisputeCategoryBadge.tsx` — 11-category border badge
- `src/entities/dispute/ui/SeverityIndicator.tsx` — 4-segment severity bar
- `src/entities/dispute/model/__tests__/entity.test.ts` — 22 tests
- `src/entities/dispute/ui/__tests__/badges.test.tsx` — 13 tests
- `src/shared/api/db.ts` — 6 imports + 6 dbSchema entries + 6 export entries
- `src/shared/api/server/index.ts` — 6 re-exports

## Decisions Made

- **DTO dates use ISO strings** — follows Phase 35 API alignment pattern for portable API contracts that work across network boundaries
- **disputeEvidences (plural)** — used the actual Drizzle generator export name instead of plan's singular `disputeEvidence`. The plan referenced the wrong export name; the correct Drizzle table is `disputeEvidences` per `src/db/schema/dispute-evidences.ts`
- **Lifecycle is pure functions** — no server dependencies, client-safe, importable anywhere. Auth enforcement belongs in Phase 106 API routes (T-105-06)
- **Steiger typo-in-layer-name** — the `api/` segment warning is pre-existing (also in tenant entity). Not a new violation introduced by this plan
- **generateDisputeReference** — marked with `import 'server-only'`, never exported from client barrel. Satisfies T-105-07 threat mitigation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Drizzle export name: disputeEvidence → disputeEvidences**

- **Found during:** Task 1 (Creating reference.ts)
- **Issue:** Plan specified `import { disputeEvidence } from '@schema/dispute-evidence'` but Drizzle generator exports `disputeEvidences` (plural) from `@schema/dispute-evidences`
- **Fix:** Used correct export name `disputeEvidences` and import path `@schema/dispute-evidences` throughout all 3 insertion points in db.ts and server/index.ts
- **Files modified:** src/shared/api/db.ts, src/shared/api/server/index.ts
- **Verification:** `grep "export const" src/db/schema/dispute-evidences.ts` confirms `disputeEvidences`; typecheck passes with zero dispute errors
- **Committed in:** `c4121c79` (entity layer), `c5266c87` (barrel wiring)

---

**Total deviations:** 1 auto-fixed (bug: incorrect Drizzle export name)
**Impact on plan:** Minimal — export name mismatch would have blocked compilation. Fix uses the actual generated export name. No scope creep.

## Issues Encountered

- Build failure is pre-existing (`src/entities/dwallet/api/index.ts` webpack error) — not caused by dispute changes. Zero dispute-related build errors.
- Steiger `typo-in-layer-name` for `api/` segment is pre-existing in tenant entity — not a new violation.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Entity layer ready for Phase 106 (Dispute API routes) — all DTOs, constants, and lifecycle accessible via `@entities/dispute`
- Server-side imports fully wired: `import { disputeCases, generateDisputeReference } from '@entities/dispute/server'`
- UI components ready for Phase 107 (Dispute Intake Wizard) — color-coded badges for forms and dashboards
- All 35 tests pass, zero dispute-related type errors in full project typecheck

---

## Self-Check: PASSED

- All 9 key source files exist on disk
- All 5 commits verified in git log
- Plan verification: DisputeStatusBadge in index.ts=1, generateDisputeReference in index.server.ts=1, disputeCases in db.ts=3, disputeCases in server/index.ts=1, server-only in reference.ts=1, server-only in index.server.ts=1
- Zero dispute-related TypeScript errors in full project typecheck
- 35 passing tests across 2 test files

---

_Phase: 105-dispute-schema-entity-layer_
_Completed: 2026-06-26_
