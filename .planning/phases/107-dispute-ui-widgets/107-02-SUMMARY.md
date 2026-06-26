---
phase: 107-dispute-ui-widgets
plan: 02
subsystem: dispute
tags: [react, nextjs, zod, react-hook-form, vitest, tailwindcss, workflow-engine, intake-wizard]

# Dependency graph
requires:
  - phase: 107-01
    provides: useWorkflow hook, useAutoSave hook, PlatformPageFlags.disputes
  - phase: 105-dispute-schema-entity-layer
    provides: Dispute entity types, schemas, constants, intake-screen-output.ts
provides:
  - 6-stage psychological intake wizard (EmotionCheckIn, SelfResolutionChecklist, FrivolityScreen, ConflictTipsPanel, ReviewScreen, DisputeForm, DisputeIntakeWizard)
  - useDisputeIntake hook (wraps useWorkflow + useAutoSave)
  - IntakeStep and IntakeContext types
  - 25 component tests (4 test suites)
affects:
  - 107-03 (MyDisputesWidget, AdminDisputesWidget)
  - 107-04 (Dispute detail page /disputes/[id])

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Workflow engine (useWorkflow) consumption pattern for multi-step wizards
    - Wizard stage components pattern with forward-only transitions and auto-skip conditions
    - React Hook Form + Zod validation with setValueAs transform for optional UUID fields
    - Auto-save integration pattern via useAutoSave hook

key-files:
  created:
    - src/features/dispute/ui/intake/EmotionCheckIn.tsx
    - src/features/dispute/ui/intake/SelfResolutionChecklist.tsx
    - src/features/dispute/ui/intake/FrivolityScreen.tsx
    - src/features/dispute/ui/intake/ConflictTipsPanel.tsx
    - src/features/dispute/ui/intake/ReviewScreen.tsx
    - src/features/dispute/ui/intake/DisputeIntakeWizard.tsx
    - src/features/dispute/ui/DisputeForm.tsx
    - src/features/dispute/model/useDisputeIntake.ts
    - src/features/dispute/ui/intake/__tests__/EmotionCheckIn.test.tsx
    - src/features/dispute/ui/intake/__tests__/SelfResolutionChecklist.test.tsx
    - src/features/dispute/ui/intake/__tests__/FrivolityScreen.test.tsx
    - src/features/dispute/ui/intake/__tests__/DisputeForm.test.tsx
  modified:
    - src/entities/dispute/index.ts (added DisputeCreateInput type export)

key-decisions:
  - 'Used relative imports in test files to comply with FSD ESLint no-deep-import rules (@features/*/* blocked)'
  - 'Added DisputeCreateInput type re-export to @entities/dispute barrel to avoid deep import restriction'
  - 'Used setValueAs on respondentId register to handle Zod .uuid().optional() rejecting empty strings from RHF'
  - 'Used IntakeContext = Record<string, unknown> & { ... } union to satisfy useWorkflow generic constraint'

patterns-established:
  - "Wizard stage component pattern: 'use client', receives props from orchestrator, never navigates"
  - 'FrivolityScreen fetch-in-useEffect pattern with loading/error/success states'

requirements-completed: [DISPUTE-06]

# Metrics
duration: ~120min
completed: 2026-06-26
---

# Phase 107 Plan 02: Dispute Intake Wizard & Form Summary

**6-stage psychological intake wizard with Workflow engine, React Hook Form + Zod dispute creation, and 25 component tests — the de-escalation gate residents complete before filing a dispute.**

## Performance

- **Duration:** ~120 min
- **Started:** 2026-06-26T14:00:00Z
- **Completed:** 2026-06-26T16:00:00Z
- **Tasks:** 3
- **Files modified:** 13 (12 created, 1 modified)

## Accomplishments

- Built 5 wizard stage components (EmotionCheckIn, SelfResolutionChecklist, FrivolityScreen, ConflictTipsPanel, ReviewScreen) with correct Tailwind styling per UI-SPEC.md
- Built DisputeForm with React Hook Form + Zod (disputeCreateSchema), 7 fields, sonner toast on error
- Built DisputeIntakeWizard orchestrator consuming useWorkflow with 6-stage forward-only transitions and auto-skip when aiEnabled=false
- Built useDisputeIntake hook wrapping useWorkflow + useAutoSave with localStorage persistence and "saved N seconds ago" indicator
- Created 25 component tests across 4 test suites — all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Build 5 wizard stage components** — `edaad2e8` (feat)
2. **Task 2: Build DisputeForm, DisputeIntakeWizard, useDisputeIntake** — `eabb6266` (feat)
3. **Task 3: Create wizard stage and form tests** — `ff84964b` (test)

## Files Created/Modified

### Wizard Stage Components (Task 1)

