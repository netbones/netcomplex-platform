# Feature Gating Unification — Agent Advisory

> **DOCUMENT SEQUENCE NOTICE (2026-06-01)**
>
> This advisory is part of a 5-document sequence for the Feature Gate Consolidation. Read in this order:
>
> 1. **`docs/GATE_DISCUSSION.md`** — Original 4-layer proposal (the problem statement)
> 2. **`docs/GATE_ADDENDUM.md`** — Revised 5-layer design with gap resolutions
> 3. **`docs/GATE_PLAN.md`** — Consolidated 3-phase migration roadmap
> 4. **`.planning/GATE_ADVISORY.md`** — First advisory, focused on the tier-system bridge (`normalizeTier()`)
> 5. **`.planning/ADVISORY.md`** (this file) — Comprehensive second advisory (full `canAccess()` design)
>
> **Authoritative current state:** `.planning/phases/41-feature-gate-consolidation/41-{CONTEXT,01,02,03}-PLAN.md`
>
> The two advisories (4 and 5) describe the same problem from different angles. Both have implementation details that are **stale relative to the actual codebase** (verified 2026-06-01): they reference `getTenantTier`/`getModuleDefinition`/`getTenantModule` cached helpers that don't exist, suggest `unstable_cache`+`revalidateTag` patterns not used, and assume `/api/flags` returns `tier` (it doesn't). The plans in `phases/41-feature-gate-consolidation/` are the verified, executable version. **Keep both advisories as historical record of the design discussion.**

> **Scope:** Phase 1 implementation of `canAccess()` unified gate
> **Last updated:** 2026-06-01
> **Status:** Ready to execute — all design decisions resolved

---

## Context Summary

The platform has three overlapping feature gating systems that lack documented precedence and a single resolution path. This advisory describes the complete, verified design for unifying them behind a single `canAccess()` function.

**Systems being unified:**

| System                      | Values                                 | Location                            |
| --------------------------- | -------------------------------------- | ----------------------------------- |
| TierGuard / FeatureRegistry | `foundation` \| `depth` \| `core`      | `src/shared/lib/constants/tiers.ts` |
| Module Gate                 | `isModuleEnabled(tenantId, moduleKey)` | `src/entities/tenant/api/`          |
| PlatformPageFlags           | 15 DB-stored booleans per tenant       | `settings` table                    |

---

## Tier System: Verified Clean State

**DB audit result (2026-06-01):**

| tier       | count |
| ---------- | ----- |
| STANDARD   | 9     |
| PREMIUM    | 3     |
| ENTERPRISE | 2     |

| minTier    | count |
| ---------- | ----- |
| STANDARD   | 9     |
| PREMIUM    | 3     |
| ENTERPRISE | 2     |

**Conclusion:** No legacy values (`sprout`, `grove`, `forest`) exist in the database. No data migration script is needed. The code change can be deployed directly.

**Do not add handling for legacy tier strings.** If `normalizeTier()` encounters an unknown value, it must throw — not fall back silently.

---

## Canonical Types

```typescript
// src/shared/lib/constants/tiers.ts

// DB layer — matches tenants.tier and platform_modules.minTier columns exactly
export type TenantTier = 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';

// Application layer — canonical, used everywhere in logic
export type TierLevel = 'foundation' | 'depth' | 'core';

export const TIER_ORDER: Record<TierLevel, number> = {
  foundation: 1,
  depth: 2,
  core: 3,
};

export const DB_TIER_TO_LEVEL: Record<TenantTier, TierLevel> = {
  STANDARD: 'foundation',
  PREMIUM: 'depth',
  ENTERPRISE: 'core',
};
```

The bridge boundary is exactly `resolveGateContext()`. Anything that flows through `GateContext` is already canonical `TierLevel`. Nothing downstream touches `TenantTier` directly.

---

## `normalizeTier()` — Throws on Unknown

```typescript
export function normalizeTier(raw: string): TierLevel {
  if (raw in DB_TIER_TO_LEVEL) {
    return DB_TIER_TO_LEVEL[raw as TenantTier];
  }
  if (raw === 'foundation' || raw === 'depth' || raw === 'core') {
    return raw;
  }
  // Unknown = data corruption or bug. Surface loudly.
  logger.error({ event: 'tier.invalid', raw });
  throw new Error(`Invalid tier value: "${raw}". Expected STANDARD, PREMIUM, or ENTERPRISE.`);
}

export function tierAtLeast(tenant: TierLevel, required: TierLevel): boolean {
  return TIER_ORDER[tenant] >= TIER_ORDER[required];
}
```

