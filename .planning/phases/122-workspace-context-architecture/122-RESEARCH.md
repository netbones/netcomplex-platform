---
phase: 122
slug: workspace-context-architecture
status: complete
created: 2026-07-01
source: codebase research + CONTEXT.md + 122-UI-SPEC.md + .planning/REQUIREMENTS.md + .planning/STATE.md
---

# Phase 122 — Research: WorkspaceContext Architecture

> **Question answered:** "What do I need to know to PLAN this phase well?"
>
> Aligned to Nyquist Dimension 8 (Validation Architecture). Sources verified against the
> live codebase on 2026-07-01; every file:line citation is reproducible.

---

## 0. TL;DR — Critical Findings Before Planning

1. **CONTEXT.md has factual path errors.** The canonical gate context hook is
   `src/features/gate/model/gate.ts:54` (NOT `src/features/auth/model/useGateContext.ts`),
   the `FeatureRegistry` lives at `src/entities/tenant/api/features/registry.ts:43` (NOT a
   standalone `registry.ts:1` family of registration APIs), and there is **no
   `AuthenticatedUserProvider`**, no `AppShell`, and **no `GateContext.Provider`** in the
   codebase. GateContext is a plain hook composition over `usePageFlags + useSession`, not
   a React Context. Plan against the _real_ provider stack documented in §4.
2. **Existing registries are static `Record<K, V>` exports, not runtime `register()` APIs.**
   `MODULES: Record<ModuleKey, ModuleDefinition>` (`src/shared/lib/constants/tiers.ts:51`),
   `SPACES: Record<SpaceId, SpaceDefinition>` (`src/widgets/dashboard/model/spaces.ts:61`),
   `FEATURE_REGISTRY: Record<string, FeatureDefinition>`
   (`src/entities/tenant/api/features/registry.ts:43`). CONTEXT.md's `WorkspaceRegistry` sketch
   (`register(type, def)`) does not match the house pattern. See §1 + §10 for the
   recommended hybrid shape.
3. **Phase 111 delegations are already queryable from the client** via
   `useDelegations(params?)` in `src/entities/delegation/api.ts:22`, returning
   `DelegationListItem[]` (`src/entities/delegation/types.ts:9`) with the exact fields
   `resolveWorkspaceContext()` needs (`id`, `propertyId`, `propertyAddress`, `agentId`,
   `permissions[]`, `status`, `expiresAt`, `grantedById/Name`). No new backend route is
   required for P1a — the resolver can be a pure client function over existing data.
4. **React Context + `useState` is the right primitive, NOT Zustand.** `useState`
   already provides the atomic replace semantics C-01 mandates; Zustand would add a
   selector layer D-08 explicitly disclaims. Save Zustand for selector _user prefs_
   (Recent/Pinned) where persistence is desirable. See §6.
5. **The notification deep-link handler has no specialisation yet** — the click target is
   `<Link href={notification.link}>` at `src/app/notifications/page.tsx:128-134`. D-07's
   in-app hop must wrap that link with an onClick (or replace it with a
   `<NotificationLink>` consumer). External/email deep links flow through middleware →
   `SpaceChrome` via a read-once hint header. See §7.
6. **ADR-020 (Agent Delegation) is only "Proposed"** — it lives in
   `.planning/phases/111-agent-gateway/AGENT_DELEGATION_DISCUSSION.md` as `ADR-020 Proposed`.
   The two `## ADR-020` entries in `docs/STEERING/ADR.md` refer to Focus Space Architecture
   and `server.ts` sub-barrels — NOT agent delegation. Plan does NOT block on the formal
   ADR (D-01 accepts M6+ direction regardless), but PLAN.md should flag the documentation
   gap. See §10.
