This is solid feedback. Let me work through the gaps systematically.

---

## Revised Design: `canAccess()` with the Missing Pieces

### 1. Canonical Feature Key Namespace

The three systems use incompatible key formats today. The unified namespace uses the module key as the canonical identifier — it's already the most stable and least ambiguous of the three:

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
// ... all 15 page flags; these are the canonical surface keys
// sub-features use dot notation: 'maintenance.updates', 'surveys.external'
```

The mapping tables then translate from `FeatureKey` → each system's internal key:

```typescript
// Static mapping tables — the core artifact

export const FEATURE_TO_MODULE: Record<FeatureKey, ModuleKey | null> = {
  maintenance:  'maintenance',
  bookings:     'bookings',
  surveys:      'surveys',
  events:       'events',
  groups:       'groups',
  chat:         'chat',
  news:         'news',
  directory:    'directory',
  resources:    'resources',
  conservation: 'conservation',
  services:     'marketplace',
  competitions: null,  // no module gate — competitions are always available if page flag is on
  dashboard:    null,
  messages:     'chat',  // shares the chat module
};

export const FEATURE_TO_FLAG: Record<FeatureKey, PlatformPageFlagKey | null> = {
  maintenance:  'maintenance',
  bookings:     'bookings',
  surveys:      'surveys',
  events:       'events',
  groups:       'groups',
  chat:         'chat',
  news:         'news',
  directory:    'directory',
  resources:    'resources',
  conservation: 'conservation',
  services:     'services',
  competitions: 'competitions',
  dashboard:    'dashboard',
  messages:     'messages',
};

export const FEATURE_TO_REGISTRY: Record<FeatureKey, string | null> = {
  maintenance:  'page.maintenance',
  surveys:      'page.surveys',
  // null = no registry entry; feature is fully controlled by the layers above
  competitions: null,
  ...
};
```

`null` values are intentional and load-bearing — they document that a feature has no gate at that layer, rather than leaving it implicit. The CI test validates completeness of all three tables against their respective source enums.

---

### 2. Five Layers — Role Is Layer 0

Role-based access is a prerequisite, not a filter within the gate chain. It runs before tier because there's no point checking tier if the user's role can't access the feature at all regardless of tier. The revised model:

```
Role → Tier → Module → PageFlag → FeatureToggle
  0      1       2         3            4
```

```typescript
export type GateReason =
  | 'role' // user's role cannot access this feature at all
  | 'tier' // tenant's subscription tier doesn't include this module
  | 'module' // module exists at tier but not installed for this tenant
  | 'flag' // tenant admin disabled this page flag
  | 'feature' // developer-controlled toggle (unreleased, A/B, etc.)
  | 'allowed';

export interface GateResult {
  allowed: boolean;
  reason: GateReason;
}
```

The role check is a synchronous lookup against `ROLE_PERMISSIONS` — the existing map in `src/entities/tenant/api/permissions.ts`. It stays synchronous to avoid adding a DB round-trip for a check that never changes at runtime.

---

### 3. Server vs Client Split — Two Variants, One Contract

The asymmetry is real and can't be hidden. The server variant does DB resolution; the client variant consumes pre-fetched data. Both return `GateResult` with the same shape.

```typescript
// src/shared/api/gate.ts — SERVER variant (async, DB access)

export async function canAccess(
  ctx: GateContext, // { tenantId, role, tier } — resolved once per request
  feature: FeatureKey,
  opts?: { skipFlag?: boolean } // escape hatch for admin-panel routes that bypass flags
): Promise<GateResult>;

// src/shared/lib/gate-client.ts — CLIENT variant (sync, pre-fetched data)

export function canAccessClient(
  ctx: ClientGateContext, // { role, tier, flags: Record<PlatformPageFlagKey, boolean> }
  feature: FeatureKey
): GateResult;
```

`GateContext` is resolved once per request at the middleware or layout level, not per feature check:

```typescript
// In a route handler or server component:
const ctx = await resolveGateContext(tenantId, session);
// ctx = { tenantId, role, tier } — fetches tenant tier once, cached for request

