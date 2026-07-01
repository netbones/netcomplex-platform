---
phase: 122
slug: workspace-context-architecture
created: 2026-07-01
source: CONTEXT.md + 122-RESEARCH.md + 122-UI-SPEC.md + 122-VALIDATION.md + codebase walk
---

# Phase 122 — Pattern Mapping

> Maps each new file this phase will create/modify to the closest existing in-repo
> analog. Extracts concrete code excerpts so PLAN.md can lift them without re-discovery.
> Pairs with `122-RESEARCH.md` (which provides the why) — this file provides the what.

## File Inventory (from CONTEXT.md `implementation_order` + RESEARCH §10 + VALIDATION.md)

### New files (10 source + 10 tests + 1 modified)

**FSD `entities/workspace` slice (P1a-1 model)**

1. `src/entities/workspace/model/types.ts` — workspace type vocab + interfaces
2. `src/entities/workspace/model/registry.ts` — `WORKSPACE_REGISTRY` static map + helpers
3. `src/entities/workspace/model/permissions.ts` — workspace Permission union
4. `src/entities/workspace/model/__tests__/registry.test.ts`
5. `src/entities/workspace/index.ts` — public API barrel

**FSD `features/workspace` slice (P1a-2 + P1a-3 model)** 6. `src/features/workspace/model/workspace-context.tsx` — React Context + Provider + hook (`'use client'`) 7. `src/features/workspace/model/resolve-workspace-context.ts` — pure resolver 8. `src/features/workspace/model/switch-workspace.ts` — 5-step action 9. `src/features/workspace/__tests__/provider-integration.test.tsx` 10. `src/features/workspace/__tests__/switch-and-navigate.test.tsx` 11. `src/features/workspace/__tests__/gate-coexistence.test.tsx` 12. `src/features/workspace/model/__tests__/workspace-context.test.tsx` 13. `src/features/workspace/model/__tests__/switch-workspace.test.tsx` 14. `src/features/workspace/index.ts` — public API barrel

**FSD `widgets/workspace` slice (P1a-4 + P1a-5 + P1a-6)** 15. `src/widgets/workspace/ui/WorkspaceSelector.tsx` — hierarchical tree + search/recent/pinned/all 16. `src/widgets/workspace/ui/EmptyWorkspaceState.tsx` — onboarding with 3 verb-first CTAs 17. `src/widgets/workspace/ui/WorkspaceScopePanel.tsx` — scope/delegator/permissions/expiry 18. `src/widgets/workspace/ui/NotificationLink.tsx` — wraps notification link with `switchWorkspace()` 19. `src/widgets/workspace/ui/__tests__/WorkspaceSelector.test.tsx` 20. `src/widgets/workspace/ui/__tests__/EmptyWorkspaceState.test.tsx` 21. `src/widgets/workspace/ui/__tests__/WorkspaceScopePanel.test.tsx` 22. `src/widgets/workspace/ui/__tests__/NotificationLink.test.tsx` 23. `src/widgets/workspace/index.ts` — public API barrel

**Modified files**

- `src/app/providers.tsx` — wrap `<TooltipProvider>` children in `<WorkspaceContextProvider>` (P1a-2 insertion point per RESEARCH §5.2)
- `src/app/notifications/page.tsx:128-134` — replace `<Link>` with `<NotificationLink>` (D-07 — required for P1a-3 deeplink; or defer to follow-up per VALIDATION §"Test Sequencing" item 4)

**Not yet created** (the directories `src/entities/workspace`, `src/features/workspace`, `src/widgets/workspace` do not exist — clean greenfield slices).

---

## Pattern A — `WORKSPACE_REGISTRY`: static `Record<K, V>` + pure helper functions

### Closest analogs (rank order)

**Rank 1 (CLEAREST) — `SPACES` registry** at `src/widgets/dashboard/model/spaces.ts:61`

```ts
export type SpaceId = 'home' | 'providers' | 'services' | 'community' | 'messages' | 'admin';

export interface SpaceDefinition {
  id: SpaceId;
  href: string;
  labelKey: string;
  icon: LucideIcon;
  isCore: boolean;
  requiredFlag?: keyof PlatformPageFlags;
  minimumRole?: string;
  widgetIds: string[];
}

export const SPACES: Record<SpaceId, SpaceDefinition> = {
  home: { id: 'home', href: '/dashboard', labelKey: 'spaces.home', icon: Home, isCore: true, widgetIds: [...] },
  admin: { id: 'admin', href: '/admin', labelKey: 'spaces.admin', icon: Shield, isCore: true, minimumRole: 'admin', widgetIds: [...] },
  // ...
};

export const SPACE_SLUGS = Object.keys(SPACES) as SpaceId[];

// Pure helpers — no mutation, no side effects
export function filterSpaces(accessibleSpaceIds: SpaceId[], flags: PlatformPageFlags): SpaceDefinition[] {
  return accessibleSpaceIds
    .map(id => SPACES[id])
    .filter((space): space is SpaceDefinition => {
      if (!space) return false;
      if (space.requiredFlag) return flags[space.requiredFlag] !== false;
      // ...
      return true;
    });
}

export function getActiveSpaceId(pathname: string): SpaceId | 'home' { /* pure route resolver */ }
export function resolveSpace(slug: string): SpaceDefinition | undefined { return SPACES[slug as SpaceId]; }
export function getWidgetsForSpace(spaceId: SpaceId): string[] { return SPACES[spaceId]?.widgetIds ?? []; }
```