---

## Five-Layer Gate Model

Gates evaluate in this order, short-circuiting at the first `false`:

```
Role (0) → Tier (1) → Module (2) → PageFlag (3) → FeatureToggle (4)
```

| Layer      | Mechanism                                   | Update Cadence       | Set By        |
| ---------- | ------------------------------------------- | -------------------- | ------------- |
| 0 Role     | `ROLE_PERMISSIONS` map (in-memory)          | Deploy               | Platform team |
| 1 Tier     | `tenants.tier` + `platform_modules.minTier` | Quarterly            | Platform team |
| 2 Module   | `tenant_modules.enabled`                    | Onboarding / upgrade | Tenant admin  |
| 3 PageFlag | `settings` table, 15 keys                   | Weekly               | Tenant admin  |
| 4 Feature  | `FeatureRegistry` (in-memory)               | Deploy               | Platform team |

---

## Mapping Tables

These are the core artifact. Every `FeatureKey` must have an explicit entry (or `null`) in all three tables. `null` means no gate at that layer — it is intentional and load-bearing, not a missing value.

```typescript
// src/shared/api/gate.ts

export type FeatureKey =
  | 'maintenance'
  | 'bookings'
  | 'events'
  | 'surveys'
  | 'competitions'
  | 'groups'
  | 'chat'
  | 'news'
  | 'directory'
  | 'resources'
  | 'conservation'
  | 'services'
  | 'dashboard'
  | 'messages';

export const FEATURE_TO_MODULE: Record<FeatureKey, ModuleKey | null> = {
  maintenance: 'maintenance',
  bookings: 'bookings',
  surveys: 'surveys',
  events: 'events',
  groups: 'groups',
  chat: 'chat',
  news: 'news',
  directory: 'directory',
  resources: 'resources',
  conservation: 'conservation',
  services: 'marketplace',
  messages: 'chat', // shares the chat module
  competitions: null, // no module gate
  dashboard: null, // no module gate
};

export const FEATURE_TO_FLAG: Record<FeatureKey, PlatformPageFlagKey | null> = {
  maintenance: 'maintenance',
  bookings: 'bookings',
  surveys: 'surveys',
  events: 'events',
  groups: 'groups',
  chat: 'chat',
  news: 'news',
  directory: 'directory',
  resources: 'resources',
  conservation: 'conservation',
  services: 'services',
  competitions: 'competitions',
  dashboard: 'dashboard',
  messages: 'messages',
};

export const FEATURE_TO_REGISTRY: Record<FeatureKey, string | null> = {
  maintenance: 'page.maintenance',
  bookings: 'page.bookings',
  surveys: 'page.surveys',
  events: 'page.events',
  groups: 'page.groups',
  chat: 'page.chat',
  news: 'page.news',
  directory: 'page.directory',
  resources: 'page.resources',
  conservation: 'page.conservation',
  services: 'page.services',
  messages: 'page.messages',
  competitions: null,
  dashboard: null,
};
```

---

## `GateContext` and Resolution

```typescript
export interface GateContext {
  tenantId: string;
  role: Role;
  tier: TierLevel; // always canonical — normalized at resolution time
}

export type GateReason = 'role' | 'tier' | 'module' | 'flag' | 'feature' | 'allowed';

export interface GateResult {
  allowed: boolean;
  reason: GateReason;
}
```

`resolveGateContext()` is called **once per request**, not per feature check:

```typescript
export async function resolveGateContext(
  tenantId: string,
  session: Session | null
): Promise<GateContext> {
  const tenant = await getTenantTier(tenantId); // cached 10 min
  return {
    tenantId,
    role: (session?.user?.role as Role) ?? 'RESIDENT',
    tier: normalizeTier(tenant.tier),
  };
}
```

---

## `canAccess()` — Server Variant

