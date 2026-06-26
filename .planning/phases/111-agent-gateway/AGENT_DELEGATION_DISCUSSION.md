# DISCUSSION: Agent Access & Property Delegation Model (Phase 111+)

**Date:** 2026-06-26  
**Status:** Proposed / Open for Discussion  
**Related:** Phase 110 (Page & Navigation Access Control), ADR-017 (Property-First Architecture), AgentAccess schema

## Context

NetComplex needs to support **property owner delegation** for letting, management, and sale of properties via professional agents. This enables Premium/Enterprise tenants (investors, property managers) to grant scoped, time-bound, auditable access to agents without compromising resident privacy or tenant isolation.

Key requirements:

- Granular per-property scopes (VIEW_LISTING, MANAGE_OCCUPANCY, VIEW_FINANCIALS, CONTACT_OCCUPANTS, MARKET_PROPERTY)
- Explicit owner consent and easy revocation
- Full audit trail
- Privacy preservation (data minimization, resident visibility into who has access)
- Future-proof for non-human (AI) agents
- Multi-tenant safety

Existing assets: `AgentAccess`, `AgentProfile`, `Property`, `PremiumSeat`, Phase 110 centralized `/api/access`.

---

## Proposed ADR-020: Agent Delegation & Privacy-Preserving Access Control

### Status

Proposed

### Context

Property owners (especially in Premium tier) require secure delegation to agents for operational efficiency. Current `AgentAccess` model is a good start but needs enhancement for privacy, blockchain-optional trust, and AI agent extensibility. Scattered checks must be unified via Phase 110 pipeline.

### Decision

Adopt a **hybrid centralized + optional decentralized** delegation model:

1. **Core System (App Layer)**: Extend existing `AgentAccess` with:
   - Enhanced scopes (enum array)
   - Consent metadata (signed statement, timestamp)
   - Resident visibility toggle
   - Revocation workflow with notifications

2. **Privacy Layer**:
   - Scope-based data projection in all queries
   - Resident dashboard widget showing active delegations
   - Zero-Knowledge Proofs (ZKP) for selective disclosure (see below)

3. **Optional Blockchain Integration** (Merits below):
   - Smart contracts for immutable delegation records and automated royalty/fee distribution
   - On-chain verification for high-value actions (sales, long-term leases)

4. **Access Resolution**:
   - Extend Phase 110 `resolvePageAccess` with AgentAccess lookup
   - `PageAccess.agent` field includes resolved scopes + propertyIds
   - RLS policies enforce grants at DB level for sensitive tables

### Consequences

**Positive**

- Empowers owners with professional management while retaining control
- Strong audit + consent reduces legal risk
- Unified with Phase 110 pipeline → minimal new code
- Prepares for AI agents (scope-based, revocable tokens)

**Negative / Trade-offs**

- Increased complexity in query layer (projection logic)
- Blockchain adds gas fees, complexity, and regulatory considerations (optional)
- ZKP introduces performance overhead (mitigated by selective use)

**Related**

- ADR-017 Property-First
- Phase 110 Access Control
- Existing AgentAccess schema

---

## Delegation Smart Contract Merits (Optional Blockchain Layer)

**Why Consider Smart Contracts?**

1. **Immutability & Transparency**: Delegation grants recorded on-chain (e.g., Polygon or Ethereum L2 for low cost). Owners and agents can verify independently.

2. **Automated Execution**:
   - Commission splits paid automatically on successful sale/lease via escrow smart contract
   - Time-bound grants auto-expire
   - Royalty distribution for community (e.g., 1% to HOA on sales facilitated via platform)

3. **Trust Minimization**: Reduces reliance on platform operator for dispute resolution. On-chain proof of grant/revocation.

4. **Interoperability**: Agents can use the same wallet across multiple communities/HOAs.

**Implementation Sketch**

- ERC-721/1155 style "Delegation NFT" per grant (revocable via burn)
- Escrow contract for high-value transactions
- Integration via wallet connect in agent dashboard
- Off-chain indexing (The Graph) for fast queries

**Risks & Mitigations**

- Gas costs → Use L2 or optimistic rollups
- Regulatory (KYC/AML) → Hybrid: on-chain for grant, off-chain for PII
- Complexity → **Opt-in per tenant** (Enterprise tier)

**Recommendation**: Start with app-layer only. Add blockchain in Phase 113+ for Premium+ tenants who opt-in.

---

## Zero-Knowledge Proofs for Privacy

**Proposal**: Use ZKPs for selective disclosure of resident data to agents.

**Use Cases**:

- Prove "I am the verified owner of Property X" without revealing full identity
- Agent proves "I have valid delegation for CONTACT_OCCUPANTS" without exposing full grant details
- Resident proves residency status without exposing exact move-in dates or other PII

**Technologies**:

- **Semaphore** or **Semaphore-like** (for anonymous signaling)
- **zk-SNARKs** (via circom + snarkjs) for complex proofs
- Integrate via wallet (MetaMask + zk proofs)

**Implementation**:

- Owner generates ZKP attesting to ownership + delegation scope
- Agent presents proof to `/api/access` or dedicated endpoint
- Verifier contract/smart contract or off-chain verifier checks proof

**Merits**:

- Strong privacy: Agent learns only necessary attributes
- Compliance-friendly (POPIA/GDPR minimal disclosure)
- Future-proofs for decentralized identity (DID)

**Challenges**:

- UX complexity (wallet + proof generation)
- Computation cost → Use efficient circuits + server-side proof generation where possible
- Adoption curve

**Recommendation**: Prototype simple ZK ownership proof in Phase 112. Full integration later.

---

## Threat Model & Risk Mitigation (Extension of Phase 110)

**Additional Risks for Delegation**:

- **Consent Forgery**: Mitigated by owner-signed grants + 2FA/passkey on creation
- **Data Leakage**: Strict projection + RLS + audit on every read
- **Agent Overreach**: Granular scopes + resident revocation + activity monitoring
- **Platform Abuse**: Immutable logs + dual-control for platform admins
- **AI Agent Risks**: Sandboxed scopes, human-in-loop for sensitive actions, full audit

**Governance**:

- Tenant-level delegation policy (max duration, allowed scopes)
- Annual access reviews
- Resident notification on new delegations
- Dispute resolution workflow (merits + behavior records)

---

## Open Questions for Discussion

1. Should blockchain delegation be mandatory for Enterprise tier or purely optional?
2. Prioritize ZKP for which flows first (ownership proof vs full selective disclosure)?
3. How should commission/fee models integrate (platform cut + agent %)?
4. Resident opt-out rights: Can a resident block agent contact even if owner delegated?
5. AI agent authentication: JWT + scope claims vs wallet-based?

---

## Next Steps

- Finalize ADR-020 after feedback
- Implement core app-layer delegation in Phase 111
- Spike ZKP proof generation
- Update TIER_MODEL and FEATURE_REGISTRY

**Feedback Welcome** — especially from legal/compliance on privacy and smart contract aspects.

---

_This discussion feeds into formal ADR and implementation plans._
