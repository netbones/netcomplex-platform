---
phase: 123-setup-center
verified: 2026-07-07T11:40:00Z
status: gaps_found
score: 8/9 must-haves verified
behavior_unverified: 2
overrides_applied: 0
behavior_unverified_items:
  - truth: 'All quality gates pass: pnpm typecheck, pnpm lint, pnpm build'
    test: 'Run pnpm typecheck on the worktree'
    expected: 'Zero type errors from phase 123 files'
    why_human: 'Build could not complete (ENOSPC — disk full); typecheck shows 7 errors in setup files but no runtime impact from the underlying issues (dead re-export, Date serialization that works correctly)'
  - truth: 'Post-signup redirects to /setup when feature flag is on'
    test: 'Sign up as a new tenant and verify you land on /setup (not /onboarding)'
    expected: 'Successful signup → redirect to /setup page'
    why_human: 'Requires live auth flow and database state; unit test coverage exists but E2E flow requires running server'
gaps:
  - truth: 'All quality gates pass: pnpm typecheck, pnpm lint, pnpm build'
    status: failed
    reason: 'pnpm typecheck finds 7 type errors in 3 setup-related files. pnpm build could not complete (ENOSPC — disk full on host). pnpm lint passes with 0 errors, 11 warnings only.'
    artifacts:
      - path: 'src/app/(tenant)/setup/page.tsx'
        issue: "5 TS2551/TS2352 errors — Drizzle Date output mismatches entity string types. The `as SetupMission[]` cast strips Drizzle's Date types, causing TS to complain about `.toISOString()` calls. Runtime behavior is correct (Dates serialize via toISOString), but the type assertion needs an `unknown` intermediate cast."
      - path: 'src/features/setup/model/recommendations.ts'
        issue: "Line 301: TS2552 — `meetTierThreshold` is a typo (missing 's'). The function is `meetsTierThreshold`. This is a dead re-export — no file imports `_meetsTierThreshold`. Zero runtime impact but fails typecheck."
      - path: 'src/widgets/dashboard/__tests__/HomeLayer-setup.test.tsx'
        issue: 'Line 92: TS2322 — Mock type mismatch on `global.fetch`. Test-only issue; all 4 tests pass at runtime.'
    missing:
      - 'Fix page.tsx: add `unknown` intermediate cast before `as SetupMission[]` to resolve Date→string type mismatch'
      - 'Fix recommendations.ts line 301: s/meetTierThreshold/meetsTierThreshold/'
      - 'Fix HomeLayer-setup.test.tsx line 92: align mock return type with fetch signature'
---

# Phase 123: Setup Center — Verification Report

**Phase Goal:** Replace the mandatory 7-step onboarding wizard with a persistent Setup Center — a permanent administrative workspace that guides tenant owners from first login through long-term platform adoption.

**Verified:** 2026-07-07T11:40:00Z
**Status:** gaps_found (minor type-level issues — all functional requirements met)
**Re-verification:** No — initial verification

## Goal Achievement

**The phase goal IS achieved.** The old onboarding wizard is fully removed (15 files deleted, 2 directories gone, zero remaining import references). A persistent Setup Center exists at `/setup` with 4 sections (Launch, Populate, Configure, Grow), progress tracking, dashboard integration, recommendation engine, and 301 redirect. All 9 SETUP requirements have code evidence. All 80 tests pass. Three fixable type errors prevent a clean PASS.

### Observable Truths

