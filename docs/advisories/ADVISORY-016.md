# ADVISORY-016 — Client-Aware Gate System

**Status:** Pending agent execution
**Date:** 2026-06-24
**Triggered by:** COMMUNIQUE-03 — Tier Gating System Architecture Review
**Advisory class:** Architectural — multi-phase
**Related:** ADVISORY-015 (provider gate audit), ADR-022 (pending — provider lifecycle)

---

## 1. Problem Statement

The 5-layer `canAccess()` gate enforces feature availability on the server. The client-side counterpart, `canAccessClient()` (`src/features/gate/model/gate.ts`), deliberately skips Layer 1 (Tier) and Layer 2 (Module) because they require database access. The consequence is a structural asymmetry:

- The server knows a tenant's module availability. The client does not.
- Every gated feature renders as fully interactive UI — pages, forms, domain cards, navigation links.
- The user's only feedback is a 403 response after they have filled and submitted a form.
- Domain cards in the services and admin dashboards display all features as live, regardless of tier.

This is not a configuration error. The Soralia Village tenant has `tier: STANDARD` during development, and five modules (`bookings`, `competitions`, `providers`, `settings`, `conservation`) are gated at PREMIUM. The gate is working as designed. The UX failure is that the client has no way to reflect that gate.

**Immediate symptom:** `/bookings` — form renders, user submits, server returns 403 with `"This feature is not available for your community"`.

**Systemic symptom:** Any STANDARD tier tenant has a broken UX surface across five modules with no visible indication at the UI layer.

---

## 2. Root Cause Analysis

### 2.1 — The client/server gate split

`canAccess()` (`src/entities/tenant/api/gate/gate.ts`) evaluates all 5 layers in order. First-false wins. Layers 1 and 2 both call `isModuleEnabled()`, which does a database join across `TenantModule` and `PlatformModule`. This is not executable in a client component.

`canAccessClient()` (`src/features/gate/model/gate.ts`) evaluates Layers 0, 3, and 4 only. Layers 1 and 2 are explicitly skipped with a comment noting the DB dependency. The function returns `true` for any module unless a PageFlag or FeatureToggle says otherwise. For the five gated modules, neither PageFlag nor FeatureToggle is false — so the client gate passes, and every component renders as accessible.

### 2.2 — Inconsistent route enforcement

No single pattern is applied to gated routes:

| Route                     | Gate mechanism                       | Layers covered |
| ------------------------- | ------------------------------------ | -------------- |
| `POST /api/bookings`      | `assertModuleEnabled('bookings')`    | Layer 2 only   |
| `GET /api/bookings`       | `assertModuleEnabled('bookings')`    | Layer 2 only   |
| `GET /api/admin/bookings` | `requireAnyPermission(['bookings'])` | Layer 0 only   |
| Admin routes (varied)     | `canAccess()`                        | Layers 0–2     |
| Page routes (client)      | `canAccessClient()`                  | Layers 0, 3, 4 |

Some routes check permissions but not tier. Some check tier but not role. Some check neither. There is no lint or test that enforces consistent gate usage.

### 2.3 — `defaultEnabled: false` at PREMIUM tier

Five modules have `minTier: PREMIUM, defaultEnabled: false`. This means a PREMIUM tenant who has never had a `TenantModule` row created for these modules will also be denied access. `isModuleEnabled()` falls back to `PlatformModule.defaultEnabled` when no `TenantModule` row exists — and gets `false`. This is a provisioning gap: PREMIUM tier does not automatically unlock PREMIUM modules.

### 2.4 — Soralia development tier

The anchor tenant is seeded as `STANDARD`. All five gated modules are under active development and are tested locally. This guarantees false-negative gate rejections during development and produces misleading test results.

---

## 3. Options Considered

### Option A — Server-render walls only (no client awareness)

Gated pages redirect server-side before any client JS loads. No form is ever seen.

**Pros:** Secure, no extra endpoint, no client cache.
**Cons:** Does not solve domain cards, navigation, or any client-rendered component. Every non-page surface still renders gated features as available. Does not scale — every new surface needs its own server guard.

