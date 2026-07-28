# COMMUNIQUE-03 — Tier Gating System Architecture Review

**Status:** Open for review
**Date:** 2026-06-23
**Trigger:** Bookings submission returning `"This feature is not available for your community"` despite the UI allowing full form interaction.
**Scope:** Gate architecture audit, client/server asymmetry, domain-card UX, Soralia tier misalignment.

---

## 1. Problem Statement

### 1.1 — Immediate symptom

A user navigates to `/bookings`, fills the booking form in full, submits, and receives:

> "This feature is not available for your community" (403)

The UX is broken: no indication before submission that the feature is gated. The form renders, accepts input, feels live — then fails silently at the server.

### 1.2 — Root cause (narrow)

Soralia Village tenant has `tier: STANDARD` (tier level 1). The `bookings` `PlatformModule` has `minTier: PREMIUM` (tier level 2). The server-side `isModuleEnabled()` rejects the request at the tier comparison.

**But this is not a configuration bug.** The tier mismatch is intentional — Soralia Village is on the STANDARD tier during active development. The real problem is that the client has no way to know which features are gated.

### 1.3 — Root cause (architectural)

The 5-layer gate system is **server-side only**. The client-side counterpart (`canAccessClient()` at `src/features/gate/model/gate.ts:84`) skips Layer 1 (Tier) and Layer 2 (Module) because they require database access. This means:

- Every gated feature renders fully interactive UI
- Users can navigate to gated pages, fill forms, attempt mutations
- The only feedback is a 403 after submission
- Domain cards (services dashboard, admin dashboard) show all features as available

---

## 2. Current Architecture: The 5-Layer Gate

**File:** `src/entities/tenant/api/gate/gate.ts:119-175`

`canAccess()` evaluates layers in order — first false wins:

| Layer | Name          | Source                             | Client-visible?  | Example                         |
| ----- | ------------- | ---------------------------------- | ---------------- | ------------------------------- |
| **0** | Role          | `ROLE_PERMISSIONS[role]`           | Yes (static)     | RESIDENT has `bookings: true`   |
| **1** | Tier          | Tenant tier vs module `minTier`    | **No**           | STANDARD < PREMIUM → fail       |
| **2** | Module        | `isModuleEnabled()` DB-backed      | **No**           | `TenantModule.enabled` override |
| **3** | PageFlag      | `settings.value` per-tenant toggle | Yes (cached)     | `page_bookings_enabled`         |
| **4** | FeatureToggle | Vercel Feature Flag registry       | Yes (precompute) | `page.bookings` tier check      |

### 2.1 — How each route gates (inconsistent)

| Route                     | Gate mechanism                                 | Layer coverage             |
| ------------------------- | ---------------------------------------------- | -------------------------- |
| `POST /api/bookings`      | `assertModuleEnabled('bookings')`              | Layer 2 only               |
| `GET /api/bookings`       | `assertModuleEnabled('bookings')`              | Layer 2 only               |
| `GET /api/admin/bookings` | `requireAnyPermission(['bookings'])`           | Layer 0 only               |
| Various admin routes      | `canAccess(ctx, { module: 'bookings' })`       | Layers 0-2                 |
| Various page routes       | `canAccessClient(ctx, { module: 'bookings' })` | Layers 0, 3, 4 (skip 1, 2) |

**Key gap:** Routes gate differently. Some use the full `canAccess`, some use `assertModuleEnabled` (Layer 2 only), some use permission-only checks. There is no single enforcement point.

### 2.2 — PlatformModule vs TenantModule

```
PlatformModule          TenantModule
──────────────          ────────────
moduleKey (PK)     ──→  moduleKey
minTier                  tenantId
defaultEnabled           enabled (override)
```

- `PlatformModule` defines the module's minimum tier and default state.
- `TenantModule` allows per-tenant overrides (e.g., a STANDARD tenant can have bookings enabled via an explicit override row).
- `isModuleEnabled()` checks `TenantModule` first; falls back to `PlatformModule.defaultEnabled` and tier comparison.

### 2.3 — Seeded values (as of 2026-06-23)

