# 46-01 Summary — Provider Dashboard Space, Analytics & Verification

## Status

Plan 46-01 is **substantially complete** in this worktree.

Implemented in this slice:

- provider-scoped API surface for dashboard, analytics, verification, and credit score
- shared server helper for provider access resolution and verification/credit snapshots
- dedicated `/dashboard/providers` page with a provider-specific layer
- provider widget set (overview, analytics, listings, inquiries, credit progress)
- widget registry + dashboard exports + default layouts for the new provider space
- permission model extension for `providers`
- focused dashboard-space tests updated for the new route/space

## Key changes

### APIs

Added:

- `src/app/api/providers/analytics/route.ts`
- `src/app/api/providers/analytics/credit-score/route.ts`
- `src/app/api/providers/dashboard/route.ts`
- `src/app/api/providers/verification/route.ts`
- `src/shared/api/provider-platform.ts`

Behavior:

- provider access is granted to `ADMIN`/`BOARD` via the new `providers` permission
- resident provider access is resolved via either:
  - matching `ServiceProvider.email` to the signed-in user email, or
  - existing `CommunityServiceListing.providerId = session.user.id`
- analytics are tenant-scoped and listing-owner-scoped
- verification state is returned as a normalized display status (`UNVERIFIED` / `PROBATION` / `VERIFIED` / `SUSPENDED`)
- dashboard route returns provider profile, listing summary, inquiry counts, verification state, and credit progress
- verification route supports admin/board PATCH updates

### UI

Added:

- `src/app/(tenant)/dashboard/providers/page.tsx`
- `src/widgets/dashboard/ui/ProvidersLayer.tsx`
- `src/widgets/dashboard/ui/provider-widgets/provider-queries.ts`
- `src/widgets/dashboard/ui/provider-widgets/provider-ui.tsx`
- `src/widgets/dashboard/ui/provider-widgets/ProviderOverviewWidget.tsx`
- `src/widgets/dashboard/ui/provider-widgets/ProviderAnalyticsWidget.tsx`
- `src/widgets/dashboard/ui/provider-widgets/ProviderListingsWidget.tsx`
- `src/widgets/dashboard/ui/provider-widgets/ProviderInquiriesWidget.tsx`
- `src/widgets/dashboard/ui/provider-widgets/ProviderCreditProgressWidget.tsx`
- `src/widgets/dashboard/ui/provider-widgets/index.ts`

Behavior:

- provider dashboard renders a dedicated provider-facing surface instead of falling back to the generic space layout
- verification status is visually prominent
- no-provider-record state is handled gracefully with a registration/linking prompt
- analytics and credit progress reflect verification visibility level

### Dashboard model / permissions / defaults

Updated:

- `src/shared/lib/permissions.ts`
- `src/shared/api/db.ts`
- `src/shared/api/index.ts`
- `src/shared/api/server/index.ts`
- `src/db/index.ts`
- `src/widgets/dashboard/index.ts`
- `src/widgets/dashboard/model/widgets.ts`
- `src/widgets/dashboard/ui/SpaceLayout.tsx`
- `src/widgets/dashboard/ui/MobileSpaceBar.tsx`
- `src/entities/widget/model/default-layouts.ts`

### Tests

Updated:

- `src/widgets/dashboard/model/spaces.test.ts`
- `src/widgets/dashboard/model/active-space.test.ts`

## Deviations / notes

1. **Existing enum reuse**
   - The branch already contains `ProviderVerificationStatus` values `PENDING`, `PROBATION`, `VERIFIED`, `SUSPENDED`.
   - To avoid widening schema churn in Plan 01, the implementation maps `PENDING` to the display status `UNVERIFIED` instead of renaming the enum/database layer.

2. **Listing views**
   - The current schema does not contain provider listing view/impression tracking.
   - `totalViews` is included in the analytics response shape but currently returns `0`.

3. **Permission enforcement approach**
   - The existing `requireAnyPermission()` helper is purely role-based and cannot express “resident if linked to provider”.
   - A focused helper (`src/shared/api/provider-platform.ts`) was added to preserve existing auth patterns while supporting provider-linked resident access.

## Validation run

### Passed

- Targeted ESLint on touched files

### Attempted but blocked by tool/repo setup

- Targeted TypeScript CLI check
  - blocked by TypeScript 6 `TS5112` when combining repo config with explicit file arguments
- Focused Vitest run for updated space tests
  - blocked by worktree/symlink path resolution in the local Vitest setup (`src/test/setup.ts` resolved against the alternate worktree path)

### Editor diagnostics

- Clean on the touched route/UI/model files after implementation
- One initial standalone helper diagnostic reported unresolved aliases, but targeted ESLint for that file passed after integration

## Follow-up considerations for 46-02 / 46-03

Potential blockers / constraints to keep in mind:

1. **No real listing view telemetry yet**
   - If 46-02 or 46-03 needs provider growth funnels or detailed exposure metrics, a listing-view event model will be required.

2. **Provider identity remains split**
   - Listings are keyed by `users.id`, while verification/credits are keyed by `ServiceProvider.id` and linked through provider email.
   - Any next slice that deepens provider lifecycle automation should consider whether that identity bridge needs hardening.

3. **Verification/admin UX is API-only so far**
   - Verification PATCH exists, but there is no dedicated admin UI in this slice for moderation/state transitions.

4. **Provider space nav visibility is still mostly flag/role-driven**
   - Access is enforced on the provider routes/API, but broader nav-level “show only when linked provider exists” logic is not yet centralized.