**Rejected.** Insufficient scope.

### Option B — Embed gate context in Better Auth session

Gate availability is computed on session creation and stored in the session object via `additionalFields`.

**Pros:** No extra request, always in sync with session lifecycle.
**Cons:** Session is an auth artifact. Embedding feature availability couples auth to product logic. Gate state can change (admin enables a module) without requiring a new session — this would produce stale gate data until the user re-authenticates. The session contract becomes load-bearing for product decisions.

**Rejected.** Coupling is too tight; staleness window is too wide.

### Option C — Gate context API endpoint (selected)

A lightweight authenticated endpoint returns a flat map of `{ moduleKey: boolean }` for the current tenant. Called once on app shell mount, cached in Zustand with session-scope invalidation.

**Pros:** Clean separation, cacheable, invalidatable, composable with existing Zustand store patterns. Does not couple auth to product logic. Cache can be busted on admin actions without requiring re-auth.
**Cons:** One extra request on mount. Requires Zustand store, a hook, and consumption at all affected surfaces.

**Selected.**

### Option D — Middleware-level gate (blanket redirect)

Next.js middleware intercepts all requests to gated routes and redirects if the tenant lacks access.

**Pros:** Centralized enforcement, no per-route code.
**Cons:** Middleware runs on every request including static assets. Requires DB access in the edge runtime, which conflicts with the Drizzle/pooling constraints documented in the stack. Does not solve client-rendered surfaces (domain cards, etc.).

**Rejected.** Edge runtime DB access is a known constraint; middleware scope is too broad.

---

## 4. Architecture Decision

### 4.1 — Principle

> The server is the single source of truth for feature availability. The client caches a read-only mirror of that truth. No feature renders as available on the client unless the server says it is.

> The client gate is a UX layer, not a security layer. It exists to prevent users from wasting effort. It does not enforce policy. Every gated mutation must retain a server-side gate regardless of client gate status.

### 4.2 — Gate context endpoint

```
GET /api/gate/context
Authorization: session (required)

Response:
{
  "modules": {
    "chat": true,
    "directory": true,
    "maintenance": true,
    "bookings": false,
    "competitions": false,
    "providers": false,
    "settings": false,
    "conservation": false,
    ...
  }
}
```

- Auth-gated. Returns 401 if no session.
- Uses `withTenant()` for tenant isolation.
- Calls `isModuleEnabled(tenantId, moduleKey)` for each known `PlatformModule` key.
- Wrapped in `apiSuccess()` envelope per ADR-021 REST standard.
- `Cache-Control: private, max-age=60, stale-while-revalidate=300`.
- No `maxDuration` override needed — expected latency < 100ms (single join, ~14 rows).

### 4.3 — Zustand gate context store

New store at `src/entities/tenant/model/gate-context-store.ts`:

```typescript
interface GateContextStore {
  modules: Record<string, boolean>; // moduleKey → available
  hydrated: boolean; // true after first fetch
  hydrate: () => Promise<void>; // call on app shell mount
  invalidate: () => void; // call after admin module change
}
```

- `hydrate()` fetches `/api/gate/context` and populates `modules`.
- `invalidate()` clears `modules` and sets `hydrated: false`, triggering re-fetch on next access.
- Store is session-scoped: cleared on sign-out via Better Auth `onSessionEnd` hook.

### 4.4 — `useGateContext()` hook

```typescript
// src/entities/tenant/model/useGateContext.ts
export function useGateContext(moduleKey: string): boolean {
  const { modules, hydrated } = useGateContextStore();
  if (!hydrated) return false; // default-deny until hydrated
  return modules[moduleKey] ?? false;
}
```

Default-deny on unhydrated state prevents the flash where a gated feature briefly renders as available before the fetch resolves.

### 4.5 — Domain card gating

Every domain card in `ServicesSubLauncher`, `AdminSubLauncher`, `MessagesSubLauncher`, and analogous surfaces reads from `useGateContext()`.