```typescript
export async function canAccess(
  ctx: GateContext,
  feature: FeatureKey,
  opts?: { skipFlag?: boolean }
): Promise<GateResult> {
  // Layer 0: Role
  const roleOk = ROLE_PERMISSIONS[ctx.role]?.includes(feature) ?? false;
  if (!roleOk) return { allowed: false, reason: 'role' };

  // Layer 1: Tier
  const moduleKey = FEATURE_TO_MODULE[feature];
  if (moduleKey !== null) {
    const moduleDef = await getModuleDefinition(moduleKey); // cached 10 min
    const required = normalizeTier(moduleDef.minTier);
    if (!tierAtLeast(ctx.tier, required)) {
      return { allowed: false, reason: 'tier' };
    }

    // Layer 2: Module installed
    const installed = await getTenantModule(ctx.tenantId, moduleKey); // cached 5 min
    const enabled = installed?.enabled ?? moduleDef.defaultEnabled;
    if (!enabled) return { allowed: false, reason: 'module' };
  }

  // Layer 3: Page flag
  if (!opts?.skipFlag) {
    const flagKey = FEATURE_TO_FLAG[feature];
    if (flagKey !== null) {
      const flags = await getPageFlags(ctx.tenantId); // cached, tagged
      if (!flags[flagKey]) return { allowed: false, reason: 'flag' };
    }
  }

  // Layer 4: Feature registry
  const registryKey = FEATURE_TO_REGISTRY[feature];
  if (registryKey !== null) {
    const ok =
      registry.canAccessPage(ctx.role, registryKey) && registry.hasFeature(ctx.tier, registryKey);
    if (!ok) return { allowed: false, reason: 'feature' };
  }

  if (!result.allowed) {
    logger.info({
      event: 'gate.denied',
      tenantId: ctx.tenantId,
      feature,
      reason: result.reason,
      role: ctx.role,
      tier: ctx.tier,
    });
  }

  return { allowed: true, reason: 'allowed' };
}
```

`skipFlag: true` is for admin-panel routes that bypass tenant operator toggles — an admin should be able to manage surveys even if the tenant has the surveys page flag off.

---

## `canAccessClient()` — Client Variant

```typescript
// src/shared/lib/gate-client.ts

export interface ClientGateContext {
  role: Role;
  tier: TierLevel;
  flags: Record<PlatformPageFlagKey, boolean>;
}

export function canAccessClient(ctx: ClientGateContext, feature: FeatureKey): GateResult {
  // Layers 0, 3, 4 only — module/tier checks require DB, handled server-side
  const roleOk = ROLE_PERMISSIONS[ctx.role]?.includes(feature) ?? false;
  if (!roleOk) return { allowed: false, reason: 'role' };

  const flagKey = FEATURE_TO_FLAG[feature];
  if (flagKey !== null && !ctx.flags[flagKey]) {
    return { allowed: false, reason: 'flag' };
  }

  const registryKey = FEATURE_TO_REGISTRY[feature];
  if (registryKey !== null) {
    const ok =
      registry.canAccessPage(ctx.role, registryKey) && registry.hasFeature(ctx.tier, registryKey);
    if (!ok) return { allowed: false, reason: 'feature' };
  }

  return { allowed: true, reason: 'allowed' };
}

export function useGateContext(): ClientGateContext {
  const { data: flags } = usePageFlags();
  const session = useSession();
  return {
    role: (session?.user?.role as Role) ?? 'RESIDENT',
    tier: normalizeTier(flags?.tier ?? 'STANDARD'),
    flags: flags?.pages ?? {},
  };
}
```

The client variant intentionally skips layers 1 and 2 (tier ceiling and module install). Those require DB access and are enforced server-side. The client uses pre-fetched flag data from `usePageFlags()`.

---

## `GateGuard` Component

Replaces `TierGuard`. Accepts either a simple fallback or a render prop when the denial reason matters.

```typescript
// src/shared/ui/GateGuard.tsx
'use client';

interface GateGuardProps {
  feature:   FeatureKey;
  children:  React.ReactNode;
  fallback?: React.ReactNode;
  render?:   (result: GateResult) => React.ReactNode;
}

export function GateGuard({ feature, children, fallback = null, render }: GateGuardProps) {
  const ctx    = useGateContext();
  const result = canAccessClient(ctx, feature);

  if (render) return <>{render(result)}</>;
  return result.allowed ? <>{children}</> : <>{fallback}</>;
}
```

Usage for upgrade prompt vs hidden:

```tsx
<GateGuard
  feature="surveys"
  render={({ result }) =>
    result.allowed ? <SurveysTab /> : result.reason === 'tier' ? <UpgradePrompt /> : null
  }
/>
```

---

## API Route Consumer Pattern

