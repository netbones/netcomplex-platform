# COMMUNIQUE-07 — WorkspaceContext Refinement: Hierarchical Workspaces & Frontend Abstraction

**To:** Architecture Advisors  
**Date:** 2026-07-01  
**Status:** Decisions Provided — Awaiting Implementation Sign-off  
**References:**

- [COMMUNIQUE-05](./COMMUNIQUE-05.md) — original request (human vs. mechanical agents)
- [COMMUNIQUE-06](./COMMUNIQUE-06.md) — advisor response (Principal abstraction, workspace review)
- [ADVISORY-022](../advisories/ADVISORY-022.md) — Principal architecture (backend)
- [ADVISORY-023](../advisories/ADVISORY-023.md) — Workspace Context architecture (frontend)
- [AGENT_DISCUSSION.md](../discussions/AGENT_DISCUSSION.md) — Part Two (initial mockups) and Part Three (refinement)

---

## 0. Purpose

COMMUNIQUE-06 left three questions open and asked the architect to choose between a flat workspace selector and a hierarchical one, to confirm the URL strategy, and to decide whether to ship the workspace redesign incrementally. The architect responded in `AGENT_DISCUSSION.md` Part Three and formalized the guidance in `ADVISORY-023.md`.

This communique consolidates the answers, captures the new `WorkspaceContext` frontend abstraction, and revises the priority roadmap in COMMUNIQUE-06 §4. The original request is unchanged. The Principal decision from COMMUNIQUE-06 is now **approved**.

---

## 1. Three Decisions — Approved

| Question (from COMMUNIQUE-06 §5)                    | Decision                                                                                                                                        | Source                                                            |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Approve Principal abstraction as M6+ direction?** | ✅ **Yes**                                                                                                                                      | `AGENT_DISCUSSION.md` §1, `ADVISORY-022.md`                       |
| **Remove AGENT from Role enum?**                    | ✅ **Yes** — but introduce `WorkspaceContext` frontend abstraction first                                                                        | `AGENT_DISCUSSION.md` §2, `ADVISORY-023.md`                       |
| **Ship workspace redesign now?**                    | ⏸ **No — incrementally.** Build shell first (selector, work-first dashboard, context model), then evolve property workspaces. Defer automation. | `AGENT_DISCUSSION.md` §11, `ADVISORY-023.md` Progressive Delivery |

### 1.1 — Why WorkspaceContext precedes Principal

The advisor's most important refinement:

> "Introduce a lightweight `WorkspaceContext` object in the frontend before removing AGENT from the role enum."

```
Backend (later)
Principal
  ↓
AgentAccess
  ↓
Permissions

Frontend (now)
WorkspaceContext
  ↓
Navigation
  ↓
Capabilities
```

These intentionally mirror one another. The frontend can adopt `WorkspaceContext` immediately — no schema change, no migration. When the `Principal` model lands later, most of the UI will already be decoupled from `Role` and identity details, making the backend migration significantly less invasive.

---

## 2. The WorkspaceContext Abstraction

### 2.1 — Shape

```ts
interface WorkspaceContext {
  principalId: string;
  principalKind: 'USER' | 'PROVIDER' | 'MECHANICAL_AGENT' | 'INTEGRATION';
  delegationId?: string;
  propertyId?: string;
  permissions: Permission[];
}
```

Every page consumes `WorkspaceContext` rather than deriving behaviour from `Role` or URLs. This becomes the frontend mirror of the backend `Principal` abstraction.

### 2.2 — Identity never changes

The user does not switch identity. They switch **operational context**. The UI must never imply that a delegated property, provider business, or owner relationship is a different authenticated identity.

**Avoid:** "Working As"
**Prefer:** "Current Workspace" / "Active Workspace" / "Current Context"

### 2.3 — Where it lives in the React tree

```
AuthenticatedUserProvider (existing)
  ↓
WorkspaceContext.Provider (new)
  ↓
AppShell (consumes context)
  ↓
Pages (consume context via hook)
```

A new `useWorkspaceContext()` hook reads the current workspace and exposes it to any descendant. Pages query capabilities (not roles) for conditional rendering.

### 2.4 — Phased rollout

Per `ADVISORY-023.md` Progressive Delivery:

**Phase 1 (next 4-6 weeks)**

- `WorkspaceContext` abstraction in frontend
- Context-aware navigation
- Work-first dashboard (replaces current `/agent-gateway` shell)
- Empty states for zero-delegation users

**Phase 2 (8-12 weeks)**

- Property workspace (`/properties/[id]` with conditional sections)
- Provider workspace
- Owner workspace
- Hierarchical workspace selector

**Phase 3 (post-Principal refactor)**

- Automation workspace (deferred until `MechanicalAgent` model exists)
- AI Assistant panel
- Workspace search + favourites + pinning

---

## 3. Hierarchical Workspace Selector

The advisor revised the flat selector from DISCUSSION Part Two. The selected model is **hierarchical**, mirroring the platform's data structure.