Gated card state:

```
opacity-50 cursor-not-allowed pointer-events-none
```

Tooltip on hover (using existing `Tooltip` component from `@shared/ui`):

```
"Available on Premium tier — contact your community administrator to upgrade."
```

No clickthrough. No navigation. No form is reachable from a gated card.

### 4.6 — Page-level gate wall

New component: `src/features/gate/ui/ModuleGateWall.tsx`

```tsx
interface ModuleGateWallProps {
  moduleKey: string;
  children: React.ReactNode;
}

// If module is gated: renders <GatedFeaturePage /> (upsell/interstitial)
// If module is available: renders children
// If not yet hydrated: renders <DashboardSkeleton /> (prevents flash)
```

`GatedFeaturePage` is a simple, reusable page:

- Module name and description
- "This feature is available on Premium tier"
- "Contact your community administrator to learn more"
- No action buttons (residents cannot upgrade; admins can contact Netcomplex separately)

Every page under a gated route wraps its content in `<ModuleGateWall moduleKey="...">`.

### 4.7 — Route-level enforcement (unchanged)

Server routes retain their existing gate calls. Phase A of this advisory normalizes inconsistent usage, but does not remove server gates. Server gates remain the enforcement layer; client gates are display-only.

**Standing rule (to be documented in GUIDE.md):**

> Every gated mutation (`POST`, `PATCH`, `DELETE`) must call `canAccess()` or `assertModuleEnabled()` server-side. Client-side `useGateContext()` is display-only and must never be the only gate on a mutation.

### 4.8 — Soralia development tier

The Soralia Village seed record (`scripts/seed-data/soralia-village.ts`) will have `tier` set to `PREMIUM` for the duration of active development. This eliminates false-negative gate rejections during feature development and testing. The tier will be reset to `STANDARD` (or the contractually agreed anchor-tenant tier) at launch. This decision is noted in the risk register below.

**Rejected alternative:** STANDARD tier + explicit `TenantModule` override rows for each gated module. This is precise but requires ongoing maintenance as new modules are added. The tier field is a single change with identical practical effect during development.

### 4.9 — `defaultEnabled` correction

Modules with `minTier: PREMIUM, defaultEnabled: false` are wrong. If a module is gated at PREMIUM, a PREMIUM tenant should have it available without manual provisioning. `defaultEnabled` should be `true` for all modules whose `minTier` matches or is below the tenant's actual tier.

Corrected seed values (PREMIUM tier modules):

| Module         | minTier | defaultEnabled (current) | defaultEnabled (corrected) |
| -------------- | ------- | ------------------------ | -------------------------- |
| `competitions` | PREMIUM | false                    | **true**                   |
| `bookings`     | PREMIUM | false                    | **true**                   |
| `providers`    | PREMIUM | false                    | **true**                   |
| `settings`     | PREMIUM | false                    | **true**                   |
| `conservation` | PREMIUM | false                    | **true**                   |

ENTERPRISE modules (`campaign`) retain `defaultEnabled: false` — these remain provisioned manually ("contact us to activate" semantics are appropriate at ENTERPRISE).

---

## 5. Architecture Before / After

### Before

```
Server gate (canAccess / assertModuleEnabled)
  └── Enforces tier + module + role + flag
  └── Returns 403 if any layer fails

Client gate (canAccessClient)
  └── Evaluates role + pageflag + featuretoggle only
  └── SKIPS tier and module (DB dependency)
  └── Always returns true for gated modules (no PageFlag set)

Result: UI renders all features as available → 403 at submission
```

### After

