# FSD Migration Plan

> **Status:** In progress (~65% complete)
> **Architecture:** [Feature-Sliced Design](https://feature-sliced.design/)
> **Scope:** `src/` directory of the Next.js monorepo

Agents should work through each phase sequentially. Each task includes a clear objective, the files involved, and the acceptance criteria. Do not skip ahead — later phases depend on earlier ones being clean.

---

## Phase 1 — Fix `shared/` bloat

**Priority: High. This is the most impactful structural problem.**

`shared/` has become a catch-all. FSD's rule is that `shared/` contains only truly generic, domain-free code. Domain-aware code must live in `entities/` or `features/`.

### 1.1 — Thin out `shared/ui`

`shared/ui` currently holds 45+ components. Many are domain-specific and must be relocated.

**Move to `entities/<slice>/ui/`:**

| Component            | Destination                                                             |
| -------------------- | ----------------------------------------------------------------------- |
| `AuthCheck.tsx`      | `entities/tenant/ui/`                                                   |
| `TierGuard.tsx`      | `entities/tenant/ui/`                                                   |
| `TenantStyles.tsx`   | `entities/tenant/ui/` _(already duplicated there — remove from shared)_ |
| `CommunityMap.tsx`   | `entities/directory/ui/`                                                |
| `RichTextEditor.tsx` | `shared/ui/` _(keep — generic)_                                         |
| `SideDrawer.tsx`     | `shared/ui/` _(keep — generic)_                                         |
| `Breadcrumbs.tsx`    | `shared/ui/` _(keep — generic)_                                         |
| `ImageUpload.tsx`    | `shared/ui/` _(keep — generic)_                                         |
| `MediaLibrary.tsx`   | `shared/ui/` _(keep — generic)_                                         |

**Move to `features/<slice>/ui/`:**

| Component                                                                                                         | Destination                                                   |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `SignupFormSection.tsx`, `SignupCTA.tsx`, `SignupHeader.tsx`                                                      | `features/auth/ui/` _(create slice if absent)_                |
| `HeroSection.tsx`, `FeaturesSection.tsx`, `MissionSection.tsx`, `CTASection.tsx`, `PageCTA.tsx`, `PrimaryCTA.tsx` | `features/marketing/ui/` _(create slice)_                     |
| `PricingCards.tsx`, `PricingCTA.tsx`, `PricingFAQ.tsx`, `PricingHeader.tsx`                                       | `features/pricing/ui/` _(create slice)_                       |
| `PlatformHeader.tsx`, `PlatformFooter.tsx`                                                                        | `features/platform/ui/` _(create slice or move to app layer)_ |
| `LocaleSelector.tsx`, `LocaleAwareEditor.tsx`                                                                     | `features/i18n/ui/` _(create slice)_                          |

**Acceptance criteria:**

- `shared/ui/index.ts` exports only generic, domain-free components
- No component in `shared/ui` imports from `entities/` or `features/`
- All moved components update their import paths; run `pnpm build` with no broken imports

---

### 1.2 — Split `shared/api`

`shared/api` currently holds auth, tenant config, feature flags, tRPC, Supabase, storage, permissions, and schemas. Split by concern:

| Module                                                                         | Action                                         |
| ------------------------------------------------------------------------------ | ---------------------------------------------- |
| `auth.ts`, `auth-client.ts`, `auth-utils.ts`                                   | Keep in `shared/api/` — used across all layers |
| `permissions.ts`                                                               | Move to `entities/tenant/api/`                 |
| `features/registry.ts`, `features/tenantFeatures.tsx`                          | Move to `entities/tenant/api/`                 |
| `flags/` (index, platform-flags, statsig-flags)                                | Move to `entities/tenant/api/flags/`           |
| `tenant/`                                                                      | Move to `entities/tenant/api/`                 |
| `config/tenant.ts`                                                             | Move to `entities/tenant/api/`                 |
| `trpc/client.ts`, `trpc/server.ts`                                             | Keep in `shared/api/trpc/`                     |
| `db.ts`, `supabase.ts`, `storage.ts`                                           | Keep in `shared/api/` — infrastructure         |
| `data-fetching.ts`, `revalidation.ts`, `slug.ts`, `turnstile.ts`, `schemas.ts` | Keep in `shared/api/` — generic utilities      |

**Acceptance criteria:**

- `entities/tenant/` owns all tenant/feature/permission/flag logic
- `shared/api/index.ts` re-exports only infrastructure-level utilities
- `pnpm build` passes; `pnpm test` passes

---

### 1.3 — Merge `shared/lib` and `src/lib`

`src/lib/` is a leftover from pre-FSD and duplicates `shared/lib/`. Merge and delete.

**Steps:**

1. Diff `src/lib/` against `shared/lib/` — identify any unique files
2. Unique files in `src/lib/` → merge into `shared/lib/` or the appropriate slice
3. Update all import paths that reference `src/lib/` → `@/shared/lib/` (or the relevant alias)
4. Delete `src/lib/`

**Files in `src/lib/` to check:**

- `admin-config.ts` → `entities/admin/model/` or `shared/lib/`
- `constants.ts`, `constants/tiers.ts` → already exists in `shared/lib/` — confirm and delete
- `email/resend.ts`, `email/templates.ts` → `shared/api/email/` or a new `features/email/` slice
- `hooks/useSignupForm.ts` → `features/auth/model/`
- `i18n.ts` → `shared/lib/` (already there as `i18n-config.ts` — reconcile)
- `logging.ts` → already in `shared/lib/` — delete duplicate
- `modules/` → `entities/tenant/lib/` (module enabling logic is tenant-specific)
- `prisma.ts` → `shared/api/` (already there — delete duplicate)
- `useContactSettings.ts`, `useTranslation.ts` → `shared/lib/` or `features/i18n/`

**Acceptance criteria:**

- `src/lib/` directory is deleted
- Zero references to `src/lib/` anywhere in `src/`
- `pnpm build` and `pnpm test` pass

---

## Phase 2 — Relocate orphaned `src/` modules

These directories sit outside all FSD layers and must be assigned a home.

### 2.1 — Move `src/hooks/`

Four hooks currently live at the root of `src/`:

| Hook                   | Destination                                     | Rationale                                                                     |
| ---------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------- |
| `useApiToast.ts`       | `shared/lib/hooks/`                             | Generic, used everywhere                                                      |
| `useIdentity.ts`       | `entities/tenant/model/` or `shared/lib/hooks/` | Identity is cross-cutting; check usage                                        |
| `usePageLoading.tsx`   | `shared/ui/` or `shared/lib/hooks/`             | Generic UX utility                                                            |
| `useResidentFilter.ts` | `entities/directory/model/`                     | Domain-specific — already partially duplicated in `features/directory/model/` |

**Note:** `useResidentFilter` appears in both `src/hooks/` and `features/directory/model/`. Reconcile — keep only the FSD location.

**Acceptance criteria:**

- `src/hooks/` directory deleted
- All usages updated to new import paths

---

### 2.2 — Move `src/types/`

| File          | Destination                                                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `enums.ts`    | Audit per-domain — split enum groups into their respective `entities/<slice>/model/types.ts`. Generic enums → `shared/lib/types.ts` |
| `identity.ts` | `entities/tenant/model/types.ts` or `shared/api/types.ts` depending on usage                                                        |

**Acceptance criteria:**

- `src/types/` directory deleted
- Enums and types live in their domain slice or `shared/`

---

### 2.3 — Move `src/server/`

The tRPC identity router currently lives at `src/server/routers/identity.ts` outside FSD.

**Destination:** `entities/identity/api/router.ts` (create `entities/identity/` slice) or `shared/api/trpc/routers/identity.ts` if it's truly shared infrastructure.

Check whether `identity.ts` is domain-specific (belongs in an entity) or cross-cutting infrastructure (belongs in `shared/api/trpc/`). Move accordingly, and update the tRPC route handler in `src/app/api/trpc/[trpc]/route.ts`.

**Acceptance criteria:**

- `src/server/` directory deleted
- tRPC router registered from its new FSD location

---

### 2.4 — Populate or delete `src/processes/`

`src/processes/` exists but is empty. In FSD, `processes/` is an optional layer for cross-feature business flows (e.g. onboarding, checkout). Either:

- **Populate it** if there are multi-feature flows that don't belong in any single feature slice (e.g. the tenant signup flow that touches auth + invitations + households)
- **Delete it** if all such flows are handled within `features/` already

Decision must be made before closing Phase 2.

---

## Phase 3 — Complete incomplete slices

### 3.1 — Create `features/maintenance`

The `maintenance` domain has `entities/maintenance/` and `widgets/maintenance/` but no `features/maintenance/` slice. Any user-facing interactions (submitting a request, filtering tickets, analytics actions) need a feature slice.

**Create `src/features/maintenance/` with:**

```
features/maintenance/
  index.ts
  model/
    useMaintenanceForm.ts      # form state + submission logic
    useMaintenanceFilter.ts    # filter state for the list
  ui/
    MaintenanceForm.tsx        # (move from widgets/maintenance/ui if duplicated)
    MaintenanceStatusFilter.tsx
```

---

### 3.2 — Add `ui/` to `entities/maintenance`

`entities/maintenance/` has `api/` and `model/types.ts` but no `ui/` folder. Display components for a maintenance request (status badge, priority indicator, request card) belong here.

**Create:**

```
entities/maintenance/ui/
  MaintenanceCard.tsx
  StatusBadge.tsx
  PriorityBadge.tsx
```

---

### 3.3 — Flesh out `features/directory` and `features/service`

Both slices have a `model/` and `ui/` folder but sparse contents. Verify:

- `features/directory/ui/` — `DirectoryChatModal` and `DirectoryGrid` are currently in `widgets/directory/ui/`. If they are feature-level interactions (not widget compositions), move them here.
- `features/service/ui/` — `CreateListingForm` is present; confirm `useServiceFilter` in `model/` covers all filter interactions.

---

## Phase 4 — Update test coverage config

The `coverage/` directory still reflects the old `components/` + `lib/` structure (pre-FSD). Update vitest coverage paths to match the new FSD layout.

**Update `vitest.config.ts`:**

- Coverage `include` should point to `src/{app,pages,widgets,features,entities,shared}/**`
- Remove any references to old `components/` or `lib/` paths
- Regenerate coverage report: `pnpm test --coverage`

---

## Phase 5 — Import path audit & linting

After all moves are complete:

1. Run a global search for any remaining imports from `src/lib`, `src/hooks`, `src/types`, `src/server`, `src/processes`
2. Enforce FSD layer boundaries via ESLint. Consider adding [`eslint-plugin-boundaries`](https://github.com/javierbrea/eslint-plugin-boundaries) with rules that prevent:
   - `shared/` importing from `entities/` or `features/`
   - `entities/` importing from `features/`
   - Cross-slice imports within the same layer
3. Verify `pnpm build`, `pnpm lint`, and `pnpm test` all pass clean

---

## Summary checklist

```
Phase 1 — shared/ cleanup
  [ ] 1.1 Thin out shared/ui — move domain components to entities/ and features/
  [ ] 1.2 Split shared/api — move tenant/feature/flag logic to entities/tenant/
  [ ] 1.3 Merge src/lib/ into shared/lib/ and delete src/lib/

Phase 2 — Orphan relocation
  [ ] 2.1 Move src/hooks/ to appropriate slices
  [ ] 2.2 Move src/types/ — split enums by domain
  [ ] 2.3 Move src/server/ tRPC router into FSD
  [ ] 2.4 Populate or delete src/processes/

Phase 3 — Incomplete slices
  [ ] 3.1 Create features/maintenance/ slice
  [ ] 3.2 Add ui/ to entities/maintenance/
  [ ] 3.3 Flesh out features/directory/ and features/service/

Phase 4 — Test coverage
  [ ] 4.1 Update vitest coverage paths to FSD structure
  [ ] 4.2 Regenerate coverage report

Phase 5 — Import audit & linting
  [ ] 5.1 Grep for leftover legacy import paths
  [ ] 5.2 Add eslint-plugin-boundaries rules
  [ ] 5.3 Full clean build: pnpm build + pnpm lint + pnpm test
```