The definition shape is structurally identical to what `WorkspaceDefinition` needs (typed key, label, icon, optional role/flag gating, child widget IDs). Haber pattern: import `LucideIcon` for the icon type, store the icon component as value.

**Rank 2 — `MODULES` enum-keyed registry** at `src/shared/lib/constants/tiers.ts:51`

```ts
export type ModuleKey = 'directory' | 'news' | 'events' | /* ... 18 keys */;

export interface ModuleDefinition {
  key: ModuleKey;
  label: string;
  description: string;
  tier: TierLevel;
}

export const MODULES: Record<ModuleKey, ModuleDefinition> = {
  directory: { key: 'directory', label: 'Directory', description: '...', tier: 'foundation' },
  // ...
};

// Pure predicate + lookup helpers
export function hasModuleAccess(tier: TierLevel, module: ModuleKey): boolean {
  const tierModules = TIERS[tier].modules;
  return tierModules.includes(module);
}
export function getTierModules(tier: TierLevel): ModuleKey[] {
  return TIERS[tier].modules;
}
```

This is the canonical layer shouldn't-touched-by-mutation pattern. Mirroring this gives us `hasWorkspaceAccess`, `getEnabledWorkspaceTypes` style helpers.

**Rank 3 — `FEATURE_REGISTRY` (string-keyed, tier-aware feature defs)** at `src/entities/tenant/api/features/registry.ts:43`

```ts
export const FEATURE_REGISTRY: Record<string, FeatureDefinition> = {
  'page.directory': {
    key: 'page.directory',
    tier: 'foundation',
    category: 'page',
    label: '...',
    description: '...',
    icon: 'users',
  },
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

Feature-flag-aware filter — directly applicable to the `disabled?: boolean` workspace gating (D-11 Automation).

### Pattern A → Phase 122 application

Recommended shape from `122-RESEARCH.md` §1.3 (verbatim style; **adopt, do not invent new shape**):

```ts
// src/entities/workspace/model/registry.ts
export type WorkspaceType = 'PERSONAL' | 'PROVIDER' | 'PROPERTY' | 'OWNER' | 'AUTOMATION';

export interface WorkspaceDefinition {
  type: WorkspaceType;
  label: string;
  icon: LucideIcon;
  href?: string; // optional — Personal has none
  navigation: NavItem[];
  actions: ActionDef[];
  widgetIds: string[]; // mirror SpaceDefinition.widgetIds
  requiredPermissions: Permission[];
  children?: WorkspaceType[]; // D-04 hierarchy
  disabled?: boolean; // D-11 — Automation: disabled: true in P1a
}

export const WORKSPACE_REGISTRY: Record<WorkspaceType, WorkspaceDefinition> = {
  PERSONAL: { type: 'PERSONAL', label: 'Personal', icon: User /* ... */ },
  PROVIDER: {
    type: 'PROVIDER',
    label: 'Provider',
    icon: Building2,
    children: ['PROPERTY'] /* ... */,
  },
  PROPERTY: { type: 'PROPERTY', label: 'Property', icon: Home /* ... */ },
  OWNER: { type: 'OWNER', label: 'Owner', icon: ShieldCheck /* ... */ },
  AUTOMATION: { type: 'AUTOMATION', label: 'Automation', icon: Bot, disabled: true },
};

// Pure helpers, mirroring tier/spaces conventions
export function getEnabledDefinitions(): WorkspaceDefinition[] {
  return Object.values(WORKSPACE_REGISTRY).filter(d => !d.disabled);
}
export function getDefinition(type: WorkspaceType): WorkspaceDefinition | undefined {
  return WORKSPACE_REGISTRY[type];
}
export function getWorkspaceTypes(): WorkspaceType[] {
  return Object.keys(WORKSPACE_REGISTRY) as WorkspaceType[];
}
```

### Decision note (the PATTERN conflict)

CONTEXT.md's `WorkspaceRegistry { register(), getDefinition(), ... }` runtime sketch is **valid in-repo** — `src/widgets/dashboard/model/registry.ts:26-89` ships a `WidgetRegistry` class singleton with `register() / resolve() / list() / listForContext()`. However the closest _**entity-domain**_ analog (`SPACES`, `MODULES`, `FEATURE_REGISTRY`) is the static `Record<K, V>` form, and RESEARCH §1.3 verdict is explicit: ship static for P1a.

> **PATTERN LOCK:** Adopt the **static `Record` + helpers** form (Rank 1-3 analog). RESEARCH §1.3 explicitly rejects the runtime `register()` API for v1; PLAN must not import the `WidgetRegistry` class pattern. Runtime registration becomes possible only as a Phase P3+ addendum.

### Steiger caveat (RESEARCH §10)

`LucideIcon` import in the registry at `src/entities/workspace/model/registry.ts` may trigger `entities → @shared/lib` Steiger warnings (entity slices importing shared UI primitives). Existing precedent: `src/widgets/dashboard/model/spaces.ts:12-13` imports `LucideIcon` from `lucide-react` AND icon values. For the **entity** layer, prefer the **string icon key** form (registry stores `"Home"`, widgets resolve to `<Home />`) — keeps `entities/workspace` free of UI dependencies. PLAN must pick one and call it out; recommended is string keys in entities, value resolution in `widgets/workspace/ui`.

---

## Pattern B — `WorkspaceTarget` + `WorkspaceContext` interfaces

### Closest analog — `ClientGateContext` at `src/features/gate/model/gate.ts:38-43`

```ts
export interface ClientGateContext {
  role: Role;
  flags: PlatformPageFlags;
  /** Optional tier (TierLevel) — when present, enables Layer 4 client-side. */
  tier?: TierLevel;
}
```

### Pattern B → Phase 122 application

Identical shape — an interface with one required shape and optional flags. Apply the same pattern in `src/entities/workspace/model/types.ts`:

```ts
// PATTERN LIFT from gate.ts:38-43 — interface + JSDoc optional fields
export interface WorkspaceContext {
  workspaceId: string;
  workspaceType: WorkspaceType;
  scope?: { propertyId?: string; providerId?: string; ownerId?: string };
  permissions: Permission[];
}

