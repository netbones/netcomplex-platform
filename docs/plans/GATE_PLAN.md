# Feature Gate Consolidation Plan

> **Last updated:** 2026-06-01
> **Status:** Design complete, Phase 1 ready to execute
> **Related docs:** `docs/GATE_DISCUSSION.md` (original proposal), `docs/GATE_ADDENDUM.md` (revised design with gap resolutions), `docs/UBIQUITOUS_LANGUAGE.md` C2 (conflict C2 origin), `docs/HOLISTIC.md` (cross-context impact)

---

## Problem Statement

Three overlapping feature gating systems create undocumented precedence and ad-hoc callsite decisions:

1. **TierGuard / FeatureRegistry** — 30+ fine-grained toggles, evaluated client-side, keyed as `page.*`, `feature.*`, `widget.*`
2. **Module Gate** — `isModuleEnabled(tenantId, moduleKey)` — DB-backed, 18 module keys, tier-aware
3. **PlatformPageFlags** — 15 boolean DB-stored flags per tenant, set via admin settings UI

`maintenance` appears in all three. Every developer adding a feature must grep three files to understand the full gate chain. Tracked as UBIQUITOUS_LANGUAGE.md conflict **C2**.

---

## Solution Summary

The three systems operate at genuinely different concerns (tier ceiling → module installation → page visibility → UI element toggles). The fix is to **formalise the hierarchy and provide a single entry point that enforces it** — not to collapse them.

### The 5-Layer Precedence Model

```
Role → Tier → Module → PageFlag → FeatureToggle
  0      1       2         3            4
```

| Layer                | Mechanism                                   | What It Controls                                      | Who Sets It                  | Update Cadence |
| -------------------- | ------------------------------------------- | ----------------------------------------------------- | ---------------------------- | -------------- |
| **0: Role**          | `ROLE_PERMISSIONS` (in-memory)              | Whether the user's role can access the feature at all | Code (deploy)                | Never          |
| **1: Tier**          | `platform_modules.minTier` vs `tenant.tier` | Maximum possible capability                           | Platform team                | Quarterly      |
| **2: Module**        | `tenant_modules.enabled`                    | Whether a capability bundle is installed              | Tenant onboarding / settings | Per onboarding |
| **3: PageFlag**      | `settings` table, 15 keys                   | Whether a page/section is visible to residents        | Tenant admin (UI toggle)     | Weekly         |
| **4: FeatureToggle** | `FeatureRegistry` in-memory                 | Fine-grained UI element toggles                       | Code (deploy)                | Per deploy     |

### Core Artefact: Three Mapping Tables

`FEATURE_TO_MODULE`, `FEATURE_TO_FLAG`, `FEATURE_TO_REGISTRY` — explicit lookup from canonical `FeatureKey` to each system's internal key. Explicit `null` values document that a feature has no gate at that layer. The CI test validates completeness.

### Single Entry Point: `canAccess()`

```typescript
// Server
canAccess(ctx: GateContext, feature: FeatureKey, opts?: { skipFlag?: boolean }): Promise<GateResult>

// Client (sync, uses pre-fetched data)
canAccessClient(ctx: ClientGateContext, feature: FeatureKey): GateResult
```

`GateContext` resolved once per request at middleware/layout level, not per feature check.

---

## Canonical FeatureKey Namespace