```
Server gate (canAccess / assertModuleEnabled) — UNCHANGED
  └── Enforces all 5 layers
  └── Remains the enforcement layer

Gate context endpoint (GET /api/gate/context) — NEW
  └── Returns { modules: { bookings: false, ... } }
  └── Cached 60s, stale-while-revalidate 300s

Zustand gate context store — NEW
  └── Hydrated on app shell mount
  └── Default-deny until hydrated
  └── Invalidated on admin module changes

useGateContext(moduleKey) hook — NEW
  └── Reads from store
  └── Returns false if not hydrated (default-deny)

Domain cards — MODIFIED
  └── Read useGateContext()
  └── Greyed out with tooltip if false
  └── No clickthrough when gated

ModuleGateWall component — NEW
  └── Wraps every gated page
  └── Renders GatedFeaturePage if module is false
  └── Renders skeleton if not yet hydrated
  └── Renders children if module is true

Client gate (canAccessClient) — MODIFIED (Phase C)
  └── Delegates to useGateContext() for module check
  └── Eliminates the skip on Layers 1-2
```

---

## 6. Pre-Execution Discovery Checklist

The agent must verify the following before writing any code. Stop and escalate if any finding contradicts this advisory.

```bash
# D1 — Confirm gate.ts locations and exports
grep -rn "canAccessClient\|canAccess" src/features/gate/ src/entities/tenant/api/gate/
grep -rn "assertModuleEnabled\|isModuleEnabled" src/entities/tenant/lib/modules/

# D2 — List all routes using module gates (inconsistency audit)
grep -rn "assertModuleEnabled\|canAccess\|requireAnyPermission" src/app/api/ \
  | grep -v "node_modules" | sort

# D3 — Confirm Zustand store pattern (for new store structure)
grep -rn "create\b" src/entities/widget/model/widget-store.ts | head -5

# D4 — Confirm withTenant and apiSuccess import paths
grep -n "withTenant\|apiSuccess" src/app/api/flags/route.ts

# D5 — Confirm PlatformModule seed values
grep -n "minTier\|defaultEnabled" prisma/seed/modules.ts

# D6 — Confirm Soralia Village seed tier field
grep -n "tier" scripts/seed-data/soralia-village.ts | head -10

# D7 — Confirm existing Tooltip import path (for domain card gating)
grep -rn "from.*shared/ui" src/widgets/dashboard/ui/AdminSubLauncher.tsx 2>/dev/null \
  || grep -rn "Tooltip" src/widgets/dashboard/ui/ | head -5

# D8 — Confirm DashboardSkeleton import path (for ModuleGateWall)
grep -rn "DashboardSkeleton" src/widgets/dashboard/ui/ | head -5

# D9 — Confirm gate context store does not already exist
ls src/entities/tenant/model/

# D10 — Identify all domain card components to modify
grep -rn "SubLauncher\|DomainCard\|CommandBar" src/widgets/dashboard/ui/ | grep "\.tsx" | sort

# GATE D1 — Confirm no existing /api/gate/context route
ls src/app/api/gate/ 2>/dev/null || echo "Directory does not exist (expected)"
```

---

## 7. Phased Execution Plan

> **Phase ordering note:** Phase E (Soralia tier) precedes Phase C/D (UI gate work) to ensure all UI gate testing occurs against accurate data.

---

### Phase A — Route audit and normalization

**Goal:** Every gated API route uses either `canAccess()` or `assertModuleEnabled()`. No bare permission-only checks on module-gated routes.

**Scope:** All routes in `src/app/api/` that touch a module-gated resource.

**Tasks:**

1. Run D2 discovery. Produce a list of routes and their current gate mechanism.
2. For each route touching a gated module (`bookings`, `competitions`, `providers`, `settings`, `conservation`, `campaign`):
   - If using `requireAnyPermission()` alone → add `assertModuleEnabled(moduleKey)` before the permission check, or replace with `canAccess()`.
   - If using `assertModuleEnabled()` alone → assess whether role check is also needed. If yes, add `canAccess()`. If the route is read-only and open to all authenticated users within the tenant, `assertModuleEnabled()` alone is sufficient.
   - If no gate → this is a critical gap. Add `canAccess()` or `assertModuleEnabled()` immediately.
3. Do not remove existing gates. Only add missing ones or normalize inconsistent ones.

**Done criteria:**

- Every route touching a gated module has at least one of: `canAccess()` or `assertModuleEnabled()`.
- No route relies solely on `requireAnyPermission()` for a module-gated resource.
- `pnpm typecheck` and `pnpm lint` pass.