| Module         | minTier    | defaultEnabled | Soralia (STANDARD) |
| -------------- | ---------- | -------------- | ------------------ |
| `chat`         | STANDARD   | true           | ✅ Accessible      |
| `directory`    | STANDARD   | true           | ✅ Accessible      |
| `maintenance`  | STANDARD   | true           | ✅ Accessible      |
| `events`       | STANDARD   | true           | ✅ Accessible      |
| `groups`       | STANDARD   | true           | ✅ Accessible      |
| `surveys`      | STANDARD   | true           | ✅ Accessible      |
| `resources`    | STANDARD   | true           | ✅ Accessible      |
| `content`      | STANDARD   | true           | ✅ Accessible      |
| `competitions` | PREMIUM    | false          | ❌ Gated           |
| `bookings`     | PREMIUM    | false          | ❌ Gated           |
| `providers`    | PREMIUM    | false          | ❌ Gated           |
| `settings`     | PREMIUM    | false          | ❌ Gated           |
| `conservation` | PREMIUM    | false          | ❌ Gated           |
| `campaign`     | ENTERPRISE | false          | ❌ Gated           |

**Observation:** 5 of 14 modules are gated for Soralia Village on STANDARD tier. None of these gates are reflected in the UI.

---

## 3. UX Defects from Client/Server Gate Asymmetry

### 3.1 — Pages render fully, fail at submission

**Affected:** `/bookings`, `/competitions`, `/providers/*`, `/settings/*`

User can navigate to the page, see the full form, enter data, and only learns it's gated when the server returns 403. This is the worst possible UX for a gated feature — the user invests effort before learning they cannot proceed.

### 3.2 — Domain cards show all features as active

**Affected:** Services dashboard widget cards, admin dashboard feature cards

Both dashboards render feature cards (e.g., "Book a facility", "Create competition", "Provider directory") without any visual indication of tier-gating. Cards are clickable and navigate to pages that may reject the user at the server.

### 3.3 — Navigation shows gated routes

**Affected:** Sidebar navigation, header links, mobile bottom bar

If a gated feature's page flag is `true` (Layer 3), the navigation renders the link. The user clicks, arrives at a page, and may encounter either a completely interactive form (if client gate skips layers) or a 403 page (if server-rendered).

### 3.4 — No fallback UI for gated features

There is no standard component for "this feature requires a higher tier." Each gated route handles the 403 differently — some return JSON errors, some return HTML, some redirect. There is no consistent UX pattern.

---

## 4. Design Questions for Resolution

### Q1 — Should tier-gated features be visible at all?

- **Option A (hide):** Gated features do not appear in navigation, domain cards, or search. The platform surface shrinks to match the tenant's tier. Pro: clean UX, no dead ends. Con: no upsell visibility — tenant never sees what they're missing.
- **Option B (grey with upsell):** Gated features appear as greyed-out cards with a tooltip ("Available on Premium tier") and no clickthrough. Pro: visible upsell path. Con: adds visual noise for features not available.
- **Option C (show with gate at entry):** Gated features appear normally but clicking navigates to an upsell/interstitial page explaining the tier requirement. Pro: educates user. Con: still a dead-end click.

### Q2 — How should the client learn which features are gated?

- **Option A — Gate context API:** The server exposes a lightweight endpoint (`/api/gate/context`) returning `{ moduleKey: boolean }` for all modules. The client hydrates on session load and caches. Domain cards, navigation, and page gates read from this cache.
- **Option B — Embed in session:** The gate context is embedded in the Better Auth session object (via `additionalFields` or session hook). No extra request needed.
- **Option C — Server-render walls:** Pages for gated features redirect server-side before any client JS loads. No client knowledge needed; the page simply doesn't render.

### Q3 — Should all routes use the same gate?

Currently routes call `assertModuleEnabled()`, `canAccess()`, `requireAnyPermission()`, or nothing — inconsistently. Should there be a single gate function that all routes wrap, or should gating be middleware-level?

### Q4 — What is Soralia Village's tier during development?

The tenant is seeded as `STANDARD`. But during active development, most features are built and tested locally. Should the dev tenant be temporarily `PREMIUM` until launch, or should the module tier thresholds be lowered during development?

### Q5 — Is `PlatformModule.defaultEnabled: false` on PREMIUM intentional?