15 keys covering all current page flags. Module key used as canonical identifier (most stable, least ambiguous of the three systems' key formats).

```typescript
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
// Sub-features use dot notation: 'maintenance.updates', 'surveys.external'
```

---

## Phase Breakdown

### Phase 1: Foundation (1 day) — **READY TO EXECUTE**

**Goal:** Additive introduction of `canAccess()` infrastructure. No existing callsites change.

**Deliverables:**

1. **`src/shared/api/gate.ts`** — `FeatureKey` type, three mapping tables, `GateResult`/`GateReason` types, `canAccess()` server function
2. **`src/shared/lib/gate-client.ts`** — `canAccessClient()` sync function, `useGateContext()` hook
3. **`src/shared/api/gate.test.ts`** — CI test asserting:
   - Every `FeatureKey` maps to a valid entry (or explicit `null`) in all three tables
   - Every `ModuleKey` referenced in tables exists in `platform_modules` seed
   - Every `PlatformPageFlagKey` referenced exists in the flags enum
4. **`src/shared/ui/GateGuard.tsx`** — client component replacing `TierGuard`, consuming `canAccessClient()`

**Acceptance Criteria:**

- [ ] ⏳ All four files exist with full TypeScript types
- [ ] ⏳ `npm test` passes with the new gate test
- [ ] ⏳ `npm run typecheck` passes
- [ ] ⏳ No existing callsites modified
- [ ] ⏳ `canAccess()` is exported and callable but unused in production code

**Risk:** Low — purely additive. CI test prevents future drift even before migration begins.

---

### Phase 2: Incremental Migration (opportunistic, 1-2 weeks)

**Goal:** New routes and new pages call `canAccess()` instead of the three individual systems. Existing routes migrated opportunistically when touched for other reasons.

**Strategy:** Mechanical replacements per consumer pattern:

#### Pattern A — Boolean conditional render

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

#### Pattern B — TierGuard wrapper → GateGuard

```tsx
// Before
<TierGuard feature="page.surveys">
  <SurveysTab />
</TierGuard>

// After
<GateGuard feature="surveys">
  <SurveysTab />
</GateGuard>
```

For cases where the `reason` matters (upgrade prompt vs "coming soon" vs hidden), `GateGuard` accepts a render prop:

```tsx
<GateGuard
  feature="surveys"
  render={({ result }) =>
    result.reason === 'tier' ? <UpgradePrompt /> : result.reason === 'flag' ? null : <SurveysTab />
  }
/>
```

#### Pattern C — API route guard

```typescript
// Before
const moduleOk = await isModuleEnabled(tenantId, 'surveys');
if (!moduleOk) return apiError('MODULE_DISABLED', 403);

// After — standardised HTTP semantics
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

**This fixes the current inconsistency** where some routes return `403`, some return `404`, and some return `200` with an empty body when a module is disabled.

**Acceptance Criteria:**

- [ ] ⏳ All new routes (post-Phase 1) use `canAccess()` or `canAccessClient()`
- [ ] ⏳ Migration progress tracked per-entity in `docs/contexts/*.md` "Migration Status" sections
- [ ] ⏳ No regression in feature visibility (existing behaviour preserved)

**Risk:** Low — opportunistic migration. Each touch is reviewed, not bulk-refactored.

---

### Phase 3: Cleanup (after all callsites migrated)

**Goal:** The three individual systems become implementation details behind `canAccess()`. Their public exports restricted or removed.

**Tasks:**

1. Audit remaining callsites of `isModuleEnabled`, `usePageFlags` direct reads, `TierGuard`, `hasFeature`
2. Move `FEATURE_TO_MODULE`/`FEATURE_TO_FLAG`/`FEATURE_TO_REGISTRY` tables to `@shared/api/gate` (already there after Phase 1)
3. Restrict exports of `isModuleEnabled` if no longer used externally
4. Keep `FeatureRegistry` and `RolePermissions` as internal implementation details
5. Update `docs/UBIQUITOUS_LANGUAGE.md` C2 status from "Open" to "Resolved"

**Acceptance Criteria:**

- [ ] ⏳ All three legacy systems are internal-only
- [ ] ⏳ `canAccess()` / `canAccessClient()` / `GateGuard` are the only public gate API
- [ ] ⏳ CI test continues to pass
- [ ] ⏳ `docs/UBIQUITOUS_LANGUAGE.md` C2 marked resolved

**Risk:** Medium — needs careful audit. But the migration is incremental so risk compounds gradually.

---

## Caching Strategy

Three cache tiers, each matching the update frequency of its source:

| Source                | Cache                               | TTL                         | Invalidation                                          |
| --------------------- | ----------------------------------- | --------------------------- | ----------------------------------------------------- |
| `tenants.tier`        | Request-scoped via `GateContext`    | Per-request (resolved once) | Tier change → `revalidateGate(tenantId)`              |
| `tenant_modules`      | Existing 5-min cache                | 5 min                       | Module install/uninstall → `revalidateGate(tenantId)` |
| `settings` (PageFlag) | Already cached via `usePageFlags()` | Per-tenant                  | Flag toggle → `revalidateGate(tenantId)`              |
| `ROLE_PERMISSIONS`    | None (in-memory constant)           | —                           | —                                                     |
| `FeatureRegistry`     | None (in-memory constant)           | —                           | —                                                     |

`revalidateGate(tenantId)` plugs into the existing `revalidation.ts` pattern (alongside `revalidateDashboard()`, `revalidateContent()`).

**Performance characteristic:** A route handler that calls `canAccess()` 5 times does **one** DB fetch for tier, **one** batched fetch for modules, and **zero** for role/feature. No regression from current behaviour.

---

## Server vs Client Split

The asymmetry between server (DB access) and client (pre-fetched data) is real and cannot be hidden. Two variants, one contract:

| Variant             | Location                        | Async?      | Data Source                                 |
| ------------------- | ------------------------------- | ----------- | ------------------------------------------- |
| `canAccess()`       | `src/shared/api/gate.ts`        | Yes (async) | DB: `tenants`, `tenant_modules`, `settings` |
| `canAccessClient()` | `src/shared/lib/gate-client.ts` | No (sync)   | `useGateContext()` hook → pre-fetched data  |

Both return `GateResult` with the same shape, so consumer code is identical.

**Client-side migration:** `useGateContext()` extends the existing `usePageFlags()` hook to also carry tier. `GateGuard` replaces `TierGuard` mechanically.

---

## Observability

`canAccess()` logs exactly **one structured line per call on `false` results**, zero on `allowed` results (to keep noise low):

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

**Answers the support question "why can't tenant X see feature Y?" in a single log query:**

```
event=gate.denied tenantId=<X> feature=surveys
```

The `reason` field immediately narrows whether it's a tier/billing issue, a module configuration issue, an admin toggle, or a code deploy.

---

## Files to Create

| Path                            | Purpose                                             |
| ------------------------------- | --------------------------------------------------- |
| `src/shared/api/gate.ts`        | Server `canAccess()`, types, mapping tables         |
| `src/shared/lib/gate-client.ts` | Client `canAccessClient()`, `useGateContext()` hook |
| `src/shared/api/gate.test.ts`   | CI test for mapping completeness                    |
| `src/shared/ui/GateGuard.tsx`   | Client component replacing `TierGuard`              |

## Files to Modify (Phase 2+)

| Path                             | Change                                                      |
| -------------------------------- | ----------------------------------------------------------- |
| `src/shared/api/revalidation.ts` | Add `revalidateGate(tenantId)`                              |
| Per-entity context docs          | Add "Migration Status" section, update as callsites migrate |
| `docs/UBIQUITOUS_LANGUAGE.md`    | Mark C2 as Resolved (Phase 3)                               |
| `docs/HOLISTIC.md`               | Update progress log                                         |

---

## Decision Log

| Date       | Decision                                               | Rationale                                                                                       |
| ---------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| 2026-06-01 | Module key as canonical FeatureKey namespace           | Most stable, least ambiguous of the three systems' key formats                                  |
| 2026-06-01 | Role as Layer 0 (prerequisite)                         | No point checking tier if role can't access the feature regardless                              |
| 2026-06-01 | Explicit `null` values in mapping tables               | Load-bearing — documents that a feature has no gate at that layer, rather than leaving implicit |
| 2026-06-01 | Two variants of `canAccess()` (server/client)          | Asymmetry is real; cannot be hidden behind one function                                         |
| 2026-06-01 | One log per `false` result, zero on `allowed`          | Support debugging without log noise on the happy path                                           |
| 2026-06-01 | `GATE_REASON_TO_ERROR` standardises HTTP semantics     | Fixes current `403`/`404`/`200-empty` inconsistency                                             |
| 2026-06-01 | Phase 1 is additive only, no existing callsites change | Zero-breaking-changes migration; CI test is the safety net                                      |

---

## Open Questions

None currently. The addendum resolved all 7 gaps from my initial evaluation:

- Canonical namespace ✓
- Role as Layer 0 ✓
- Server/client split ✓
- Caching strategy ✓
- Consumer patterns ✓
- Observability ✓
- Role of role ✓

---

## Next Steps

1. Execute Phase 1 (1 day) — 4 files, 1 CI test, no callsite changes
2. Begin Phase 2 opportunistic migration on the next entity touched
3. Track migration progress in per-entity context docs
4. Mark UBIQUITOUS_LANGUAGE.md C2 as Resolved upon Phase 3 completion