---

### Phase E — Soralia development tier correction

**Goal:** Soralia Village seed is `PREMIUM` for the development period. PlatformModule `defaultEnabled` is corrected for PREMIUM-tier modules.

**Tasks:**

1. In `scripts/seed-data/soralia-village.ts`, change `tier: 'STANDARD'` (or equivalent field) to `tier: 'PREMIUM'`.
2. In `prisma/seed/modules.ts`, for each module with `minTier: PREMIUM, defaultEnabled: false`:
   - Change `defaultEnabled` to `true`.
   - Affected modules: `competitions`, `bookings`, `providers`, `settings`, `conservation`.
   - `campaign` (ENTERPRISE): leave `defaultEnabled: false`.
3. Apply changes to the development database:
   ```bash
   pnpm tsx prisma/seed.ts
   # or the project's seeding command — confirm via AGENTS.md
   ```
4. Verify Soralia tenant record in DB shows `tier = 'PREMIUM'`.

**GATE E1:** Before executing, confirm with DavDev that `PREMIUM` is the correct development tier. This advisory recommends it, but the anchor tenant agreement may specify otherwise.

**Done criteria:**

- `scripts/seed-data/soralia-village.ts` has `tier: 'PREMIUM'`.
- `prisma/seed/modules.ts` has `defaultEnabled: true` for the five PREMIUM modules.
- Development database reflects the change.
- No regressions in existing tests.

---

### Phase B — Gate context endpoint

**Goal:** `GET /api/gate/context` returns module availability for the current authenticated tenant.

**Tasks:**

1. Create `src/app/api/gate/context/route.ts`:
   - Auth check via `getSessionAndRole()`. Return 401 if no session.
   - Tenant resolution via `withTenant()`.
   - Fetch all `PlatformModule` keys from DB (or use the known static list from `prisma/seed/modules.ts`).
   - For each key, call `isModuleEnabled(tenantId, key)`.
   - Return `apiSuccess({ modules: { [key]: boolean } })`.
   - Set `Cache-Control: private, max-age=60, stale-while-revalidate=300` header.
2. Add `export const maxDuration = 8;` per AGENTS.md API route standard.
3. Write a unit test in `src/test/api/gate-context.test.ts`:
   - Authenticated session → returns module map with correct booleans.
   - Unauthenticated → returns 401.
   - STANDARD tenant → gated modules return `false`.
   - PREMIUM tenant → gated modules return `true`.

**Done criteria:**

- `GET /api/gate/context` returns correct data for both STANDARD and PREMIUM tenants.
- Unit test passes.
- `pnpm typecheck` and `pnpm lint` pass.

---

### Phase C — Zustand gate context store and hook

**Goal:** `useGateContext(moduleKey)` is available everywhere in the component tree.

**Tasks:**

1. Create `src/entities/tenant/model/gate-context-store.ts`:

   ```typescript
   interface GateContextState {
     modules: Record<string, boolean>;
     hydrated: boolean;
     hydrate: () => Promise<void>;
     invalidate: () => void;
   }
   ```

   - `hydrate()` fetches `/api/gate/context`, sets `modules` and `hydrated: true` on success. No-ops if `hydrated` is already true (call `invalidate()` first to force refresh).
   - `invalidate()` resets `modules: {}` and `hydrated: false`.
   - Error handling: if fetch fails, log via `createComponentLogger('GateContextStore')` and leave `hydrated: false`. Do not throw.

2. Create `src/entities/tenant/model/useGateContext.ts`:

   ```typescript
   export function useGateContext(moduleKey: string): boolean {
     const { modules, hydrated } = useGateContextStore();
     if (!hydrated) return false;
     return modules[moduleKey] ?? false;
   }
   ```

3. Export both from `src/entities/tenant/index.ts` (client barrel) and update `src/entities/tenant/server.ts` if needed (store is client-only — do not add to server barrel).

