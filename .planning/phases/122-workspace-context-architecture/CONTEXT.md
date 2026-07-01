# Phase 122: WorkspaceContext Architecture — Context

**Gathered:** 2026-07-01
**Status:** Ready for planning
**Milestone:** M5 — Anchor Tenant Launch (post-hardening) / M5+ workspace evolution
**Sources:**

- ADDENDUM-023 — 4 binding constraints + Workspace Registry requirement
- AGENT_DISCUSSION.md — Parts One, Two, Three (advisor guidance)
- COMMUNIQUE-05 — original human vs mechanical agent query
- COMMUNIQUE-06 — advisor Principal response + workspace design review
- COMMUNIQUE-07 — WorkspaceContext refinement + revised roadmap

---

## ⚠️ MANDATORY: Feature Branch Required

**This phase MUST be executed within a dedicated feature branch branched from `dev`.**

The `dev` branch has active GSD workflow gating (pre-commit hooks, state checks, Steiger enforcement) that will block or interfere with this phase's exploratory architectural work. Do not commit directly to `dev`.

### Feature Branch Protocol

1. Create branch: `git checkout -b phase-122-workspace-context` from `dev`
2. Execute all P1a-1 through P1a-6 steps on the feature branch
3. Run quality gates on the feature branch before merging back
4. Merge to `dev` via standard PR/rebase workflow when complete

### Rationale

- Current GSD pre-commit hooks on `dev` enforce constraints that are incompatible with exploratory architecture work
- Steiger FSD checks on `dev` may fail during intermediate WIP states
- Separate branch prevents blocking other contributors' work on `dev`
- Enables squashing intermediate commits into clean history on merge

---

<domain>

## Phase Boundary

Establish the **WorkspaceContext frontend abstraction** as the runtime lens through which the entire platform renders. This is the frontend mirror of the `Principal` backend concept — it decouples UI behaviour from `Role` and identity details, replacing role-based branching with workspace-based contextual rendering.

This phase covers **frontend architecture only**. It does NOT introduce the `Principal` database model (backend refactor is deferred to Phase 1d / later phase). It does NOT remove `AGENT` from the `Role` enum (blocked on WorkspaceContext being in place first).

**IN scope:** WorkspaceRegistry, WorkspaceContext abstraction, workspace switching logic, hierarchical selector, empty states, workspace scope panel.

**OUT of scope:** Principal backend model, AGENT role removal, MechanicalAgent model, automation workspace, property page refactor, backend delegation changes.

### Problem Statement

Today the UI branches on `Role` to determine what a user sees:

```ts
if (role === 'AGENT') showAgentView();
if (role === 'OWNER') showOwnerView();
```

This breaks down because:

- `AGENT` is a context, not a role — any role can act as an agent under delegation
- Role-based UI doesn't scale to providers who manage 200+ properties
- There's no concept of "current workspace" — the user is always acting as themselves
- Delegated properties, provider businesses, and personal account all live in the same flat space

### Solution

Introduce a lightweight `WorkspaceContext` that wraps the active workspace:

```ts
interface WorkspaceContext {
  workspaceId: string;
  workspaceType: 'PERSONAL' | 'PROVIDER' | 'PROPERTY' | 'OWNER' | 'AUTOMATION';
  scope?: { propertyId?: string; providerId?: string; ownerId?: string };
  permissions: Permission[];
}
```

Every page consumes `WorkspaceContext` instead of `Role`. The context is:

- **Immutable** — never mutated in place, always atomically replaced
- **Lightweight** — no domain data (tasks, messages, billing), just a scope pointer
- **Recreatable** — derived from active delegations, not cached as global state
- **Routing-independent** — URLs identify resources, not workspace perspective

</domain>

<decisions>

## Binding Constraints (from ADDENDUM-023)

### C-01: WorkspaceContext is Immutable

WorkspaceContext must be an atomic, replace-only object. Switching workspace always replaces the full object. Partial updates are disallowed.

- **Rationale:** predictable state transitions, clean cache invalidation, deterministic rendering
- **Model:** `Workspace A → dispose → Workspace B` (never `Workspace A → mutate fields → Workspace B`)