```
My Account
│
├── Personal
│
├── Provider
│     ├── Dashboard
│     ├── Marketplace
│     └── Delegated Properties
│            ├── 14 Palm Avenue
│            ├── 22 Sunset Close
│            └── ...
│
└── Owner
      ├── My Properties
      ├── Delegations
      └── Audit
```

**Critical insight:** Delegated Properties belong **under** the Provider workspace — not beside it. The Provider is operating under those delegations. They are not separate workspaces; they are the Provider's portfolio.

### 3.1 — Selection rules

The selector surfaces:

| Workspace                     | Source                                             | When visible                   |
| ----------------------------- | -------------------------------------------------- | ------------------------------ |
| Personal                      | Default session                                    | Always                         |
| Provider                      | User's `ServiceProvider` memberships               | If user is a provider          |
| Provider → Delegated Property | Active `AgentAccess` records where user is grantee | If user has delegations        |
| Owner                         | User owns property                                 | If user has property ownership |
| Automation                    | User owns `MechanicalAgent` principals             | Only when Phase 113+ ships     |

### 3.2 — VS Code-style search

For users with 200+ managed properties, dropdown-only navigation fails. The selector must support:

- **Search** — type-ahead across properties, providers, owner portfolios
- **Recent** — last 10 workspaces visited
- **Favorites** — user-pinned
- **All** — flat list of everything (paginated)

This is a search-driven workspace switcher, not a navigation menu.

### 3.3 — Empty state

For users with zero delegations:

```
Welcome to Agent Workspace

You don't currently manage any delegated properties.

You can:
  - Accept a delegation invitation
  - Browse the Marketplace
  - Learn how property delegation works
```

The dashboard transforms automatically once the first delegation exists. Empty state is **not** a broken dashboard — it's an onboarding surface.

---

## 4. URL Strategy — Confirmed

The advisor confirmed the URL strategy from COMMUNIQUE-06 §3.2.7: **shared property route, role-conditional UI**.

```
/properties/[id]  ← single route
```

Same property. Different capabilities. UI sections differ by `WorkspaceContext`:

| Context | Sections shown                                 |
| ------- | ---------------------------------------------- |
| Owner   | Financials, Compliance, Delegations, Residents |
| Agent   | Maintenance, Tasks, Bookings, Messaging        |

This avoids:

- `/agent-gateway/property/[id]` (duplicate route)
- `/properties/[id]/agent` (URL-driven UI)
- Conditional rendering based on URL params (fragile)

The page consumes `WorkspaceContext` and renders accordingly.

---

## 5. Workspace as First-Class Object

The advisor's final addition: **the workspace itself should be a first-class object with explicit scope**.

Example workspace summary panel:

```
Current Workspace
──────────────────────────
Provider
Soralia Property Management
Managing
  14 Properties
  18 Delegations
  127 Tasks
Permissions
  Maintenance
  Bookings
  Messaging
Expires
  Never
```

Or for a delegated property:

```
Current Workspace
──────────────────────────
Property
14 Palm Avenue
Delegated by
  John Smith
Expires
  31 Dec
Permissions
  Maintenance
  Documents
  Messaging
  Occupants
```

The workspace panel answers four questions that delegated users always need:

- What am I operating on?
- Who delegated it?
- What am I allowed to do?
- When does it expire?

This reduces confusion dramatically in delegated environments.

---

## 6. Workspace-Specific Actions

The advisor's principle: **actions should be contextual, not global**.

Avoid flat "Quick Actions" panels that span contexts. Each workspace exposes only its relevant actions:

| Workspace | Actions                                            |
| --------- | -------------------------------------------------- |
| Property  | Create Maintenance, Message Owner, Upload Document |
| Provider  | Marketplace, Bookings, Staff                       |
| Owner     | Create Delegation, Review Audit, Suspend Access    |
| Personal  | Profile, Settings (no work actions)                |

This resolves COMMUNIQUE-06 §3.2.4 (Quick Actions span contexts).

---

## 7. Owner vs Agent Separation

The advisor agreed with our review: **owner and agent are different workflows**, even if they share the shell.

| Role  | Work focus                                                                                    | Landing surface                |
| ----- | --------------------------------------------------------------------------------------------- | ------------------------------ |
| Owner | granting authority, reviewing activity, auditing, oversight                                   | Owner Dashboard                |
| Agent | executing delegated responsibilities, completing tasks, communicating, maintaining properties | Agent Workspace (per-property) |

The advisor's clearer model:

```
Owner Dashboard
  ↓
Delegations
  ↓
Agent Workspace (per delegation)
```

These are different navigation paths. The shell can be shared, but the **landing page** differs.

This resolves COMMUNIQUE-06 §3.2.5 (owner view conflated with agent view).

---

## 8. Mechanical Agent Workspace — Hidden Until Phase 113+

The advisor confirmed our position: do not build placeholder automation dashboards with fabricated metrics.

**Workspace Registry pattern:**

```
Personal       (visible)
Provider       (visible)
Property       (visible)
Owner          (visible)
Automation     (hidden — registered, not enabled)
```

`Automation` is registered in the workspace type registry but only enabled when the `MechanicalAgent` domain ships in Phase 113+. This is a one-line config change to enable it later.

