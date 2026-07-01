# COMMUNIQUE-06 — Agent Gateway: Advisor Response & Workspace Design Review

**To:** Architecture Advisors  
**Date:** 2026-07-01  
**Status:** Decision Required  
**References:** [COMMUNIQUE-05](./COMMUNIQUE-05.md) (original request), [ADVISORY-022](../advisories/ADVISORY-022.md), [AGENT_DISCUSSION.md](../discussions/AGENT_DISCUSSION.md), [AGENT_USER_STORIES.md](../discussions/AGENT_USER_STORIES.md)

---

## 0. Purpose

COMMUNIQUE-05 asked the architect to choose between three model-split options for the agent gateway. The advisor responded with [ADVISORY-022](../advisories/ADVISORY-022.md) and a detailed discussion ([AGENT_DISCUSSION.md](../discussions/AGENT_DISCUSSION.md)) that:

1. **Rejects all three options** in favor of a `Principal` abstraction
2. **Removes AGENT from the Role enum** (it's a context, not an identity)
3. **Proposes a workspace page design** with GitHub-orgs-like context switching

This communique consolidates the advisor's response and adds our latest concerns from the workspace review. It is a **decision document**, not a fresh request — the original question lives in COMMUNIQUE-05.

---

## 1. Advisor Response — `Principal` Abstraction

### 1.1 — Core principle: authorize principals, not implementations

The advisor rejects Options A (unified), B (discriminator), and C (separate models). Instead:

```
Principal
├── User
├── ServiceProvider
├── MechanicalAgent
├── ExternalIntegration
└── FutureRobot
```

A `Principal` is "something that can authenticate and perform work." The authorization layer evaluates only:

- authenticated principal
- granted scopes
- delegation status

`AgentToken` already encodes this correctly. **Authorization is already unified and should remain untouched.**

### 1.2 — ServiceProvider and MechanicalAgent are NOT siblings

They are different **bounded contexts**:

| Concept           | Bounded Context | Responsibilities                                                                 |
| ----------------- | --------------- | -------------------------------------------------------------------------------- |
| `ServiceProvider` | Commerce        | marketplace, billing, reputation, service catalogue, verification, bookings      |
| `MechanicalAgent` | Automation      | capability declaration, API credentials, execution, orchestration, usage metrics |

A cleaning company (sells services) and a cleaning robot (executes tasks) live in different conceptual domains. They share authentication but not business model.

### 1.3 — Drop the polymorphic FK entirely

```
Principal (id, kind, displayName, status)
├── User             (1:1 with Principal)
├── ServiceProvider  (1:1 with Principal)
├── MechanicalAgent  (1:1 with Principal)

AgentAccess.principalId → Principal.id  // normal FK, no polymorphism
```

`AgentAccess.principalId` becomes a single, normal FK with full referential integrity. No nullable FKs. No application-layer enforcement hacks. Every join goes through `Principal`.

### 1.4 — Remove AGENT from the `Role` enum

```
Role (organizational permissions):
  USER, RESIDENT, BOARD, ADMIN, PROVIDER, MANAGER, ...

Agent Context (derived, ephemeral):
  Active Delegation → scoped Agent Context
```

When a delegation is active, the UI changes, navigation changes, permissions narrow. The role itself does not change. A resident who accepts a maintenance delegation remains a RESIDENT — they are now operating within an agent context.

### 1.5 — Pluggable verification framework

Replace the `isVerified` boolean with a verification policy engine:

```
Verification
  principalId
  type        // BUSINESS_REGISTRATION | API_OWNERSHIP | CAPABILITY_DECLARATION | CALIBRATION_CERT
  status      // PENDING | VERIFIED | EXPIRED
  evidence    Json
```

Different policies per principal kind. One engine, many policies.

### 1.6 — Capability-driven billing

One billing engine, many billing strategies:

- Human provider: monthly subscription, marketplace commission
- Mechanical agent: API calls, tokens, usage, execution minutes
- Robot: inspection hours, distance, maintenance jobs

### 1.7 — Migration path

P1 refactor scope:

- New `Principal` model
- `AgentAccess.principalId` replaces `providerId` + `granteeUserId` polymorphic pair
- New `MechanicalAgent` model linked through `Principal`
- Migration: add `Principal` rows for existing `ServiceProvider` records; backfill `AgentAccess.principalId` from `providerId`

---

## 2. The Provider vs. Agent Role Gap

The current onboarding flow:

```
USER registers → gets verified → elevated to PROVIDER role → sees minimal chrome
```

The `Role` enum includes both `PROVIDER` and `AGENT` as distinct roles. The `AGENT` role is referenced in `useIdentity.ts`, `AnnouncementForm.tsx`, and the identity router — but there is no AGENT onboarding flow. A provider logs in today, sees an icon and chat, and has no path to the agent gateway.

| Concept              | Role       | Purpose                                                                           |
| -------------------- | ---------- | --------------------------------------------------------------------------------- |
| **Service Provider** | `PROVIDER` | Lists services in marketplace, gets booked, receives payments                     |
| **Property Agent**   | `AGENT`    | Accepts delegations, views managed properties, operates within scoped permissions |

A letting agency is BOTH — `PROVIDER` (marketplace presence) AND `AGENT` (delegated property management). The current Role enum is single-valued, so multi-role needs a different solution.

The advisor's resolution (§1.4): remove `AGENT` from the Role enum entirely. Agent context is **derived from active delegations**, not stored as a role. The role system doesn't need to "catch up" because the role doesn't exist.

### Open question: how does this interact with the workspace selector?

If AGENT isn't a role, the "Working As: Delegated Property A" option in the workspace selector is misleading — it's not an identity. A cleaner model:

| Selector option                   | Source                                           |
| --------------------------------- | ------------------------------------------------ |
| "Personal Account"                | `User` (default session)                         |
| "Soralia Property Management Ltd" | `ServiceProvider` membership                     |
| "Delegated: 14 Palm Avenue"       | Active `AgentAccess` (grantee side)              |
| "My Properties"                   | Active `AgentAccess` (grantor side — owner view) |

These are four orthogonal axes, not a flat list.

---

## 3. Workspace Design Review

The advisor proposed a workspace page design in `AGENT_DISCUSSION.md` Part Two — a GitHub-orgs-like context switcher with role-specific widgets. Review:

### 3.1 — Strengths

| Element                           | Why it works                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------- |
| **Context switcher first**        | Surfaces "who am I working as?" before any other UI                             |
| **Work-first cards**              | "Active Delegations 12", "Maintenance Requests 4" answer "do I have work?"      |
| **Delegation mini-dashboards**    | Per-property operational context, not just access metadata                      |
| **Property Workspace sub-pages**  | `/agent-gateway/property/[id]` makes a delegated property feel real             |
| **Tokens demoted to Settings**    | Token management is plumbing, not landing-page content                          |
| **Same shell, different widgets** | Personal/Provider/Delegated/Automation/Administration share shell, vary widgets |
| **AI Assistant panel**            | Future-friendly, slots in without redesign                                      |

### 3.2 — Concerns

**3.2.1 — Switcher scalability**

- 20+ active delegations won't fit in a dropdown — needs search/grouping
- "Working As: Soralia Property Management Ltd" conflates `ServiceProvider` and `User` identity
- If workspaces nest (provider business → delegated property inside it), needs a tree, not a list
- No keyboard navigation, screen reader, or mobile spec

**3.2.2 — Conflation of context and identity**

- The advisor's own insight: AGENT is a context, not an identity
- The mockup's "Working As" implies per-user identity switch
- "Personal" = User identity; "Soralia Property Management Ltd" = ServiceProvider; "Delegated: 14 Palm Avenue" = AgentAccess
- The Principal abstraction suggests these are orthogonal axes, not flat options

**3.2.3 — Navigation conflict**

- "My Delegations" vs. "Managed Properties" — overlapping content unless one filters the other

**3.2.4 — Quick Actions span contexts**

- `+ Accept Invitation` (pending delegation) ≠ `+ Create Maintenance` (managed property) ≠ `+ Contact Owner` (specific delegation) ≠ `+ View Marketplace` (global)
- A flat Quick Actions panel can't serve all four — each workspace needs its own action set

**3.2.5 — Owner view is owner-side, not agent-side**

- "My Delegated Agents" / "Create Delegation" / "Recent Activity" / "Audit" are owner concerns
- Conflating owner and agent perspectives in one workspace is confusing
- Need separate sections or workspace entries for grantor vs. grantee

**3.2.6 — Mechanical Agent data doesn't exist**

- `13 241 calls today`, `Rate Limit: Healthy`, `2 Active Tokens` — none of this data exists
- `MechanicalAgent` model is deferred to Phase 113+
- Building this UI before the data is a mockup that lies

**3.2.7 — URL strategy for shared properties**

- `/agent-gateway/property/[id]` (agent view) vs. existing `/properties/[id]` (owner view)
- Should be the same physical page with role-conditional UI, not two routes

### 3.3 — What's missing

- Mobile/responsive layout (4-column mockups won't survive on a phone)
- Recent Activity timeline integration (existing `DelegationAuditLog` not used)
- Breadcrumbs for nested workspaces
- Keyboard shortcuts for power users
- Onboarding empty states (zero delegations)
- Bulk actions (delegate 5 properties at once)
- Notification preferences (context-specific)
- Accessibility (screen reader for switcher, focus management)
- URL state preservation when switching contexts
- Search across delegations/properties

### 3.4 — Recommended implementation order

The design as proposed is a 6-12 month build. De-risk by shipping:

1. **Context switcher** (P1, ~1 week) — foundation
2. **Work-first home cards** (P1, ~1 week) — `Active Delegations N`, `Tasks Today M`
3. **Delegation mini-dashboards on cards** (P1, ~2 weeks) — replace technical card with operational summary
4. **Property Workspace sub-page** (P2, ~3 weeks) — `/agent-gateway/property/[id]`
5. **Owner view as separate section** (P2, ~2 weeks) — keep grantor and grantee views separate
6. **Mechanical Agent workspace** (P3, defer until Phase 113+ MechanicalAgent model exists)
7. **AI Assistant panel** (P3, ~4 weeks) — only after workspace pattern proves stable

### 3.5 — Three open questions for the advisor

1. **URL strategy** — should the property workspace live in `/agent-gateway/property/[id]` or in the existing `/properties/[id]` with role-conditional sections? The latter is more consistent with the existing app structure.

2. **Switcher shape** — flat list of workspaces (Personal / Provider / Delegated / Automation) or tree (provider business → delegated properties inside it)? Data is hierarchical; design assumes flat.

3. **Zero-delegation empty state** — what does a user with no active delegations see? A blank selector with empty state, or a "Create your first delegation" onboarding CTA?

---

## 4. Revised Priority Roadmap

**P0 — Ship now (Phase 111 ADDENDUM fixes)**

- `DelegationListItem.propertyName` type mismatch
- Unblock escalation bug (use `originalPermissions` as ceiling)
- ES256 signing vs `credentialType` default mismatch
- `DelegationAction` missing `@@index`

**P1 — Principal refactor (Phase 113+)**

- Introduce `Principal` model
- Decouple `AgentAccess` from `ServiceProvider` via `principalId`
- Migration: backfill `Principal` rows from existing `ServiceProvider`
- Add `MechanicalAgent` model linked through `Principal`
- **Estimated effort**: 4-6 weeks including data migration

**P2 — Agent context from delegations**

- Remove `AGENT` from `Role` enum
- Derive agent context from active `AgentAccess` records
- Workspace selector (de-risked scope)

**P3 — Workspace page design (progressive)**

- Property workspace sub-pages
- Delegation mini-dashboards
- Owner view (separate from agent)

**P4 — Pluggable verification**

- Verification policy engine
- Different policies per principal kind

**P5 — Capability-driven billing**

- One billing engine, many strategies

**P6 — Mechanical Agent + AI integration**

- Deferred until Principal refactor lands
- AI Assistant panel

---

## 5. Decision Required

Three concrete questions for the architecture advisor:

1. **Approve Principal abstraction as the M6+ direction?** This unblocks Mechanical Agent, Verification, and Billing as separate concerns. Effort: 4-6 weeks. Risk: data migration on `AgentAccess` and `ServiceProvider`.

2. **Confirm AGENT removal from Role enum?** This is consistent with the advisor's own principle but requires auditing every reference (useIdentity.ts, AnnouncementForm.tsx, identity router, feature-gate tests).

3. **Approve workspace page redesign as P2-P3?** Or do you want to ship a simpler interim version (context switcher + work-first cards only) and revisit the full workspace design in a later phase?

**Related:**

- [COMMUNIQUE-05](./COMMUNIQUE-05.md) — original request
- [ADVISORY-022](../advisories/ADVISORY-022.md) — principal-based architecture guidance
- [AGENT_DISCUSSION.md](../discussions/AGENT_DISCUSSION.md) — full advisor response with workspace mockups
- [AGENT_USER_STORIES.md](../discussions/AGENT_USER_STORIES.md) — cluster 1-4 actor landscape
- BD `soralia-village-sm23` — current ADDENDUM gap tracking (P0 fixes + Principal refactor scope)
