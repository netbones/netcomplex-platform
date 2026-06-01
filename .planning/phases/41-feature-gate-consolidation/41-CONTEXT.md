# Phase 41 Context: Feature Gate Consolidation

> **Created:** 2026-06-01
> **Status:** Planning
> **Phase goal:** Consolidate the three overlapping feature gating systems (TierGuard/FeatureRegistry, Module Gate, PlatformPageFlags) into a single `canAccess()` entry point with explicit 5-layer precedence.

## Background

Tracked as UBIQUITOUS_LANGUAGE.md conflict **C2** (medium priority). Three systems answer "can this user see this feature?" with undocumented precedence:

1. **TierGuard / FeatureRegistry** — 30+ fine-grained toggles keyed as `page.*`, `feature.*`, `widget.*`, evaluated client-side against `TierLevel` (`foundation`/`depth`/`core`)
2. **Module Gate** — `isModuleEnabled(tenantId, moduleKey)` DB-backed, 18 module keys, tier-aware via `platform_modules.minTier` (uses old `TenantTier` = `STANDARD`/`PREMIUM`/`ENTERPRISE`)
3. **PlatformPageFlags** — 15 boolean DB-stored flags per tenant, set via admin settings UI

`maintenance` appears in all three. Every developer adding a feature must grep three files to understand the full gate chain.

## Solution

A single `canAccess()` function with explicit 5-layer precedence, two mapping tables as the core artefact, and a CI test that prevents future drift. **No existing callsites change in Phase 1** — purely additive.

```
Role → Tier → Module → PageFlag → FeatureToggle
  0      1       2         3            4
```

## Key Design Decisions (locked)

- **Module key as canonical `FeatureKey` namespace** — most stable, least ambiguous of the three systems' key formats
- **Role as Layer 0 (prerequisite)** — runs before tier; no point checking tier if role can't access regardless
- **Two variants of `canAccess()`** — server (async, DB access) and client (sync, pre-fetched data); same `GateResult` shape
- **Explicit `null` values in mapping tables** — load-bearing; documents "no gate at this layer" rather than leaving implicit
- **`GateContext` resolved once per request** — fetched at middleware/layout level, not per feature check
- **3-tier caching matching update frequency** — tier (10min TTL via GateContext), module (5min existing), page flag (existing usePageFlags)
- **One log per `false` result, zero on `allowed`** — structured `event: 'gate.denied'`
- **`GATE_REASON_TO_ERROR` for API routes** — standardises HTTP semantics (fixes current `403`/`404`/`200-empty` inconsistency)

## Critical Codebase Findings

### Two Tier Systems Coexist

The codebase has **two tier systems** that need to be unified or explicitly bridged:

| System  | Values                                  | Location                                        | Used By                                  |
| ------- | --------------------------------------- | ----------------------------------------------- | ---------------------------------------- |
| **Old** | `STANDARD` \| `PREMIUM` \| `ENTERPRISE` | `TenantTier` in `@entities/tenant`              | `isModuleEnabled()`, `tenants.tier` (DB) |
| **New** | `foundation` \| `depth` \| `core`       | `TierLevel` in `@shared/lib/constants/tiers.ts` | `FeatureRegistry`, `MODULES`, `TIERS`    |

The `isModuleEnabled()` function uses the old system with `TIER_LEVELS: Record<TenantTier, number>`. The `FeatureRegistry` uses the new system. **Phase 1 must bridge these** so the gate can evaluate both layers consistently.

The DB column `tenants.tier` is `TenantTier` (old). The conversion happens implicitly via `TIER_LEVELS[tier]` mapping.

### Existing Test Patterns

- Tests use **Vitest** (`npm test` runs `vitest`, `npm run test:run` runs `vitest run` for CI)
- `src/entities/tenant/api/flags/platform-flags.test.ts` mocks `@api/db` with hoisted `vi.fn()` pattern
- Test files colocated next to source: `foo.ts` → `foo.test.ts`
- 20+ existing test files across the project

### Existing Hook: `usePageFlags`

`src/shared/lib/hooks/usePageFlags.ts` already exists — fetches from `/api/flags` and returns `PlatformPageFlags`. The `useGateContext()` hook will extend this to also carry tier.

### Existing API: `/api/flags`

`usePageFlags` calls `/api/flags` which returns `{ flags, tier, tenantId }` (already includes tier per `flags.test.ts`). Good — no API change needed for `useGateContext()`.

### TierGuard Exists at Entity Layer

`src/entities/tenant/ui/TierGuard.tsx` — the current client-side wrapper. Takes `feature`/`page`/`widget` string + `tier` prop. `GateGuard` will replace this, but **not in Phase 1** (Phase 2 opportunistic migration).

## Phase Plan (3 plans in 1 wave)

| Plan      | Objective                                                     | Files Created                                                            | Risk |
| --------- | ------------------------------------------------------------- | ------------------------------------------------------------------------ | ---- |
| **41-01** | Server `canAccess()` + mapping tables                         | 1 (`src/shared/api/gate.ts`)                                             | Low  |
| **41-02** | Client `canAccessClient()` + `useGateContext()` + `GateGuard` | 2 (`src/shared/lib/gate-client.ts`, `src/shared/ui/GateGuard.tsx`)       | Low  |
| **41-03** | CI test for mapping completeness + `revalidateGate()` helper  | 2 (`src/shared/api/gate.test.ts`, edit `src/shared/api/revalidation.ts`) | Low  |

All three plans can run **in parallel** (Wave 1) — no inter-plan dependencies:

- Plan 41-01 creates `gate.ts` (server)
- Plan 41-02 creates `gate-client.ts` + `GateGuard.tsx` (client); consumes types from `gate.ts`
- Plan 41-03 creates `gate.test.ts` + `revalidateGate()` helper; tests both `gate.ts` exports

**Sequential concern:** Plan 41-02 imports types from `gate.ts` (FeatureKey, GateResult, GateReason). Must be **executed after** Plan 41-01 (or in parallel with awareness).

## Out of Scope (Phase 2-3 work)

- Migrating existing callsites from `isModuleEnabled`/`TierGuard`/`usePageFlags` → `canAccess()` (Phase 2 opportunistic)
- Removing `TierGuard`/`isModuleEnabled` public exports (Phase 3 cleanup)
- Unifying the two tier systems (separate phase; bridge is enough for Phase 1)
- Changing `MODULES.tier` from `TierLevel` to use the old `TenantTier` system
- Resolving UBIQUITOUS_LANGUAGE.md C4 (tier naming mismatch) — separate workstream

## Success Criteria

- [ ] `canAccess()` is exported and callable but unused in production code
- [ ] `canAccessClient()` works in client components
- [ ] `GateGuard` renders `children`/`fallback`/`render` correctly
- [ ] `useGateContext()` provides `{ role, tier, flags }` from `/api/flags`
- [ ] CI test catches drift: every `FeatureKey` must map to a valid entry in all three tables
- [ ] No existing callsites modified
- [ ] `npm run typecheck` passes
- [ ] `npm run test:run` passes
- [ ] `npm run lint` passes

## References

- `docs/GATE_DISCUSSION.md` — original 4-layer proposal
- `docs/GATE_ADDENDUM.md` — revised design with 5 layers, server/client split, observability
- `docs/GATE_PLAN.md` — consolidated 3-phase migration roadmap
- `docs/UBIQUITOUS_LANGUAGE.md` C2 — conflict origin
- `docs/HOLISTIC.md` — cross-context impact, decision log
