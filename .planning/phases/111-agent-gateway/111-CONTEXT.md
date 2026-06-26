# Phase 111: Agent Gateway — Context

**Gathered:** 2026-06-26
**Status:** Ready for planning
**Source:** Platform architecture — enables Phase 110 extension point D-08/D-09

<domain>
## Phase Boundary

Build the Agent Gateway — a unified access and delegation layer that mediates ALL caller types (human users, non-human AI agents, cron/webhook processes, and delegated third-party providers) through a single authorization pipeline. This is the gate that Phase 110's `/api/access?caller=agent` extension point serves.

The gateway answers three questions per request:

1. **Who is calling?** — human session, agent token, cron secret, or delegation credential
2. **What can they do?** — resolved scope: pages, API endpoints, data domains, actions
3. **On whose behalf?** — self, delegated owner, tenant, or platform

This phase establishes the agent identity model, token lifecycle, delegation framework, and the owner→provider delegation flow for property management tasks (letting, sale, maintenance management).
</domain>

<decisions>
## Implementation Decisions

### Agent Identity Model

- **D-01:** `Agent` type union: `HumanAgent | AIAgent | CronAgent | DelegatedProvider` — each with distinct auth mechanism
- **D-02:** `AgentToken` model — JWT-based, scoped, expirable, revocable. Stored in `agent_tokens` table with `scope: jsonb`, `issuedBy`, `issuedTo`, `expiresAt`, `revokedAt`
- **D-03:** `X-Agent-Token` header — canonical transport. Falls back to session cookie for `HumanAgent`

### Scope Resolution

- **D-04:** Agent scope defines: `{ spaces: string[], pages: string[], apis: string[], dataDomains: string[], actions: string[], maxDuration: number }` — resolved at request time
- **D-05:** Scope intersection: agent scope ∩ tenant module gating ∩ feature flags → effective permissions
- **D-06:** `resolveAgentScope(token) → EffectiveScope` — consumed by Phase 110's `/api/access?caller=agent`

### Owner Delegation (Property Management)

- **D-07:** `Delegation` model — owner delegates specific property tasks to a provider: `{ propertyId, providerId, scopes: DelegationScope[], expiresAt, acceptedAt }` where `DelegationScope = 'VIEW_LISTING' | 'MANAGE_OCCUPANCY' | 'VIEW_FINANCIALS' | 'CONTACT_OCCUPANTS' | 'MARKET_PROPERTY'` (granular, privacy-preserving — maps to data projection in queries)
- **D-07a:** Resident opt-out: per-tenant policy setting. Phase 111 builds the mechanism (resident dashboard widget showing active delegations + block toggle per agent). Whether opt-out is available is a tenant-level configuration — the mechanism is universal, the policy is per-tenant.
- **D-08:** Owner-initiated flow: `/api/properties/[id]/delegate` — creates pending delegation, notifies provider
- **D-09:** Provider acceptance: `/api/delegations/[id]/accept` — activates delegation, issues scoped agent token
- **D-10:** Delegation scope limits: provider can only access pages/APIs relevant to their delegation (e.g., letting agent sees maintenance tickets for their managed properties only)
- **D-11:** Delegation audit trail: `DelegationAction` log — create, accept, reject, revoke, scope-modify, expire

### Token Lifecycle

- **D-12:** Token issuance: `/api/agent/tokens` — admin creates scoped token for AI agent or integration
- **D-13:** Token revocation: `PATCH /api/agent/tokens/[id]/revoke` — immediate, cascades to all active sessions using that token
- **D-14:** Token expiry: cron job or on-next-request invalidation. Expired tokens return 401 with `X-Agent-Token-Expired: true`

### Integration with Existing Systems

- **D-15:** Phase 110 `usePageAccess()` resolves agent scope into visible spaces/pages
- **D-16:** Phase 41 `canAccess()` extended with agent scope dimension
- **D-17:** Phase 33 suspension applies to `HumanAgent` and `DelegatedProvider` — suspended owner's delegations are paused
- **D-18:** Phase 46 provider verification applies to `DelegatedProvider` — unverified providers cannot accept delegations

### Agent's Discretion

- JWT signing algorithm and secret management
- Token format (opaque vs self-describing JWT)
- Delegation notification channel (in-app notification vs email vs both)
- Whether delegation revocation triggers email to provider
- Scope template presets (e.g., `letting-agent` = `{ spaces: ['services'], apis: ['maintenance', 'bookings'], actions: ['read', 'create-ticket'] }`)
- Resident opt-out widget design (dashboard placement, notification on new delegation)

### ADR-020 Decisions (from AGENT_DELEGATION_DISCUSSION.md)

- **D-19:** Blockchain delegation: app-layer only in Phase 111. Smart contract delegation (immutable records, escrow, ERC-721 Delegation NFT) deferred to Phase 113+ as opt-in for Enterprise tenants
- **D-20:** Zero-Knowledge Proofs: Phase 111 skips ZKP entirely. Phase 112 will spike a simple ZK ownership proof prototype (Semaphore or circom/snarkjs). Select privacy handled by scope-based data projection in Phase 111
- **D-21:** Commission/fee model: Phase 111 records delegation actions only — no platform commission logic. Configurable per-tenant commission rates (platform cut + agent %) deferred to a future billing phase. No hardcoded rates
- **D-22:** AI agent authentication: JWT + scope claims — consistent with D-02 AgentToken model. AI agents get scoped JWTs issued via `/api/agent/tokens`. `X-Agent-Token` header transport. No wallet-based auth in Phase 111
- **D-23:** Resident privacy dashboard: Phase 111 includes a resident-facing widget showing active delegations on their property with per-agent block toggle. Complements dWallet's data-sharing consent (Phase 47) — dWallet governs "do I share my data?", this widget governs "do I allow this agent to access my property data / contact me?". Follows dWallet's UX pattern: toggle + append-only audit log (DelegationAction) + Pino structured log. When `CONTACT_OCCUPANTS` scope is blocked by resident, the agent's effective scopes are narrowed server-side via Phase 110 pipeline
  </decisions>

<canonical_refs>

## Canonical References

- `.planning/phases/110-page-nav-access-control/110-CONTEXT.md` — D-08/D-09 extension points
- `.planning/phases/41-feature-gate-consolidation/` — `canAccess()`, GateContext
- `.planning/phases/33-user-suspension/` — suspension model
- `.planning/phases/46.1-platform-saas-billing-foundation/` — provider platform
- `src/shared/api/provider-platform.ts` — `requireProviderAccess()`
- `src/features/auth/model/useGateContext.ts` — existing gate context
  </canonical_refs>

<deferred>
## Deferred Ideas

- **Phase 112:** ZKP ownership proof spike (Semaphore/circom — prototype only)
- **Phase 113+:** Blockchain delegation (smart contracts, escrow, Delegation NFT — Enterprise opt-in)
- **Future billing phase:** Configurable per-tenant commission rates (platform cut + agent %)
- OAuth2/OIDC provider integration for external agent platforms
- Rate limiting per agent (separate from user rate limits)
- Agent marketplace — providers publish agent capabilities, owners browse and delegate
- Multi-property delegation bundles (one delegation covering multiple properties)
- Delegation pricing/tier integration (premium delegations with more scope)
- Cross-tenant agent access (platform-level agents spanning tenants)
  </deferred>

---

_Phase: 111-agent-gateway_
_Context gathered: 2026-06-26_