4. Call `hydrate()` in the app shell. The correct location is the authenticated layout wrapper (`src/app/(tenant)/layout.tsx` or the dashboard layout — confirm via D3/D9 discovery). It must be called after the session is established. Use `useEffect` with `[]` dependency.

5. Wire sign-out: call `invalidate()` on Better Auth `signOut` success callback in `auth-client.ts` or wherever sign-out is handled.

**Done criteria:**

- `useGateContext('bookings')` returns `false` for STANDARD tenant, `true` for PREMIUM tenant.
- Returns `false` (default-deny) before hydration completes.
- Store is cleared on sign-out.
- `pnpm typecheck` and `pnpm lint` pass.

---

### Phase D — UI gate enforcement

**Goal:** Domain cards are greyed when gated. Gated pages show `ModuleGateWall` instead of the interactive form.

**Tasks:**

**D1 — Domain card gating**

1. Identify all domain card components via D10 discovery. Expected: `ServicesSubLauncher.tsx`, `AdminSubLauncher.tsx`, `MessagesSubLauncher.tsx`, possibly `AdminCommandBar.tsx`, `ServicesCommandBar.tsx`.
2. For each card that corresponds to a gated module, add:
   ```tsx
   const isAvailable = useGateContext(moduleKey);
   ```
3. Apply gated state conditionally:
   ```tsx
   className={cn(
     baseCardClasses,
     !isAvailable && "opacity-50 cursor-not-allowed pointer-events-none"
   )}
   ```
4. Wrap with `Tooltip` from `@shared/ui` when `!isAvailable`:
   ```
   "Available on Premium tier — contact your community administrator to upgrade."
   ```
5. Remove the `onClick` / `href` prop when `!isAvailable` to eliminate keyboard navigation to the gated route.

**D2 — `ModuleGateWall` component**

1. Create `src/features/gate/ui/ModuleGateWall.tsx`:

   ```tsx
   interface ModuleGateWallProps {
     moduleKey: string;
     moduleName: string; // display name for the upsell page
     children: React.ReactNode;
   }
   ```

   - If `!hydrated`: render `<DashboardSkeleton />` (prevents flash).
   - If `hydrated && !isAvailable`: render `<GatedFeaturePage moduleName={moduleName} />`.
   - If `hydrated && isAvailable`: render `children`.

2. Create `src/features/gate/ui/GatedFeaturePage.tsx`:
   - Simple page: module name, tier requirement, contact admin copy.
   - No action buttons. No upgrade CTA (residents cannot self-upgrade in this model).
   - Reuse existing `PageLayout` and `SectionLayout` from `@shared/ui`.

3. Export both from `src/features/gate/index.ts`.

4. Wrap gated pages. Affected pages (from COMMUNIQUE-03 §2.3):
   - `src/app/bookings/page.tsx` → `<ModuleGateWall moduleKey="bookings" moduleName="Facility Bookings">`
   - `src/app/competition/page.tsx` → `<ModuleGateWall moduleKey="competitions" moduleName="Competitions">`
   - `src/app/(tenant)/providers/register/page.tsx` → `<ModuleGateWall moduleKey="providers" moduleName="Service Providers">`
   - `src/app/settings/page.tsx` → `<ModuleGateWall moduleKey="settings" moduleName="Community Settings">`
   - `src/app/conservation/page.tsx` → `<ModuleGateWall moduleKey="conservation" moduleName="Conservation">`
   - Confirm additional affected pages via D10 discovery and `grep -rn "assertModuleEnabled" src/app/`.

**Done criteria:**

- A STANDARD tenant user sees greyed domain cards for all 5 gated modules.
- Greyed cards have tooltip. No clickthrough.
- Navigating directly to a gated page URL renders `GatedFeaturePage`, not the form.
- A PREMIUM tenant user sees all cards active and all pages render normally.
- `ModuleGateWall` renders skeleton during hydration (no flash of gated content).
- `pnpm typecheck` and `pnpm lint` pass.
- No visual regression for PREMIUM-tier surfaces.

---

## 8. Risk Register