```typescript
// Canonical error code mapping
export const GATE_REASON_TO_ERROR: Record<GateReason, string> = {
  role: 'INSUFFICIENT_ROLE',
  tier: 'TIER_REQUIRED',
  module: 'MODULE_DISABLED',
  flag: 'PAGE_DISABLED',
  feature: 'FEATURE_UNAVAILABLE',
  allowed: 'OK',
};

// In a route handler:
const ctx = await resolveGateContext(tenantId, session);
const result = await canAccess(ctx, 'surveys');
if (!result.allowed) {
  return apiError(GATE_REASON_TO_ERROR[result.reason], 403);
}
```

---

## Caching Strategy

| Data               | Cache Duration            | Invalidation Tag            | Invalidated By                  |
| ------------------ | ------------------------- | --------------------------- | ------------------------------- |
| `tenants.tier`     | 10 min                    | `tenant-tier-{tenantId}`    | Tier upgrade                    |
| `platform_modules` | 10 min                    | `platform-modules`          | Deploy only                     |
| `tenant_modules`   | 5 min                     | `tenant-modules-{tenantId}` | Module install/uninstall        |
| Page flags         | 5 min                     | `flags-{tenantId}`          | `revalidatePageFlags(tenantId)` |
| Role permissions   | None (in-memory constant) | —                           | Deploy                          |
| FeatureRegistry    | None (in-memory constant) | —                           | Deploy                          |

Add `revalidateGate(tenantId)` to `src/shared/api/revalidation.ts` — calls all four tagged invalidations for a tenant at once. Call it after any module install, tier change, or flag toggle.

---

## Updated `isModuleEnabled()` Internals

The existing function is updated to use canonical types internally. External call signature is unchanged — no callsite migration needed.

```typescript
async function isModuleEnabled(tenantId: string, moduleKey: ModuleKey): Promise<boolean> {
  const [tenant, moduleDef] = await Promise.all([
    getTenantTier(tenantId),
    getModuleDefinition(moduleKey),
  ]);

  const tenantLevel = normalizeTier(tenant.tier);
  const requiredLevel = normalizeTier(moduleDef.minTier);

  if (!tierAtLeast(tenantLevel, requiredLevel)) return false;

  const installed = await getTenantModule(tenantId, moduleKey);
  return installed?.enabled ?? moduleDef.defaultEnabled;
}
```

The old `TIER_LEVELS: Record<TenantTier, number>` map is removed from this file. `TIER_ORDER` from `tiers.ts` replaces it via `tierAtLeast()`.

---

## Phase 1 File Checklist

| File                                | Action | Notes                                                                                                        |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| `src/shared/lib/constants/tiers.ts` | Modify | Add `normalizeTier()`, `tierAtLeast()`, `DB_TIER_TO_LEVEL`, `TIER_ORDER`. Remove any legacy string handling. |
| `src/shared/api/gate.ts`            | Create | `FeatureKey`, mapping tables, `GateContext`, `GateResult`, `resolveGateContext()`, `canAccess()`             |
| `src/shared/lib/gate-client.ts`     | Create | `ClientGateContext`, `canAccessClient()`, `useGateContext()`                                                 |
| `src/shared/ui/GateGuard.tsx`       | Create | Replaces `TierGuard`. Export both `GateGuard` and `GATE_REASON_TO_ERROR`.                                    |
| `src/shared/api/revalidation.ts`    | Modify | Add `revalidateGate(tenantId)`                                                                               |
| `src/entities/tenant/api/`          | Modify | Update `isModuleEnabled()` internals to use `normalizeTier()` + `tierAtLeast()`. Remove `TIER_LEVELS` map.   |
| `src/shared/api/gate.test.ts`       | Create | See test suite below.                                                                                        |

No existing callsites change in Phase 1. `canAccess()` is additive. New routes and new pages call it; existing routes migrate opportunistically in Phase 2.

---

## Test Suite

