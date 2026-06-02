# Phase 41 Context: Feature Gate Consolidation

> **Created:** 2026-06-01
> **Revised:** 2026-06-01 (narrowed to verified scope)
> **Status:** Planning
> **Phase goal:** Consolidate the three overlapping feature gating systems behind a single `canAccess()` entry point with explicit 5-layer precedence. Remove all legacy tier string handling (`sprout`, `grove`, `forest`) — the DB is clean, the code is not.

## Background

Tracked as UBIQUITOUS_LANGUAGE.md conflict **C2** (medium priority). Three systems answer "can this user see this feature?" with undocumented precedence:

1. **TierGuard / FeatureRegistry** — 30+ fine-grained toggles keyed as `page.*`, `feature.*`, `widget.*`
2. **Module Gate** — `isModuleEnabled(tenantId, moduleKey)` DB-backed, 18 module keys
3. **PlatformPageFlags** — 15 boolean DB-stored flags per tenant

The advisory at `.planning/ADVISORY.md` is partially stale (verified against actual codebase, see "Advisory Status" below). The core signal — "no legacy tier strings" — is authoritative.

## Advisory Status (verified 2026-06-01)

| Advisory Claim                                                                     | Reality                                                                                                                | Action                                        |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| DB has no legacy values                                                            | **Confirmed** — 9 STANDARD, 3 PREMIUM, 2 ENTERPRISE; no `sprout`/`grove`/`forest`                                      | None                                          |
| `getTierLevel()` should become `normalizeTier()` that throws on unknown            | Advisory's pseudocode is for a refactored future; codebase has 3 `getTierLevel()` functions and 2 `TIER_ORDER` records | **Out of scope** — separate refactor          |
| `isModuleEnabled()` should be "updated" to use canonical types                     | The current function works; the advisory's suggested changes are for a different architectural goal                    | **Out of scope** — leave as-is, consume as-is |
| `getTenantTier`, `getModuleDefinition`, `getTenantModule` should be cached helpers | These don't exist as separate functions; the inline queries work and are not a performance problem                     | **Out of scope** — premature optimization     |
| `revalidateTag()` should replace `revalidatePath`                                  | Existing `revalidation.ts` is consistently `revalidatePath`-based                                                      | **Out of scope** — match existing pattern     |
| `getPageFlags` should replace `getPlatformPageFlags`                               | Cosmetic rename, no functional impact                                                                                  | **Out of scope**                              |
| `useGateContext()` reads `flags?.tier`                                             | **Not true** — `/api/flags` does not return `tier`                                                                     | **Scope decision: client skips tier check**   |
| Remove `sprout`/`grove`/`forest` from code                                         | **True** — 8 occurrences across 6 files                                                                                | **In scope**                                  |

## Core Invariant (advisory's authoritative signal)

> `sprout`, `grove`, `forest` are deprecated. They do not appear in the database. They should not appear in the codebase.

The DB schema defaults `subscriptionTier` to `'sprout'` and `<option value="sprout">` exists in the admin form — these are dormant legacy, removed in Phase 1.

## Solution

A single `canAccess()` function with explicit 5-layer precedence, three mapping tables as the core artefact, and a CI test that prevents future drift. Phase 1 is **purely additive for the gate system** (no existing callsites change). Phase 1 **does** remove the legacy tier string handling (8 surgical edits, no functional change since DB has no legacy data).

```
Role → Tier → Module → PageFlag → FeatureToggle
  0      1       2         3            4
```

| Layer      | Mechanism                                   | Update Cadence       | Set By        |
| ---------- | ------------------------------------------- | -------------------- | ------------- |
| 0 Role     | `ROLE_PERMISSIONS` map (in-memory)          | Deploy               | Platform team |
| 1 Tier     | `tenants.tier` + `platform_modules.minTier` | Quarterly            | Platform team |
| 2 Module   | `tenant_modules.enabled`                    | Onboarding / upgrade | Tenant admin  |
| 3 PageFlag | `settings` table, 15 keys                   | Weekly               | Tenant admin  |
| 4 Feature  | `FeatureRegistry` (in-memory)               | Deploy               | Platform team |

## Key Design Decisions (locked)