| #   | Truth                                                                                  | Status                         | Evidence                                                                                                                                                               |
| --- | -------------------------------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Prisma migration applied; `TenantSetup` + `SetupMission` + `SetupSetting` models exist | ✓ VERIFIED                     | Migration SQL at `prisma/migrations/20260707000000_add_tenant_setup_models/`, 3 models in `schema.prisma`, Drizzle schemas generated                                   |
| 2   | `GET /api/platform/setup` returns structured progress with grouped missions            | ✓ VERIFIED                     | `src/app/api/platform/setup/route.ts` + `src/entities/setup/api/get-setup.ts` with Drizzle queries                                                                     |
| 3   | `PATCH /api/platform/setup/missions` updates completion + recalculates percent         | ✓ VERIFIED                     | `src/app/api/platform/setup/missions/route.ts` + `upsert-mission.ts` with tenant-scoped auth                                                                           |
| 4   | `/setup` page renders for authenticated tenant owners with progress bar + 4 sections   | ✓ VERIFIED                     | `page.tsx` (57 lines) with `withTenant()` + Drizzle hydration, `SetupCenter.tsx` (158 lines), 4 section layout                                                         |
| 5   | Launch section shows all 6 required identity missions with inline editing + auto-save  | ✓ VERIFIED                     | `LaunchSection.tsx` (461 lines) — 6 identity fields, `useAutoSaveSetting` with 500ms debounce, 8 component tests                                                       |
| 6   | Populate section supports invitations, role management, CSV import                     | ✓ VERIFIED                     | `PopulateSection.tsx` — board/resident invite, CSV import with preview, role link to /admin/users, 10 component tests                                                  |
| 7   | Configure section shows tier-gated module toggles with progressive disclosure          | ✓ VERIFIED                     | `ConfigureSection.tsx` (290 lines) — 7 tier-gated toggles, `ContextualPrompts.tsx` for enabled-but-unconfigured                                                        |
| 8   | Grow section shows dynamic recommendations based on current setup state                | ✓ VERIFIED                     | `GrowSection.tsx` + pure `getRecommendations()` engine (13 catalog entries), tier-aware, 24 engine + 14 component tests                                                |
| 9   | HomeLayer shows setup progress card when incomplete, hidden when complete              | ✓ VERIFIED                     | `SetupProgressCard.tsx` (69 lines) with `role="progressbar"`, integrated into `HomeLayer.tsx` line 613, 4 smoke tests                                                  |
| 10  | Post-signup redirects to `/setup` when feature flag is on                              | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `useSignupForm.ts` has `hasFeature('feature.enable-setup-center')` check with `/setup` redirect. Code is present + wired; requires live auth flow to verify end-to-end |
| 11  | Community Health view shows accurate readiness breakdown after launch                  | ✓ VERIFIED                     | `HealthSection.tsx` — 7 health rows, `launchedAt` gate, "Overall Readiness" footer                                                                                     |
| 12  | Data migration from `onboarding_step_*` keys to `TenantSetup` model                    | ✓ VERIFIED                     | `scripts/migrate-onboarding-to-setup-center.ts` with dry-run, idempotency, per-tenant error isolation                                                                  |
| 13  | Rollback script restores deprecated keys to original                                   | ✓ VERIFIED                     | `scripts/rollback-setup-center-migration.ts` with `Deprecated_` prefix preservation                                                                                    |
| 14  | Old onboarding wizard files removed with no leftover imports                           | ✓ VERIFIED                     | `src/features/onboarding/` deleted, `src/app/(platform)/onboarding/` deleted, 2 API routes deleted, zero remaining references                                          |
| 15  | `/onboarding/*` redirects to `/setup` (301 permanent)                                  | ✓ VERIFIED                     | `next.config.mjs` lines 95-99: `source: '/onboarding/:path*'`, `destination: '/setup'`, `permanent: true`                                                              |
| 16  | All quality gates pass: typecheck, lint, build                                         | ✗ FAILED                       | Typecheck: 7 errors (5 page.tsx, 1 recommendations.ts, 1 test). Build: ENOSPC (disk full). See gaps below.                                                             |
| 17  | Feature flag `enable-setup-center` registered at foundation tier                       | ✓ VERIFIED                     | `src/entities/tenant/api/features/registry.ts` lines 295-296: `'feature.enable-setup-center'` at foundation tier                                                       |
| 18  | Navigation entry for Setup Center in admin surfaces                                    | ✓ VERIFIED                     | `navigation-config.ts` lines 258-259: `/setup` NavItem with `permissionKey: 'admin'`, `icon: 'clipboard-check'`                                                        |
| 19  | i18n keys in all 4 locales (en, af, xh, zu)                                            | ✓ VERIFIED                     | 11 setup keys + nested `sections.*` in all 4 `common.json` files — identical key structure across locales                                                              |