7. **Feature-branch protocol is required** (CONTEXT.md §"MANDATORY: Feature Branch
   Required"). Pre-flight: `wt list` first; `Steiger` will likely fire on intermediate FSD
   states. See §11.

---

## 1. Existing Pattern Reuse — WorkspaceRegistry Precedent

### 1.1 Closest Analogs (in decreasing fit)

| Rank | Pattern            | Location                                           | Why It's the Closest Fit                                                                                                                                                                                                                                                         |
| ---- | ------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `SPACES` registry  | `src/widgets/dashboard/model/spaces.ts:61`         | `Record<SpaceId, SpaceDefinition>` with `filterSpaces()` pure filter (`:192`) and `getActiveSpaceId(pathname)` route resolver (`:273`). Almost literally a workspace registry by another name — but keyed by _Space_ (UI nav surface), not by _Workspace_ (operational context). |
| 2    | `WIDGET_REGISTRY`  | `src/entities/tenant/api/features/registry.ts:310` | `Record<string, WidgetDefinition>` with `canUseWidget(key, tier)` helpers — shows the static-map + tier-aware helper pattern used throughout funding/feature gating.                                                                                                             |
| 3    | `MODULES`          | `src/shared/lib/constants/tiers.ts:51`             | `Record<ModuleKey, ModuleDefinition>` with `hasModuleAccess(tier, module)` and `getTierModules(tier)` (`:253`, `:261`). Enum-keyed registry with `helper()` functions exported alongside.                                                                                        |
| 4    | `FEATURE_REGISTRY` | `src/entities/tenant/api/features/registry.ts:43`  | `Record<string, FeatureDefinition>` with `hasFeature()`, `getFeaturesForTier()`, `canAccessPage()`, `getEnabledFeaturesForTenant()`. Heaviest inspiration for `WorkspaceDefinition` + helpers.                                                                                   |

### 1.2 Concrete Excerpts — The House Pattern

```ts
// src/shared/lib/constants/tiers.ts:51 (canonical enum-keyed registry)
export const MODULES: Record<ModuleKey, ModuleDefinition> = {
  directory: { key: 'directory', label: 'Directory', description: '...', tier: 'foundation' },
  // ...
};

export function hasModuleAccess(tier: TierLevel, module: ModuleKey): boolean {
  const tierModules = TIERS[tier].modules;
  return tierModules.includes(module); // ← pure predicate over static record
}
export function getTierModules(tier: TierLevel): ModuleKey[] {
  return TIERS[tier].modules; // ← pure lookup
}
```

```ts
// src/entities/tenant/api/features/registry.ts:43 (static map + tier-aware helpers)
export const FEATURE_REGISTRY: Record<string, FeatureDefinition> = {
  'page.directory': { key: 'page.directory', tier: 'foundation', category: 'page', label: '...' },
  // ...
};

export function hasFeature(
  featureKey: string,
  tenantTier: TierLevel,
  featureFlags?: Record<string, boolean>
): boolean {
  const feature = FEATURE_REGISTRY[featureKey];
  if (!feature) return false;
  if (featureFlags && featureKey in featureFlags) return featureFlags[featureKey];
  const tierOrder: TierLevel[] = ['foundation', 'depth', 'core'];
  return tierOrder.indexOf(tenantTier) >= tierOrder.indexOf(feature.tier);
}

export function getEnabledFeaturesForTenant(
  tenant: Tenant,
  featureFlags?: Record<string, boolean>
): FeatureDefinition[] {
  return Object.values(FEATURE_REGISTRY).filter(f =>
    hasFeature(f.key, tenant.subscriptionTier, tenant.featureFlags ?? featureFlags)
  );
}
```

```ts
// src/widgets/dashboard/model/spaces.ts:61 (functional sibling — workspace registry precedent)
export const SPACES: Record<SpaceId, SpaceDefinition> = {
  home:    { id: 'home',    href: '/dashboard', labelKey: 'spaces.home',    icon: Home,    isCore: true,  widgetIds: [...] },
  admin:   { id: 'admin',   href: '/admin',     labelKey: 'spaces.admin',   icon: Shield,  isCore: true, minimumRole: 'admin', widgetIds: [...] },
  // ...
};

export function filterSpaces(
  accessibleSpaceIds: SpaceId[],
  flags: PlatformPageFlags
): SpaceDefinition[] {
  return accessibleSpaceIds
    .map(id => SPACES[id])
    .filter((space): space is SpaceDefinition => {
      if (!space) return false;
      if (space.requiredFlag) return flags[space.requiredFlag] !== false;
      // ...
      return true;
    });
}

export function getActiveSpaceId(pathname: string): SpaceId | 'home' {
  if (!pathname) return 'home';
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'admin';
  // ...
  return resolveSpace(slug) ?.id ?? 'home';
}
```

### 1.3 Recommendation — WorkspaceRegistry Shape

Follow the **static `Record<WorkspaceType, WorkspaceDefinition>` + pure helpers** pattern
rather than CONTEXT.md's runtime `register()` sketch. House style prefers static records:
they are tree-shakeable, type-checked, and the `disabled?: boolean` field satisfies
D-11 (Automation hidden until Phase 113+) without a runtime API.

```ts
// RECOMMENDED shape (Phase 122, P1a-1) — aligned to house pattern
export type WorkspaceType = 'PERSONAL' | 'PROVIDER' | 'PROPERTY' | 'OWNER' | 'AUTOMATION';

export interface WorkspaceDefinition {
  type: WorkspaceType;
  label: string;
  icon: LucideIcon; // match SpaceDefinition.icon style
  href?: string; // resource route, optional (Personal has none)
  navigation: NavItem[];
  actions: ActionDef[];
  widgetIds: string[]; // match SpaceDefinition.widgetIds style
  requiredPermissions: Permission[];
  children?: WorkspaceType[]; // hierarchy per D-04
  disabled?: boolean; // D-11 — Automation has disabled: true in P1a
}

export const WORKSPACE_REGISTRY: Record<WorkspaceType, WorkspaceDefinition> = {
  PERSONAL: { type: 'PERSONAL', label: 'Personal', icon: User /* ... */ },
  PROVIDER: {
    type: 'PROVIDER',
    label: 'Provider',
    icon: Building2,
    children: ['PROPERTY'] /* ... */,
  },
  PROPERTY: { type: 'PROPERTY', label: 'Property', icon: Home /* per-delegation, dynamic */ },
  OWNER: { type: 'OWNER', label: 'Owner', icon: ShieldCheck /* ... */ },
  AUTOMATION: { type: 'AUTOMATION', label: 'Automation', icon: Bot, disabled: true /* D-11 */ },
};

// Pure helpers — identical pattern to hasFeature / filterSpaces / getActiveSpaceId
export function getEnabledDefinitions(): WorkspaceDefinition[] {
  return Object.values(WORKSPACE_REGISTRY).filter(d => !d.disabled);
}
export function getDefinition(type: WorkspaceType): WorkspaceDefinition | undefined {
  return WORKSPACE_REGISTRY[type];
}
```

**If a runtime registration API becomes necessary** (e.g. pluggable workspace types added
by the future monorepo `packages/`), add a `registerWorkspaceType(def)` mutation function
after P1a — but the v1 ships static. This is the **.C-05 + D-11 sweet spot**: new types =
new registry entries, no shell changes.

---

## 2. GateContext Coexistence

### 2.1 Real Signatures (CONTEXT.md paths are wrong)

**There is no `GateContext.Provider` and no `useGateContext` at the path CONTEXT.md cites.**
GateContext is purely a hook composition, not a React Context:

```ts
// src/features/gate/model/gate.ts:38
export interface ClientGateContext {
  role: Role;
  flags: PlatformPageFlags;
  tier?: TierLevel; // optional — /api/flags doesn't return tier today
}

// src/features/gate/model/gate.ts:54 — the canonical (NOT path-cited) hook
export function useGateContext(): ClientGateContext | null {
  const { flags, isLoading, error } = usePageFlags();
  const { data: session } = useSession();
  if (isLoading || error || !flags) return null;
  const role = (session?.user as { role?: string } | undefined)?.role as Role | undefined;
  const resolvedRole: Role = role ?? 'RESIDENT';
  return { role: resolvedRole, flags };
}
```

There is a **separate** Zustand store at `src/entities/tenant/model/gate-context-store.ts:10`:

```ts
export const useGateContextStore = create<GateContextState>()((set, get) => ({
  modules: {},
  hydrated: false,
  hydrate: async () => {
    // fetches /api/gate/context
    if (get().hydrated) return;
    try {
      const res = await fetch('/api/gate/context');
      // ...
      set({ modules: data.modules ?? {}, hydrated: true });
    } catch {
      /* default-deny */
    }
  },
  invalidate: () => set({ modules: {}, hydrated: false }),
}));
```

And a **re-export shim** at `src/entities/tenant/model/useGateContext.ts:3` that takes a
`moduleKey` argument (different surface — a per-module feature-flag lookup, not the
client gate context):

```ts
// src/entities/tenant/model/useGateContext.ts:3
export function useGateContext(moduleKey: string): boolean {
  const { modules, hydrated } = useGateContextStore();
  if (!hydrated) return false;
  return modules[moduleKey] ?? false;
}
```

### 2.2 Coexistence Contract WorkspaceContext Must Honour

| Concern         | GateContext (existing)                                              | WorkspaceContext (new)                                                  |
| --------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Surface         | `ClientGateContext = { role, flags, tier? }`                        | `WorkspaceContext = { workspaceId, workspaceType, scope, permissions }` |
| Hook            | `useGateContext(): ClientGateContext \| null`                       | `useWorkspaceContext(): WorkspaceContext \| null`                       |
| Provider        | **No provider** — derived from `usePageFlags + useSession` directly | `WorkspaceContext.Provider` (React Context) — see §4                    |
| Domain          | What you can access (identity + capability)                         | What workspace you operate within (scope)                               |
| Caching         | Module flags cached in Zustand store                                | NEVER cached (D-08 — derived on switch)                                 |
| Deny default    | Returns `null` while loading                                        | Returns `null` while resolving                                          |
| Reset on change | `useGateContextStore.invalidate()` on logout                        | No state to invalidate on logout — provider unmounts                    |

**The integration constraint:** WorkspaceContext must NOT replace GateContext. Consumers
already exist (`SpaceChrome.tsx:38`, `MobileSpaceBar.tsx:46`) that call
`useGateContext()` to retrieve flags. WorkspaceContext provides the orthogonal _what
workspace am I in_ dimension. PLAN.md must explicitly forbid WiredComponent that reads
`role` to derive workspace — that's the C-04 anti-pattern the phase is replacing.

**Concrete composition (already tested in repo):**

```tsx
// src/widgets/dashboard/ui/SpaceChrome.tsx:38 (current usage)
const ctx = useGateContext(); // → role + flags
const { spaces } = useVisibleSpaces(ctx?.flags); // uses filterSpaces over SPACES

// After Phase 122 (P1a-2 onward):
const wctx = useWorkspaceContext(); // → workspaceId, type, scope, perms
const gctx = useGateContext(); // unchanged — keep both
```

---

## 3. Phase 111 AgentAccess / AgentToken / Delegation Hooks

### 3.1 Canonical Frontend Surface (already shipped — no backend work needed in P1a)

Phase 111 shipped the `entities/delegation` FSD slice with three TanStack Query hooks:

```ts
// src/entities/delegation/api.ts:22 — canonical delegations list hook
export function useDelegations(params?: DelegationListParams) {
  const { data: sessionData } = useSession();
  return useQuery<DelegationListItem[]>({
    queryKey: [...DELEGATIONS_KEY, params],
    queryFn: async () => {
      const url = new URL('/api/delegations', window.location.origin);
      if (params?.propertyId) url.searchParams.set('propertyId', params.propertyId);
      if (params?.status) url.searchParams.set('status', params.status); // ← filter to ACTIVE
      if (params?.agentId) url.searchParams.set('agentId', params.agentId);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Failed to fetch delegations: ${res.status}`);
      const json = await res.json();
      return json.data ?? json;
    },
    enabled: !!sessionData?.user?.id,
  });
}
```

```ts
// src/entities/delegation/types.ts:9 — exact shape needed by resolveWorkspaceContext
export interface DelegationListItem {
  id: string;
  propertyId: string;
  propertyAddress: string | null;
  agentId: string;
  agentName: string | null;
  agentEmail: string | null;
  grantedById: string;
  grantedByName: string | null;
  permissions: string[]; // ← canonical scope keys, e.g. 'maintenance:read'
  status: DelegationStatusFilter; // PENDING | ACTIVE | REJECTED | REVOKED | EXPIRED
  startedAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  blocked?: boolean;
}
```

### 3.2 How `resolveWorkspaceContext()` Calls Them

The plan-side `resolveWorkspaceContext(target)` is a **pure client function** that lifts
existing Phase 111 data into a `WorkspaceContext`. No new API route needed in P1a:

```ts
// RECOMMENDED resolver (P1a-3 — to be designed in PLAN, not committed here)
import { useDelegations } from '@entities/delegation';
import { useSession } from '@api/client';