This resolves COMMUNIQUE-06 §3.2.6 (Mechanical Agent data doesn't exist).

---

## 9. Revised Priority Roadmap

COMMUNIQUE-06 §4 priorities are revised to insert `WorkspaceContext` as a P1 frontend deliverable BEFORE the Principal refactor.

| Priority | Item                                                                               | Source                 | Effort    |
| -------- | ---------------------------------------------------------------------------------- | ---------------------- | --------- |
| **P0**   | Phase 111 ADDENDUM fixes (ES256, unblock, index, propertyName)                     | COMMUNIQUE-06 §4       | 1-2 weeks |
| **P1a**  | `WorkspaceContext` frontend abstraction                                            | This communique §2     | 2-3 weeks |
| **P1b**  | Hierarchical workspace selector (Personal/Provider/Owner)                          | This communique §3     | 2-3 weeks |
| **P1c**  | Empty states + workspace scope panel                                               | This communique §§3, 5 | 1-2 weeks |
| **P1d**  | `Principal` database refactor (decouple `AgentAccess` from `ServiceProvider`)      | COMMUNIQUE-06 §1       | 4-6 weeks |
| **P1e**  | Remove `AGENT` from `Role` enum (after `WorkspaceContext` is in place)             | This communique §1.1   | 1-2 weeks |
| **P2**   | Property workspace (`/properties/[id]` with conditional sections)                  | This communique §4     | 3-4 weeks |
| **P2**   | Workspace search, favourites, pinning                                              | This communique §3.2   | 2-3 weeks |
| **P3**   | Pluggable verification framework                                                   | COMMUNIQUE-06 §1.5     | 4-6 weeks |
| **P3**   | Capability-driven billing                                                          | COMMUNIQUE-06 §1.6     | 4-6 weeks |
| **P4**   | Automation workspace (deferred until `MechanicalAgent` model exists in Phase 113+) | This communique §8     | TBD       |
| **P4**   | AI Assistant panel                                                                 | This communique §2.4   | 4-6 weeks |

The key change from COMMUNIQUE-06: **P1d (Principal DB refactor) is now P1d, after P1a-c (frontend abstraction)**. The frontend can adopt `WorkspaceContext` immediately without waiting for backend changes. This de-risks the migration significantly.

---

## 10. ADVISORY-023 Design Principles (adopted)

Future work should favour:

- ✓ Stable authenticated identity
- ✓ Explicit workspace context
- ✓ Context-aware navigation
- ✓ Shared property routes
- ✓ Search-driven workspace selection
- ✓ Progressive disclosure
- ✓ Workspace-specific actions
- ✓ Progressive feature rollout

Future work should avoid:

- ✗ Identity switching
- ✗ Role-driven UI
- ✗ Duplicate property pages
- ✗ Global action panels
- ✗ Placeholder automation dashboards
- ✗ Flat workspace lists that do not scale

---

## 11. Open Questions Resolved

| Question (from COMMUNIQUE-06 §3.5)                                  | Resolution                                                        |
| ------------------------------------------------------------------- | ----------------------------------------------------------------- |
| URL strategy: `/agent-gateway/property/[id]` vs `/properties/[id]`? | `/properties/[id]` — single route, role-conditional sections (§4) |
| Flat switcher or tree?                                              | Hierarchical tree — Delegated Properties under Provider (§3)      |
| Zero-delegation empty state?                                        | Welcome surface with delegation invitation flow (§3.3)            |

All three questions from COMMUNIQUE-06 are now resolved.

---

## 12. New Open Questions

Three questions remain for the next round:

1. **WorkspaceContext caching strategy** — is `WorkspaceContext` recomputed on every route change, or cached with a stale-while-revalidate strategy? Invalidating the wrong context could show the wrong workspace to the user.

2. **Cross-workspace deep links** — if a user receives a notification for "Delegated Property A" while their current workspace is "Personal", should clicking the notification switch the workspace, or open a side panel without switching? Each has UX tradeoffs.

3. **WorkspaceContext vs. URL state** — when the user refreshes the page or shares a URL, the workspace context must be reconstructed from the URL. What's the canonical URL pattern for encoding the active workspace? `/properties/[id]?workspace=agent-123`? Or a path segment?

---

**Decision required:** Approve P1a-c sequence (WorkspaceContext → selector → empty states) as the M5+ frontend path. Approve the URL strategy and hierarchical selector.

**Related:**

- [COMMUNIQUE-05](./COMMUNIQUE-05.md) — original request
- [COMMUNIQUE-06](./COMMUNIQUE-06.md) — advisor response (Principal + workspace review)
- [ADVISORY-022](../advisories/ADVISORY-022.md) — Principal architecture (backend)
- [ADVISORY-023](../advisories/ADVISORY-023.md) — Workspace Context architecture (frontend)
- [AGENT_DISCUSSION.md](../discussions/AGENT_DISCUSSION.md) — Part Three refinement
- BD `soralia-village-sm23` — current ADDENDUM gap tracking (P0 fixes + Principal refactor scope)