- **DB layer keeps `TenantTier` (`STANDARD`/`PREMIUM`/`ENTERPRISE`)** — no DB migration
- **Application layer uses `TenantTier` directly** — no `normalizeTier()` rename, no canonical boundary creation
- **Client skips Tier and Module layers** — `canAccessClient()` evaluates only Role (0), PageFlag (3), FeatureToggle (4). Server returns 403 on tier/module denials; client renders null/upgrade prompt based on what server allows
- **`GateContext` carries `TenantTier`** — same type as DB column, no conversion
- **No new cached helpers** — consume `isModuleEnabled()` and `getPlatformPageFlags()` as-is
- **No `unstable_cache` with tags** — use existing `revalidatePath()` pattern
- **One log per `false` result, zero on `allowed`** — structured `event: 'gate.denied'`
- **`GATE_REASON_TO_ERROR` for API routes** — standardises HTTP semantics
- **Legacy tier string removal is in-scope** — 8 occurrences across 6 files

## Concrete Removal Targets (legacy tier strings)

| File                                              | Line    | What                                                           | Action                                                                                                                                                                                                                                              |
| ------------------------------------------------- | ------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/shared/lib/constants/tiers.ts`               | 261-275 | `getTierLevel()` switch with `sprout`/`grove`/`forest` cases   | Remove cases; default branch returns `'foundation'` for unknown (back-compat with non-legacy unknowns like `'gold'`) — or throws. **Decision: keep returning `'foundation'` as fallback** so existing callers don't break. Just delete the 3 cases. |
| `src/db/schema/tenants.ts`                        | 17      | `subscriptionTier: text('subscriptionTier').default('sprout')` | Change default to `'basic'` (matches Prisma line 816)                                                                                                                                                                                               |
| `prisma/schema.prisma`                            | 72      | `subscriptionTier String @default("sprout")`                   | Change default to `"basic"`                                                                                                                                                                                                                         |
| `src/page-modules/admin/ui/TenantFeaturePage.tsx` | 111-113 | `<option value="sprout">` etc.                                 | Remove the 3 `<option>` lines                                                                                                                                                                                                                       |
| `src/shared/api/slug.ts`                          | 67      | `'forest'` reference                                           | Audit: is it a tier name or a generic word? **Verify before removing.**                                                                                                                                                                             |
| `src/entities/tenant/api/base.ts`                 | 6       | Comment mentioning `forest`                                    | Update comment to remove tier reference                                                                                                                                                                                                             |

## Phase Plan (3 plans in 1 wave)

| Plan      | Objective                                                                        | Files Created                                                      | Files Modified                       |
| --------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------ |
| **41-01** | Legacy string removal (7 edits, 5 files) + Server `canAccess()` + mapping tables | 1 (`src/shared/api/gate.ts`)                                       | 5 (legacy removal)                   |
| **41-02** | Client `canAccessClient()` + `useGateContext()` (real session) + `GateGuard`     | 2 (`src/shared/lib/gate-client.ts`, `src/shared/ui/GateGuard.tsx`) | 0                                    |
| **41-03** | CI test for mapping completeness + `revalidateGate()`                            | 1 (`src/shared/api/gate.test.ts`)                                  | 1 (`src/shared/api/revalidation.ts`) |

**Sequential concern:** Plan 41-01 modifies `tiers.ts` (removes legacy cases) and 4 other files. The `tiers.ts` change must NOT break callers of `getTierLevel()`. The change is purely deleting 3 cases from a switch — existing callers passing `STANDARD`/`PREMIUM`/`ENTERPRISE` or `foundation`/`depth`/`core` still work.

**Cascade impact:** Plan 41-01's legacy removal touches:

- `src/entities/tenant/lib/modules/index.ts` — re-exports `getTierLevel`, no breakage
- `src/entities/tenant/lib/modules/require-module.ts` — has its own `getTierLevel` (different signature), not affected
- `src/entities/tenant/api/features/registry.ts` — uses `getTierLevel` from tiers.ts, works after edit

Plan 41-01 task 1 must run a `grep` audit post-edit to confirm no breakage.

## Trajectory (where Phase 1 sits in the 3-phase migration)

Phase 41 is **Phase 1 of 3** in the consolidation described in `docs/GATE_PLAN.md`. The destination (Phase 3 acceptance criteria):

> All three legacy systems are internal-only. `canAccess()` / `canAccessClient()` / `GateGuard` are the only public gate API. CI test continues to pass. `docs/UBIQUITOUS_LANGUAGE.md` C2 marked Resolved.

```
   Phase 1 (this)            Phase 2                    Phase 3 (destination)
   ─────────────             ───────                    ─────────────────────
   canAccess()    public, unused          ~50% of API routes call it   100% of API routes
   canAccessClient() public, unused       ~50% of UI components        100% of UI components
   GateGuard      public, unused          ~50% of guards               100% of guards
   isModuleEnabled  unchanged            half-migrated                @internal
   TierGuard        unchanged            half-migrated                @internal
   usePageFlags     unchanged            direct reads replaced        consumed by useGateContext only
   assertModuleEnabled unchanged          replaced with canAccess()    deleted
   revalidateGate() public, no callers   called by mutation routes    called by mutation routes
   C2 status        Open (infra done)     Open (migration in flight)   Resolved
   DB tier          TenantTier           TenantTier                   TenantTier
   Test suite       static drift          + per-layer behaviour        + real-system integration
