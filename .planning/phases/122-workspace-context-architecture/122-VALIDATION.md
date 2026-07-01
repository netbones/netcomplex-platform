---
phase: 122
slug: workspace-context-architecture
created: 2026-07-01
template: gsd-core/templates/VALIDATION.md
---

# Validation Strategy — Phase 122: WorkspaceContext Architecture

> Required by Nyquist Dimension 8. Derived from `122-RESEARCH.md` §"Validation Architecture".

## Scope

Validates the six implementation steps (P1a-1 through P1a-6) against the binding constraints C-01..C-05, architectural decisions D-01..D-15, and requirement IDs WS-01..WS-06.

## Unit Tests (must ship in P1a-1 through P1a-6)

| Implementation Step                                        | Test File Target                                                    | Coverage Goal                                                                       | Approach                                                                                                                                                                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1a-1** WorkspaceRegistry                                | `src/entities/workspace/model/__tests__/registry.test.ts`           | 100% on `getEnabledDefinitions`, `getDefinition`                                    | Pure data + predicate tests (no mocks). Assert all 5 types registered, AUTOMATION disabled (D-11), PROVIDER declares PROPERTY child (D-04), navigation/actions/widgets arrays non-empty for enabled types |
| **P1a-2** WorkspaceContext provider                        | `src/features/workspace/model/__tests__/workspace-context.test.tsx` | All public surface of `WorkspaceContextProvider` + `useWorkspaceContext`            | `renderHook()` under wrapper; assert provider returns `null` until resolved, then non-null; assert mount-unmount invariant (D-08) — no state survives reuse of the hook after remount                     |
| **P1a-3** switchWorkspace (atomic + idempotent + rollback) | `src/features/workspace/model/__tests__/switch-workspace.test.tsx`  | All 6 branches: success, idempotent, registry_miss, revoked, expired, network error | `renderHook` + `act`; `vi.mock('next/navigation')` for `useRouter().push`; assert `router.push` called exactly once on success, zero on idempotent or error                                               |
| **P1a-4** Hierarchical selector                            | `src/widgets/workspace/ui/__tests__/WorkspaceSelector.test.tsx`     | Render 0, 1, 100, 250 delegations; keyboard nav (CMD+K, arrows, Enter, Esc)         | `render()` + `fireEvent`; assert accessible focus ring; assert virtualization kicks in above 100 rows (TanStack Virtual)                                                                                  |
| **P1a-5** Empty state                                      | `src/widgets/workspace/ui/__tests__/EmptyWorkspaceState.test.tsx`   | All 3 CTAs render + copy per UI-SPEC §"Copywriting Contract"                        | Snapshot or text-equality assertions on the three verb-first CTAs ("Accept a delegation invitation" etc.)                                                                                                 |
| **P1a-6** Scope panel                                      | `src/widgets/workspace/ui/__tests__/WorkspaceScopePanel.test.tsx`   | All four workspace types render correct fields; missing field behaviour             | Parametrize across `PERSONAL/PROVIDER/PROPERTY/OWNER`; assert "Delegated by" only renders for Provider/Property; assert "Expires: Never" when null                                                        |

## Integration Tests (cross-cutting flows)

| Flow                                                        | Test Target                                                      | What it Covers                                                                                                                                                                                                        |
| ----------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **WorkspaceContextProvider + useWorkspaceContext consumer** | `src/features/workspace/__tests__/provider-integration.test.tsx` | Provider (mount) → child consumer (read) → switch action (mutate) → consumer re-renders with new context                                                                                                              |
| **switchWorkspace + router.push**                           | `src/features/workspace/__tests__/switch-and-navigate.test.tsx`  | Mock next/navigation; assert `switchWorkspace({type:'PROPERTY', delegationId:'d1'})` calls `router.push('/properties/p1')` exactly once, then sets context atomically                                                 |
| **GateContext + WorkspaceContext coexist**                  | `src/features/workspace/__tests__/gate-coexistence.test.tsx`     | Render a component that calls `useGateContext()` AND `useWorkspaceContext()` simultaneously; assert both return valid data without interfering; assert switching workspace does NOT change GateContext and vice versa |
| **Notification deep-link integration**                      | `src/widgets/workspace/ui/__tests__/NotificationLink.test.tsx`   | Click `<NotificationLink href="/properties/p1">` → assert `switchWorkspace` called, `router.push` called, toast shown                                                                                                 |
| **External deep-link middleware**                           | `src/middleware.test.ts` (extend existing)                       | Mock request with `?agent_token=...` → assert response location is `/properties/p1` with NO `?agent_token` (C-02), assert `x-workspace-hint` header set                                                               |