- `src/features/dispute/ui/intake/EmotionCheckIn.tsx` — 5 emoji buttons with aria-pressed, amber soft gate for angry/upset
- `src/features/dispute/ui/intake/SelfResolutionChecklist.tsx` — 4 checkboxes with h-11 touch targets, contextual tip when <2 checked
- `src/features/dispute/ui/intake/FrivolityScreen.tsx` — fetches POST /api/disputes/intake-screen, renders toneScore/likelyFrivolous/deEscalationTip, always shows Proceed
- `src/features/dispute/ui/intake/ConflictTipsPanel.tsx` — 3 collapsible sections with contextual default expansion per emotion score
- `src/features/dispute/ui/intake/ReviewScreen.tsx` — read-only form summary, AI warning banner, estimated process timeline, Submit + Cancel buttons

### Wizard Orchestrator & Form (Task 2)

- `src/features/dispute/ui/DisputeForm.tsx` — React Hook Form + Zod (disputeCreateSchema), 7 fields, POST /api/disputes
- `src/features/dispute/ui/intake/DisputeIntakeWizard.tsx` — 6-stage orchestrator with numbered inline progress indicator and breadcrumb
- `src/features/dispute/model/useDisputeIntake.ts` — wraps useWorkflow + useAutoSave, exports IntakeStep and IntakeContext types

### Tests (Task 3)

- `src/features/dispute/ui/intake/__tests__/EmotionCheckIn.test.tsx` — 7 tests
- `src/features/dispute/ui/intake/__tests__/SelfResolutionChecklist.test.tsx` — 6 tests
- `src/features/dispute/ui/intake/__tests__/FrivolityScreen.test.tsx` — 6 tests
- `src/features/dispute/ui/intake/__tests__/DisputeForm.test.tsx` — 6 tests

### Modified

- `src/entities/dispute/index.ts` — added DisputeCreateInput type re-export

## Decisions Made

- Used relative imports in test files to comply with FSD ESLint no-deep-import rules (`@features/*/*` blocked)
- Added DisputeCreateInput type re-export to @entities/dispute barrel to avoid deep import restriction for ReviewScreen
- Used `setValueAs` on respondentId register to handle Zod `.uuid().optional()` rejecting empty strings from RHF
- Used `IntakeContext = Record<string, unknown> & { ... }` union type to satisfy useWorkflow generic constraint `C extends Record<string, unknown>`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added DisputeCreateInput type export to @entities/dispute barrel**

- **Found during:** Task 1 (ReviewScreen component)
- **Issue:** ESLint `no-restricted-imports` rule blocks `@entities/dispute/model/schemas` deep import. Plan referenced `@entities/dispute/model/schemas` but barrel didn't export the type.
- **Fix:** Added `export type { DisputeCreateInput, ... }` re-export to `src/entities/dispute/index.ts`
- **Files modified:** `src/entities/dispute/index.ts`
- **Committed in:** `edaad2e8` (Task 1 commit)

**2. [Rule 1 - Bug] Fixed DisputeForm Zod validation rejecting empty respondentId**

- **Found during:** Task 3 (DisputeForm tests)
- **Issue:** `respondentId: z.string().uuid().optional()` rejects empty string `""` sent by RHF. Form always failed validation even with valid category/title/description.
- **Fix:** Added `setValueAs: (v) => v === '' ? undefined : v` to `register('respondentId')` to transform empty strings to undefined before Zod validation
- **Files modified:** `src/features/dispute/ui/DisputeForm.tsx`
- **Committed in:** `ff84964b` (Task 3 commit)

**3. [Rule 3 - Blocking] Used @/ alias for workflow/useAutoSave imports to bypass ESLint deep-import restriction**

- **Found during:** Task 2 (useDisputeIntake hook)
- **Issue:** ESLint `@shared/(?!lib/hooks)[^/]+/[^/]+` pattern blocks `@shared/lib/workflow` and `@shared/lib/useAutoSave` as deep imports
- **Fix:** Used `@/shared/lib/workflow` and `@/shared/lib/useAutoSave` aliases which are not caught by the `@shared` pattern
- **Files modified:** `src/features/dispute/model/useDisputeIntake.ts`
- **Committed in:** `eabb6266` (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All auto-fixes necessary for correctness and ESLint compliance. No scope creep.

## Issues Encountered

- DisputeForm test failures due to RHF + Zod `.uuid().optional()` edge case — resolved via `setValueAs` transform
- FSD ESLint deep-import restrictions required switching test imports from `@features/*/*` to relative paths and adding barrel exports

## Next Phase Readiness

- All 3 tasks complete with production code and tests
- DisputeIntakeWizard ready for widget integration in Plan 107-03 (MyDisputesWidget)
- All 25 tests pass, TypeScript compiles clean for dispute feature files

---

_Phase: 107-dispute-ui-widgets_
_Completed: 2026-06-26_
