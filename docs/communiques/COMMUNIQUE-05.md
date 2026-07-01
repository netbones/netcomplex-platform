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

---

## 5. Recommendation (for discussion)

**Bridge phase (now → M5 launch):** Add `providerKind: ProviderKind @default(HUMAN)` discriminator to `ServiceProvider` (Option B). This is one line in the schema, backward-compatible, and gives us the query capability without the polymorphic FK complexity. Authorize all agents identically through `AgentToken` regardless of kind.

**Post-M5 (M6+):** Revisit Option C when mechanical-agent capabilities (usage tracking, capability registry, per-operation billing) diverge sufficiently from human-provider capabilities to justify a separate model.

The key insight: the question is **not** about authorization (both human and mechanical agents are "just callers with scoped JWTs"). The question is about **provider lifecycle** — how the agent entity is registered, verified, billed, and discovered.

---

**Decision required:** Approve Option B (discriminator), Option C (separate models), or propose an alternative approach.

**Related:**

- `.planning/phases/111-agent-gateway/ADDENDUM.md` — known gaps
- `.planning/phases/111-agent-gateway/111-CONTEXT.md` — Agent type union (D-01), blockchain/ZKP/commission deferrals (D-19–D-23)
- `docs/STEERING/UBIQUITOUS_LANGUAGE.md` — C1 shape conflation precedent
- BD `soralia-village-sm23` — current ADDENDUM gap tracking
