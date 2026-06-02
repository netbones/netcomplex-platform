> **DOCUMENT SEQUENCE NOTICE (2026-06-01)**
>
> This advisory is part of a 5-document sequence for the Feature Gate Consolidation. Read in this order:
>
> 1. **`docs/GATE_DISCUSSION.md`** — Original 4-layer proposal (the problem statement)
> 2. **`docs/GATE_ADDENDUM.md`** — Revised 5-layer design with gap resolutions
> 3. **`docs/GATE_PLAN.md`** — Consolidated 3-phase migration roadmap
> 4. **`.planning/GATE_ADVISORY.md`** (this file) — First advisory, focused on the tier-system bridge (`normalizeTier()`)
> 5. **`.planning/ADVISORY.md`** — Comprehensive second advisory (full `canAccess()` design)
>
> **Authoritative current state:** `.planning/phases/41-feature-gate-consolidation/41-{CONTEXT,01,02,03}-PLAN.md`
>
> The two advisories (4 and 5) describe the same problem from different angles. Both have implementation details that are **stale relative to the actual codebase** (verified 2026-06-01): they reference `getTenantTier`/`getModuleDefinition`/`getTenantModule` cached helpers that don't exist, suggest `unstable_cache`+`revalidateTag` patterns not used, and assume `/api/flags` returns `tier` (it doesn't). The plans in `phases/41-feature-gate-consolidation/` are the verified, executable version. **Keep both advisories as historical record of the design discussion.**

---

Good catch. This is the most concrete blocker for Phase 1 — `canAccess()` can't evaluate layer 1 (tier) and layer 4 (feature registry) consistently if they're speaking different type systems. Let me resolve it properly.

---

## Tier System Analysis

First, establish what each system actually encodes:

```
Old system (DB + isModuleEnabled):
  STANDARD=1, PREMIUM=2, ENTERPRISE=3
  → ordinal comparison: tenant.tier >= module.minTier

New system (FeatureRegistry + MODULES):
  foundation < depth < core
  → same ordinal comparison, different labels
```

They're isomorphic — both are ordered three-level hierarchies used for the same comparison. The values are different strings pointing at the same conceptual positions. This means no data migration is needed; only a bridge function and a canonical type is needed.

---

## The Bridge

```typescript
// src/shared/lib/constants/tiers.ts — extend, don't replace

// Canonical type — the new system wins as the source of truth
export type TierLevel = 'foundation' | 'depth' | 'core';

// Legacy DB type — kept for DB reads, not used in logic
export type TenantTier = 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';

// Ordinal map for the canonical system
export const TIER_ORDER: Record<TierLevel, number> = {
  foundation: 1,
  depth: 2,
  core: 3,
};

// Bridge — converts DB value to canonical
export const DB_TIER_TO_LEVEL: Record<TenantTier, TierLevel> = {
  STANDARD: 'foundation',
  PREMIUM: 'depth',
  ENTERPRISE: 'core',
};

// Also handle legacy string tiers from older tenants (per UBIQUITOUS_LANGUAGE.md)
const LEGACY_TIER_MAP: Record<string, TierLevel> = {
  sprout: 'foundation',
  grove: 'depth',
  forest: 'core',
};

export function normalizeTier(raw: string): TierLevel {
  if (raw in DB_TIER_TO_LEVEL) return DB_TIER_TO_LEVEL[raw as TenantTier];
  if (raw in LEGACY_TIER_MAP) return LEGACY_TIER_MAP[raw];
  // If it's already canonical, pass through
  if (raw === 'foundation' || raw === 'depth' || raw === 'core') return raw;
  // Unknown tier — fail safe to lowest
  logger.warn({ event: 'tier.unknown', raw });
  return 'foundation';
}

export function tierAtLeast(tenantTier: TierLevel, required: TierLevel): boolean {
  return TIER_ORDER[tenantTier] >= TIER_ORDER[required];
}
```

`normalizeTier()` is the single function that touches the DB value. Everything downstream — `canAccess()`, `isModuleEnabled()`, `FeatureRegistry` — works exclusively in `TierLevel`. The old `TIER_LEVELS` map in `isModuleEnabled()` is replaced by `TIER_ORDER` + `tierAtLeast()`.

---

## Updated `GateContext` and `resolveGateContext()`