| ID  | Risk                                                                                               | Severity | Mitigation                                                                                                                                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | Agent normalizes route gates (Phase A) in a way that breaks existing working routes                | Medium   | Phase A is audit-only changes. No functional logic changes, only gate additions. Unit tests must pass before proceeding.                                                                                                       |
| R2  | Soralia tier set to PREMIUM in dev, forgotten at launch                                            | High     | Document in HOLISTIC.md as a launch gate. Add to risk register. GATE E1 requires DavDev explicit confirmation.                                                                                                                 |
| R3  | Gate context fetch adds latency to app shell mount                                                 | Low      | Response is small (~14 keys). Cache headers (60s / stale-while-revalidate 300s) minimize repeat requests.                                                                                                                      |
| R4  | `useGateContext()` default-deny causes flash of skeleton on every mount                            | Low      | Skeleton is acceptable initial state. If hydration is fast (<200ms in dev), the flash is imperceptible.                                                                                                                        |
| R5  | Admin changes module availability; client cache is stale                                           | Medium   | `invalidate()` must be called after any `TenantModule` write in admin routes. The agent must identify these routes in Phase B and add the invalidation call.                                                                   |
| R6  | `defaultEnabled: true` on PREMIUM modules causes unintended activation for non-development tenants | Medium   | Correction is logically consistent with tier semantics. Any existing PREMIUM tenants without a `TenantModule` row for these modules will gain access — verify this is intentional before applying seed changes to production.  |
| R7  | Client gate and server gate diverge (client says available, server says gated)                     | Low      | Acceptable by design. Server gate is enforcement. Client gate is display. A stale client cache may show a feature as available that the server rejects — the result is a 403, which is handled correctly (not a security gap). |

---

## 9. GUIDE.md Addendum (to be written by agent)

The agent must append the following section to `docs/STEERING/GUIDE.md` (or create it if the file does not exist at that path):

```markdown
## Feature Gate Rules

### Server gate (enforcement layer)

Every gated mutation (POST, PATCH, DELETE) touching a module-gated resource must call
`canAccess()` or `assertModuleEnabled()` server-side. This is non-negotiable.

### Client gate (display layer)

`useGateContext(moduleKey)` returns whether a module is available for the current tenant.
It is display-only. It must never be the sole gate on a mutation.

### `ModuleGateWall` (page boundary)

Every page behind a gated module wraps its content in `<ModuleGateWall moduleKey="..." moduleName="...">`.
This prevents form rendering before the user learns the feature is gated.

### Domain cards

Cards corresponding to gated modules read `useGateContext()` and render in greyed/disabled
state when the module is unavailable. No clickthrough. Tooltip explains tier requirement.

### Invalidation

Any route that writes to `TenantModule` must call `useGateContextStore().invalidate()`
on the client after the mutation succeeds, or emit a response header that triggers client
invalidation. (Current approach: client-side `invalidate()` call after admin mutation.)
```

---

## 10. Done Criteria (advisory-level)

- [ ] ⏳ Phase A: All gated routes have consistent server gate calls.
- [ ] ⏳ Phase E: Soralia seed is `PREMIUM`. PlatformModule seed has `defaultEnabled: true` for PREMIUM modules. Development database updated.
- [ ] ⏳ Phase B: `GET /api/gate/context` returns correct module map. Unit test passes.
- [ ] ⏳ Phase C: `useGateContext()` returns `false` (default-deny) before hydration, correct value after. Store cleared on sign-out.
- [ ] ⏳ Phase D: Domain cards grey out gated modules. `ModuleGateWall` renders `GatedFeaturePage` for gated routes. No flash.
- [ ] ⏳ GUIDE.md updated with gate rules section.
- [ ] ⏳ HOLISTIC.md updated: Soralia dev tier risk logged as launch gate item.
- [ ] ⏳ `pnpm typecheck`, `pnpm lint`, `pnpm build` pass on all phases.
- [ ] No 403 is ever seen by an end user for a gated feature — the gate wall intercepts before form interaction.