export interface WorkspaceTarget {
  workspaceType: WorkspaceType;
  delegationId?: string; // required for PROPERTY
  propertyId?: string;
  providerId?: string;
  ownerId?: string;
}
```

`WorkspaceRegistry` (instance interface) discards `register()` per Pattern A verdict — keep only the lookup helpers.

### Permission type union

The existing `SCOPE_LABELS: Record<string, string>` at `src/entities/delegation/types.ts:58` enumerates hats like `'maintenance:read'`, `'communication:contact_occupant'`, etc. Phase 122's `permissions.ts` should union these — derive a `Permission` type from `keyof typeof SCOPE_LABELS | string` (or the explicit scope strings from `ROLE_PERMISSIONS` at `src/shared/lib`).

```ts
// src/entities/workspace/model/permissions.ts
import type { SCOPE_LABELS } from '@entities/delegation';
export type Permission = keyof typeof SCOPE_LABELS | (string & {}); // allow forward-compat additions
```

---

## Pattern C — Feature barrel (public API surface)

### Closest analog — `src/entities/delegation/index.ts:1-2`

```ts
export * from './types';
export { useDelegations, useBlockDelegation, useDelegationAudit } from './api';
```

And `src/features/gate/index.ts:1-2`:

```ts
export * from './model/gate';
export * from './ui/GateGuard';
```

### Pattern C → Phase 122 application

Steiger enforces a public API presence per slice. The barrel should re-export only the model symbols consumers need (NOT the `'use client'` provider — that's a separate leak concern).

```ts
// src/entities/workspace/index.ts
export * from './model/types';
export * from './model/permissions';
export * from './model/registry';
```

```ts
// src/features/workspace/index.ts
export { WorkspaceContextProvider, useWorkspaceContext } from './model/workspace-context';
export { switchWorkspace } from './model/switch-workspace';
export { resolveWorkspaceContext, WorkspaceResolveError } from './model/resolve-workspace-context';
export type { WorkspaceContext, WorkspaceTarget } from '@entities/workspace';
```

> **Do NOT `export *` from `features/workspace/index.ts`** — that leaks the React Provider symbol to consumers who may not need it. Selectively export per the `features/gate/index.ts` pattern (and even better, alias the provider to its lowercase consumer-hook form).

---

## Pattern D — `useGateContext` hook composition (NOT a React Context!)

### Closest analog — `src/features/gate/model/gate.ts:54-69`

```ts
export function useGateContext(): ClientGateContext | null {
  const { flags, isLoading, error } = usePageFlags();
  const { data: session } = useSession();

  if (isLoading || error || !flags) {
    return null; // ← deny-default while loading
  }

  const role = (session?.user as { role?: string } | undefined)?.role as Role | undefined;
  const resolvedRole: Role = role ?? 'RESIDENT';

  return {
    role: resolvedRole,
    flags,
  };
}
```

### Pattern D → Phase 122 deviation

RESEARCH §6 verdict: WorkspaceContext **DOES** use a real React Context provider (unlike GateContext which is pure hook composition). The reason is D-07 — `switchWorkspace()` must be callable from arbitrary callbacks (notification links, middleware-hint effects) outside the render tree of the selector.

The `null`-while-loading convention from `useGateContext:58-60` is preserved verbatim — `useWorkspaceContext()` returns `WorkspaceContext | null`.

```ts
// src/features/workspace/model/workspace-context.tsx  ('use client' — PATTERN LIFT from providers.tsx structure)
'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { WorkspaceContext, WorkspaceTarget } from '@entities/workspace';

const WorkspaceContextCtx = createContext<WorkspaceContext | null>(null);

interface WorkspaceContextProviderProps {
  initial?: WorkspaceContext | null;
  children: ReactNode;
}

export function WorkspaceContextProvider({ initial = null, children }: WorkspaceContextProviderProps) {
  const [ctx, setCtx] = useState<WorkspaceContext | null>(initial);   // ← atomic replace semantics (C-01)
  return (
    <WorkspaceContextCtx.Provider value={ctx}>
      <WorkspaceContextCtxSetter.Provider value={setCtx}>
        {children}
      </WorkspaceContextCtxSetter.Provider>
    </WorkspaceContextCtx.Provider>
  );
}