Bookings, competitions, providers, settings, conservation are all `defaultEnabled: false` even at PREMIUM tier. This means even a PREMIUM tenant needs an explicit `TenantModule` override to activate them. Is this the intended rollout model, or should PREMIUM tenants get these by default?

---

## 5. Proposed Architecture: Unified Gate with Client Awareness

### 5.1 — Principle

> The server is the single source of truth for feature availability. The client caches a read-only mirror. No feature renders as available on the client unless the server says it is.

### 5.2 — Gate context endpoint

```
GET /api/gate/context
→ { modules: { bookings: true, competitions: false, ... } }
```

Returns a flat map of `moduleKey → boolean` for the current tenant. Auth-gated (requires session). Cached with `stale-while-revalidate` at 60s. Called once on app shell mount, cached in Zustand.

### 5.3 — Domain card contract

Every domain card in the services/admin dashboard reads from the gate context:

| Gate state | Card appearance                              | Click behavior                                                                               |
| ---------- | -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `true`     | Normal (active, colored, hover)              | Navigate to feature page                                                                     |
| `false`    | Greyed out, reduced opacity, no hover effect | No clickthrough. Tooltip: "Available on Premium tier — contact your community administrator" |

### 5.4 — Page-level enforcement

Every gated page checks the gate context client-side BEFORE rendering the interactive form. If the module is `false`, the page renders the interstitial/upsell UI instead. No form is shown, no data is collected, no 403 is ever seen by an end user.

### 5.5 — Route-level enforcement (unchanged)

Server routes continue to enforce gates via `canAccess()` or `assertModuleEnabled()`. The client gate is a UX layer, not a security layer — it exists to prevent the user from wasting effort, not to enforce policy.

### 5.6 — Soralia Village development tier

During active development (pre-launch), the Soralia tenant should be `PREMIUM` tier. This avoids false-negative gate rejections while building and testing features. The tier can be lowered to `STANDARD` at launch if that reflects the actual anchor tenant agreement.

**Alternate:** Keep `STANDARD` but add `TenantModule` overrides for the 5 gated modules during development. This is more precise but adds seeding maintenance overhead.

---

## 6. Implementation Phases (Proposed)

### Phase A — Audit & normalize gate usage

- [ ] ⏳ Identify every API route and page that checks a module gate
- [ ] ⏳ Ensure all routes use either `canAccess()` or `assertModuleEnabled()` consistently
- [ ] Remove bare `requireAnyPermission()` calls for module-gated routes (permission ≠ availability)

### Phase B — Gate context endpoint

- [ ] ⏳ Implement `GET /api/gate/context` returning module availability map
- [ ] ⏳ Add Zustand store for gate context with session-scoped caching
- [ ] ⏳ Hydrate on app shell mount

### Phase C — Domain card gating

- [ ] ⏳ Audit all domain card components in services and admin dashboards
- [ ] ⏳ Each card reads gate context; greys out when `false`
- [ ] ⏳ Add tooltip component for gated cards

### Phase D — Page-level wall

- [ ] Create `<FeatureGateWall>` component — renders upsell/interstitial when module is `false`
- [ ] ⏳ Wrap every gated page with `<FeatureGateWall>`
- [ ] ⏳ Remove per-page 403 handling

### Phase E — Soralia tier resolution

- [ ] ⏳ Decide: dev tier = PREMIUM, or STANDARD + TenantModule overrides
- [ ] ⏳ Apply to seed data and/or database
- [ ] ⏳ Document the decision in ADR-022 or a new ADR

---

## 7. Related

- **ADVISORY-015** — Provider platform gate audit surfaced similar client/server asymmetry
- **BD `k20s`** — Reputation route side-effect fix (completed)
- **`src/entities/tenant/api/gate/gate.ts`** — 5-layer `canAccess()` server gate
- **`src/features/gate/model/gate.ts`** — `canAccessClient()` client gate (skips layers 1-2)
- **`src/entities/tenant/lib/modules/assert-module-enabled.ts`** — `isModuleEnabled()` tier comparison
- **`prisma/seed/modules.ts`** — `PlatformModule` seed definitions
- **`scripts/seed-data/soralia-village.ts:28`** — Soralia tenant tier