const maintenance = await canAccess(ctx, 'maintenance');
const surveys = await canAccess(ctx, 'surveys');
// These share the same ctx — no repeated tenant/tier fetch
```

For client components, the existing `usePageFlags()` hook already fetches the flags bundle. It's extended to also carry tier:

```typescript
// Extended hook — replaces direct flag reads in client components
export function useGateContext(): ClientGateContext {
  const { data: flags } = usePageFlags();
  const session = useSession();
  return {
    role: session?.user?.role ?? 'RESIDENT',
    tier: flags?.tier ?? 'foundation',
    flags: flags?.pages ?? {},
  };
}
```

Client-side TierGuard components then call `canAccessClient()` instead of `hasFeature()` directly. The migration is mechanical — `hasFeature(role, 'page.maintenance')` → `canAccessClient(ctx, 'maintenance')`.

---

### 4. Caching Strategy

Three tiers of cache, each matching the update frequency of its source:

```
┌─────────────────────────────────────────────────────────────┐
│  Tenant tier        │ Cache: 10 min (tenant.tier rarely     │
│  (DB: tenants)      │ changes; TTL matches ISR revalidate)  │
├─────────────────────────────────────────────────────────────┤
│  Module enabled     │ Cache: 5 min per tenantId+moduleKey   │
│  (DB: tenant_modules│ Invalidated by: revalidateTenantModules│
│  + platform_modules)│                                       │
├─────────────────────────────────────────────────────────────┤
│  Page flags         │ Cache: already cached via usePageFlags │
│  (DB: settings)     │ Server: unstable_cache, tag: flags-{tid}│
│                     │ Invalidated by: revalidatePageFlags()  │
├─────────────────────────────────────────────────────────────┤
│  Role permissions   │ No cache needed — in-memory constant  │
│  FeatureRegistry    │ No cache needed — in-memory constant  │
└─────────────────────────────────────────────────────────────┘
```

`GateContext` is request-scoped — resolved once via `resolveGateContext()` and passed down. This means a route handler that calls `canAccess()` five times does one DB fetch for tier, one for modules (batched), and zero for role/feature. The existing `revalidation.ts` already has `revalidateDashboard()` and `revalidateContent()` — a `revalidateGate(tenantId)` function is added that invalidates tier + module + flag caches for a given tenant, called after any module install/uninstall or flag toggle.

---

### 5. Gate Result Consumer Patterns

Three current consumption patterns, each with a migration target:

**Pattern A — Boolean conditional render (most common):**

```tsx
// Before
if (!isModuleEnabled(tenantId, 'surveys')) return null;

// After (server component)
const result = await canAccess(ctx, 'surveys');
if (!result.allowed) return null;

// After (client component)
const ctx = useGateContext();
const result = canAccessClient(ctx, 'surveys');
if (!result.allowed) return null;
```

**Pattern B — TierGuard wrapper component:**

```tsx
// Before
<TierGuard feature="page.surveys">
  <SurveysTab />
</TierGuard>

// After — GateGuard wraps canAccessClient internally
<GateGuard feature="surveys">
  <SurveysTab />
</GateGuard>
```

`GateGuard` replaces `TierGuard`. It renders `children` on `allowed`, a `fallback` prop (default: `null`) on `!allowed`. For cases where the reason matters (showing an upgrade prompt vs a "coming soon" vs just hiding), it accepts a render prop:

```tsx
<GateGuard
  feature="surveys"
  render={({ result }) =>
    result.reason === 'tier' ? (
      <UpgradePrompt />
    ) : result.reason === 'flag' ? null : ( // admin turned it off — don't explain
      <SurveysTab />
    )
  }
/>
```

**Pattern C — Route-level guard (API routes):**

```typescript
// Before
const moduleOk = await isModuleEnabled(tenantId, 'surveys');
if (!moduleOk) return apiError('MODULE_DISABLED', 403);

// After
const result = await canAccess(ctx, 'surveys');
if (!result.allowed) return apiError(GATE_REASON_TO_ERROR[result.reason], 403);

const GATE_REASON_TO_ERROR: Record<GateReason, string> = {
  role: 'INSUFFICIENT_ROLE',
  tier: 'TIER_REQUIRED',
  module: 'MODULE_DISABLED',
  flag: 'PAGE_DISABLED',
  feature: 'FEATURE_UNAVAILABLE',
  allowed: 'OK',
};
```

This also fixes the current inconsistency where some routes return `403`, some return `404`, and some return `200` with an empty body when a module is disabled. The canonical mapping above standardises the HTTP semantics.

---

### 6. Observability

`canAccess()` logs exactly one structured line per call on `false` results, zero on `allowed` results (to keep noise low):

```typescript
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
```

This answers the support question "why can't tenant X see feature Y?" in a single log query: `event=gate.denied tenantId=<X> feature=surveys`. The `reason` field immediately narrows whether it's a tier/billing issue, a module configuration issue, an admin toggle, or a code deploy.

---

### The Phase 1 Deliverable (1 day, still)

The mapping tables + CI test remain the highest-leverage starting point. Phase 1 now has a sharper scope:

1. `src/shared/api/gate.ts` — `FeatureKey` type, `FEATURE_TO_MODULE`, `FEATURE_TO_FLAG`, `FEATURE_TO_REGISTRY` mapping tables, `GateResult`/`GateReason` types, `canAccess()` server function
2. `src/shared/lib/gate-client.ts` — `canAccessClient()` sync function, `useGateContext()` hook
3. `src/shared/api/gate.test.ts` — CI test asserting every `FeatureKey` maps to a valid entry (or explicit `null`) in all three tables; every `ModuleKey` referenced in the tables exists in the `platform_modules` seed; every `PlatformPageFlagKey` referenced exists in the flags enum
4. `src/shared/ui/GateGuard.tsx` — client component replacing `TierGuard`, consuming `canAccessClient()`

No existing callsites change in Phase 1. `canAccess()` is additive. The CI test is the safety net that prevents future drift.