export function useWorkspaceContext(): WorkspaceContext | null {
  return useContext(WorkspaceContextCtx);   // ← null while unresolved (mirrors useGateContext)
}

// Setter exposed only to switchWorkspace() — exported through features barrel, internal to consumers
export const WorkspaceContextSetter = createContext<React.Dispatch<React.SetStateAction<WorkspaceContext | null>> | null>(null);
```

> **Steiger caveat:** exposing the setter via a separate context export means PLAN must make sure `WorkspaceContextSetter` is NOT re-exported through `src/features/workspace/index.ts` — only `switchWorkspace` is. Bypassing this leaks mutation surface to consumers. Apply the `features/gate/index.ts` selective-export pattern (see Pattern C).

---

## Pattern E — `switchWorkspace()` 5-step contract

### Closest analog — `useBlockDelegation()` optimistic mutation at `src/entities/delegation/api.ts:48-87`

```ts
export function useBlockDelegation() {
  const queryClient = useQueryClient();

  return useMutation<...>({
    mutationFn: async ({ delegationId, blocked }) => {
      const res = await fetch(`/api/delegations/${delegationId}/block`, { /* ... */ });
      // ...
      return json.data ?? json;
    },
    onMutate: async ({ delegationId, blocked }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: DELEGATIONS_KEY });
      const previous = queryClient.getQueryData<DelegationListItem[]>(DELEGATIONS_KEY);
      queryClient.setQueryData<DelegationListItem[]>(DELEGATIONS_KEY, old =>
        (old ?? []).map(d => (d.id === delegationId ? { ...d, blocked } : d))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(DELEGATIONS_KEY, context?.previous);  // ← rollback
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DELEGATIONS_KEY });
    },
  });
}
```

> PATTERN LIFT: optimistic mutation → rollback → invalidate. WorkspaceContext's atomic switch (C-01) + rollback on resolve failure is the same shape. The `setWorkspaceContext(nextCtx)` is the analog of `queryClient.setQueryData(...)`, and the `try/catch` wrapping `resolveWorkspaceContext` is the analog of `onError → setQueryData(previous)`.

### Pattern E → Phase 122 application

The `switchWorkspace()` function from `src/features/workspace/model/switch-workspace.ts` follows UI-SPEC §"Atomic Workspace Switch" 5-step:

```ts
// PATTERN LIFT shapes from delegation/api.ts:48-87 (optimistic + rollback) and CONTEXT specifics from gate.ts:54
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { resolveWorkspaceContext, WorkspaceResolveError } from './resolve-workspace-context';
import { useWorkspaceContext, WorkspaceContextSetter } from './workspace-context';

