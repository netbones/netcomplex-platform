# COMMUNIQUE-05 — Agent Gateway: Human & Mechanical Agent Architecture

**To:** Architecture Advisors  
**Date:** 2026-07-01  
**Status:** Decision Required  
**Trigger:** Phase 111 Agent Gateway implementation delivered; Phase 118 hardening complete. Now facing the dual-agent domain problem — distinguishing human agents from mechanical (AI/automated) agents within the same delegation and provider infrastructure.

---

## 1. Current Infrastructure

### 1.1 — Agent Identity & Auth

| Artifact             | Purpose                                                                                                                                                                                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AgentToken`         | Scoped, expirable, revocable JWT credential. Fields: `tokenHash` (unique), `scope` (Json), `credentialType` (default `jwt_es256`), `expiresAt`, `revokedAt`, `lastUsedAt`. Back-linked to `AgentAccess`.                                                                                                  |
| `AgentAccess`        | The delegation record — a granted access relationship between an owner (grantor) and an agent (grantee). Fields: `status` (DelegationStatus: PENDING/ACTIVE/REJECTED/REVOKED), `permissions` (String[] — current effective scopes), `originalPermissions` (String[] — immutable ceiling set at creation). |
| `ResidentDelegation` | Owner→renter scoped rights (maintenance initiation). Separate from AgentAccess because the grantee is a resident, not a provider.                                                                                                                                                                         |
| `DelegationAction`   | Append-only audit log. Every status change writes a row with `actorId`, `action` type, and `metadata` payload.                                                                                                                                                                                            |
| `AGENT_SCOPES`       | 20 canonical scopes (e.g. `VIEW_LISTING`, `MANAGE_OCCUPANCY`, `CONTACT_OCCUPANTS`). Four `SCOPE_BUNDLES` preset templates (letting-agent, maintenance-contractor, inspector, property-manager).                                                                                                           |

**Auth flow:**

1. Owner calls `POST /api/properties/[id]/delegate` → creates PENDING `AgentAccess`
2. Provider calls `POST /api/delegations/[id]/accept` → sets ACTIVE, issues `AgentToken` (JWT with scoped claims)
3. All subsequent API calls carry `X-Agent-Token` header
4. `resolveAgentScope()` in Phase 110 access pipeline validates the token, checks suspension, and intersects agent scopes with tenant module gating + feature flags

### 1.2 — The Provider Pattern

`ServiceProvider` (`prisma/schema.prisma:1144`) is the existing provider entity:

```
model ServiceProvider {
  id              String
  tenantId        String
  companyName     String
  trade           String
  phone           String
  isActive        Boolean
  isVerified      Boolean    — gating check at delegation acceptance
  providerType    ProviderType — COMMUNITY | THIRD_PARTY
  ...
}
```

A `ServiceProvider` can:

- Register, get verified, subscribe to billing plans
- Receive delegations via AgentAccess (the `ServiceProvider` IS the grantee)
- List and manage properties in the marketplace
- Create service bookings, process payments

Currently, the provider is assumed to be a **human-operated business**. There is no distinction between "this provider is a human letting agency" and "this provider is an AI ad-posting service."

### 1.3 — What Phase 111 **did not** resolve

The `Agent` type union proposed in the Phase 111 context (`HumanAgent | AIAgent | CronAgent | DelegatedProvider`) was never implemented. Instead, the implementation converged on a single `AgentToken`-based pipeline that treats all callers uniformly — a JWT is a JWT. The type union remains aspirational.

---

## 2. The Dual-Domain Problem

### 2.1 — Two Distinct Delegation Patterns

**Domain A: Property Owner → Human Agent**

The owner delegates property management to a real-estate agent, letting agency, or maintenance contractor — a human professional operating through the service-provider marketplace.

| Delegation Type         | Examples                                      |
| ----------------------- | --------------------------------------------- |
| Rental/lease management | Letting agent finds tenants, manages viewings |
| Property sale           | Estate agent lists and sells the property     |
| Inspection              | Certified inspector assesses condition        |
| Maintenance management  | Contractor handles repair requests            |

**Domain B: Property Owner → Mechanical Agent**

The owner delegates specific automated tasks to an AI agent, automated service, or future robotic system. This is NOT a human operating a provider account — it is an autonomous or semi-autonomous software agent.

| Delegation Type            | Examples                                                                    |
| -------------------------- | --------------------------------------------------------------------------- |
| Advertising orchestration  | AI posts listing to Property24, PrivateProperty, etc. automatically         |
| Lease drafting             | AI generates lease contracts from templates, sends for e-signature          |
| Maintenance orchestration  | AI triages maintenance requests, dispatches to appropriate contractors      |
| Robotic personnel (future) | Physical robots performing property inspections, cleaning, security patrols |

### 2.2 — Shared Provider Infrastructure

Critically, **both human and mechanical agents operate through the provider pattern**:

| Capability                    | Human Agent                           | Mechanical Agent                                       |
| ----------------------------- | ------------------------------------- | ------------------------------------------------------ |
| Accept delegation             | ✓ POST `/api/delegations/[id]/accept` | ✓ same                                                 |
| Hold AgentToken               | ✓ JWT with scoped claims              | ✓ same                                                 |
| Act within scoped permissions | ✓ AgentAccess.permissions             | ✓ same                                                 |
| Create service bookings       | ✓ through provider marketplace        | ✗ (orchestrates contractors, doesn't perform the work) |
| Get verified                  | ✓ isVerified check                    | ? (what does "verified" mean for an AI?)               |
| Subscribe to billing          | ✓ subscription tiers                  | ? (per-use metering? flat fee?)                        |
| Audit trail                   | ✓ DelegationAction                    | ✓ same                                                 |

The divergence is not in the **authorization model** (both use AgentToken + scopes) but in the **business model**:

- A human agent is **verified, billed, and held accountable** through the existing provider infrastructure
- A mechanical agent may need **different verification** (API key registration, model certification, rate-limit compliance) and **different billing** (per-operation tokens, subscription to AI capability tiers, usage-based pricing)

---

## 3. The Architectural Question

### 3.1 — Should we split the model?

**Option A: Single unified model (current state)**

Advantages:

- AgentToken + AgentAccess work the same for both types
- The authorization pipeline is already built
- No migration, no schema change, no new API routes

Disadvantages:

- `ServiceProvider` becomes ambiguous: is the provider entity a human business or an AI service?
- Verification semantics differ (business registration vs. AI capability certification)
- Billing semantics differ (subscription tiers vs. per-operation metering)
- Cannot query "show me all mechanical agents" or "show me all human agents" without a discriminator field

**Option B: Split `ServiceProvider` by `providerKind`**

Add a discriminator enum `ProviderKind { HUMAN, MECHANICAL }` to `ServiceProvider`. Both types share the same delegation and auth infrastructure but diverge on:

- `verificationRequirements` — different schema of proof
- `billingModel` — different pricing and metering
- `capabilityRegistry` — what can this provider actually DO

Advantages:

- Smallest schema change (one enum, no new models)
- Authorization pipeline unchanged
- Backward-compatible

Disadvantages:

- `ServiceProvider` already has field sprawl; adding mechanical-agent-specific columns worsens the C1-type shape conflation already documented in `UBIQUITOUS_LANGUAGE.md`
- A human letting agency and an AI ad-poster have almost nothing in common beyond "they receive a JWT"

**Option C: Separate `MechanicalAgent` model + `providerKind` discriminator**

Keep `ServiceProvider` for human providers. Add a new `MechanicalAgent` model for AI/automated agents. Both implement the same delegation interface (both can hold `AgentAccess` records), but each has its own schema:

- `ServiceProvider` retains verification, billing, marketplace listing
- `MechanicalAgent` has capability declaration, rate-limit config, usage tracking, model/version metadata

Advantages:

- Clean separation of concerns — no shape conflation
- Each model can evolve independently
- Clear query semantics

Disadvantages:

- More complex schema
- `AgentAccess` must reference either a `ServiceProvider` OR a `MechanicalAgent` → polymorphic FK (Prisma doesn't support) or a union-type workaround
- Duplication of the delegation-acceptance flow

### 3.2 — The Polymorphic FK Problem

`AgentAccess` currently has:

```prisma
provider   ServiceProvider @relation(fields: [providerId], references: [id])
```

If we create `MechanicalAgent` as a separate model, `AgentAccess` needs to reference one OR the other. Prisma does not support polymorphic foreign keys. Workarounds:

| Workaround           | Approach                                                                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Null FK**          | Add `mechanicalAgentId String?` — exactly one FK is non-null per row. Enforce in application layer.                                           |
| **Union table**      | Create `DelegationTarget` junction table with `targetId` + `targetType` — adds one more join per query                                        |
| **Discriminated FK** | `granteeId String` (the ID) + `granteeKind GrantableKind` (HUMAN_PROVIDER / MECHANICAL_AGENT) — no FK constraint at DB level, enforced in app |

---

## 4. Key Decisions Required

### 4.1 — Immediate (Phase 111 ADDENDUM closure)

These can be resolved without the dual-domain decision:

1. **DelegationListItem.propertyName type mismatch** — remove stale field. Trivial.
2. **Unblock escalation bug** — use `originalPermissions` as ceiling during unblock. Schema already supports this.
3. **ES256 vs. HS256 signing** — verify or fix `signAgentToken` in `agent-token.ts`. Decision: do we want asymmetric (ES256) for cross-service verification, or symmetric (HS256) for simplicity?
4. **DelegationAction missing indexes** — add `@@index([delegationId])` and `@@index([tenantId])`. Trivial.

### 4.2 — Architectural (this communique)

We need guidance on:

1. **Which model split?** Option A (stay unified), Option B (discriminator on ServiceProvider), or Option C (separate models with polymorphic FK workaround)?
2. **How should mechanical-agent verification differ from human-provider verification?** For a human, "verified" means business registration + trade license. For an AI, does it mean API key registration? Model certification? Sandboxed capability declaration?
3. **How should mechanical-agent billing differ?** Per-operation tokens (e.g., 0.01 ZAR per listing post)? AI tier quotas (already in `PlatformAiTierQuota`)? Flat subscription like human providers? Should the billing layer be shared or separate?
4. **What is the "robot personnel" horizon?** If physical robots performing inspections are >12 months out, we can defer mechanical-agent schema decisions to Phase 113+ and use Option A as a tactical bridge. If robots are on the M6 roadmap, we should build the schema correctly now.

### 4.4 — The Provider vs. Agent Role Distinction

The current role system has a gap that directly impacts the agent gateway design.

**Current provider onboarding flow:**

```
USER registers → gets verified → elevated to PROVIDER role → sees provider chrome
```

The `Role` enum (`prisma/schema.prisma`) includes both `PROVIDER` and `AGENT` as distinct roles:

```
enum Role {
  USER, RESIDENT, GROUP_ADMIN, COMMITTEE, BOARD, ADMIN,
  AGENT, MANAGER, ASSOCIATE, PROVIDER
}
```

**Current PROVIDER experience (what exists):**

A provider logging in today sees:

- A provider-specific header icon
- Chat (messages with residents/clients)
- Essentially nothing else — no property dashboard, no delegation management, no service listing management surfaced in their primary navigation

The `AgentToken`/`AgentAccess`/`DelegationWidget` stack was built in Phase 111 and registered in Phase 118, but the provider still has no path to reach it. The delegation infrastructure exists, but the **role-based navigation that surfaces it does not**.

**The PROVIDER vs. AGENT distinction:**

| Concept              | Role       | Identity                                                   | Purpose                                                                           |
| -------------------- | ---------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Service Provider** | `PROVIDER` | A business (plumbing company, electrician, letting agency) | Lists services in marketplace, gets booked by residents, receives payments        |
| **Property Agent**   | `AGENT`    | A delegate who manages property on an owner's behalf       | Accepts delegations, views managed properties, operates within scoped permissions |

A letting agency is BOTH — it has a `PROVIDER` role (to list its services) AND should have `AGENT` context (to manage delegated properties). But currently there is no AGENT role flow — the agent exists only as an `AgentAccess` database row, not as a user-facing identity.

**Key questions for the architecture advisor:**

1. **Should AGENT be a separate login identity or a sub-mode of PROVIDER?**
   - _Separate identity_: An agent creates an agent account, gets verified, receives delegations. Distinct from their provider business account (if they have one).
   - _Sub-mode of PROVIDER_: A provider toggles into "agent mode" to manage delegated properties, then back to "provider mode" to manage service listings. Same login, two contexts.

2. **How does the AGENT role get assigned?**
   - Automatically when a delegation is accepted? (The `AgentAccess.status → ACTIVE` triggers role assignment)
   - Manually by an admin? (Role assigned at account creation)
   - Via invitation? (Owner invites an agent email → they register → automatically AGENT role)

3. **What does an AGENT see that a PROVIDER doesn't?**
   - The `/agent-gateway` page with `DelegationWidget`
   - Property-specific dashboards (maintenance requests for managed properties)
   - Tenant communication scoped to managed properties
   - Delegation audit log

4. **Can a user hold both PROVIDER and AGENT roles simultaneously?** The current Role enum is single-valued. If a letting agency needs both marketplace presence (PROVIDER) and delegation management (AGENT), we either need:
   - Multi-role support (array of roles per user)
   - A `providerKind` or `agentMode` toggle on the session
   - Separate user accounts per role

5. **What is the AGENT chrome/navigation?** Currently a provider sees a single icon. An agent needs a proper navigation surface with:
   - Gateway home (delegations overview)
   - Per-property dashboards (maintenance, bookings, occupants)
   - Token management (for mechanical agents)
   - Audit log

The agent gateway page we built (`/agent-gateway`) is currently accessible to anyone, but should be gated to users with AGENT role (or AGENT-capable PROVICER role) and scoped to show only relevant delegations. The role system needs to catch up to the delegation infrastructure.

### 4.3 — Agent Gateway Page Design

The `/agent-gateway` page currently exists as a minimal shell: a `DelegationWidget` (showing active delegations with block toggles) plus sidebar quick-links to maintenance, services, and profile. There is no token management UI, no agent profile view, and no distinction between human and mechanical agent contexts. We need design input on what this page should become.

**Current page structure:**

| Section             | Content                                                                     |
| ------------------- | --------------------------------------------------------------------------- |
| Header              | Breadcrumbs, title, subtitle                                                |
| Main (left 2/3)     | `DelegationWidget` — active/pending delegation cards                        |
| Sidebar (right 1/3) | "Access Tokens" card (links to `/agent-gateway/tokens`), "Quick Links" card |

**Open design questions:**

1. **Token management UI** — Currently a placeholder link. Should the gateway page have an inline token list (issue, view, revoke) or should `/agent-gateway/tokens` remain a separate sub-page? For mechanical agents, API tokens are the primary interface — does this warrant a more prominent placement than for human agents who primarily use the delegation widget?

2. **Agent profile section** — Should the gateway show a profile summary (name, provider type, verification status, active properties)? The `ServiceProvider` record has `companyName`, `trade`, `isVerified`. For mechanical agents, this might show capability set, model version, rate-limit status.

3. **Role-based view switching** — The gateway serves three different audiences. Should we handle this with tab navigation, role-conditional sections, or separate page variants?

   | Audience                      | Primary need                                                                |
   | ----------------------------- | --------------------------------------------------------------------------- |
   | **Property owner**            | View my delegated agents, manage permissions, revoke access                 |
   | **Human agent (provider)**    | Accept/reject delegations, view managed properties, manage service listings |
   | **Mechanical agent operator** | View issued API tokens, monitor usage, configure capabilities               |

4. **Dual-agent onboarding flow** — When a property owner navigates to "delegate to an agent," how do they choose between "find a human agent" (marketplace/browse providers) and "connect a mechanical agent" (register an AI service, paste an API key)? Are these the same flow or separate entry points?

5. **Activity feed vs. static cards** — The `DelegationAuditLog` exists as a component. Should the gateway surface recent delegation activity (accepted, rejected, scope-changed) as a timeline or activity feed?

6. **Mechanical agent status indicators** — For AI agents, what status should the UI display? "Last active: 2 min ago"? "Rate limit: 85%"? "Model: claude-sonnet-4-20250514"? The `AgentToken` model has `lastUsedAt` — is this sufficient?

7. **Mobile/tablet layout** — The current three-column layout may not scale. What priority do we assign to delegation cards vs. token management on smaller screens?

**Relevant existing components:**

- `DelegationWidget` — active/pending delegation cards with block toggle, optimistic update
- `DelegationAuditLog` — color-coded timeline of delegation lifecycle events
- `useDelegations` / `useDelegationAudit` — TanStack Query hooks
- Agent entity exports: `AGENT_SCOPES`, `SCOPE_BUNDLES`, `SCOPE_LABELS`

We request design guidance on the page structure, audience-specific views, and how to differentiate the human-agent vs. mechanical-agent user experience within the same gateway surface.

---

## 5. Recommendation (for discussion)

**Bridge phase (now → M5 launch):** Add `providerKind: ProviderKind @default(HUMAN)` discriminator to `ServiceProvider` (Option B). This is one line in the schema, backward-compatible, and gives us the query capability without the polymorphic FK complexity. Authorize all agents identically through `AgentToken` regardless of kind.

**Post-M5 (M6+):** Revisit Option C when mechanical-agent capabilities (usage tracking, capability registry, per-operation billing) diverge sufficiently from human-provider capabilities to justify a separate model.

The key insight: the question is **not** about authorization (both human and mechanical agents are "just callers with scoped JWTs"). The question is about **provider lifecycle** — how the agent entity is registered, verified, billed, and discovered.

---

**Decision required:** Superseded by advisor response in §6 below.

> **SUPERSEDED — see §6 for new direction.** The advisor rejected all three options (A/B/C) and recommended a `Principal` abstraction. Section 5's bridge-phase recommendation (Option B) is no longer the proposed path.

**Related:**

- `.planning/phases/111-agent-gateway/ADDENDUM.md` — known gaps
- `.planning/phases/111-agent-gateway/111-CONTEXT.md` — Agent type union (D-01), blockchain/ZKP/commission deferrals (D-19–D-23)
- `docs/STEERING/UBIQUITOUS_LANGUAGE.md` — C1 shape conflation precedent
- BD `soralia-village-sm23` — current ADDENDUM gap tracking

---

## 6. Advisor Response — `Principal` Abstraction (RECOMMENDED)

The advisor ([`docs/discussions/AGENT_DISCUSSION.md`](../discussions/AGENT_DISCUSSION.md) and [`docs/advisories/ADVISORY-022.md`](../advisories/ADVISORY-022.md)) **rejects all three options** in §3 and recommends a fourth architecture centered on a `Principal` abstraction.

### 6.1 — Core principle: authorize principals, not implementations

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

Whether the principal is human, AI, integration, or future robot is irrelevant to the authorization pipeline. `AgentToken` already encodes this correctly.

### 6.2 — ServiceProvider and MechanicalAgent are NOT siblings

The advisor pushes back on framing them as equivalent — they are different **bounded contexts**:

| Concept           | Bounded Context | Responsibilities                                                                 |
| ----------------- | --------------- | -------------------------------------------------------------------------------- |
| `ServiceProvider` | Commerce        | marketplace, billing, reputation, service catalogue, verification, bookings      |
| `MechanicalAgent` | Automation      | capability declaration, API credentials, execution, orchestration, usage metrics |

A cleaning company (sells services) and a cleaning robot (executes tasks) live in different conceptual domains. They share authentication but not business model.

### 6.3 — Drop the polymorphic FK entirely

The advisor's proposed schema:

```prisma
model Principal {
  id           String   @id @default(cuid())
  kind         PrincipalKind  // USER | SERVICE_PROVIDER | MECHANICAL_AGENT | INTEGRATION | ROBOT
  displayName  String
  status       PrincipalStatus
  ...
}