```typescript
// src/shared/api/gate.ts

export interface GateContext {
  tenantId: string;
  role: Role;
  tier: TierLevel; // always canonical — DB value normalized at resolution time
}

export async function resolveGateContext(
  tenantId: string,
  session: Session | null
): Promise<GateContext> {
  const tenant = await getTenantTier(tenantId); // cached, see below
  return {
    tenantId,
    role: (session?.user?.role as Role) ?? 'RESIDENT',
    tier: normalizeTier(tenant.tier), // <-- bridge happens here, once per request
  };
}
```

`getTenantTier()` is a thin cached fetch:

```typescript
// Cached for 10 min, tagged for invalidation on tier change
const getTenantTier = unstable_cache(
  async (tenantId: string) =>
    db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
      columns: { tier: true },
    }),
  ['tenant-tier'],
  { revalidate: 600, tags: [`tenant-tier-${tenantId}`] }
);
```

The DB column stays as `TenantTier` — no migration. The normalization boundary is exactly `resolveGateContext()`. Anything that flows through `GateContext` is already canonical `TierLevel`.

---

## `isModuleEnabled()` Updated Internals

The existing function currently does:

```typescript
// Before — uses old TIER_LEVELS map
const TIER_LEVELS: Record<TenantTier, number> = {
  STANDARD: 1,
  PREMIUM: 2,
  ENTERPRISE: 3,
};
if (TIER_LEVELS[tenant.tier] < TIER_LEVELS[module.minTier]) return false;
```

The updated version replaces this with the canonical comparison. Importantly, `module.minTier` in `platform_modules` is also stored as `TenantTier` in the DB (it's the `minTier` column on `PlatformModule`). So the bridge applies in both directions:

```typescript
// After — both values normalized before comparison
async function isModuleEnabled(tenantId: string, moduleKey: ModuleKey): Promise<boolean> {
  const [tenant, module] = await Promise.all([
    getTenantTier(tenantId),
    getModuleDefinition(moduleKey),
  ]);

  const tenantLevel = normalizeTier(tenant.tier);
  const requiredLevel = normalizeTier(module.minTier); // platform_modules.minTier is also TenantTier

  if (!tierAtLeast(tenantLevel, requiredLevel)) return false;

  const installed = await getTenantModule(tenantId, moduleKey);
  return installed?.enabled ?? module.defaultEnabled;
}
```

`getModuleDefinition()` and `getTenantModule()` are each cached separately at 5 min with module-scoped invalidation tags. The `Promise.all` means the tier fetch and module definition fetch happen in parallel rather than sequentially.

---

## `FeatureRegistry` Integration

The `FeatureRegistry` already uses `TierLevel` natively. After the bridge, layer 4 of `canAccess()` passes `ctx.tier` (already canonical) directly into the registry:

```typescript
// Layer 4 in canAccess()
const registryKey = FEATURE_TO_REGISTRY[feature];
if (registryKey !== null) {
  const featureOk =
    registry.canAccessPage(ctx.role, registryKey) && registry.hasFeature(ctx.tier, registryKey);
  if (!featureOk) return { allowed: false, reason: 'feature' };
}
```

No type coercion needed at this point because `ctx.tier` is already `TierLevel` by the time it reaches here.

---

## Updated Phase 1 Deliverable

The scope is the same four files as before, plus one addition:

| File                                | Change                                                                                                                                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/shared/lib/constants/tiers.ts` | Add `normalizeTier()`, `tierAtLeast()`, `DB_TIER_TO_LEVEL`, `TIER_ORDER`                                                                                                               |
| `src/shared/api/gate.ts`            | `GateContext` with `TierLevel`, `resolveGateContext()`, `canAccess()`                                                                                                                  |
| `src/shared/lib/gate-client.ts`     | `canAccessClient()`, `useGateContext()`                                                                                                                                                |
| `src/shared/ui/GateGuard.tsx`       | Replaces `TierGuard`                                                                                                                                                                   |
| `src/shared/api/gate.test.ts`       | Existing completeness tests + new: assert `normalizeTier()` is total (every `TenantTier` and legacy string maps to a valid `TierLevel`), assert `tierAtLeast()` ordering is transitive |

The update to `isModuleEnabled()` internals is also Phase 1 — it's a small change to an existing function, not a new callsite, and it closes the inconsistency immediately rather than leaving two ordinal comparison systems running in parallel.

The DB column `tenants.tier` and `platform_modules.minTier` stay as `TenantTier`. No schema migration. The bridge is entirely in application code, at the resolution boundary.