export function useSwitchWorkspace() {
  const router = useRouter();
  const current = useWorkspaceContext();
  const setCtx = useContext(WorkspaceContextSetter);

  return async function switchWorkspace(target: WorkspaceTarget): Promise<void> {
    // Step 0 — Idempotency short-circuit (UI-SPEC §"Automatic Workspace Switch" already-in-target row)
    if (current && targetWorkspaceId(current) === resolveTargetWorkspaceId(target)) {
      if (target.href) router.push(target.href);
      return; // no toast, no context change
    }

    let nextCtx: WorkspaceContext;
    try {
      // Step 1 — resolve
      nextCtx = await resolveWorkspaceContext(target /* delegations, session */);
    } catch (err) {
      // Rollback: leave current context intact (C-01 + UI-SPEC error row)
      if (err instanceof WorkspaceResolveError) {
        toast.error(/* UI-SPEC "resolve failure" copy */);
      }
      throw err;
    }

    // Step 2 — atomic replace (React's set provides the single-render guarantee per RESEARCH §6.2)
    setCtx?.(nextCtx);

    // Step 3 — navigate
    if (target.href) router.push(target.href);

    // Step 5 — notify (Step 4 is render, which happens automatically on setCtx)
    toast.success(`Now viewing: ${workspaceLabel(nextCtx)}`);
  };
}
```

### Tests for `switchWorkspace()` — direct lift from `feature-gate-client.test.tsx`

```ts
// PATTERN LIFT from src/features/gate/__tests__/feature-gate-client.test.tsx:7-17
vi.mock('@api/client', () => ({ useSession: vi.fn() }));
vi.mock('@/shared/lib/hooks/usePageFlags', () => ({ usePageFlags: vi.fn() }));
// ... AND add:
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
```

> **Do NOT copy the LSP bug** RESEARCH flagged: the existing `useGateContext` tests use `mockUseSession.mockReturnValue({...} as any)` casts on `Role` enums that bypass typecheck — fine for the existing tests, but PLAN should consider tightening the cast to `as unknown as ReturnType<typeof useSession>` to avoid propagating the same debt to `switch-workspace.test.tsx`.

---

## Pattern F — Provider insertion at root `Providers`

### Closest analog (_the only insertion point_) — `src/app/providers.tsx:46-55`

```tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import { Toaster } from 'sonner';
import { authClient, trpc } from '@api/client';
import { TooltipProvider } from '@shared/ui';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        /* ... */
      })
  );
  const [trpcClient] = useState(() =>
    trpc.createClient({
      /* ... */
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster position="top-right" />
          {children}
        </TooltipProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

### Pattern F → Phase 122 insertion

Per RESEARCH §5.2, slot `WorkspaceContextProvider` inside `TooltipProvider`, wrapping `{children}` AND `<Toaster>` — the Toaster needs to read the current workspace label from context for the success toast:

```tsx
// src/app/providers.tsx — RECOMMENDED edit (P1a-2)
<TooltipProvider>
  <WorkspaceContextProvider>
    <Toaster position="top-right" />
    {children}
  </WorkspaceContextProvider>
</TooltipProvider>
```

> **Why this slot, NOT `(tenant)/layout.tsx`:** `/notifications` lives outside `(tenant)` (at `src/app/notifications/page.tsx`) and is the D-07 deep-link target — it must also consume `useWorkspaceContext()`. Root `Providers` is the only universally mounted client provider surface.

---

## Pattern G — Resolver pure function (no React)

### Closest analog — `filterSpaces()` at `src/widgets/dashboard/model/spaces.ts:192-217`

```ts
export function filterSpaces(
  accessibleSpaceIds: SpaceId[],
  flags: PlatformPageFlags
): SpaceDefinition[] {
  return accessibleSpaceIds
    .map(id => SPACES[id])
    .filter((space): space is SpaceDefinition => {
      if (!space) return false;
      if (space.requiredFlag) {
        return flags[space.requiredFlag] !== false;
      }
      if (space.id === 'community') {
        /* ... */
      }
      return true;
    });
}
```

And `getActiveSpaceId()` at `:273` — pure route → space ID resolver.

### Pattern G → Phase 122 application

`resolveWorkspaceContext()` is a pure function — `WorkspaceTarget` + `DelegationListItem[]` + `Session` → `WorkspaceContext`. Direct PATTERN LIFT:

```ts
// src/features/workspace/model/resolve-workspace-context.ts  (note: NOT 'use client' — pure, testable in isolation)
import type { WorkspaceContext, WorkspaceTarget } from '@entities/workspace';
import type { DelegationListItem } from '@entities/delegation';

export class WorkspaceResolveError extends Error {
  constructor(
    public readonly code: 'registry_miss' | 'revoked' | 'expired' | 'not_implemented' | 'forbidden'
  ) {
    super(code);
  }
}

export function resolveWorkspaceContext(
  target: WorkspaceTarget,
  delegations: DelegationListItem[],
  session: { user: { id: string } }
): WorkspaceContext {
  switch (target.workspaceType) {
    case 'PERSONAL':
      return {
        workspaceId: `personal:${session.user.id}`,
        workspaceType: 'PERSONAL',
        permissions: ['profile:read', 'settings:manage'],
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
        permissions: delegation.permissions as Permission[],
      };
    }
    case 'PROVIDER':
    case 'OWNER':
      throw new WorkspaceResolveError('not_implemented'); // R-03 deferred to P2 (D-03 incremental ship)
    case 'AUTOMATION':
      throw new WorkspaceResolveError('forbidden'); // D-11 disabled
  }
}
```

> PLAN should consider placing this in **`entities/workspace`** rather than `features/workspace` — RESEARCH §10.1 says either works since the function is pure (no React). The `entities` placement is more aligned with FSD model segment semantics and prevents a `features → entities` cross-layer import from `switchWorkspace()`. Choose one; document the choice in PLAN.

### Tests — Lift the builder pattern from `feature-gate-client.test.tsx:22-64`

```ts
// PATTERN LIFT from feature-gate-client.test.tsx:22-64 — makeFlags/makeCtx builder helpers
function activeDelegation(o: Partial<DelegationListItem> = {}): DelegationListItem {
  return {
    id: 'd1',
    propertyId: 'p1',
    propertyAddress: '14 Palm Avenue',
    agentId: 'a1',
    agentName: null,
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
  };
}
```

### Data sources

`useDelegations(params?)` at `src/entities/delegation/api.ts:22-39` already returns `DelegationListItem[]` from `GET /api/delegations` — the resolver consumes this directly. No new API route needed in P1a (per RESEARCH §3.1).

- `DelegationListItem` shape at `src/entities/delegation/types.ts:9-27` includes all needed fields: `id`, `propertyId`, `propertyAddress`, `grantedByName`, `permissions`, `status`, `expiresAt`.
- `DelegationStatusFilter` enum at `:29`: `'PENDING' | 'ACTIVE' | 'REJECTED' | 'REVOKED' | 'EXPIRED'` — resolver only accepts `ACTIVE`.
- `SCOPE_LABELS` at `:58-79` for human-readable permission chip labels in the scope panel.

---

## Pattern H — `SpaceChrome` integration (do NOT refactor)

### Closest analog — `src/widgets/dashboard/ui/SpaceChrome.tsx:38-41`

```tsx
export function SpaceChrome({ children }: SpaceChromeProps) {
  const [collapsed, setCollapsed] = useState(true);
  const pathname = usePathname();
  const ctx = useGateContext();
  const { spaces: visibleSpaces, isLoading: accessLoading } = useVisibleSpaces(ctx?.flags);

  const activeSpaceId = getActiveSpaceId(pathname);
  // ...
}
```

### Pattern H → Phase 122 application

RESEARCH §4.2 is explicit: **P1a does NOT refactor SpaceChrome.** WorkspaceContext becomes an orthogonal opinion the selector sets; SpaceChrome keeps `useGateContext()`. Pattern H is a HOOK-ADJACENT consumer example, not a target refactor.

The scope panel (P1a-6) does render inside SpaceChrome's wrapper (`<ErrorBoundary><div className="flex min-h-screen bg-gray-50">`), but it consumes `useWorkspaceContext()` — keep both hooks side-by-side:

```tsx
// After P1a — PATTERN LIFT shape only (NOT a forced refactor; the executor decides if P1a-6 wires this)
const wctx = useWorkspaceContext(); // new
const gctx = useGateContext(); // unchanged
```

### `MobileSpaceBar` path caveat (RESEARCH citation error)

RESEARCH §4.1 cites `MobileSpaceBar` at `src/widgets/workspace/ui/MobileSpaceBar.tsx:46`. **Verified path:** `src/widgets/dashboard/ui/MobileSpaceBar.tsx` — there is **no** `src/widgets/workspace/` directory yet. PLAN must correct the citation if it propagates the path. Discussion of where `WorkspaceSelector` mounts: in `src/shared/ui/Header.tsx` (root layout → header → workspace selector trigger) per UI-SPEC §"Surface 1", NOT inside SpaceChrome.

---

## Pattern I — `NotificationLink` consumer + middleware hint header (D-07)

### Closest edit site — `src/app/notifications/page.tsx:127-134`

```tsx
{
  notification.link && (
    <Link href={notification.link} className="text-indigo-600 text-sm hover:underline mt-2 block">
      View details
    </Link>
  );
}
```

### Pattern I → Phase 122 application

Replace this `<Link>` with `<NotificationLink>` (P1a-3 deliverable or follow-up per VALIDATION §"Test Sequencing" item 4):

```tsx
// src/widgets/workspace/ui/NotificationLink.tsx ('use client') — PATTERN LIFT body from notifications/page.tsx:127
'use client';

import { Link } from 'next/link'; // or @shared/ui if aliased
import { useSwitchWorkspace } from '@features/workspace';
import { inferWorkspaceTarget } from '@features/workspace/model/infer-target';
import { toast } from 'sonner';

interface NotificationLinkProps {
  href: string;
  notificationId: string;
  children: React.ReactNode;
  className?: string;
}

export function NotificationLink({
  href,
  notificationId,
  children,
  className,
}: NotificationLinkProps) {
  const switchWorkspace = useSwitchWorkspace();

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    const target = inferWorkspaceTarget(href); // pure URL → WorkspaceTarget parser
    if (target) {
      try {
        await switchWorkspace(target);
      } catch {
        // toast already shown by switchWorkspace
        return;
      }
    }
    // Fall through: target is null OR switch succeeded → navigate
    window.location.href = href;
  };

  return (
    <Link href={href} onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}
```

### External deep-link middleware (defer per VALIDATION `Out of Scope` if PLAN chooses)

`src/middleware.ts` exists (referenced by RESEARCH §7.2). For external deep links, middleware parses `?agent_token=...`, resolves via `verifyAgentToken` (`src/shared/lib/agent-token.ts:131-211` per RESEARCH §9.2), sets `x-workspace-hint` header or read-once cookie (`Max-Age=5`), strips URL param (C-02). VALIDATION §27 lists `src/middleware.test.ts` extension as an integration test target — defer if outside P1a scope.

---

## Pattern J — `tanstack/react-virtual` (no existing analog!)

### Discovery

```
$ grep -l '@tanstack/react-virtual\|useVirtualizer\|use_virtual' src/widgets/dashboard/ui/*.tsx package.json
(no results)
$ grep -n 'tanstack/react-virtual\|useVirtualizer' package.json
(no results)
```

**Nobody in the codebase uses TanStack Virtual.** The library is NOT currently in `package.json`. UI-SPEC §"Search / Recent / Pinned / All" calls for virtualization when row count exceeds 100; VALIDATION §"P1a-4 Hierarchical selector" requires asserting "virtualization kicks in above 100 rows".

### Pattern J → Phase 112 action

PLAN must add `@tanstack/react-virtual` to `package.json` as a new dependency BEFORE P1a-4 can ship. This is a non-trivial deviation from "no new dependencies" — flag it explicitly:

```bash
# Pre-P1a-4 prep
pnpm add @tanstack/react-virtual
```

Suggested PATTERN LIFT from TanStack docs (no in-repo analog to mirror):

```tsx
// src/widgets/workspace/ui/WorkspaceSelector.tsx — virtualized >100 rows
import { useVirtualizer } from '@tanstack/react-virtual';

const rowVirtualizer = useVirtualizer({
  count: allWorkspaces.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 44, // matches UI-SPEC §"Spacing Scale" mobile touch target
  overscan: 5,
});
```

PLAN should decide whether to ship the virtualization hook in P1a-4 or split it into a follow-up (acceptable if the initial selector renders rows directly and adds virtualization conditionally when `count > 100`). VALIDATION explicitly tests both `100` and `250` delegations — so code must virtualize at the boundary.

---

## Pattern K — Vitest test mock shape (carry forward, fix the bug)

### Closest analog — `src/features/gate/__tests__/feature-gate-client.test.tsx:7-17`

```ts
vi.mock('@api/client', () => ({ useSession: vi.fn() }));
vi.mock('@/shared/lib/hooks/usePageFlags', () => ({ usePageFlags: vi.fn() }));

import { canAccessClient, useGateContext, useCanAccess, GateGuard } from '@features/gate';
import { useSession } from '@api/client';
import { usePageFlags } from '@/shared/lib/hooks/usePageFlags';

const mockUseSession = vi.mocked(useSession);
const mockUsePageFlags = vi.mocked(usePageFlags);

function makeFlags(overrides: Partial<PlatformPageFlags> = {}): PlatformPageFlags {
  return {
    campaign: true,
    conservation: 'default' as const,
    /* ... */ ...overrides,
  } satisfies PlatformPageFlags;
}

function makeCtx(
  overrides: { role?: Role; flags?: Partial<PlatformPageFlags>; tier?: TierLevel } = {}
) {
  return {
    role: (overrides.role ?? 'RESIDENT') as Role,
    flags: makeFlags(overrides.flags),
    tier: overrides.tier,
  };
}
```

And `src/entities/delegation/__tests__/api.test.tsx:18-50` — the `vi.hoisted` pattern for mutable mock state:

```ts
const { mockSessionState } = vi.hoisted(() => ({
  mockSessionState: {
    data: { user: { id: 'user-1', email: 'alice@example.com', name: 'Alice', image: null } },
    isPending: false,
    error: null,
  } as {
    /* ... */
  },
}));

vi.mock('@api/client', () => ({ useSession: () => mockSessionState }));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}
```

### Pattern K → Phase 122 application

All `switch-workspace.test.tsx`, `provider-integration.test.tsx`, `gate-coexistence.test.tsx`, `switch-and-navigate.test.tsx` tests follow this scaffold. Required mocks differ:

| Test file                       | Mocks required                                                                   |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `workspace-context.test.tsx`    | `@api/client` → `useSession`, `@/shared/lib/hooks/usePageFlags` → `usePageFlags` |
| `switch-workspace.test.tsx`     | + `next/navigation` → `useRouter` (no analog in repo — new mock)                 |
| `switch-and-navigate.test.tsx`  | + `next/navigation`                                                              |
| `gate-coexistence.test.tsx`     | + `@features/gate` → `useGateContext` (do NOT mock — test the real composition)  |
| `provider-integration.test.tsx` | Provider wrapper; no mocks beyond the SwitchWorkspace test                       |

### The LSP bug to NOT propagate

RESEARCH §0 finding 1 flags the `useGateContext` mock pattern uses `as any` casts on the mock return values (`mockUseSession.mockReturnValue({ data: { user: { id: 'u1', role: 'ADMIN' } } } as any)`). Per AGENTS.md (`strict TypeScript, no 'any'`), Phase 122 tests should use the `as unknown as ReturnType<typeof useSession>` two-hop cast or a `vi.hoisted` typed builder helper like `api.test.tsx` — DO NOT copy the `as any` pattern.

### `next/navigation` mock — new pattern

```ts
// PATTERN LIFT shape — no in-repo instance for next/navigation mock; create one
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(''),
}));
```

---

## Pattern L — Workspace Scope Panel content rendering

### Closest analog — `DBNull`-style scope/dimension pairings from `SpaceDefinition`

The scope panel renders type-conditional content (different fields per `WorkspaceType`) without role-based branching (C-04). Existing `SpaceDefinition` uses optional fields with discriminator-driven UI; the scope panel mirrors this with `workspaceType` as the discriminator:

```tsx
// PATTERN LIFT pattern — space-free variant from SpaceDefinition:requiredFlag vs minimumRole
{
  space.requiredFlag && <FlagIcon flag={space.requiredFlag} />;
}
{
  space.minimumRole && <RoleBadge role={space.minimumRole} />;
}
```

### Pattern L → Phase 122 application

```tsx
// src/widgets/workspace/ui/WorkspaceScopePanel.tsx — PATTERN LIFT optional-field rendering from SpaceDefinition
export function WorkspaceScopePanel() {
  const wctx = useWorkspaceContext();
  if (!wctx) return <LoadingSkeleton />;

  const def = WORKSPACE_REGISTRY[wctx.workspaceType];
  return (
    <aside className="bg-white rounded-lg p-lg">
      <h2 className="text-2xl font-bold">Current Workspace</h2>
      <p className="text-sm text-gray-900">{def.label}</p>
      <p className="text-sm text-gray-600">{workspaceDisplayName(wctx)}</p>

      {/* Discriminator-conditional fields — PATTERN LIFT from SpaceDefinition's optional-field convention */}
      {wctx.workspaceType === 'PERSONAL' && <PersonalScopePanel context={wctx} />}
      {wctx.workspaceType === 'PROVIDER' && <ProviderScopePanel context={wctx} />}
      {wctx.workspaceType === 'PROPERTY' && <PropertyScopePanel context={wctx} />}
      {wctx.workspaceType === 'OWNER' && <OwnerScopePanel context={wctx} />}
      {/* AUTOMATION never renders (D-11) */}
    </aside>
  );
}

function PropertyScopePanel({ context }: { context: WorkspaceContext }) {
  const delegation = useDelegations({ propertyId: context.scope?.propertyId, status: 'ACTIVE' });
  // PATTERN LIFT from notifications/page.tsx:121-123 (date display)
  const expiryLabel = delegation?.expiresAt
    ? new Date(delegation.expiresAt).toLocaleDateString()
    : 'Never';
  return (
    <>
      <p className="text-xs text-gray-500 mt-sm">
        Delegated by: {delegation?.grantedByName ?? 'Direct access'}
      </p>
      <p className="text-xs text-gray-500">Expires: {expiryLabel}</p>
      <p className="text-xs text-gray-500">
        Permissions:{' '}
        {context.permissions.map(p => SCOPE_LABELS[p] ?? p).join(', ') || '—No permissions—'}
      </p>
    </>
  );
}
```

The `PropertyScopePanel` consumes `useDelegations(params)` directly (Pattern G analog) — note the panel needs the delegation data; the resolver does NOT push it into WorkspaceContext (C-03 forbids storing delegation data in context).

---

## Cross-references (places new files reference existing externals)

| New file                                                | Existing imports it needs                                                                                                  |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `entities/workspace/model/permissions.ts`               | `SCOPE_LABELS` from `@entities/delegation/types` (RESEARCH §9.2)                                                           |
| `entities/workspace/model/registry.ts`                  | `LucideIcon` from `lucide-react` OR string-icon convention (pick one — see Pattern A caveat)                               |
| `features/workspace/model/resolve-workspace-context.ts` | `DelegationListItem`, `DelegationStatusFilter` from `@entities/delegation` (api.ts:22, types.ts:9, types.ts:29)            |
| `features/workspace/model/switch-workspace.ts`          | `useRouter` from `next/navigation`; `toast` from `sonner` (existing dep)                                                   |
| `features/workspace/model/workspace-context.tsx`        | `useSession` from `@api/client`; React Context primitives (built-in)                                                       |
| `widgets/workspace/ui/WorkspaceSelector.tsx`            | `useVirtualizer` from `@tanstack/react-virtual` (NEW DEP — see Pattern J); `WORKSPACE_REGISTRY` from `@entities/workspace` |
| `widgets/workspace/ui/NotificationLink.tsx`             | `Link` from `next/link`; `useSwitchWorkspace` from `@features/workspace` (this slice's own barrel)                         |
| `widgets/workspace/ui/WorkspaceScopePanel.tsx`          | `useDelegations` from `@entities/delegation`; `SCOPE_LABELS` from `@entities/delegation`; `useWorkspaceContext`            |
| `src/app/providers.tsx` (modified)                      | `WorkspaceContextProvider` from `@features/workspace` (new)                                                                |
| `src/app/notifications/page.tsx` (modified)             | `NotificationLink` from `@widgets/workspace` (new)                                                                         |

## Anomaly log (must fix in PLAN, not gloss over)

1. **CONTEXT.md paths that are wrong** (verified against codebase):
   - `src/features/auth/model/useGateContext.ts` → actual: `src/features/gate/model/gate.ts:54` (and a separate re-export at `src/entities/tenant/model/useGateContext.ts:3` that takes a different `moduleKey: string` arg — DO NOT import for WorkspaceContext work)
   - The CONTEXT.md "WorkspaceRegistry" sketch shows `register()` runtime API — do NOT use (see Pattern A verdict)
   - `AuthenticatedUserProvider`/`AppShell` references in CONTEXT.md specifics tree → DO NOT EXIST. Real insertion is `TooltipProvider` → `WorkspaceContextProvider` in `src/app/providers.tsx:49` (Pattern F)
2. **RESEARCH §4.1 cites `MobileSpaceBar` at wrong path** — verified actual is `src/widgets/dashboard/ui/MobileSpaceBar.tsx` (no `src/widgets/workspace/` directory exists yet). Fix in PLAN.
3. **TanStack Virtual is NOT installed** — P1a-4 requires `pnpm add @tanstack/react-virtual` first (Pattern J deviation). PLAN must include this dependency bump.
4. **ADR-020 collisions** — `docs/STEERING/ADR.md` has two `## ADR-020` entries (Focus Space, server.ts barrels); Phase 111's agent-delegation "Proposed ADR-020" lives at `.planning/phases/111-agent-gateway/AGENT_DELEGATION_DISCUSSION.md:24` and was never promoted. PLAN should not block on this but should file a BD issue to renumber (RESEARCH R-06).
5. **Test `as any` casts propagate typecheck debt** — Phase 122 tests should use `vi.hoisted` typed builders per `src/entities/delegation/__tests__/api.test.tsx:18-50`, NOT the `as any` casts in `feature-gate-client.test.tsx` (Pattern K).
6. **Steiger `entities/workspace` + `lucide-react`** — registry at `entities/workspace/model/registry.ts` importing `LucideIcon` may trigger Steiger. Use the **string-icon-key** convention instead (registry stores `"Home"`, widgets resolve to `<Home />`) — Pattern A §Steiger caveat.

## PATTERN MAPPING COMPLETE