### C-02: URLs are Resource-Only

Workspace state MUST NOT be encoded in the URL.

- **Correct:** `/properties/123`
- **Incorrect:** `/properties/123?workspace=agent` or `/properties/123/agent`
- **Rationale:** prevents routing-logic duplication, avoids coupling UI state to navigation, ensures consistent deep linking

### C-03: WorkspaceContext is Lightweight

Only allowed fields: `workspaceId`, `workspaceType`, `scope` reference, `permissions`.

- **Disallowed:** tasks, messages, maintenance, billing, verification, domain entities, cached query results
- **Rationale:** WorkspaceContext is a scope pointer, not a data container. All domain data is retrieved via the existing query layer (tRPC/React Query).

### C-04: No Role-Based UI Branching for Workspace Behaviour

Workspace behaviour MUST be driven by WorkspaceContext, not by `Role` enum checks.

- **Rationale:** `Role` represents persistent identity; workspace represents operational context. These are independent concerns.

### C-05: Workspace Registry Required Before Selector

A Workspace Registry MUST exist as the canonical source of workspace types, navigation, actions, widgets, and permission mapping before the hierarchical selector is built. No hardcoded workspace logic in UI shells.

- **Rationale:** new workspace types (Automation, Community, HOA, Vendor) should require registry entries only — UI shell remains unchanged.

## Architectural Decisions (from AGENT_DISCUSSION + COMMUNIQUES)

### D-01: Principal Abstraction (Approved — M6+ Direction)

The backend `Principal` model is the long-term answer. This phase builds the frontend mirror (`WorkspaceContext`) so that when `Principal` lands, the UI is already decoupled from `Role`.

### D-02: Remove AGENT from Role Enum (Approved — After WorkspaceContext)

`AGENT` will be removed from the `Role` enum, but ONLY after `WorkspaceContext` is in place. This phase ships the precondition.

### D-03: Ship Workspace Redesign Incrementally

Build shell first (registry, selector, context, empty states), then property workspaces, then owner views. Defer automation until `MechanicalAgent` domain exists (Phase 113+).

### D-04: Hierarchical Selector (Not Flat)

Delegated Properties belong UNDER the Provider workspace — not beside it.

```
My Account
├── Personal
├── Provider
│     ├── Dashboard
│     ├── Marketplace
│     └── Delegated Properties
│            ├── 14 Palm Avenue
│            ├── 22 Sunset Close
│            └── ...
└── Owner
      ├── My Properties
      ├── Delegations
      └── Audit
```

### D-05: "Current Workspace" (Not "Working As")

The user is not becoming someone else — they're changing operational context. Label: "Current Workspace" or "Active Workspace".

### D-06: Single Property Route

`/properties/[id]` with role-conditional UI sections. NOT `/agent-gateway/property/[id]` (duplicate route).

### D-07: Automatic Workspace Switching on Deep Links

Clicking a notification about Palm Avenue should automatically switch WorkspaceContext, navigate to the resource, and toast the context change. No manual pre-switch step.

### D-08: No Caching of WorkspaceContext

WorkspaceContext itself is not cached. Cache the data behind it (tasks, permissions, messages) through the existing query layer. WorkspaceContext should be inexpensive enough to recreate on every switch.

### D-09: PrincipalId is Internal

Pages shouldn't care about Principal IDs. Expose `workspaceId`, `workspaceType`, `scope`, and `permissions` — not `principalId` or `principalKind`. Backend implementation details must not leak into React.

### D-10: Search-Driven Selector

For users with 200+ managed properties, the selector must support search, recent, favorites, pinned, and all. VS Code-style workspace switcher pattern.

### D-11: Automation Workspace Hidden

Registered in the WorkspaceRegistry but not enabled until Phase 113+. One-line config change to flip on.

### D-12: Empty State for Zero Delegations

Welcome surface with delegation invitation flow, not a broken dashboard:

```
Welcome to Agent Workspace
You don't currently manage any delegated properties.

You can:
  - Accept a delegation invitation
  - Browse the Marketplace
  - Learn how property delegation works
```

### D-13: Workspace Scope Panel