model User             { id String @id  principal Principal @relation(...) }
model ServiceProvider  { id String @id  principal Principal @relation(...) }
model MechanicalAgent  { id String @id  principal Principal @relation(...) }

model AgentAccess {
  grantorId    String
  principalId  String       // single, normal FK — no polymorphism
  principal    Principal    @relation(...)
  ...
}
```

`AgentAccess.principalId` becomes a **normal FK** with full referential integrity. No nullable FKs. No application-layer enforcement hacks. Every join goes through `Principal`.

### 6.4 — Remove AGENT from the `Role` enum

The advisor argues that **AGENT is a context, not an identity**:

```
Role (organizational permissions):
  USER, RESIDENT, BOARD, ADMIN, PROVIDER, MANAGER, ...

Agent Context (derived, ephemeral):
  Active Delegation → scoped Agent Context
```

When a delegation is active, the UI changes, navigation changes, permissions narrow. The role itself does not change. A resident who accepts a maintenance delegation remains a RESIDENT — they are now operating within an agent context.

This eliminates the multi-role problem entirely and prevents role inflation.

### 6.5 — Gateway becomes a Workspace (not an admin page)

Instead of a static `/agent-gateway` admin page, the advisor recommends a **workspace** model that scales across user types:

```
Workspace context switcher (like GitHub orgs):
  Personal Account
  Soralia Property Management Ltd
  Delegated: 14 Palm Avenue
  Delegated: 22 Sunset Close
  Automation