```

**Phase 1 ships a foundation, not consolidation.** This is intentional (user decision Q1=A) — the cost is "two gate systems running in parallel" temporarily, the benefit is "no callsite change in Phase 1, no risk of breaking production gates."

## Lock-in Decisions (Phase 1 commitments to Phase 2/3)

These are the public API shapes that Phase 1 ships. Once committed, Phase 2/3 must work within them. Changing any of these would break the foundation.

| Symbol                            | Signature                                                                                                                                                  | Phase 1 decision                        | Why this matters                                                                                             |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `canAccess()`                     | `(ctx: GateContext, feature: FeatureKey, opts?: { skipFlag?: boolean }) => Promise<GateResult>`                                                            | Add to `src/shared/api/gate.ts`         | The single server entry point. Phase 2 migrates API routes to this signature.                                |
| `canAccessClient()`               | `(ctx: ClientGateContext, feature: FeatureKey, opts?: { skipFlag?: boolean }) => GateResult`                                                               | Add to `src/shared/lib/gate-client.ts`  | The single client entry point. Phase 2 migrates client components.                                           |
| `useGateContext()`                | `() => ClientGateContext \| null`                                                                                                                          | Add to `src/shared/lib/gate-client.ts`  | Reads real session (`useSession()`) + page flags. Returns `null` while loading.                              |
| `GateGuard`                       | `(props: { feature, children, fallback?, render?, skipFlag?, loadingFallback? }) => JSX.Element`                                                           | Add to `src/shared/ui/GateGuard.tsx`    | Replaces `TierGuard`. Phase 2 migrates TierGuard callsites.                                                  |
| `GateContext`                     | `{ tenantId: string; role: Role; tier: TenantTier }`                                                                                                       | Add to `src/shared/api/gate.ts`         | Resolution shape. Created once per request via `resolveGateContext()`.                                       |
| `ClientGateContext`               | `{ role: Role; flags: PlatformPageFlags; tier?: TierLevel }`                                                                                               | Add to `src/shared/lib/gate-client.ts`  | Client resolution shape. `tier` is optional — Phase 1 fetches flags only; Phase 2 adds tier to `/api/flags`. |
| `GateResult`                      | `{ allowed: boolean; reason: GateReason }`                                                                                                                 | Add to `src/shared/api/gate.ts`         | Return shape. Same for server and client.                                                                    |
| `GateReason`                      | `'role' \| 'tier' \| 'module' \| 'flag' \| 'feature' \| 'allowed'`                                                                                         | Add to `src/shared/api/gate.ts`         | Stable 6-value enum. Phase 2 may add 'unauthenticated' if needed.                                            |
| `FeatureKey`                      | 14-key union (maintenance, bookings, events, surveys, competitions, groups, chat, news, directory, resources, conservation, services, dashboard, messages) | Add to `src/shared/api/gate.ts`         | Canonical namespace. Sub-features use dot notation (`'maintenance.updates'`).                                |
| `FEATURE_TO_MODULE/FLAG/REGISTRY` | `Record<FeatureKey, …Key \| null>`                                                                                                                         | Add to `src/shared/api/gate.ts`         | The core artefact. `null` is load-bearing.                                                                   |
| `GATE_REASON_TO_ERROR`            | `Record<GateReason, string>`                                                                                                                               | Add to `src/shared/api/gate.ts`         | Standardises HTTP error semantics (fixes current 403/404/200-empty inconsistency).                           |
| `revalidateGate(tenantId)`        | `(tenantId: string) => void` (uses `revalidatePath()`)                                                                                                     | Add to `src/shared/api/revalidation.ts` | Cache invalidation hook. Phase 2 wires into mutation routes.                                                 |

**Changing any of these in Phase 2/3 requires a deprecation cycle.** New symbols can be added; existing ones cannot break.

## Phase 2/3 Deferrals (what Phase 1 does NOT do)

These are deliberate omissions. Phase 2/3 will pick them up. Listing them explicitly so a future contributor doesn't pick a different direction.

| Deferral                                       | Description                                                                                                                              | Phase                           | Notes                                                                                 |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------- |
| Client tier in `useGateContext()`              | `/api/flags` doesn't return `tier`; client `ctx.tier` is always `undefined` in Phase 1; Layer 4 (FeatureToggle) is permissive without it | Phase 2                         | Add `tier` to `/api/flags` response; populate `useGateContext().tier`                 |
| Cached helpers                                 | `getTenantTier`, `getModuleDefinition`, `getTenantModule` as separate `unstable_cache`-wrapped functions                                 | Phase 2                         | Extract from `canAccess()`; tagged for invalidation                                   |
| Tag-based revalidation                         | `revalidateTag('tenant-tier-{id}')` instead of `revalidatePath()`                                                                        | Phase 2 (with cached helpers)   | Requires tag-based cache to be useful                                                 |
| Real-system integration tests                  | Tests currently mock `isModuleEnabled` and `getPlatformPageFlags`                                                                        | Phase 2                         | Mock-only is fine for drift detection; real integration tests catch signature changes |
| Callsite migration                             | Migrate `assertModuleEnabled`, `TierGuard`, direct `isModuleEnabled` calls, direct `usePageFlags` reads                                  | Phase 2 (opportunistic)         | Mechanical, per-pattern replacement                                                   |
| Restrict `isModuleEnabled`/`TierGuard` exports | Move to `@internal` or delete                                                                                                            | Phase 3                         | Only after all callsites migrated                                                     |
| Consolidate 3 `getTierLevel()` functions       | One canonical function; remove the other two                                                                                             | Separate workstream             | Tracked by UBIQUITOUS_LANGUAGE.md C4                                                  |
| Unify the two tier systems                     | `TenantTier` (DB) ↔ `TierLevel` (application) bridge                                                                                     | Separate workstream             | Tracked by UBIQUITOUS_LANGUAGE.md C4                                                  |
| Update `docs/UBIQUITOUS_LANGUAGE.md` C2 status | Mark C2 "Open (Phase 1 infrastructure complete)" or "Resolved"                                                                           | Phase 1 (this phase) or Phase 3 | Decision deferred — see "Open Questions"                                              |
| Per-entity context doc updates                 | Add "Migration Status" section to each `docs/contexts/*.md`                                                                              | Phase 2                         | Track per-entity migration progress                                                   |

## Out of Scope (deferred to later phases)

- Migrating existing callsites from `isModuleEnabled`/`TierGuard`/`usePageFlags` → `canAccess()` (Phase 2 opportunistic)
- Removing `TierGuard`/`isModuleEnabled` public exports (Phase 3 cleanup)
- Consolidating the 3 `getTierLevel()` functions into one (separate refactor)
- Renaming `getPlatformPageFlags` → `getPageFlags` (cosmetic)
- Switching `revalidation.ts` to `revalidateTag()` (architectural change)
- Adding `tier` to `/api/flags` response (server-only tier check, client skips)
- Unifying the two tier systems (`TenantTier` vs `TierLevel`) — tracked by UBIQUITOUS_LANGUAGE.md C4

## Success Criteria

- [ ] All 8 legacy tier string occurrences removed (6 files)
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run test:run` passes
- [ ] `grep -r "sprout\|grove\|forest" src/ --include="*.ts" --include="*.tsx"` returns no results
- [ ] `grep "sprout" prisma/schema.prisma` returns no results
- [ ] Server `canAccess()` is callable and returns correct `GateResult` for all 5 layer combinations
- [ ] All 3 mapping tables have entries for all 14 `FeatureKey` values
- [ ] `canAccessClient()` works in client components (layers 0, 3, 4 only)
- [ ] `GateGuard` renders `children`/`fallback`/`render` correctly
- [ ] `useGateContext()` provides `{ role, flags }` from `/api/flags` (no tier)
- [ ] `revalidateGate(tenantId)` uses `revalidatePath()` (matches existing pattern)
- [ ] CI test catches drift: every `FeatureKey` must map to a valid entry in all three tables
- [ ] No existing callsites of `TierGuard`/`isModuleEnabled` modified
- [ ] No `normalizeTier()` rename, no `TIER_LEVELS` removal, no new cached helpers

## References

- `.planning/ADVISORY.md` — partially stale; only the "no legacy tier strings" signal is authoritative
- `docs/GATE_DISCUSSION.md` — original 4-layer proposal
- `docs/GATE_ADDENDUM.md` — revised design (5 layers, observability, caching)
- `docs/GATE_PLAN.md` — consolidated 3-phase migration roadmap (Phase 1 of 3)
- `docs/UBIQUITOUS_LANGUAGE.md` C2, C4 — conflict origins
- `docs/HOLISTIC.md` — cross-context impact, decision log