// Pure resolver — no React. Used both by switchWorkspace() (P1a-3) and tested in isolation.
export async function resolveWorkspaceContext(
  target: WorkspaceTarget,
  delegations: DelegationListItem[],
  session: Session
): Promise<WorkspaceContext> {
  switch (target.workspaceType) {
    case 'PERSONAL':
      return {
        workspaceId: `personal:${session.user.id}`,
        workspaceType: 'PERSONAL',
        permissions: ['profile:read', 'settings:manage'], // owned by user, not delegation
      };
    case 'PROPERTY': {
      const delegation = delegations.find(d => d.id === target.delegationId);
      if (!delegation) throw new WorkspaceResolveError('registry_miss');
      if (delegation.status !== 'ACTIVE') throw new WorkspaceResolveError('revoked');
      if (new Date(delegation.expiresAt) < new Date()) throw new WorkspaceResolveError('revoked');
      return {
        workspaceId: `property:${delegation.propertyId}`,
        workspaceType: 'PROPERTY',
        scope: { propertyId: delegation.propertyId },
        permissions: delegation.permissions,
      };
    }
    case 'OWNER':
      return {
        /* derived from user.ownedProperties count, etc. */
      };
    // PROVIDER, AUTOMATION: similar derivations
  }
}
```

**Caveat for PLAN.md:** Provider business identity (`workspaceType: 'PROVIDER'`,
`scope.providerId`) is not yet in `DelegationListItem`. Phase 111 stored provider
verification in `providerVerifications` table (`src/db/schema/...`) — but the existing
`useDelegations()` does not return the provider's organisation. PLAN must either add a new
hook `useProviderWorkspaces()` that queries `/api/providers/me` (existing route per STATE
decisions), or extend the DelegationListItem interface. **Recommendation:** add a small
`useProviderWorkspaces()` hook in `entities/delegation/api.ts` (or a parallel
`entities/provider/` slice) that returns just enough to populate the PROVIDER workspace —
do not extend DelegationListItem's shape.

### 3.3 Agent Token Integration (only relevant for agent callers, P2 territory)

`usePageAccess(agentToken?)` already exists at `src/shared/lib/hooks/usePageAccess.ts:72`
and returns `agent: { scope, expiresAt, tokenId, delegationId }`. The scope array is the
JSON of agent permissions — same keys as `permissions[]` on `WorkspaceContext`. P1a's
`resolveWorkspaceContext()` can use this when `target.workspaceType === 'PROPERTY'` AND a
delegation lookup is unavailable for the current session (rare — agent callers in token
mode have no `useSession` data). PLAN should defer this edge case to P2 property workspace
work; P1a's resolver can require a user session + `useDelegations`.

---

## 4. Space Navigation System — Existing Surface WorkspaceContext Integrates With

### 4.1 Existing Data Flow

```
session (Better Auth)
  │
  ├─ usePageFlags()                    → flags: PlatformPageFlags | null
  │                                     (/api/flags — server is source of truth)
  └─ useRouter().pathname              → string
                │
                ▼
  usePageAccess() ───────────────────► { spaces: SpaceId[], pages, features, agent }
                (TanStack Query, /api/access)
                │
                ▼
  useVisibleSpaces(flags?) ──────────► { spaces: SpaceDefinition[], isLoading, error }
                │ (calls filterSpaces(accessibleIds, flags))
                ▼
  SpaceChrome.tsx:39
                │
                ├─── <SpaceLauncher spaces={...} activeSpaceId pathname />   (desktop sidebar)
                └─── <MobileSpaceBar />                                    (mobile bottom bar — calls useVisibleSpaces internally)
```

Key consumers and call sites:

| Component             | File:Line                                           | What it consumes                                                                   |
| --------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `SpaceChrome`         | `src/widgets/dashboard/ui/SpaceChrome.tsx:38-41`    | `useGateContext()` + `useVisibleSpaces(ctx?.flags)` + `getActiveSpaceId(pathname)` |
| `MobileSpaceBar`      | `src/widgets/workspace/ui/MobileSpaceBar.tsx:46-53` | `useGateContext()` + `useVisibleSpaces(ctx?.flags)`                                |
| `SpaceLauncher`       | `src/widgets/dashboard/ui/SpaceLauncher.tsx:25`     | Pure presentational — receives `SpaceDefinition[]` as prop from SpaceChrome        |
| `(tenant)/layout.tsx` | `src/app/(tenant)/layout.tsx:13-26`                 | Hydrates `useGateContextStore` on session, mounts `<SpaceChrome>`                  |

### 4.2 Integration Boundary for WorkspaceContext

WorkspaceContext must integrate with — **but not break** — the existing 5-space nav:
P1a's mandate is to LAYER IN the context provider + selector + scope panel; it must not
change the visible nav (UI-SPEC §"Regression checklist":

> - Header / SpaceLauncher / MobileSpaceBar nav unchanged in role/format

That means:

- **No immediate refactor** of `SpaceChrome` to consume `useWorkspaceContext()` instead
  of `useGateContext()` — keep both. WorkspaceContext becomes the _opinion_ the selector
  sets, while SpaceChrome continues to reflect access via `useVisibleSpaces`.
- **P1a-4** (hierarchical selector) renders in the **header** (per UI-SPEC §"Surface 1"),
  not in SpaceChrome's sidebar. The header is at `src/shared/ui/Header.tsx` — mounted by
  root layout (`src/app/layout.tsx:44`).
- **P1a-6** (scope panel) renders as a persistent element in the shell — the UI-SPEC §"Surface 3"
  describes it as "persistent in app shell". The integration point is `SpaceChrome.tsx`
  (which represents the shell for tenant routes). The scope panel can render next to or
  inside `SpaceChrome`'s main wrapper.
- **LATER phases** (P2 property workspace) will replace `SpaceLauncher` with
  workspace-aware entries and add a `WorkspaceDefinition.children` renderer. P1a ships
  the _registry_ and _context_ — not the consumer.

---

## 5. React Provider Composition — Where `WorkspaceContext.Provider` Slots In

### 5.1 The Actual Provider Stack

CONTEXT.md's tree (`AuthenticatedUserProvider → WorkspaceContext.Provider → AppShell → Pages`)
does not exist. The real stack:

```
src/app/layout.tsx (RSC server component)
  └─ <Providers>                                  ← src/app/providers.tsx
       ├─ <trpc.Provider client={trpcClient}>
       │    └─ <QueryClientProvider client={queryClient}>
       │         └─ <TooltipProvider>
       │              └─ <Toaster position="top-right" />
       │              └─ {children}                            ← Header + Suspense({children}) + Footer
       └─ (no further providers here)