```typescript
// src/shared/api/gate.test.ts

describe('normalizeTier', () => {
  it('maps all TenantTier DB values to canonical TierLevel', () => {
    expect(normalizeTier('STANDARD')).toBe('foundation');
    expect(normalizeTier('PREMIUM')).toBe('depth');
    expect(normalizeTier('ENTERPRISE')).toBe('core');
  });

  it('passes through valid TierLevel values unchanged', () => {
    expect(normalizeTier('foundation')).toBe('foundation');
    expect(normalizeTier('depth')).toBe('depth');
    expect(normalizeTier('core')).toBe('core');
  });

  it('throws on legacy tier strings — not silently handled', () => {
    expect(() => normalizeTier('sprout')).toThrow();
    expect(() => normalizeTier('grove')).toThrow();
    expect(() => normalizeTier('forest')).toThrow();
  });

  it('throws on unknown tier strings', () => {
    expect(() => normalizeTier('gold')).toThrow();
    expect(() => normalizeTier('')).toThrow();
  });
});

describe('tierAtLeast', () => {
  it('returns true when tenant tier meets requirement', () => {
    expect(tierAtLeast('core', 'foundation')).toBe(true);
    expect(tierAtLeast('depth', 'depth')).toBe(true);
    expect(tierAtLeast('core', 'core')).toBe(true);
  });

  it('returns false when tenant tier is below requirement', () => {
    expect(tierAtLeast('foundation', 'depth')).toBe(false);
    expect(tierAtLeast('foundation', 'core')).toBe(false);
    expect(tierAtLeast('depth', 'core')).toBe(false);
  });
});

describe('mapping table completeness', () => {
  const ALL_FEATURE_KEYS: FeatureKey[] = [
    'maintenance',
    'bookings',
    'events',
    'surveys',
    'competitions',
    'groups',
    'chat',
    'news',
    'directory',
    'resources',
    'conservation',
    'services',
    'dashboard',
    'messages',
  ];

  it('every FeatureKey has an explicit FEATURE_TO_MODULE entry', () => {
    for (const key of ALL_FEATURE_KEYS) {
      expect(FEATURE_TO_MODULE).toHaveProperty(key);
    }
  });

  it('every FeatureKey has an explicit FEATURE_TO_FLAG entry', () => {
    for (const key of ALL_FEATURE_KEYS) {
      expect(FEATURE_TO_FLAG).toHaveProperty(key);
    }
  });

  it('every FeatureKey has an explicit FEATURE_TO_REGISTRY entry', () => {
    for (const key of ALL_FEATURE_KEYS) {
      expect(FEATURE_TO_REGISTRY).toHaveProperty(key);
    }
  });

  it('every non-null ModuleKey in FEATURE_TO_MODULE is a valid ModuleKey', () => {
    const VALID_MODULE_KEYS = new Set<string>([
      'directory',
      'news',
      'events',
      'groups',
      'chat',
      'resources',
      'conservation',
      'adminBasic',
      'adminIntermediate',
      'bookings',
      'surveys',
      'marketplace',
      'externalSurveys',
      'maintenance',
      'property',
      'agentGateway',
      'analytics',
      'adminAdvanced',
    ]);
    for (const [feature, moduleKey] of Object.entries(FEATURE_TO_MODULE)) {
      if (moduleKey !== null) {
        expect(VALID_MODULE_KEYS).toContain(moduleKey);
      }
    }
  });
});

describe('GATE_REASON_TO_ERROR', () => {
  it('covers all GateReason values', () => {
    const ALL_REASONS: GateReason[] = ['role', 'tier', 'module', 'flag', 'feature', 'allowed'];
    for (const reason of ALL_REASONS) {
      expect(GATE_REASON_TO_ERROR).toHaveProperty(reason);
    }
  });
});
```

---

## Grep Checklist — Run Before Closing Phase 1

```bash
# Confirm no legacy tier strings remain in source
grep -r "sprout\|grove\|forest" src/ --include="*.ts" --include="*.tsx"

# Confirm old TIER_LEVELS map is removed
grep -r "TIER_LEVELS" src/

# Confirm TierGuard callsites (migrate in Phase 2, but know the count)
grep -r "TierGuard" src/ --include="*.tsx" | wc -l

# Confirm isModuleEnabled still compiles and has no TIER_LEVELS reference
grep -r "TIER_LEVELS" src/entities/tenant/
```

---

## What Phase 2 Looks Like (Not Blocking Phase 1)

- New routes call `canAccess()` instead of individual gate functions
- Existing routes migrate when touched for other reasons
- `TierGuard` callsites migrate to `GateGuard` opportunistically
- `isModuleEnabled()` direct calls in routes are replaced by `canAccess()` layer 2

Phase 2 has no deadline — the system is correct and consistent after Phase 1. Phase 2 is cleanup, not correctness.