Every workspace exposes its scope — what the user is operating on, who delegated it, what permissions they have, and when it expires. The workspace itself is a first-class object.

### D-14: Workspace-Specific Actions

Actions are contextual, not global. No flat "Quick Actions" panel that spans contexts. Each workspace exposes only its relevant actions.

| Workspace | Actions                                            |
| --------- | -------------------------------------------------- |
| Personal  | Profile, Settings                                  |
| Provider  | Marketplace, Bookings, Staff                       |
| Property  | Create Maintenance, Message Owner, Upload Document |
| Owner     | Create Delegation, Review Audit, Suspend Access    |

### D-15: Owner vs Agent Have Different Landing Pages

Owner Dashboard → Delegations → Agent Workspace (per delegation) are different navigation paths. The shell can be shared, but the landing page differs.

</decisions>

<implementation_order>

## Implementation Order (from ADDENDUM-023 §9)

This phase implements registry + context + selector + empty states. Property page refactor and Principal backend are separate phases.

### Phase 122 (this phase) — P1a-c

| Step      | Item                   | Description                                                                             | Dependencies |
| --------- | ---------------------- | --------------------------------------------------------------------------------------- | ------------ |
| **P1a-1** | WorkspaceRegistry      | Canonical registry of workspace types, navigation, actions, widgets, permission mapping | None         |
| **P1a-2** | WorkspaceContext       | React context provider + `useWorkspaceContext()` hook                                   | P1a-1        |
| **P1a-3** | Atomic switching logic | `switchWorkspace()` — resolve → replace → navigate → render → notify                    | P1a-2        |
| **P1a-4** | Hierarchical selector  | Registry-driven tree selector with search/recent/favorites/pinned/all                   | P1a-1, P1a-2 |
| **P1a-5** | Empty states           | Welcome surface for zero-delegation users (onboarding + marketplace + learn)            | P1a-2        |
| **P1a-6** | Workspace scope panel  | First-class workspace object showing scope, delegator, permissions, expiry              | P1a-2        |

### Later phases (separate tracking)

| Phase   | Item                                                         | Timing                       |
| ------- | ------------------------------------------------------------ | ---------------------------- |
| **P1d** | Principal database refactor                                  | After WorkspaceContext ships |
| **P1e** | Remove AGENT from Role enum                                  | After P1d                    |
| **P2**  | Property workspace (`/properties/[id]` conditional sections) | After P1e                    |
| **P2**  | Workspace search, favourites, pinning                        | After P2 property            |
| **P3**  | Pluggable verification framework                             | M6+                          |
| **P4**  | Automation workspace                                         | Phase 113+                   |

</implementation_order>

<canonical_refs>

## Canonical References

### Project documentation

- `docs/advisories/ADDENDUM-023.md` — 4 binding constraints + Workspace Registry requirement
- `docs/discussions/AGENT_DISCUSSION.md` — Full three-part advisor guidance
- `docs/communiques/COMMUNIQUE-05.md` — original human vs mechanical agent query
- `docs/communiques/COMMUNIQUE-06.md` — advisor Principal response + workspace design review
- `docs/communiques/COMMUNIQUE-07.md` — WorkspaceContext refinement + revised roadmap
- `.planning/phases/111-agent-gateway/111-CONTEXT.md` — AgentGateway Phase 111 delegation foundation (AgentAccess, AgentToken, Delegation models)
- `.planning/MILESTONES.md` — Milestone structure (M5 Post-Launch for workspace work)

### Existing code patterns

- `src/features/auth/model/useGateContext.ts` — existing gate context hook (reference pattern)
- `src/shared/lib/constants/tiers.ts` — ModuleKey/MODULES pattern (for WorkspaceRegistry)
- `src/entities/tenant/api/features/registry.ts` — FeatureRegistry pattern (inspiration for WorkspaceRegistry)
- `src/widgets/dashboard/` — existing dashboard widget infrastructure
- `src/shared/api/trpc/` — tRPC query layer (WorkspaceContext queries domain data, not the other way around)

### Domain docs

- `docs/STEERING/ADR.md` — ADR-020 (delegation decisions), ADR-019 (RLS)
- `docs/STEERING/SPEC.md` — functional specifications

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Patterns