src/app/(tenant)/layout.tsx (client component — only mounted for /dashboard/* and /admin/*)
  ├─ useGateContextStore.hydrate() (effect, on session)
  └─ <I18nextProvider i18n={i18n}>
       └─ <SpaceChrome>                            ← only when session present
            └─ <ErrorBoundary>
                 └─ <div className="flex min-h-screen">
                      ├─ <SpaceLauncher .../>
                      ├─ <main>{children}</main>
                      └─ <MobileSpaceBar />
```

### 5.2 Recommended Insertion Point

**Constraint:** WorkspaceContext must be available across ALL client routes that can host
a workspace switching surface, including:

- `/dashboard/*` and `/admin/*` (via `(tenant)` route group)
- `/notifications` (the D-07 deep-link target — lives OUTSIDE `(tenant)`,
  at `src/app/notifications/page.tsx`)
- `/profile`, `/messages`, `/maintenance`, `/services`, etc. (each has its own
  `layout.tsx` that mounts `<SpaceChrome>`)

Since all of these inherit `Providers` from `src/app/providers.tsx` (mounted by
root `layout.tsx`), the cleanest insertion is **inside `Providers`** — after
`TooltipProvider`, before `Toaster`:

```tsx
// src/app/providers.tsx — RECOMMENDED edit site (P1a-2)
return (
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WorkspaceContextProvider>
          {' '}
          {/* ← new — wraps everything below */}
          <Toaster position="top-right" />
          {children}
        </WorkspaceContextProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </trpc.Provider>
);
```

**Why this slot, NOT `(tenant)/layout.tsx`:** because `/notifications` lives outside
`(tenant)` and must still consume `useWorkspaceContext()` for D-07's auto-switch.
Mounting at root `Providers` makes the hook universally available.

**Caveat for PLAN.md:** The root `layout.tsx` is a server component; providers must remain
client. `WorkspaceContextProvider` itself must be a `'use client'` component (the real
React Context lives in `src/features/workspace/model/workspace-context.tsx` with `'use
client'` directive — see §10 for FSD barrel conventions).

### 5.3 GateGuard Coexistence (regression checklist item)

The UI-SPEC §"Carry-Forward Verification" requires

> - GateGuard component unchanged — `WorkspaceContext.Provider` sits **above** `AppShell`, not above the auth provider

The actual `GateGuard` is at `src/features/gate/ui/GateGuard.tsx:36`. It does NOT mount a
provider — it consumes `useGateContext()` directly. The WorkspaceContext.Provider
sits in `Providers`, which is **below** the `trpc`/`QueryClient` providers (which Gate
indirectly relies on via `useSession`/`usePageFlags`). The relationship is satisfied:
WorkspaceContext.Provider is ABOVE the chrome, BELOW the auth/query providers. No change
to `GateGuard` is needed.

---

## 6. Zustand vs React Context — Concrete Recommendation

### 6.1 Reconciling C-01 + D-08

| Constraint                                                  | What it implies for state primitive                                                                                                                               |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C-01** WorkspaceContext is immutable; atomic replace-only | State holder must support `set(next)` as a wholesale replacement — no `update(key, value)` mutator                                                                |
| **D-08** No caching of WorkspaceContext itself              | State should be **derived** from existing TanStack Query data on each switch, not stored in a persistent store. Persistence would violate "uncached" intent.      |
| **D-07** Auto-switch on deep links                          | Switch is triggered from arbitrary places (notification link, middleware hint) — must work outside the React render tree of the selector (e.g., from a callback). |
| **C-03** Lightweight — only 4 allowed fields                | No selector-based shallow-subscription optimisation is meaningful; consumers either read all of `WorkspaceContext` or none of it.                                 |

### 6.2 Verdict: React Context + `useState`

React Context with `useState<WorkspaceContext | null>(null)` already gives us:

- **Atomic replace** — `setX(next)` issues a single render, no intermediate state is
  ever observable (C-01 satisfied by React's batching semantics).
- **No caching** — the context value lives in React's runtime only, not in a store; it
  is destroyed when the provider unmounts (D-08 satisfied — there is literally no place
  to cache).
- **Universal access from callbacks** — `useWorkspaceContext()` is callable from any
  child component, including event handlers in notification links and in middleware-hint
  effects in `SpaceChrome`.
- **Optional `null` until resolved** — matches the GateContext convention (`:54`,
  returns `null` during load).

**A Zustand store would actively work against D-08**: Zustand persists across mounts by
default (its strength is "cache, subscribe, derive") — which is precisely what D-08
forbids for THIS state. You'd have to manually `set(null)` on unmount, defeating the
purpose.

### 6.3 What STILL Belongs in Zustand — Selector User Prefs

UI-SPEC §"Search / Recent / Pinned / All" requires persisted Recent (last 5) and
user-managed Pinned lists. Those ARE appropriate client-side Zustand stores (or
`useLocalStorage` from usehooks-ts, per AGENTS.md's "Use usehooks-ts" guideline),
because:

- They are **user preferences**, not the WorkspaceContext itself (D-08 doesn't apply).
- They must persist across sessions.
- They are selectively read by the selector widget (only), not by pages.

```ts
// RECOMMENDED: two SEPARATE stores — do not combine with WorkspaceContext state
// src/features/workspace/model/workspace-prefs.ts
export const useWorkspaceRecentStore = create(persist(...))   // last 5 recently-visited workspaces
export const useWorkspacePinnedStore = create(persist(...))   // user-pinned workspaces
```

PLAN.md must explicitly forbid any `WorkspaceContext` field from flowing back into the
prefs store — prefs hold `{workspaceId, workspaceType, label, scope}` mirrors only,
which is the snapshot the selector needs to render Recent/Pinned rows.

---

## 7. Notification Deep-Link Flow — Exact Hook Point for D-07

### 7.1 Current Handler (where D-07 must intervene)

```tsx
// src/app/notifications/page.tsx:127-134 (current implementation)
{
  notification.link && (
    <Link href={notification.link} className="text-indigo-600 text-sm hover:underline mt-2 block">
      View details
    </Link>
  );
}
```

The `link` field is a plain `string` — currently no workspace context is parsed. The
mark-as-read happens on the row's `onClick` at `:111`.

**The integration:** wrap (or replace) this `<Link>` with a `<NotificationLink`
component that:

1. Parses `notification.link` for resource type (e.g., `/properties/{id}`,
   `/maintenance/{id}`, `/provider/...`).
2. Derives a `WorkspaceTarget` (call `inferWorkspaceTarget(link)`).
3. Calls `switchWorkspace(target)` (which atomically sets context + navigates).
4. Fires `toast.success('Now viewing: 14 Palm Avenue')` on success, or the UI-SPEC
   failure toast on resolve error.

### 7.2 External Deep-Link Path (middleware → header → SpaceChrome)

UI-SPEC §"Automatic Workspace Switch on Notification Deep Link" describes:

> Deep link from external (email/SMS) → Middleware resolves token → sets hint header → AppShell detects hint → calls `switchWorkspace` once

There is no `AppShell` component — `SpaceChrome` is the actual shell. Implementation:

1. **Middleware** (`src/middleware.ts` — exists from Phase 28, see STATE decisions
   `[Phase 28-proxy-consolidation-01]`) parses an `?agent_token=...` or signed-link
   parameter, resolves via `verifyAgentToken`, sets `x-workspace-hint: <JSON>` request
   header (or `Set-Cookie` with `Path=/; Max-Age=5`), removes the URL param via
   `NextResponse.redirect(new URL(...))` (URL stays resource-only — C-02).
2. **`SpaceChrome`** (or a sibling hook `useWorkspaceHint()`) reads the hint on mount
   via draft-mode cookie API, fires `switchWorkspace(target)` once, **clears the
   hint** (one-shot). Implementation can mirror the existing `useGateContextStore.hydrate`
   effect pattern in `src/app/(tenant)/layout.tsx:17-19`.
3. **No URL parameter leaks**: middleware strips the hint param before navigating (C-02
   satisfied).

### 7.3 Idempotency and "Already in Target" (UI-SPEC §"Automatic Workspace Switch")

| Scenario                                      | Behaviour                                               |
| --------------------------------------------- | ------------------------------------------------------- |
| In-app click, current ≠ target                | `switchWorkspace()` → navigate → toast                  |
| In-app click, current === target              | Just navigate (no toast)                                |
| External deep link, current ≠ target          | SpaceChrome one-shot hint → `switchWorkspace` → toast   |
| External deep link, current === target        | Navigate only                                           |
| Resolve fails (revoked/expired/registry miss) | Stay in current workspace, error toast, do NOT navigate |

`switchWorkspace()` must check idempotency first — comparing `target.workspaceId ===
current?.workspaceId` — and short-circuit before kicking off resolve.

---

## 8. Testing Strategy — Vitest + @testing-library/react

### 8.1 Confirmed Stack

`vitest.config.ts` confirms:

- environment: `jsdom`
- globals: `true` (no need to import `describe`/`it`/`expect` in tests)
- `setupFiles: ['./src/test/setup.ts']`
- aliases: `@entities`, `@features`, `@widgets`, `@shared`, `@api` all mapped (matches
  tsconfig path aliases — Workspace tests can import through `@features/workspace/...`
  without juggling module paths).
- coverage `include` covers `src/shared/**`, `src/entities/**`, `src/features/**` — new
  code in `src/features/workspace/**` will automatically be measured.

### 8.2 Reference Test Patterns to Mirror

| Analog                              | File:Line                                                    | Pattern                                                                                                                                              |
| ----------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gate context hook + component tests | `src/features/gate/__tests__/feature-gate-client.test.tsx:1` | `vi.mock` upstream hooks (`useSession`, `usePageFlags`), `renderHook()` for pure hooks, `render()` + `screen.getByText()` for components             |
| TanStack Query hook tests           | `src/shared/lib/hooks/usePageAccess.test.ts:1`               | `vi.mock('@tanstack/react-query')` with a `vi.fn()` for `useQuery`, plus `makeSession()`/`make`{Foo}`()` builder helpers                             |
| Agent-token lib tests               | `src/shared/lib/__tests__/agent-token.test.ts:1`             | Dynamic `await import('@shared/lib/agent-token')` to avoid server-only import errors, exhaustive description/expect + behavioural act-arrange-assert |

**Pattern for WorkspaceContext tests (TDD):**

```ts
// src/features/workspace/model/__tests__/workspace-registry.test.ts (RED → GREEN)
import { describe, it, expect } from 'vitest';
import { WORKSPACE_REGISTRY, getEnabledDefinitions, getDefinition } from '../registry';

describe('WORKSPACE_REGISTRY', () => {
  it('registers all five workspace types (PERSONAL, PROVIDER, PROPERTY, OWNER, AUTOMATION)', () => {
    const keys = Object.keys(WORKSPACE_REGISTRY);
    expect(keys).toEqual(
      expect.arrayContaining(['PERSONAL', 'PROVIDER', 'PROPERTY', 'OWNER', 'AUTOMATION'])
    );
  });

  it('hides Automation per D-11 (disabled: true)', () => {
    expect(WORKSPACE_REGISTRY.AUTOMATION.disabled).toBe(true);
    expect(getEnabledDefinitions().map(d => d.type)).not.toContain('AUTOMATION');
  });

  it('Provider declares PROPERTY as a child (D-04 hierarchy)', () => {
    expect(WORKSPACE_REGISTRY.PROVIDER.children).toEqual(['PROPERTY']);
  });
});
```

```ts
// src/features/workspace/model/__tests__/resolve-workspace-context.test.ts (RED → GREEN)
import { describe, it, expect } from 'vitest';
import { resolveWorkspaceContext } from '../resolve-workspace-context';
import type { DelegationListItem } from '@entities/delegation';

const activeDelegation = (o: Partial<DelegationListItem> = {}): DelegationListItem => ({
  id: 'd1',
  propertyId: 'p1',
  propertyAddress: '14 Palm Avenue',
  agentId: 'a1',
  agentName: 'Agent Smith',
  agentEmail: null,
  grantedById: 'o1',
  grantedByName: 'Owner Owens',
  permissions: ['maintenance:read', 'maintenance:create'],
  status: 'ACTIVE',
  startedAt: '2026-01-01',
  expiresAt: '2027-01-01',
  acceptedAt: '2026-01-01',
  rejectedAt: null,
  createdAt: '2026-01-01',
  ...o,
});

describe('resolveWorkspaceContext', () => {
  it('builds PROPERTY workspace from a matching ACTIVE delegation', () => {
    const ctx = resolveWorkspaceContext(
      { workspaceType: 'PROPERTY', delegationId: 'd1' },
      [activeDelegation()],
      { user: { id: 'u1' } } as never
    );
    expect(ctx).toEqual({
      workspaceId: 'property:p1',
      workspaceType: 'PROPERTY',
      scope: { propertyId: 'p1' },
      permissions: ['maintenance:read', 'maintenance:create'],
    });
  });

  it('throws registry_miss when delegationId not found', () => {
    expect(() =>
      resolveWorkspaceContext({ workspaceType: 'PROPERTY', delegationId: 'missing' }, [], {
        user: { id: 'u1' },
      } as never)
    ).toThrow(/registry_miss/);
  });

  it('throws revoked when delegation status is REVOKED', () => {
    expect(() =>
      resolveWorkspaceContext(
        { workspaceType: 'PROPERTY', delegationId: 'd1' },
        [activeDelegation({ status: 'REVOKED' })],
        { user: { id: 'u1' } } as never
      )
    ).toThrow(/revoked/);
  });

  it('throws revoked when expiresAt is in the past', () => {
    expect(() =>
      resolveWorkspaceContext(
        { workspaceType: 'PROPERTY', delegationId: 'd1' },
        [activeDelegation({ expiresAt: '2020-01-01' })],
        { user: { id: 'u1' } } as never
      )
    ).toThrow(/revoked/);
  });

  it('builds PERSONAL workspace from session alone (no delegations)', () => {
    const ctx = resolveWorkspaceContext({ workspaceType: 'PERSONAL' }, [], {
      user: { id: 'u1', role: 'RESIDENT' },
    } as never);
    expect(ctx.workspaceType).toBe('PERSONAL');
    expect(ctx.workspaceId).toBe('personal:u1');
    expect(ctx.scope).toBeUndefined();
  });
});
```

```ts
// src/features/workspace/model/__tests__/switch-workspace.test.tsx (RED → GREEN)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { WorkspaceContextProvider, useWorkspaceContext, switchWorkspace } from '../..';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe('switchWorkspace', () => {
  it('atomically replaces WorkspaceContext on success (C-01)', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      <WorkspaceContextProvider initial={{ workspaceId: 'personal:u1', workspaceType: 'PERSONAL', permissions: [] }}>{children}</WorkspaceContextProvider>;

    const { result } = renderHook(() => useWorkspaceContext(), { wrapper });
    expect(result.current?.workspaceId).toBe('personal:u1');

    await act(async () => {
      await switchWorkspace({ workspaceType: 'PROPERTY', delegationId: 'd1' });
    });

    expect(result.current?.workspaceId).toBe('property:p1');   // wholesale replaced, not merged
  });

  it('leaves prior context intact on resolve error (rollback semantics)', async () => {
    // Switch to a revoked delegation → expect current to remain unchanged, error thrown
    // (Verify by asserting result.current.workspaceId === 'personal:u1' after act)
  });

  it('short-circuits (no toast, no navigate) when target === current', async () => {
    // switchWorkspace({workspaceId: 'personal:u1'}) → no router.push call
  });
});
```

### 8.3 TDD Candidates (ordered by ROI)

| Rank | Target                                                                   | Reason                                                                                                                          |
| ---- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `WORKSPACE_REGISTRY` + `getEnabledDefinitions()` + `getDefinition(type)` | Pure data; tests ARE the spec; trivial to write                                                                                 |
| 2    | `resolveWorkspaceContext(target, delegations, session)`                  | Pure function with `DelegationListItem[]` input — easy to fixture; covers the rollback + revoked-expired-registry-miss branches |
| 3    | `switchWorkspace(target)` — atomic replace + idempotency + rollback      | Hardest to test, but is the heart of C-01 + D-07; use `renderHook` + `act`                                                      |
| 4    | `useWorkspaceContext()` (hook under provider)                            | Mostly contract assertion — `null` until resolved, then non-null                                                                |
| 5    | `WorkspaceContextProvider` (provider behaviour under load + unmount)     | Mount-unmount semantics — ensure no cache survives unmount (D-08)                                                               |
| 6    | `inferWorkspaceTarget(link)` (used by D-07 notification deep link)       | Parse URL → WorkspaceTarget — pure string ops, high value                                                                       |

---

## 9. ADR / Phase 111 Backend Primitive Audit

### 9.1 ADR-020 Status (Documentation Gap, NOT Blocker)

`docs/STEERING/ADR.md` contains three distinct `## ADR-020` entries:

- Line 933: "ADR-020: Focus Space Architecture — Dashboard as Purpose-Built Layers"
- Line 1102: "ADR-020: Server-Only Modules Use `server.ts` Sub-Barrels in FSD Slices"

The agent delegation ADR-020 cited by CONTEXT.md is **only "Proposed"** in
`.planning/phases/111-agent-gateway/AGENT_DELEGATION_DISCUSSION.md:24`. It was never
promoted to `docs/STEERING/ADR.md`.

**Implication for PLAN:** Phase 122 doesn't block on the missing ADR (D-01 accepts the
M6+ direction and the frontend is decoupled from backend Principal landing). However,
PLAN.md should include a side-task to promote the agent-delegation ADR to `ADR.md` with
the next free sequence number — otherwise future readers will be confused by the
`ADR-020` collisions. File a BD issue to track.

### 9.2 Phase 111 Backend Primitives Available for WorkspaceContext

| Primitive                                                                             | Source                                        | Used by P1a?                                                                                                                  |
| ------------------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `DelegationListItem` shape                                                            | `src/entities/delegation/types.ts:9`          | YES — input to `resolveWorkspaceContext()` for PROPERTY workspaces                                                            |
| `useDelegations(params)`                                                              | `src/entities/delegation/api.ts:22`           | YES — wraps `GET /api/delegations`                                                                                            |
| `useBlockDelegation()`                                                                | `src/entities/delegation/api.ts:48`           | NO — orthogonal to workspace; scope of future resident-privacy widget                                                         |
| `useDelegationAudit(id)`                                                              | `src/entities/delegation/api.ts:92`           | NO — for DelegationAuditLog widget only                                                                                       |
| `DelegationStatusFilter` enum (`PENDING \| ACTIVE \| REJECTED \| REVOKED \| EXPIRED`) | `src/entities/delegation/types.ts:29`         | YES — `resolveWorkspaceContext` only accepts `status === 'ACTIVE'`                                                            |
| `SCOPE_LABELS` (human-readable scope names)                                           | `src/entities/delegation/types.ts:58`         | YES — used by Workspace Scope Panel for "Permissions: ..." line (UI-SPEC §"Scope Panel Content Contract" field "Permissions") |
| `AgentToken` signing/verification                                                     | `src/shared/lib/agent-token.ts:131-211`       | NO — for agent-caller path; P1a resolver requires session, not token                                                          |
| `PageAccessResult.agent` field                                                        | `src/shared/lib/hooks/usePageAccess.ts:40-46` | MAYBE — used to populate scope for agent-token callers (deferred to P2).                                                      |
| `AgentAccess` (Drizzle table)                                                         | `src/db/schema/agent-accesses.ts:5`           | NO — server-side primitive; clients call via `useDelegations()`                                                               |

### 9.3 Gaps P1a Must Address (but can defer)

1. **PROVIDER workspace identity** isn't in `DelegationListItem`. PLAN must add a
   small `useProviderWorkspaces()` hook (new endpoint or Drizzle query via tRPC router
   if server-component-friendly path exists) OR defer PROVIDER workspace ship to a
   follow-up plan. Context CONTEXT D-03 says "Build shell first... then property
   workspaces, then owner views" — PROVIDER shell can land in P1a-1 registry protection
   only (no resolution logic), with the resolver stubbed to throw `not_implemented` for
   PROVIDER until a follow-up plan adds the missing data source.
2. **OWNER workspace identity** — needs count of user's owned properties. The Drizzle
   `properties.ownerId` relation exists (`users-relations.ts:ownedProperties`); a
   `useOwnerWorkspaces()` hook on a new endpoint (or scope expansion on `/api/access`)
   is required. PLAN can defer to P2 (matches D-03 incremental ship).
3. **Delegation `delegator` name** is available as `grantedByName` in
   `DelegationListItem` — already covers the scope panel's "Delegated by" field
   (UI-SPEC §"Property").

### 9.4 What Phase 111 Does NOT Have

- **No workspace identity context.** Phase 111 ships delegation _records_; it does not
  model an active workspace. WorkspaceContext is the missing frontend perspective。
- **No "current delegation" state.** Each request resolves scopes via
  `resolveAgentScope()` server-side — there is no frontend "active workspace" concept to
  build on. WorkspaceContext is greenfield in this sense.

---

## 10. FSD Architecture Constraints (Steiger)

### 10.1 Slice Placement for New Code

Per AGENTS.md, FSD layers enforced by both ESLint (`no-restricted-imports`) and Steiger
(`steiger.config.js` at repo root). New WorkspaceContext code must live inside slices:

| Code                                                                                                         | FSD Layer + Slice                                          | Path                                                                  |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------- |
| `WorkspaceType`, `WorkspaceDefinition`, `WorkspaceContext` (interface), `WorkspaceTarget`, `Permission` type | `entities/workspace/model`                                 | `src/entities/workspace/model/types.ts`                               |
| `WORKSPACE_REGISTRY`, `getEnabledDefinitions()`, `getDefinition()`                                           | `entities/workspace/model`                                 | `src/entities/workspace/model/registry.ts`                            |
| `resolveWorkspaceContext()`                                                                                  | `entities/workspace/model` (or `features/workspace/model`) | `src/entities/workspace/model/resolve-context.ts` — pure fn, no React |
| `useWorkspaceContext()`, `WorkspaceContextProvider`, `switchWorkspace()`                                     | `features/workspace/model`                                 | `src/features/workspace/model/workspace-context.tsx` (`'use client'`) |
| Selector UI, empty state, scope panel                                                                        | `widgets/workspace/ui`                                     | `src/widgets/workspace/ui/WorkspaceSelector.tsx` etc.                 |
| Recent/pinned prefs store                                                                                    | `features/workspace/model`                                 | `src/features/workspace/model/workspace-prefs.ts`                     |
| `inferWorkspaceTarget(link)` (D-07 deep-link inference)                                                      | `features/workspace/model`                                 | `src/features/workspace/model/infer-target.ts`                        |

**Why not `src/features/workspace/` for `WORKSPACE_REGISTRY`?** Per FSD strict layering,
the registry is _domain data_ (the vocabulary of workspace types), not a _feature_ (which
would be a user-facing capability). FSD puts domain types in `entities`. The pure
resolver also fits `entities` (no UI). Features layer houses hooks that bridge entity
model to React (provider, hook, switch-action function).

**Steiger violations to anticipate:**

- The presence of `LucideIcon` on `WorkspaceDefinition` will cause Steiger to see
  `lucide-react` imports in `entities/workspace/model/registry.ts`. Lucide is already
  imported by `entities/workspace` precedent (`src/widgets/dashboard/model/spaces.ts:13`
  imports `LucideIcon`). Mirror that pattern: import the icon **types** in entities and
  the icon **values** in widgets. Or use a string icon key (registry stores `"Home"`,
  widget code resolves to `<Home />`). Recommend the latter for the registry — keeps
  entities pure SVG-free data, lets widgets select icons.

### 10.2 No-Public-API-Sidestep Allow List

If WorkspaceRegistry must reference `PlatformPageFlags` for filtering enabled
definitions, the cross-slice reference is allowed (already shared as `@shared/lib`). No
sidestep for Phase 122 expected. PLAN should not add new entries to
`noPublicApiSidestep` in `steiger.config.js` (sidesteps require a BD issue per AGENTS.md
§"FSD Architecture (Steiger)").

---

## 11. Execution Protocol — Feature Branch & Worktree

CONTEXT.md's "MANDATORY: Feature Branch Required" section mandates:

1. `git checkout -b phase-122-workspace-context` from `dev` (NOT mainline `main`).
2. All P1a-1 through P1a-6 commits on the feature branch.
3. Quality gates run on the branch before merging back to `dev`.

**Tension with AGENTS.md worktree protocol:** AGENTS.md mandates all GSD phases execute
inside a git worktree created via `wt switch --create <GSD_PHASE> --base dev`, copying
`.env` immediately. The phase's CONTEXT.md instead specifies a plain `git checkout -b`.

**Reconciliation:** Use the worktree flow (AGENTS.md is the higher authority). Set
`GSD_PHASE=phase-122-workspace-context`, follow Lifecycle A (create):

```bash
GSD_PHASE="phase-122-workspace-context"
wt switch --create ${GSD_PHASE} --base dev                 # NOT --base main
cp .env ../worktrees/${GSD_PHASE}/.env                     # before any commands
cd ../worktrees/${GSD_PHASE}
# quality gates inside the worktree before merging back:
#   pnpm typecheck
#   pnpm lint
#   pnpm test --run src/features/workspace src/entities/workspace
# merge via wt merge, then Lifecycle C cleanup
```

**Steiger caveat:** Steiger runs as a pre-commit hook (`bash scripts/steiger-staged.sh`,
per AGENTS.md) and may fail on intermediate FSD states during P1a (new slices being
created will lack public API barrels temporarily). Two strategies:

- Commit the bare entity slice with `index.ts` (public API barrel) BEFORE the model
  files that populate it — Steiger's `public-api-presence` rule then sees the public
  API marker.
- Or use `--no-verify` for `wip:` commits (checkpoint commits), and re-run Steiger
  before merge to `dev`.

PLAN.md should explicitly call out this Steiger sequencing risk; do NOT bypass
verification on the final commit set.

---

## 12. Risk Register — Items PLAN.md Must Address

| #    | Risk                                                                                                                                            | Mitigation                                                                                                                                                                                                     |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-01 | CONTEXT.md path errors (`useGateContext` path, `AuthenticatedUserProvider` non-existence) propagate into PLAN                                   | PLAN cites corrected paths from this RESEARCH.md; reviewer double-checks all imports in PLAN against `src/`                                                                                                    |
| R-02 | Static-registry pattern declared in CONTEXT.md sketch as `register()` runtime API → PLAN tries to build runtime API, diverging from house style | This RESEARCH §1.3 recommends static `Record<K,V>` + helpers; PLAN adopts. If runtime API is required later, addendum this RESEARCH.                                                                           |
| R-03 | PROVIDER and OWNER workspaces lack data sources in Phase 111 hooks                                                                              | P1a-1 registers all 5 types but `resolveWorkspaceContext()` only needs to fully support PERSONAL and PROPERTY for v1; PROVIDER/OWNER throw `not_implemented` (deferred to P2 per D-03)                         |
| R-04 | Steiger fails on intermediate FSD WIP states during P1a                                                                                         | Commit public API barrels before model files (§11)                                                                                                                                                             |
| R-05 | Zustand temptation — engineer reaches for Zustand for WorkspaceContext state, violating D-08                                                    | PLAN explicitly mandates React Context + `useState` (§6) with rationale verbatim from this RESEARCH                                                                                                            |
| R-06 | ADR-020 collisions in `docs/STEERING/ADR.md` confuse readers                                                                                    | File BD issue to promote `AGENT_DELEGATION_DISCUSSION.md` "Proposed ADR-020" to a sequenced ADR (e.g., ADR-022, leaving ADR-020 collisions alone for backward compat)                                          |
| R-07 | External deep-link middleware hint header leaks via URL or persists                                                                             | Middleware strips URL param (C-02), hint cookie has `Max-Age=5` (read-once). PLAN includes test asserting URL after middleware redirect contains no `?workspace=` or `?agent_token=` param                     |
| R-08 | Notification click handler in `src/app/notifications/page.tsx:128` is duplicated (e.g., future notification bell in Header)                     | Extract `<NotificationLink>` in `widgets/workspace/ui/NotificationLink.tsx`; reuse for BOTH the notifications page and any future header bell. Future header notifications feature imports the same component. |
| R-09 | Recent/Pinned Zustand stores accidentally cache WorkspaceContext itself (D-08 violation)                                                        | PLAN specifies prefs hold only `{workspaceId, workspaceType, label, scope}` snapshot fields — not the full `WorkspaceContext` (which includes `permissions[]` derived live from delegations).                  |
| R-10 | Test path aliases missing for new `entities/workspace` / `features/workspace` slices                                                            | `vitest.config.ts:53-54` already aliases `@features` and `@entities` — no config change needed. Verify by running `pnpm test --run src/features/workspace` after P1a-2                                         |

---

## Validation Architecture

> Required by Nyquist Dimension 8 — what must be tested and how, per implementation step.

### Unit Tests (must ship in P1a-1 through P1a-6)

| Implementation Step                                        | Test File Target                                                    | Coverage Goal                                                                                                                | Approach                                                                                                                                                                                                      |
| ---------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1a-1** WorkspaceRegistry                                | `src/entities/workspace/model/__tests__/registry.test.ts`           | 100% on `getEnabledDefinitions`, `getDefinition`                                                                             | Pure data + predicate tests (no mocks). Assert all 5 types registered, AUTOMATION disabled (D-11), PROVIDER declares PROPERTY child (D-04), navigation/actions/widgets arrays are non-empty for enabled types |
| **P1a-2** WorkspaceContext provider                        | `src/features/workspace/model/__tests__/workspace-context.test.tsx` | All public surface of `WorkspaceContextProvider` + `useWorkspaceContext`                                                     | `renderHook()` under wrapper; assert provider returns `null` until resolved, then non-null; assert mount-unmount (D-08) — no state survives reuse of the hook after remount                                   |
| **P1a-3** switchWorkspace (atomic + idempotent + rollback) | `src/features/workspace/model/__tests__/switch-workspace.test.tsx`  | All 6 branches: success, idempotent, registry_miss, revoked, expired, network error                                          | `renderHook` + `act`; `vi.mock('next/navigation')` for `useRouter().push`; assert `router.push` called exactly once on success, zero on idempotent or error                                                   |
| **P1a-4** Hierarchical selector                            | `src/widgets/workspace/ui/__tests__/WorkspaceSelector.test.tsx`     | Render 0, 1, 100, 250 delegations; keyboard nav (CMD+K, arrows, Enter, Esc)                                                  | `render()` + `fireEvent`; assert accessible focus ring; assert virtualization kicks in above 100 rows (TanStack Virtual)                                                                                      |
| **P1a-5** Empty state                                      | `src/widgets/workspace/ui/__tests__/EmptyWorkspaceState.test.tsx`   | All 3 CTAs render + copy per UI-SPEC §"Copywriting Contract"                                                                 | Snapshot or text-equality assertions on the three verb-first CTAs ("Accept a delegation invitation" etc.)                                                                                                     |
| **P1a-6** Scope panel                                      | `src/widgets/workspace/ui/__tests__/WorkspaceScopePanel.test.tsx`   | All four workspace types render correct fields (Per UI-SPEC §"Scope Panel Content Contract" matrix); missing field behaviour | Parametrize across `PERSONAL/PROVIDER/PROPERTY/OWNER`; assert "Delegated by" only renders for Provider/Property; assert "Expires: Never" when null                                                            |

### Integration Tests (cross-cutting flows)

| Flow                                                        | Test Target                                                      | What it Covers                                                                                                                                                                                                        |
| ----------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **WorkspaceContextProvider + useWorkspaceContext consumer** | `src/features/workspace/__tests__/provider-integration.test.tsx` | Provider (mount) → child consumer (read) → switch action (mutate) → consumer re-renders with new context                                                                                                              |
| **switchWorkspace + router.push**                           | `src/features/workspace/__tests__/switch-and-navigate.test.tsx`  | Mock next/navigation; assert `switchWorkspace({type:'PROPERTY', delegationId:'d1'})` calls `router.push('/properties/p1')` exactly once, then sets context atomically                                                 |
| **GateContext + WorkspaceContext coexist**                  | `src/features/workspace/__tests__/gate-coexistence.test.tsx`     | Render a component that calls `useGateContext()` AND `useWorkspaceContext()` simultaneously; assert both return valid data without interfering; assert switching workspace does NOT change GateContext and vice versa |
| **Notification deep-link integration**                      | `src/widgets/workspace/ui/__tests__/NotificationLink.test.tsx`   | Click `<NotificationLink href="/properties/p1">` → assert `switchWorkspace` called, `router.push` called, toast shown                                                                                                 |
| **External deep-link middleware**                           | `src/middleware.test.ts` (extend existing)                       | Mock request with `?agent_token=...` → assert response location is `/properties/p1` with NO `?agent_token` (C-02), assert `x-workspace-hint` header set                                                               |

### Property-Based Tests (recommended — C-01 + D-08 are invariant properties)

Invariants to verify with `fast-check` or hand-rolled property tests:

| #    | Property                                                                                                                                                      | Generators                   | Assertion                                                                                                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P-01 | **Atomic replace** — after `switchWorkspace(t)`, the context value identity changes (new object reference, not mutated in-place)                              | `arbitraryWorkspaceTarget()` | `oldCtx !== newCtx` (Object.is false); `oldCtx.workspaceId !== newCtx.workspaceId`; `oldCtx` still accessible via closure with pre-switch fields unchanged |
| P-02 | **Idempotency** — switching to the current workspace is a no-op: no router push, no toast, no context change                                                  | target equal to current      | `router.push` not called; `useWorkspaceContext()` value identity unchanged                                                                                 |
| P-03 | **Rollback on resolve error** — failed resolve leaves the prior context intact (C-01 + UI-SPEC §"Atomic Workspace Switch" step "no half-context is ever set") | target that throws           | `useWorkspaceContext()` value identity unchanged; error is thrown; UI error toast fires                                                                    |
| P-04 | **D-08 uncached** — unmounting and remounting the provider with the same `initial` prop yields the same initial value (no stale cache)                        | random initial               | After unmount + remount, `useWorkspaceContext()` returns the initial value, never the prior switched value                                                 |
| P-05 | **C-03 lightweight** — the serialized `WorkspaceContext` object only contains the 4 allowed fields; no domain data leaks into the value                       | random switch targets        | `JSON.stringify(ctx)` does not contain `"tasks"`, `"messages"`, `"maintenance"`, `"billing"` keys                                                          |

### Acceptance Tests Per Requirement ID (REQUIREMENTS.md doesn't list WS-01..WS-06 — these come from the phase brief)

| ID    | Description                                                                          | Primary Test Witness                                                                    |
| ----- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| WS-01 | WorkspaceRegistry (canonical registry of types/nav/actions/widgets/permissions)      | `registry.test.ts` (P-01 above) + `getEnabledDefinitions` unit test                     |
| WS-02 | WorkspaceContext abstraction (provider + hook)                                       | `workspace-context.test.tsx` (P1a-2) + gate-coexistence integration test                |
| WS-03 | Atomic switching logic (resolve → replace → navigate → render → notify)              | `switch-workspace.test.tsx` (P-01, P-02, P-03 properties)                               |
| WS-04 | Hierarchical selector (registry-driven tree with search/recent/favorites/pinned/all) | `WorkspaceSelector.test.tsx` (P1a-4) — covers >100 row virtualization + keyboard scheme |
| WS-05 | Empty states (welcome surface for zero-delegation users)                             | `EmptyWorkspaceState.test.tsx` (P1a-5) — copy + 3 CTAs                                  |
| WS-06 | Workspace scope panel (first-class workspace scope/delegator/permissions/expiry)     | `WorkspaceScopePanel.test.tsx` (P1a-6) — parametrized across 4 types                    |

### Test Sequencing (TDD mode active)

1. **Before any implementation**, write tests in this order (matches UI-SPEC's
   "Executor regression checklist"):
   1. `registry.test.ts` — RED
   2. `resolve-workspace-context.test.ts` — RED (P1a-3 prerequisite)
   3. `workspace-context.test.tsx` — RED
   4. `switch-workspace.test.tsx` — RED
   5. UI tests for P1a-4 / P1a-5 / P1a-6 — RED
2. Implement minimally to go GREEN, in the P1a-1 → P1a-6 order from CONTEXT.md.
3. Property-based tests (P-01 through P-05) ship alongside their corresponding step
   (P-01+P-03 with P1a-3; P-04 with P1a-2; P-05 with P1a-2 as a guard test).
4. Integration tests can land in the same commit as the feature they integrate (e.g.,
   `NotificationLink.test.tsx` lands with the `<NotificationLink>` JSX in P1a-3 or
   a follow-up).

---

## RESEARCH COMPLETE
