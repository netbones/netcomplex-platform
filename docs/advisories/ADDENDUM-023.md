# ADDENDUM-001 — WorkspaceContext Architecture Stabilisation

**To:** Engineering Agents
**Date:** 2026-07-01
**Status:** Binding Architectural Addendum
**Supersedes:** COMMUNIQUE-06, COMMUNIQUE-07 (partial), ADVISORY-023 (refined)

---

# 0. Purpose

This addendum finalises the **WorkspaceContext architecture direction** following review of COMMUNIQUE-07 and advisory refinement.

It introduces **four binding constraints** and one structural addition required before implementation proceeds.

These rules are not optional and must be applied across all frontend and routing work involving:

- Agent Gateway
- Property pages
- Provider workspace
- Owner workspace
- Delegation UI
- Future automation surfaces

---

# 1. Hard Constraint — WorkspaceContext is Immutable

WorkspaceContext must be treated as an **atomic, replace-only object**.

### Rule

- WorkspaceContext is never mutated in-place
- Switching workspace always replaces the full object
- Partial updates are disallowed

### Rationale

This ensures:

- predictable state transitions
- clean cache invalidation
- deterministic UI rendering
- simplified debugging of delegation scope changes

### Correct model

```
Workspace A → dispose → Workspace B
```

### Incorrect model

```
Workspace A → mutate fields → Workspace B
```

---

# 2. Hard Constraint — URLs are Resource-Only

URLs MUST represent **domain resources only**.

### Rule

Workspace state must NOT be encoded in the URL.

### Correct

```
/properties/123
```

### Incorrect

```
/properties/123?workspace=agent
/properties/123/agent
```

### Rationale

- prevents duplication of routing logic
- avoids coupling UI state to navigation
- ensures consistent deep linking
- supports multiple workspace perspectives per resource

WorkspaceContext is responsible for rendering perspective.

---

# 3. Required Architecture Addition — Workspace Registry

A **Workspace Registry** MUST be introduced prior to implementing the selector.

### 3.1 Definition

The Workspace Registry is the canonical source of:

- workspace types
- navigation structure
- available actions
- widget composition rules
- permission mapping

### 3.2 Conceptual model

```
WorkspaceRegistry
    ↓
WorkspaceDefinition
    ↓
Navigation
    ↓
Actions
    ↓
Widgets
```

### 3.3 Example

```
Property Workspace
  - route: /properties/:id
  - navigation:
      Maintenance
      Messages
      Documents
  - actions:
      Create Maintenance
      Contact Owner
  - widgets:
      TaskSummary
      Occupancy
```

### 3.4 Extension rule

New workspace types MUST be added via registry entries only.

No hardcoded workspace logic is permitted in UI shells.

---

# 4. Hard Constraint — WorkspaceContext is Lightweight

WorkspaceContext MUST remain a **minimal descriptor object**.

### Allowed fields

- workspaceId
- workspaceType
- scope reference (propertyId / providerId / ownerId)
- permissions (resolved set)

### Disallowed in WorkspaceContext

- tasks
- messages
- maintenance data
- billing data
- verification data
- domain entities
- cached query results

### Rationale

WorkspaceContext is not a data container.

It is a **scope pointer**, not a state store.

All domain data must be retrieved via the application query layer.

---

# 5. Behavioural Rule — Workspace Switching

When a user triggers a context change (notification, navigation, selection):

### Required behaviour

1. Resolve target workspace
2. Replace WorkspaceContext atomically
3. Navigate to resource route
4. Render new perspective
5. Optionally notify user of context change

### Example

```
Notification → Maintenance Request (Palm Avenue)

↓
Switch WorkspaceContext
↓
Navigate /properties/123
↓
Render Agent View
```

No manual pre-switch step is required.

---

# 6. Lifecycle Rule — WorkspaceContext is Recreated Frequently

WorkspaceContext MUST NOT be cached as a persistent global object.

It is:

- derived
- ephemeral
- reconstructible

Caching responsibility belongs to:

- queries
- domain stores
- API layer

NOT WorkspaceContext.

---

# 7. Architectural Alignment

This addendum aligns frontend and backend evolution:

| Layer    | Concept           | Responsibility                        |
| -------- | ----------------- | ------------------------------------- |
| Backend  | Principal         | Identity + authorization root         |
| Backend  | AgentAccess       | Delegation + scope grants             |
| Frontend | WorkspaceContext  | Operational perspective               |
| Frontend | WorkspaceRegistry | UI composition + navigation contracts |

---

# 8. Enforcement Rules

Agents MUST ensure:

- No workspace state encoded in URL
- No mutation of WorkspaceContext
- No embedding of domain data in WorkspaceContext
- No hardcoded workspace navigation outside registry
- No dual routing for same resource
- No role-based UI branching for workspace behaviour

---

# 9. Implementation Order (Revised)

1. WorkspaceRegistry (foundation)
2. WorkspaceContext abstraction
3. Workspace switching logic (atomic replacement)
4. Property page refactor (/properties/[id])
5. Hierarchical selector (registry-driven)
6. Empty states + onboarding surfaces
7. Principal backend refactor (later phase)
8. Automation workspace enablement (Phase 113+)

---

# 10. Long-Term Stability Goal

This architecture is designed so that:

- new workspace types require **registry entries only**
- UI shell remains unchanged indefinitely
- backend identity changes do not affect frontend structure
- delegation complexity does not leak into routing or components

---

# 11. Final Statement

WorkspaceContext is not a feature.

It is the **runtime lens through which the entire platform is rendered**.

It must remain:

- immutable
- lightweight
- replaceable
- independent of routing
- independent of domain data

All future work must preserve this separation.