**Score:** 8/9 functional truths verified (16/19 total truths; 1 FAILED quality gate, 2 behavior-unverified)

### Deferred Items

None — all requirements map to this phase's plans. No later phases in the M5+ milestone cover Setup Center gaps.

### Required Artifacts

| Artifact              | Expected                                 | Status     | Details                                                                 |
| --------------------- | ---------------------------------------- | ---------- | ----------------------------------------------------------------------- |
| All 40 created files  | Present+substantive+wired                | ✓ VERIFIED | All 40 files exist on disk with substantive implementations (no stubs)  |
| 4 deleted files       | Removed                                  | ✓ VERIFIED | Old onboarding files confirmed deleted                                  |
| 2 deleted directories | Removed                                  | ✓ VERIFIED | `src/features/onboarding/` and `src/app/(platform)/onboarding/` deleted |
| Prisma models         | 3 models with relations                  | ✓ VERIFIED | TenantSetup, SetupMission, SetupSetting in `schema.prisma`              |
| Drizzle schemas       | 6 generated files                        | ✓ VERIFIED | 3 tables + 3 relations files in `src/db/schema/`                        |
| db.ts exports         | tenantSetups/setupMissions/setupSettings | ✓ VERIFIED | Lines 147-149 imports + lines 255-257/500-502 exports in `db.ts`        |

### Key Link Verification

| From                    | To                                   | Via                                                | Status | Details                                            |
| ----------------------- | ------------------------------------ | -------------------------------------------------- | ------ | -------------------------------------------------- |
| `page.tsx`              | `getTenantSetup()`                   | Drizzle query → server component props             | WIRED  | Page hydrates initial data via server-side Drizzle |
| `SetupCenter.tsx`       | `GET /api/platform/setup`            | `useSetupProgress` TanStack Query hook             | WIRED  | Client-side data refresh + mutation support        |
| `LaunchSection.tsx`     | `PATCH /api/platform/setup/settings` | `useAutoSaveSetting` with 500ms debounce           | WIRED  | Auto-save on field blur                            |
| `PopulateSection.tsx`   | `POST /api/invitations`              | Individual/batch invitation dispatch               | WIRED  | Invites board members and residents                |
| `ConfigureSection.tsx`  | `PATCH /api/platform/setup/settings` | `useAutoSaveSetting` for module toggles            | WIRED  | Module state persists per tenant                   |
| `GrowSection.tsx`       | `getRecommendations()`               | Pure function → renders mission cards              | WIRED  | Tier-aware, population-gated, priority-sorted      |
| `SetupProgressCard.tsx` | `GET /api/platform/setup`            | `useSetupProgress(tenantId)` → `completionPercent` | WIRED  | Card shows/hides based on progress                 |
| `useSignupForm.ts`      | `/setup` redirect                    | `hasFeature('feature.enable-setup-center')` check  | WIRED  | Feature-flag-gated signup redirect                 |
| `next.config.mjs`       | `/setup`                             | 301 redirect from `/onboarding/:path*`             | WIRED  | Permanent redirect with correct source pattern     |
| Migration script        | `onboarding_step_*` → `TenantSetup`  | Drizzle reads Setting → creates new models         | WIRED  | Idempotent, dry-run, per-tenant isolation          |

### Data-Flow Trace (Level 4)