```

Each workspace has different widgets and tools but uses the same authenticated identity. See [`AGENT_DISCUSSION.md`](../discussions/AGENT_DISCUSSION.md) for full ASCII mockups.

### 6.6 — Pluggable verification framework

Replace the `isVerified` boolean with a verification policy engine:

```
Verification
  principalId
  type        // BUSINESS_REGISTRATION | API_OWNERSHIP | CAPABILITY_DECLARATION | CALIBRATION_CERT
  status      // PENDING | VERIFIED | EXPIRED
  evidence    Json
  ...
```

Human providers verify via business registration, VAT, insurance, trade licence. AI agents verify via API ownership, model provider, capability declaration, security review. Robots verify via maintenance certificate, calibration, operator registration. All use the same verification engine with different policies.

### 6.7 — Capability-driven billing

Billing should be capability-driven, not identity-driven:

- Human provider: monthly subscription, marketplace commission
- Mechanical agent: API calls, tokens, usage, execution minutes
- Robot: inspection hours, distance, maintenance jobs

One billing engine. Many billing strategies.

### 6.8 — Revised recommendation

**P0** — Ship the existing Phase 111 correctness fixes (ES256, unblock ceiling, DelegationAction indexes, propertyName type fix). Do not delay for refactoring.

**P1** — Introduce `Principal` abstraction. Decouple `AgentAccess` from `ServiceProvider`. This is a refactor that touches:

- New `Principal` model
- `AgentAccess.principalId` (replace `providerId` + `granteeUserId` polymorphic pair)
- `MechanicalAgent` model (new, linked through `Principal`)
- Migration path: add `Principal` rows for existing `ServiceProvider` records, backfill `AgentAccess.principalId` from `providerId`

**P2** — Remove `AGENT` from `Role` enum. Make agent context derive from active delegations.

**P3** — Pluggable verification framework. Different verification policies per principal kind.

**P4** — Workspace page design. Replace `/agent-gateway` admin shell with workspace pattern.

**P5** — Capability-driven billing strategies.

### 6.9 — Strategic assessment

The advisor agrees that **authorization is already unified** through `AgentToken` and `AgentAccess` — that is the strength to preserve. The architectural friction in this communique comes from trying to make identity, commerce, delegation, verification, and automation all live inside `ServiceProvider`.

The Principal abstraction allows:

- Existing Phase 111 implementation to remain stable
- Each domain (User, ServiceProvider, MechanicalAgent) to evolve independently
- Future principals (Integrations, Robots) to plug in without schema changes
- Authorization to remain stable while business capabilities continue to evolve

---

**Decision required:** Approve Principal abstraction (P1) as the M6+ direction, or defer it to Phase 113+.

**Related:**

- `docs/advisories/ADVISORY-022.md` — principal-based architecture guidance
- `docs/discussions/AGENT_DISCUSSION.md` — full advisor response with workspace mockups

---

## 7. Workspace Design Review (AGENT_DISCUSSION.md Part Two)

This section reviews the workspace design proposed in `AGENT_DISCUSSION.md` (lines 720-1147). The design proposes a GitHub-orgs-like context switcher with role-based workspace variants.

### 7.1 — Strengths

| Element                                   | Why it works                                                                                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Context switcher first**                | Surfaces the right question ("who am I working as?") before any other UI                                                                           |
| **Work-first cards**                      | "Active Delegations 12", "Maintenance Requests 4" answer "do I have work?" immediately — replaces a delegation toggle that requires interpretation |
| **Delegation mini-dashboards**            | Each delegation card showing open maintenance, bookings, messages, occupancy gives operational context, not just access metadata                   |
| **Property Workspace sub-pages**          | `/agent-gateway/property/[id]` as mini-dashboards lets a delegated property feel like a real workspace, not just a granted permission              |
| **Demote tokens to Settings**             | Token management is plumbing; surfacing it on the landing page is irrelevant to most agent operations                                              |
| **Same shell, different widgets**         | Personal/Provider/Delegated/Automation/Administration all use the same navigation with role-specific widgets — true progressive disclosure         |
| **AI Assistant panel as future addition** | Slots in naturally without redesigning the shell                                                                                                   |

### 7.2 — Concerns

#### 7.2.1 — Context switcher scalability

GitHub's organization switcher has had years of UX work for a reason. The mockup shows a flat list. Real concerns:

- A user with 20+ active delegations won't fit in a dropdown — needs search/grouping
- "Working As: Soralia Property Management Ltd" — is this a `ServiceProvider` workspace, a `Provider` role, or a `Principal`-linked entity? The mockup conflates these
- If workspaces can be nested (provider business → delegated property inside that business), the selector needs a tree, not a list
- Keyboard navigation, screen reader support, mobile-friendly variant — none specified

#### 7.2.2 — Conflation of context and identity

The advisor's own insight (§6.4) is that **AGENT is a context, not an identity**. But the mockup's "Working As" suggests a per-user identity switch:

- "Personal Account" → user identity
- "Soralia Property Management Ltd" → service provider identity
- "Delegated: 14 Palm Avenue" → delegation context

This conflates the user's identity (`User`), the provider business (`ServiceProvider`), and the delegation context (`AgentAccess`). The Principal abstraction (§6.3) suggests these should be cleanly separated.

A cleaner model:

- User identity is fixed (one per session)
- Provider workspaces come from the user's `ServiceProvider` memberships
- Delegation contexts come from active `AgentAccess` records
- The selector switches between three orthogonal axes, not flat options

#### 7.2.3 — "My Delegations" navigation conflicts

The navigation structure shows:

```
My Delegations  ←── lists all delegations as flat items
Managed Properties  ←── lists properties
```

But the workspace pattern says each delegation IS a property. These are the same thing in different lenses. A user navigating "Managed Properties" vs. "My Delegations" would see overlapping content unless one is a filter of the other.

#### 7.2.4 — Quick Actions don't fit any single context

`+ Accept Invitation`, `+ Create Maintenance`, `+ Contact Owner`, `+ View Marketplace` — these cut across contexts:

- "Accept Invitation" makes sense for a pending delegation
- "Create Maintenance" makes sense for managed properties
- "Contact Owner" only makes sense for a specific delegation
- "View Marketplace" is global

A flat "Quick Actions" panel can't serve all four. Each workspace would need its own action set.

#### 7.2.5 — Owner view cards are mostly owner-side, not agent-side

The "Owner View" mockup shows:

- My Delegated Agents (people I've delegated to)
- Pending Invitations
- Create Delegation
- Recent Activity
- Audit

This is the **owner's** view of their delegations, not the **agent's** view. Conflating owner and agent perspectives in one workspace is confusing — they have different needs:

- Owner: who am I delegating to? what scope? can I revoke?
- Agent: what am I delegated? what can I do? what's pending?

These need separate sections or separate workspace entries.

#### 7.2.6 — Data dependencies for Mechanical Agent workspace

`13 241 calls today`, `Rate Limit: Healthy`, `2 Active Tokens` — none of this data exists in the current schema. The MechanicalAgent model is deferred to Phase 113+. Building this UI before the data is a mockup that lies.

#### 7.2.7 — No URL strategy for shared properties

`/agent-gateway/property/14` works for an agent's view, but what about the owner's view of the same property? The owner already has a property dashboard somewhere. The agent view and owner view of the same property should be the same physical page with role-conditional UI, not two separate routes.

### 7.3 — What's Missing

- **Mobile/responsive layout** — the 4-column mockups won't survive on a phone
- **Recent Activity timeline integration** — the existing `DelegationAuditLog` component is not used
- **Breadcrumbs** — Property Workspace nested under Delegations → Property
- **Keyboard shortcuts** — for power users (g, m, s for navigation)
- **Onboarding empty states** — what does a new user with zero delegations see?
- **Bulk actions** — delegate to 5 properties at once, accept 3 invitations together
- **Notification preferences** — context-specific (urgent maintenance vs. audit alerts)
- **Accessibility** — screen reader for context switcher, focus management
- **URL state preservation** — if you switch contexts, what happens to the page?
- **Search** — across all delegations/properties (workspace-switcher should have search)

### 7.4 — Recommended Implementation Order

The design as proposed is a 6-12 month build. To de-risk, ship in this order:

1. **Context switcher** (P1, ~1 week) — the foundation. Even if workspaces show the same content, the switcher proves the UX works.
2. **Work-first home cards** (P1, ~1 week) — `Active Delegations N`, `Tasks Today M`. Reuse existing API count queries.
3. **Delegation mini-dashboards on cards** (P1, ~2 weeks) — replaces the technical card with operational summary. Requires aggregating maintenance/booking/message counts per property.
4. **Property Workspace sub-page** (P2, ~3 weeks) — `/agent-gateway/property/[id]`. Foundation for the rest of the design.
5. **Mechanical Agent workspace** (P3, ~defer until Phase 113+ MechanicalAgent model exists) — building this without the data is premature
6. **Owner view as separate section** (P2, ~2 weeks) — keep agent and owner views separate, link between them
7. **AI Assistant panel** (P3, ~4 weeks) — only after workspace pattern proves stable

### 7.5 — Decision Required

Three open questions for the architecture advisor before implementation:

1. **Should the property workspace live in `/agent-gateway/property/[id]` or in the existing `/properties/[id]` page with role-conditional sections?** The latter is more consistent with the existing app structure but requires routing the role check into the page.

2. **Is "Working As" a flat switcher or a tree (provider business → delegated properties inside it)?** The current design assumes flat, but the data is hierarchical.

3. **For a user with zero active delegations, what does the workspace show?** A blank selector with an empty state, or a "Create your first delegation" onboarding CTA?