- **FeatureRegistry pattern** (`src/entities/tenant/api/features/registry.ts`): Registration-based architecture with features, pages, widgets — direct inspiration for WorkspaceRegistry
- **GateContext pattern** (`src/features/auth/model/useGateContext.ts`): Existing React context for gating — WorkspaceContext follows similar provider/hook pattern
- **ModuleKey/MODULES** (`src/shared/lib/constants/tiers.ts`): Enum-based module registry with tier mapping — reference for workspace type registration

### Existing Phase 111 Infrastructure

- `AgentAccess` model — delegation grants linking owners to delegates
- `AgentToken` model — scoped, expirable tokens for agents
- `Delegation` model — owner delegates property tasks to providers
- `DelegationAction` — audit trail for delegation lifecycle events

These are the backend primitives that WorkspaceContext will resolve into frontend workspaces.

### Integration Points

- **FeatureRegistry + PlatformPageFlags**: WorkspaceContext may need to influence feature availability
- **useGateContext**: WorkspaceContext and GateContext should coexist — one handles what you can access, one handles what workspace you're in
- **Navigation system** (`src/features/navigation/`): Workspace-aware nav will eventually replace role-conditional nav items

</code_context>

<specifics>

## Specific Design Guidance

### WorkspaceRegistry Shape

```ts
interface WorkspaceRegistry {
  register(type: WorkspaceType, definition: WorkspaceDefinition): void;
  getDefinitions(): WorkspaceDefinition[];
  getDefinition(type: WorkspaceType): WorkspaceDefinition | undefined;
  getEnabledDefinitions(): WorkspaceDefinition[]; // filtered by feature flags
}

interface WorkspaceDefinition {
  type: WorkspaceType;
  label: string;
  icon: string;
  route?: string; // optional — personal has no resource route
  navigation: NavItem[];
  actions: ActionDef[];
  widgets: string[]; // widget keys
  permissions: Permission[]; // required permissions to access
  children?: WorkspaceType[]; // hierarchical structure
}
```

### WorkspaceContext Shape (Exposed to Pages)

```ts
interface WorkspaceContext {
  workspaceId: string;
  workspaceType: 'PERSONAL' | 'PROVIDER' | 'PROPERTY' | 'OWNER' | 'AUTOMATION';
  scope?: {
    propertyId?: string;
    providerId?: string;
    ownerId?: string;
  };
  permissions: Permission[];
}
```

Internal resolution (hidden from pages):

```
workspaceId → Principal → Delegation → Property
```

### React Tree Placement

```
AuthenticatedUserProvider (existing)
  ↓
WorkspaceContext.Provider (new)
  ↓
AppShell (consumes context for nav)
  ↓
Pages (consume context via useWorkspaceContext())
```

### Switching Behaviour

```ts
function switchWorkspace(target: WorkspaceTarget) {
  // 1. Resolve target workspace
  const context = await resolveWorkspaceContext(target);
  // 2. Replace atomically
  setWorkspaceContext(context);
  // 3. Navigate to resource route
  router.push(target.route);
  // 4. Notify of context change
  toast(`Now viewing: ${context.label}`);
}
```

</specifics>

<deferred>

## Deferred Ideas

- **Principal database refactor** — deferred to P1d (separate phase after this one)
- **AGENT role removal** — deferred until WorkspaceContext is in place (P1e)
- **Property workspace** (`/properties/[id]` with conditional sections) — P2
- **Workspace search, favourites, pinning** — P2
- **Owner-specific landing page** — P2
- **Cross-workspace deep link behaviour** — needs further design (automatic switching chosen)
- **WorkspaceContext caching strategy** — "don't cache it" chosen; cache underlying data only
- **Mechanical Agent workspace** — Phase 113+
- **AI Assistant panel** — M6+
- **Workspace onboarding tour** — post-launch polish
- **Resident/HOA/Community workspace types** — future, registry-only additions
- **Workspace analytics** — tracking workspace usage patterns

</deferred>

---

_Phase: 122-workspace-context-architecture_
_Context gathered: 2026-07-01_
