---
title: FEATURE GATE DISCUSSION
status: current
reviewed: 2026-07-28
tags: [discussion, proposal]
audience: developer
---

# FEATURE GATE DISCUSSION

The triple gating system is:

1. **TierGuard / FeatureRegistry** — 30+ fine-grained toggles, evaluated client-side, keyed as `page.*`, `feature.*`, `widget.*`
2. **Module Gate** — `isModuleEnabled(tenantId, moduleKey)` — DB-backed, 18 module keys, tier-aware
3. **PlatformPageFlags** — 15 boolean DB-stored flags per tenant, set via admin settings UI

The problem is that these three systems overlap (e.g., `maintenance` appears in all three), the precedence is undocumented, and any consumer has to know which gate to consult for which decision.

Here's a concrete proposal:

---

## Proposed Solution: Layered Gate Consolidation

The three systems don't need to be collapsed into one — they legitimately operate at different levels. What's broken is that **the layers are unnamed, their precedence is undocumented, and callsites make ad-hoc decisions about which layer to query**. The fix is to formalise the hierarchy and provide a single entry point that enforces it.

### The Four-Layer Precedence Model

Every feature visibility decision should travel through exactly one function: `canAccess(tenantId, feature, role)`. Internally, it evaluates four gates in order, short-circuiting at the first `false`:

```
TierLevel → ModuleEnabled → PageFlag → FeatureToggle
```

| Layer        | Mechanism                                   | What It Controls                               | Who Sets It                  |
| ------------ | ------------------------------------------- | ---------------------------------------------- | ---------------------------- |
| **Tier**     | `platform_modules.minTier` vs `tenant.tier` | Maximum possible capability                    | Netbones / Platform team     |
| **Module**   | `tenant_modules.enabled`                    | Whether a capability bundle is installed       | Tenant onboarding / settings |
| **PageFlag** | `settings` table, 15 keys                   | Whether a page/section is visible to residents | Tenant admin (UI toggle)     |
| **Feature**  | `FeatureRegistry` in-memory                 | Fine-grained UI element toggles                | Code (deployment-time)       |

The current confusion arises because PageFlag and FeatureRegistry both answer "is this page visible?" — one from DB, one from code. The resolution is to reframe their responsibilities:

- **PageFlag** → tenant operator's runtime choice ("we turned off the Surveys page this month")
- **FeatureRegistry** → developer's gating of unreleased or tier-inappropriate UI elements ("this widget only renders for premium tier users")

These are genuinely different concerns and can coexist, as long as the precedence is explicit.

### The Single Entry Point

Create `src/shared/api/gate.ts`:

```typescript
export async function canAccess(
  tenantId: string,
  feature: FeatureKey, // 'maintenance' | 'surveys' | 'events' | etc.
  role: Role
): Promise<GateResult> {
  // Layer 1: Tier check (is this tenant's tier high enough to have the module?)
  const moduleKey = FEATURE_TO_MODULE[feature];
  const tierOk = await isTierSufficient(tenantId, moduleKey);
  if (!tierOk) return { allowed: false, reason: 'tier' };

  // Layer 2: Module installed? (tenant chose to install it during onboarding)
  const moduleOk = await isModuleEnabled(tenantId, moduleKey);
  if (!moduleOk) return { allowed: false, reason: 'module' };

  // Layer 3: Page flag (tenant admin toggled it off this month)
  const flagKey = FEATURE_TO_FLAG[feature];
  if (flagKey) {
    const flagOk = await getPageFlag(tenantId, flagKey);
    if (!flagOk) return { allowed: false, reason: 'flag' };
  }

  // Layer 4: Feature registry (developer-controlled, in-memory)
  const featureOk = registry.canAccessPage(role, feature);
  if (!featureOk) return { allowed: false, reason: 'feature' };

  return { allowed: true };
}
```

The two mapping tables (`FEATURE_TO_MODULE`, `FEATURE_TO_FLAG`) are the core artefact — they make the relationship explicit in one place rather than scattered across callsites.

### Migration Path (Zero Breaking Changes)

The existing callsites (`isModuleEnabled`, `usePageFlags`, `TierGuard`) don't need to change immediately. The migration is additive:

**Phase 1 (1 day):** Add `src/shared/api/gate.ts` with the mapping tables and `canAccess()`. Write the mapping tables by auditing the 15 PageFlag keys, 18 ModuleKeys, and 30+ FeatureRegistry entries. Add a test that asserts every PageFlag key maps to a ModuleKey (catches drift at CI time).

**Phase 2 (incremental):** New routes and new pages call `canAccess()` instead of the three individual systems. Existing routes are migrated opportunistically — when a route is touched for another reason, replace the ad-hoc gate calls with `canAccess()`.

