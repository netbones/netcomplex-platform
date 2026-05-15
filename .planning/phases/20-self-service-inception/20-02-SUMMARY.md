---
phase: 20-self-service-inception
plan: 02
type: execute
wave: 2
depends_on: ['20-01']
subsystem: onboarding
tags:
  - onboarding
  - wizard
  - self-service
  - tenant-setup
requires:
  - '20-01: Self-service signup with Better Auth password hashing'
provides:
  - '5-step onboarding wizard at /platform/onboarding/[tenantId]'
  - 'Onboarding state management hook'
  - 'API for persisting onboarding step data'
affects:
  - 'Tenant settings (branding, modules, pages stored as settings)'
  - 'User journey after signup → onboarding → admin panel'
tech-stack:
  added: []
  patterns:
    - 'Step-based wizard with centralized state hook'
    - 'API route for persisting partial progress'
    - 'Reusable OnboardingStep wrapper component'
key-files:
  created:
    - 'src/app/(platform)/onboarding/layout.tsx'
    - 'src/app/(platform)/onboarding/[tenantId]/page.tsx'
    - 'src/app/api/platform/onboarding/route.ts'
    - 'src/features/onboarding/model/useOnboarding.ts'
    - 'src/features/onboarding/ui/OnboardingWizard.tsx'
    - 'src/features/onboarding/ui/OnboardingStep.tsx'
    - 'src/features/onboarding/ui/steps/BrandingStep.tsx'
    - 'src/features/onboarding/ui/steps/ModulesStep.tsx'
    - 'src/features/onboarding/ui/steps/PagesStep.tsx'
    - 'src/features/onboarding/ui/steps/InviteStep.tsx'
    - 'src/features/onboarding/ui/steps/LaunchStep.tsx'
  modified: []
decisions:
  - 'Onboarding state managed via useOnboarding hook (not context) for simpler API'
  - 'Step data persisted to tenant settings table with keys like onboarding_step_1'
  - 'ModulesStep shows foundation-tier modules with premium upsell callout'
  - 'PagesStep uses sensible defaults (News, Directory, Events, Campaign ON; Chat OFF)'
  - "InviteStep collects emails/roles but doesn't send invites yet (future work)"
  - 'LaunchStep provides links to admin panel and public site'
metrics:
  duration: ~15min
  completed: '2026-05-15'
---

# Phase 20 Plan 02: Onboarding Wizard Summary

**One-liner:** 5-step onboarding wizard (Branding → Modules → Pages → Invite Team → Launch) with centralized state management, API persistence, and redirect to admin panel on completion.

## Tasks Completed

| Task | Name                                         | Commit  | Files           |
| ---- | -------------------------------------------- | ------- | --------------- |
| 1    | Create onboarding wizard shell and API route | 49fcca6 | 6 files created |
| 2    | Build all 5 onboarding step components       | 49fcca6 | 5 files created |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Functionality] Added full OnboardingFormData type**

- **Found during:** Task 2
- **Issue:** Step components expected specific props but OnboardingFormData type wasn't fully defined
- **Fix:** Created comprehensive OnboardingFormData interface with branding, modules, pages, invites fields
- **Files modified:** src/features/onboarding/model/useOnboarding.ts
- **Commit:** 49fcca6

**2. [Rule 3 - Blocking] Fixed ModulesStep tier constants import**

- **Found during:** Task 2
- **Issue:** ModulesStep referenced MODULES and hasModuleAccess from @shared/lib/constants/tiers which needed proper typing
- **Fix:** Added ModuleKey type import and proper type guards for tier access
- **Files modified:** src/features/onboarding/ui/steps/ModulesStep.tsx
- **Commit:** 49fcca6

## Verification

- `npx tsc --noEmit --project tsconfig.json` — No errors
- All 5 step components render with correct content
- Wizard navigation (Back, Next, Skip) works as expected
- API route accepts POST with tenantId, step, and data
- LaunchStep provides links to admin panel and public site

## Auth Gates

None encountered.

## Next Steps

- Plan 20-03: AssistSession model + API (planned, not started)
- Future: Wire InviteStep to actual invitation sending API
- Future: Add onboarding progress restoration on wizard re-entry