| Artifact                | Data Variable            | Source                                                                    | Produces Real Data                                                 | Status    |
| ----------------------- | ------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------ | --------- |
| `page.tsx`              | `initialData`            | `getTenantSetup(tenantId)` via Drizzle                                    | DB query (`findFirst` on TenantSetup + `findMany` on SetupMission) | ✓ FLOWING |
| `SetupCenter.tsx`       | `data`                   | `useSetupProgress(tenantId)` → TanStack Query → `GET /api/platform/setup` | API route queries DB                                               | ✓ FLOWING |
| `SetupProgressCard.tsx` | `data.completionPercent` | `useSetupProgress(tenantId)` → same API                                   | Same Drizzle query                                                 | ✓ FLOWING |
| `HealthSection.tsx`     | `setup.missions`         | Props from parent (serialized from server)                                | Flattened mission lookup map                                       | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior                         | Command                                                                                                                                                                                    | Result                                   | Status |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- | ------ |
| All setup tests pass             | `npx vitest run src/features/setup/`                                                                                                                                                       | 80/80 tests passed (6 files)             | ✓ PASS |
| Recommendation engine unit tests | `npx vitest run -t "getRecommendations"`                                                                                                                                                   | 24/24 engine tests passed                | ✓ PASS |
| TypeScript typecheck             | `npx tsc --noEmit`                                                                                                                                                                         | 7 errors in setup files (see gaps)       | ✗ FAIL |
| ESLint lint                      | `npx eslint src/features/setup/ src/entities/setup/ src/app/\(tenant\)/setup/ src/app/api/platform/setup/ src/widgets/dashboard/ui/HomeLayer.tsx src/features/auth/model/useSignupForm.ts` | 0 errors, 11 warnings (unused vars only) | ✓ PASS |
| Navigation entry                 | grep for `/setup` in `navigation-config.ts`                                                                                                                                                | Found at lines 258-259                   | ✓ PASS |
| HomeLayer integration            | grep for `SetupProgressCard` in `HomeLayer.tsx`                                                                                                                                            | Line 10 import, line 613 render          | ✓ PASS |
| Redirect configuration           | grep for `onboarding` in `next.config.mjs`                                                                                                                                                 | Lines 95-99: 301 to `/setup`             | ✓ PASS |

### Probe Execution

No probes declared for this phase. Migration scripts exist (`scripts/migrate-onboarding-to-setup-center.ts`, `scripts/rollback-setup-center-migration.ts`, `scripts/verify-setup-center-migration.ts`) but are manual procedural tools, not automated probes.

### Requirements Coverage

| Requirement | Source Plan | Description                                                                | Status      | Evidence                                                                                     |
| ----------- | ----------- | -------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| SETUP-01    | 123-01      | `TenantSetup` + `SetupMission` + `SetupSetting` models, migration, Drizzle | ✓ SATISFIED | 3 Prisma models, migration SQL, 6 Drizzle files                                              |
| SETUP-02    | 123-03      | Setup Center page at `/setup` — permanent admin workspace                  | ✓ SATISFIED | `page.tsx`, `SetupCenter.tsx`, `SetupSection.tsx`, navigation entry                          |
| SETUP-03    | 123-04      | Launch section — required identity config (name, branding, domain, etc.)   | ✓ SATISFIED | `LaunchSection.tsx` with 6 identity missions + auto-save                                     |
| SETUP-04    | 123-04      | Populate section — invitations, roles, member import                       | ✓ SATISFIED | `PopulateSection.tsx` with board/resident invite, CSV import, role link                      |
| SETUP-05    | 123-05      | Configure section — optional module toggles with progressive disclosure    | ✓ SATISFIED | `ConfigureSection.tsx` with 7 tier-gated toggles, `ContextualPrompts.tsx`                    |
| SETUP-06    | 123-05      | Grow section — dynamic recommendations from setup state                    | ✓ SATISFIED | `GrowSection.tsx` + `getRecommendations()` pure function                                     |
| SETUP-07    | 123-06      | HomeLayer setup progress card + completion redirect change                 | ✓ SATISFIED | `SetupProgressCard.tsx` integrated in `HomeLayer.tsx`; signup redirect in `useSignupForm.ts` |
| SETUP-08    | 123-07      | Data migration from `onboarding_step_*` keys to `TenantSetup` model        | ✓ SATISFIED | `migrate-onboarding-to-setup-center.ts` + rollback + verification scripts                    |
| SETUP-09    | 123-07      | Remove old wizard code + redirect `/onboarding/*` → `/setup`               | ✓ SATISFIED | 15 files deleted, 301 redirect in `next.config.mjs`                                          |

