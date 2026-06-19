---
phase: 45
plan: 03
type: execute
subsystem: merits-ui
tags: [admin-ui, widgets, standing-badge, page-modules]
depends_on: [45-02]
provides: [merits-admin-pages, standing-badge-component]
tech_stack:
  added: [page-modules/admin/merits, StandingBadge component]
  patterns: [FSD entity slice, page-module thin wrapper, widget registry, FSD boundary compliance]
key_files:
  created:
    - src/app/(tenant)/admin/merits/page.tsx
    - src/app/(tenant)/admin/merits/new/page.tsx
    - src/app/(tenant)/admin/merits/[userId]/page.tsx
    - src/page-modules/admin/merits/ui/MeritsListPage.tsx
    - src/page-modules/admin/merits/ui/MeritEntryForm.tsx
    - src/page-modules/admin/merits/ui/UserStandingCard.tsx
    - src/page-modules/admin/merits/ui/DisputeResolveDialog.tsx
    - src/page-modules/admin/merits/ui/MeritEscalationWidget.tsx
    - src/page-modules/admin/merits/ui/PendingDisputesWidget.tsx
    - src/page-modules/admin/merits/index.ts
    - src/entities/merit/ui/StandingBadge.tsx
    - src/widgets/admin/ui/MeritEscalationWidget.tsx
    - src/widgets/admin/ui/PendingDisputesWidget.tsx
  modified:
    - src/page-modules/admin/index.ts
    - src/entities/directory/ui/UnifiedResidentCard.tsx
    - src/entities/directory/model/types.ts
    - src/app/resident/[id]/page.tsx
    - src/entities/merit/index.ts
    - src/entities/tenant/lib/navigation-config.ts
    - src/widgets/dashboard/model/spaces.ts
    - src/widgets/dashboard/model/widgets.ts
    - src/widgets/admin/index.ts
decisions:
  - StandingBadge uses public/private context: negative tiers hidden from public directory
  - Bronze tier renamed "Community Member" for public display
  - FSD public API boundary enforced: imports use @entities/merit and @pages/admin
duration: ~20 min
completed: 2026-06-19T09:05:00Z
---

# Phase 45 Plan 03: Merits Admin UI Summary

**One-liner:** Built admin CRUD pages at /admin/merits with data table, entry form, standing card, dispute resolution, and context-aware StandingBadge integrated into directory and profiles.

## What Was Implemented

### Task 1: Page-Modules + Thin Route Pages

- **MeritsListPage** (`src/page-modules/admin/merits/ui/MeritsListPage.tsx`): Data table with behaviorType badges (green MERIT, yellow WARNING, red INFRACTION), category pills, recognition/disciplinary score columns, status icons (ACTIVE/DISPUTED/UPHELD/OVERTURNED), escalation summary row (counts of review-flagged and suspension-recommended residents)
- **MeritEntryForm** (`src/page-modules/admin/merits/ui/MeritEntryForm.tsx`): User ID input, behaviorType dropdown with point preview (+5 Recognition / 2/10 Penalty Points), category selector (9 options), reason (3-500 chars), description (optional, 1000 chars)
- **UserStandingCard** (`src/page-modules/admin/merits/ui/UserStandingCard.tsx`): Standing tier badge, recognition/disciplinary score breakdown, infraction count with escalation status (REVIEW_FLAG at 3+, SUSPENSION_RECOMMENDATION at 5+), entry history table
- **DisputeResolveDialog** (`src/page-modules/admin/merits/ui/DisputeResolveDialog.tsx`): Modal showing resident name, behavior type, dispute reason, UPHOLD (#4F46E5) / OVERTURN (#DC2626) buttons with destructive confirmation text
- Three thin route pages: `/admin/merits`, `/admin/merits/new`, `/admin/merits/[userId]`

### Task 2: StandingBadge + Directory Integration

- **StandingBadge** (`src/entities/merit/ui/StandingBadge.tsx`): Context-aware tier badge with lucide-react icons (ShieldCheck/Shield/Users/AlertTriangle)
  - PUBLIC context: Gold/Silver/Community Member shown; Watchlist/Probation return null (hidden)
  - ADMIN context: All 5 tiers shown
  - Size variants: sm (12px label, 14px icon), md (14px label, 16px icon)
- **UnifiedResidentCard integration**: Added `standing?: number | null` to `Resident` type, renders badge after resident name in card header
- **Profile page integration**: Added `standing?: number | null` to `ResidentUser` interface, renders badge below user name

### Task 3: Admin Navigation Registration

- Added `/admin/merits` entry to `ADMIN_ITEMS` in `navigation-config.ts` (icon: shield, permission: users)
- Added `'merits'` to `ADMIN_DOMAINS` and `'admin-merits'` to `ADMIN_DOMAIN_WIDGET_MAP` in `spaces.ts`
- Registered 2 widgets in widget registry: `admin-merits` (MeritEscalationWidget), `admin-pending-disputes` (PendingDisputesWidget)
- Added widget re-exports to `@widgets/admin` barrel and `@pages/admin` barrel

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - FSD] Fixed deep import boundary violations**

- **Found during:** ESLint pre-commit hook
- **Issue:** `@entities/merit/ui/StandingBadge` and `@pages/admin/merits/ui/*` are deep imports violating FSD boundaries
- **Fix:** Exported `StandingBadge` from `@entities/merit` public barrel; used `@pages/admin` public API for widget re-exports
- **Files modified:** `entities/merit/index.ts`, `UnifiedResidentCard.tsx`, profile page, widget wrappers

**2. [Rule 1 - Bug] Removed unused type definition**

- **Issue:** `StandingTierUIConfig` interface defined but unused in StandingBadge.tsx
- **Fix:** Removed the interface
- **Files modified:** `src/entities/merit/ui/StandingBadge.tsx`

## Commits

| Hash     | Description                                                     |
| -------- | --------------------------------------------------------------- |
| 462e1a30 | feat(45-03): build merits admin UI — pages, widgets, navigation |

## Self-Check: PASSED

- MeritsListPage exists: ✅
- MeritEntryForm with behaviorCategory: ✅
- UserStandingCard with recognitionPoints: ✅
- DisputeResolveDialog with OVERTURN: ✅
- StandingBadge publicLabel null for Watchlist/Probation: ✅
- StandingBadge "Community Member" for Bronze: ✅
- StandingBadge in UnifiedResidentCard: ✅
- StandingBadge in profile page: ✅
- /admin/merits in ADMIN_ITEMS: ✅
- 'merits' in ADMIN_DOMAINS: ✅
- TypeScript compilation: ✅