## Property-Based Tests (recommended — C-01 + D-08 are invariant properties)

Invariants to verify with `fast-check` or hand-rolled property tests:

| #    | Property                                                                                                                                                      | Generators                   | Assertion                                                                                                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P-01 | **Atomic replace** — after `switchWorkspace(t)`, the context value identity changes (new object reference, not mutated in-place)                              | `arbitraryWorkspaceTarget()` | `oldCtx !== newCtx` (Object.is false); `oldCtx.workspaceId !== newCtx.workspaceId`; `oldCtx` still accessible via closure with pre-switch fields unchanged |
| P-02 | **Idempotency** — switching to the current workspace is a no-op: no router push, no toast, no context change                                                  | target equal to current      | `router.push` not called; `useWorkspaceContext()` value identity unchanged                                                                                 |
| P-03 | **Rollback on resolve error** — failed resolve leaves the prior context intact (C-01 + UI-SPEC §"Atomic Workspace Switch" step "no half-context is ever set") | target that throws           | `useWorkspaceContext()` value identity unchanged; error is thrown; UI error toast fires                                                                    |
| P-04 | **D-08 uncached** — unmounting and remounting the provider with the same `initial` prop yields the same initial value (no stale cache)                        | random initial               | After unmount + remount, `useWorkspaceContext()` returns the initial value, never the prior switched value                                                 |
| P-05 | **C-03 lightweight** — the serialized `WorkspaceContext` object only contains the 4 allowed fields; no domain data leaks into the value                       | random switch targets        | `JSON.stringify(ctx)` does not contain `"tasks"`, `"messages"`, `"maintenance"`, `"billing"` keys                                                          |

## Acceptance Tests Per Requirement ID

| ID    | Description                                                                          | Primary Test Witness                                                                    |
| ----- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| WS-01 | WorkspaceRegistry (canonical registry of types/nav/actions/widgets/permissions)      | `registry.test.ts` (P-01 above) + `getEnabledDefinitions` unit test                     |
| WS-02 | WorkspaceContext abstraction (provider + hook)                                       | `workspace-context.test.tsx` (P1a-2) + gate-coexistence integration test                |
| WS-03 | Atomic switching logic (resolve → replace → navigate → render → notify)              | `switch-workspace.test.tsx` (P-01, P-02, P-03 properties)                               |
| WS-04 | Hierarchical selector (registry-driven tree with search/recent/favorites/pinned/all) | `WorkspaceSelector.test.tsx` (P1a-4) — covers >100 row virtualization + keyboard scheme |
| WS-05 | Empty states (welcome surface for zero-delegation users)                             | `EmptyWorkspaceState.test.tsx` (P1a-5) — copy + 3 CTAs                                  |
| WS-06 | Workspace scope panel (first-class workspace scope/delegator/permissions/expiry)     | `WorkspaceScopePanel.test.tsx` (P1a-6) — parametrized across 4 types                    |

## Test Sequencing (TDD mode active)

1. **Before any implementation**, write tests in this order (matches UI-SPEC's "Executor regression checklist"):
   1. `registry.test.ts` — RED
   2. `resolve-workspace-context.test.ts` — RED (P1a-3 prerequisite)
   3. `workspace-context.test.tsx` — RED
   4. `switch-workspace.test.tsx` — RED
   5. UI tests for P1a-4 / P1a-5 / P1a-6 — RED
2. Implement minimally to go GREEN, in the P1a-1 → P1a-6 order from CONTEXT.md.
3. Property-based tests (P-01 through P-05) ship alongside their corresponding step (P-01+P-03 with P1a-3; P-04 with P1a-2; P-05 with P1a-2 as a guard test).
4. Integration tests can land in the same commit as the feature they integrate (e.g., `NotificationLink.test.tsx` lands with the `<NotificationLink>` JSX in P1a-3 or a follow-up).

## Framework

- Vitest + @testing-library/react (matches project convention from `package.json` and existing test files in `src/schemas/__tests__/`, `src/features/gate/__tests__/`)
- `renderHook` + `act` + `vi.mock('next/navigation')` for next/react integration (existing pattern from gate-client tests)
- TanStack Virtual test mode for the virtualized selector (P1a-4)
- `fast-check` not currently in project deps — hand-rolled property tests acceptable for P-01..P-05 (see existing `prng`/iteration patterns in other test suites)

## Out of Scope

- Property workspace route refactor (`/properties/[id]` conditional UI) — Phase P2
- Owner-specific landing page — Phase P2
- MechanicalAgent workspace — Phase 113+
- Backend Principal model — Phase P1d

---

_Validation strategy for Phase 122 — workspace-context-architecture_
_Derived from RESEARCH.md §"Validation Architecture"_