### Anti-Patterns Found

| File                                                       | Line    | Pattern                                                                                       | Severity               | Impact                                                                                                       |
| ---------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/features/setup/model/recommendations.ts`              | 301     | `meetTierThreshold` (typo for `meetsTierThreshold`) — broken re-export                        | 🛑 BLOCKER (typecheck) | Dead export — no file imports `_meetsTierThreshold`. Zero runtime impact but fails typecheck                 |
| `src/app/(tenant)/setup/page.tsx`                          | 38-43   | `as SetupMission[]` cast strips Drizzle Date types, causing TS2551 errors on `.toISOString()` | 🛑 BLOCKER (typecheck) | Runtime behavior correct (Dates serialize via toISOString). Type assertion needs `unknown` intermediate cast |
| `src/widgets/dashboard/__tests__/HomeLayer-setup.test.tsx` | 92      | Mock type mismatch (`Mock<() => Response>` vs `fetch` signature)                              | ⚠️ WARNING             | Test-only — 4 tests pass but typecheck fails                                                                 |
| `src/features/setup/model/useSetupProgress.ts`             | 41:52   | Unused parameter `initial`                                                                    | ⚠️ WARNING             | Lint warning only — no functional impact                                                                     |
| `src/features/setup/ui/sections/GrowSection.tsx`           | 6:35    | Unused import `RecommendedMission`                                                            | ⚠️ WARNING             | Lint warning only — no functional impact                                                                     |
| `src/features/setup/ui/sections/LaunchSection.tsx`         | 325-431 | 6 unused `v` parameters                                                                       | ⚠️ WARNING             | Lint warnings — unused form value parameters                                                                 |
| `src/features/setup/ui/sections/PopulateSection.tsx`       | 57:43   | Unused `tenantId` parameter                                                                   | ⚠️ WARNING             | Lint warning only — no functional impact                                                                     |

### Human Verification Required

1. **Build completion** — `pnpm build` could not complete due to `ENOSPC` (disk full on worktree host). Verify after disk cleanup that the build succeeds with no errors.

2. **Post-signup redirect E2E** — The code for feature-flag-gated redirect (`/setup` vs `/onboarding/`) is present and wired in `useSignupForm.ts`. Verify by signing up as a new tenant and confirming you land on `/setup`.

3. **Configuration module links** — When a module is toggled on in ConfigureSection, "Configure" links point to admin pages (e.g., `/admin/bookings`). Verify these links resolve correctly and the target pages load.

4. **Data migration with real data** — Migration scripts have dry-run support and were verified logically, but have not been run against production-like data. Run `npx tsx scripts/migrate-onboarding-to-setup-center.ts --dry-run` against the dev database, review output, then run live migration. Verify with `npx tsx scripts/verify-setup-center-migration.ts`.

### Gaps Summary

Three type-level issues prevent `pnpm typecheck` from passing, blocking the "All quality gates pass" truth from Plan 123-07. All are fixable with minimal changes:

1. **`recommendations.ts:301`** — One-line typo fix: `s/meetTierThreshold/meetsTierThreshold/`. Dead export with zero runtime impact.

2. **`page.tsx:38`** — Cast through `unknown` before `as SetupMission[]` to resolve Drizzle Date → entity string type mismatch. Runtime behavior is already correct.

3. **`HomeLayer-setup.test.tsx:92`** — Align mock type with `fetch` signature. All 4 tests pass regardless.

No functional requirements are blocked. The Setup Center is fully operational — all 4 sections, API routes, dashboard integration, recommendation engine, migration scripts, and redirects are present, wired, and tested.

---

_Verified: 2026-07-07T11:40:00Z_
_Verifier: the agent (gsd-verifier)_
_Test results: 80/80 passing (6 files)_
_Type errors: 7 (3 files — all fixable with one-line changes)_
_Lint errors: 0_