**Phase 3 (cleanup):** Once all callsites are migrated, the three individual systems become implementation details behind `canAccess()`. Their public exports can be restricted or removed.

### What NOT to Do

Don't merge the three systems into one DB table or one in-memory structure. They live at genuinely different update frequencies: tier limits change quarterly when Netbones reprices, module installations change when a tenant onboards or upgrades, page flags change weekly by tenant admins, and feature toggles change at deploy time. Merging them would create a hydration/caching nightmare and violate the principle that platform-team concerns shouldn't be editable by tenant admins.

### The Missing Artefact Today

The most impactful single thing missing is the **mapping table** — a lookup that says "`maintenance` module key maps to the `maintenance` page flag and the `page.maintenance` feature registry key." Without it, every developer who adds a new feature has to grep three separate files to understand the full gate chain. Adding this table and a CI test that validates it is complete covers the most risk with minimal change.

---

In short: the three layers are fine as separate mechanisms — the problem is undocumented precedence and no single resolution path. The fix is `canAccess()` + mapping tables + a CI-enforced mapping completeness check, introduced incrementally without touching existing callsites.

## Evaluation of the Proposal

Does it solve the problem? Yes, with caveats. Let me work through this carefully.

## What's Right

1. The four-layer precedence model is correct. The mechanisms operate at genuinely different concerns (tier ceiling → module installation → page visibility → UI element toggles). Forcing them into one table would be wrong because their update cadences differ (quarterly → onboarding → weekly → deploy).

2. The canAccess() entry point is the right primitive. A single function with a GateResult that includes a reason is exactly what callers need — it answers "can I see this?" and "why not?" in one call. This pattern matches well with what already exists in src/shared/api/feature-gate.ts.

3. The zero-breaking-changes migration path is pragmatic. Phase 1 (additive, 1 day), Phase 2 (opportunistic), Phase 3 (cleanup) is the right rhythm for a system that has 150+ routes and dozens of feature-gated components. Forcing a big-bang migration would block other work.

4. The CI test for mapping completeness is the highest-leverage piece. Drift between the three systems is exactly the kind of bug that surfaces in production ("surveys disappeared for a tenant") and a static test catches it before deploy. This is the single most valuable addition.

5. The "what not to do" section is well-reasoned. Merging into one DB table or one in-memory structure would be a regression. The proposal correctly identifies this.

## What's Missing or Weak

1. Caching strategy is undefined. canAccess() does at least 3 DB round-trips per call. For a page render that checks 5+ features, that's 15+ queries. The current isModuleEnabled and usePageFlags already have caching. The proposal needs to address: (a) what gets cached, (b) invalidation on tier/module/flag changes, (c) request-scoped vs tenant-scoped cache. Without this, the function will be a performance regression in production.

2. Server vs client split is unclear. Tier and Module checks require DB access (server-only). FeatureRegistry is in-memory (works on both). PageFlag is DB-backed (server, or pre-fetched via usePageFlags hook). The proposal shows canAccess() as async with tenantId, which makes it server-only. What about client-side gates (conditional rendering, tab visibility)? Does canAccess() have a server variant and a client variant, or is the client expected to pass pre-fetched data? This is a critical gap — the existing system has TierGuard as a client component.

3. Role-based access is bolted on, not integrated. The function takes role as a parameter, but the four-layer model doesn't include role as a layer. Where does ROLE_PERMISSIONS fit? Is it a fifth layer before tier, after feature, or interleaved with feature? The current FeatureRegistry.canAccessPage(role, ...) does role-aware checks, but the proposal collapses this into layer 4 without explaining the relationship.

4. The mapping tables are described but not shown. FEATURE_TO_MODULE and FEATURE_TO_FLAG are the core artefact, but the proposal doesn't show what they look like. Are they static const objects? Are they derived from Prisma schema? Do they live in the DB? A 1-day Phase 1 deliverable should at least sketch the table structure.

5. The feature key namespace is ambiguous. feature parameter accepts 'maintenance' | 'surveys' | ... — is this a ModuleKey? A FeatureRegistry key? A PageFlag key? A new unified namespace? The three systems use different key formats (maintenance vs page.maintenance vs maintenance). The proposal needs a canonical key format.

6. No mention of observability. If canAccess() is the single entry point, it's also the single point to instrument. How many false results? Which reason? Which tenant? This is a chance to add structured logging that helps debug "why can't tenant X see feature Y?" — a common support request pattern.

7. No mention of the gate result consumer pattern. The current code uses gates in three different ways: (a) boolean conditional render,
