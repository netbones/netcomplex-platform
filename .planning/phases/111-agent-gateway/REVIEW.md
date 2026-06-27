Good — I've read all four plans plus the context and discussion log. Let me give you a structured review.

---

## Phase 111 Plan Review

**Overall assessment: Well-structured and coherent.** The wave sequencing is correct, the threat models are thorough, and the decisions from the discussion log are cleanly encoded. There are several issues worth flagging before execution.

---

### Issues Requiring Attention

**1. Plan 01: Schema — `AgentToken.agentId` relation naming collision (Medium)**

The plan adds two relations on `user` for `AgentToken` — `agentToken_agentIdTouser` and `agentToken_issuedByIdTouser`. Prisma will generate these relation names automatically based on the FK field names and the existing pattern in your schema (you already have `agentAccess_agentIdTouser`). You'll need to explicitly declare the `AgentToken` back-relations on the `user` model, otherwise `prisma generate` will fail with ambiguous relation errors. The plan doesn't add these to the `user` model. **Agent must add both back-relation fields to `model user` or Prisma will reject the schema.**

**2. Plan 01: `DelegationAction.delegationId` is a soft FK, not a hard FK (Low — deliberate or gap?)**

`DelegationAction` stores `delegationId` as a `String` with no `@relation` back to `AgentAccess`. This is consistent with an append-only audit log where you don't want CASCADE deletes destroying history — but it means no referential integrity at the DB level. This is probably intentional (same pattern as other audit tables), but the plan doesn't call it out explicitly. The agent should be aware: there's no `@@index([delegationId])` in the plan's schema either, which would hurt query performance on the audit log endpoint in Plan 04.

**Recommendation:** Add `@@index([delegationId])` and `@@index([tenantId])` to `DelegationAction`.

**3. Plan 02: `property.name` and `property.address` don't exist in schema (High)**

Plan 02's `GET /api/delegations` includes:

```typescript
property: { select: { id: true, name: true, address: true } }
```

Looking at `prisma/schema.prisma`, `Property` has `street` and `unit`, not `name` or `address`. This will cause a runtime Drizzle/Prisma error. The response formatting also references `d.property?.name` and `d.property?.address`.

**Fix:** Change the select to `{ id: true, street: true, unit: true }` and update the formatter to `propertyAddress: d.property ? \`${d.property.street} ${d.property.unit}\` : null`, and drop `propertyName` (there's no name field).

**4. Plan 02: Self-delegation check missing in accept path (Low)**

Plan 01's delegation endpoint blocks self-delegation (`providerId !== session.user.id`), but the accept endpoint in Plan 02 doesn't need to re-check this since the delegation is already created — however, there's no guard against an owner accepting their own delegation if they hold a provider profile. Probably not a real attack vector given the creation guard, but worth noting.

**5. Plan 03: `resolvePageAccess` async migration scope is underspecified (Medium)**

Plan 03 mentions migrating all 16 existing tests to use `await` because `resolvePageAccess` is becoming async. This is a Phase 110 artifact being mutated in Phase 111. The plan doesn't specify whether `resolvePageAccess` itself becomes `async` or whether `resolveAgentScope` is called independently. If `resolvePageAccess` becomes async, every callsite in the codebase (not just tests) needs updating — the plan only covers the test file. **Decision gate: does `resolvePageAccess` become async? If so, the scope of impact needs a pre-execution grep.**

**Recommendation:** Add a discovery step: `grep -rn "resolvePageAccess" src/ | grep -v test | grep -v ".md"` before execution.

**6. Plan 03: `platformSuspension` relation name (Low-Medium)**

The suspension check in `resolveAgentScope` references:

```typescript
platformSuspension_user_suspension_userIdTouser;
```

Looking at the schema, the relation on `user` is `platformSuspension` (via `PlatformSuspension`). The generated Drizzle/Prisma relation name depends on the exact schema definition. If Prisma named it differently, this will fail at runtime silently (returning an empty array, not an error). **Agent should grep the generated Drizzle schema for the actual relation name before using it.**

**7. Plan 04: `PATCH /api/delegations/[id]/block` route is referenced but not planned (High)**

Plan 04's `DelegationWidget` calls `PATCH /api/delegations/[id]/block` and `useBlockDelegation` hits this endpoint. Plan 04 also references a `GET /api/delegations/[id]/audit` endpoint for `useDelegationAudit`. **Neither route is defined in Plan 02 (which only builds create/accept/reject/revoke/list).** These two routes need to be created as part of Plan 04's tasks or added to Plan 02.

Looking at Plan 04's file list, the routes aren't in `files_modified`. This is a gap — the widget will 404 on both endpoints.

**8. Plan 04: Widget location in FSD (Low)**

`src/widgets/delegation/` is a new FSD slice at the widget layer. Per FSD rules, widgets cannot import from other widgets, and features import from entities. The `DelegationWidget` imports from `@entities/delegation` — correct. However, the widget barrel also needs to be registered in the widget registry (`widgets.ts`) if it's going to be used on the dashboard. The plan doesn't include a registry entry or specify where the widget surfaces (which Space/dashboard). This should be called out as a follow-up decision or resolved explicitly.

---

### Minor Issues

- **Plan 01:** `db.agentToken` — agent will need to regenerate the Drizzle schema (`prisma generate`) before using Drizzle queries. The plan mentions this implicitly but doesn't list it as an explicit step.
- **Plan 02:** The `expiresAt` default (30 days from now) is hardcoded in the route. Tenant-level configurable defaults were deferred (D-21) but this implicit default should be documented in a comment.
- **Plan 03:** The `intersectScopeWithFlags` helper and `delegationScopeToAgentScope` helper are referenced in `resolveAgentScope` but their implementation is in the truncated section. Ensure the agent reads the full plan before executing.

---

### Things That Are Well Done

- **Wave sequencing is correct** — 01 → 02 (delegation API) and 01 → 03 (scope resolution) can run in parallel; 04 depends on both 02 and 03. Clean dependency graph.
- **Threat models are unusually thorough** — STRIDE analysis is present in all four plans with concrete mitigations.
- **Token security model is solid** — hash-only storage, single-reveal on creation, immediate revocation cascade to linked tokens.
- **D-07a resident opt-out** is correctly scoped as a per-tenant policy with a universal mechanism, avoiding over-engineering.
- **Deferred items are well-tracked** — blockchain, ZKP, commission rates all cleanly deferred with target phase labels.
- **`autonomous: false`** on Plans 02–04 is correct given the cross-cutting nature of the changes.

---

### Summary for Agent Handoff

Before execution, I'd resolve these in priority order:

1. **[High] Add `property.street`/`unit` fix to Plan 02** — the `name`/`address` fields don't exist.
2. **[High] Add block and audit routes to Plan 04** — or extend Plan 02 — since Plan 04's widget depends on them.
3. **[Medium] Add back-relations to `user` model** for `AgentToken` in Plan 01's schema task.
4. **[Medium] Add discovery grep** for `resolvePageAccess` callsites before Plan 03 execution.
5. **[Low] Add `@@index([delegationId, tenantId])` to `DelegationAction`** in Plan 01.

# POST-REVIEW DISCUSSION

Q: Lets discuss the token security model, its currently JWT, we need to future proof for eventual shift towards Web3 and smart contracts etc, are we on the right track?

Good question. Let me think through this carefully rather than just validating the current approach.

## Current Model: What You Have

Plan 01 uses HS256 JWTs signed with `BETTER_AUTH_SECRET`, stored as a sha256 hash in `AgentToken.tokenHash`. The token travels in `X-Agent-Token` header, validated server-side on every request.

This is a **solid app-layer foundation** but it has a specific characteristic that matters for your Web3 trajectory: **the platform is the sole trust authority**. Anthropic signs, Anthropic verifies, Anthropic revokes. The agent never holds a cryptographic credential that proves anything independently.

---

## The Web3 Shift — What Changes

When you move toward smart contracts and delegation NFTs (Phase 113+), the trust model inverts:

**JWT model (current):** Trust is delegated by the platform. "We say this agent has these permissions."

**Web3 model (target):** Trust is self-sovereign. "The chain says this delegation exists and is unrevoked — anyone can verify this independently."

The gap between these isn't just protocol — it's **who controls the signing keys** and **where revocation is enforced**.

---

## Where the Current Model Creates Friction

**1. Secret is platform-owned, not agent-owned**

`BETTER_AUTH_SECRET` is your secret. A Web3 delegation NFT or smart contract grant would be signed by the _property owner's wallet_ — a key you don't control and shouldn't. The JWT model can't represent "the owner cryptographically attested to this delegation" — it can only represent "the platform recorded that the owner clicked a button."

This matters for legal weight (admissibility of delegation proof) and for cross-platform interoperability.

**2. Revocation is app-layer only**

Your current revocation sets `revokedAt` in Postgres. Clean and fast. But a smart contract delegation NFT is revoked by burning it on-chain — and that burn is the canonical truth. If you later want on-chain revocation, you'd need to either replace the JWT system or run both in parallel, which creates a split-truth problem.

**3. Scope is opaque to the chain**

The `scope: Json` field in `AgentToken` is readable by your server and nothing else. A smart contract that needs to enforce "this agent can only access CONTACT_OCCUPANTS" can't read your Postgres jsonb. Scope would need to be encoded on-chain in a verifiable way.

---

## What "Future-Proofing" Actually Looks Like

The key insight is that you don't need to pick one model — you need a **credential abstraction layer** that can swap the underlying credential type without changing the resolution pipeline.

Your Plan 03 `resolveAgentScope()` is the right place for this abstraction. Right now it has one path: JWT. You want it to eventually have two paths:

```
rawCredential
  → detect type (JWT vs wallet signature vs on-chain proof)
  → validate via appropriate verifier
  → resolve to EffectiveScope
  → return (same shape either way)
```

The Plans 02-04 delegation workflow, the `DelegationWidget`, and the `canAccess()` extension are all downstream of `EffectiveScope` — they don't care how the credential was verified. That's good architecture.

---

## Concrete Recommendation

Rather than changing the JWT implementation now, make **one structural change** in Plan 01:

**Add a `credentialType` field to `AgentToken`:**

```prisma
model AgentToken {
  ...
  credentialType  String  @default("jwt_hs256")
  credentialMeta  Json?   // future: wallet address, chain ID, contract address
  ...
}
```

And in `src/shared/lib/agent-token.ts`, introduce a verifier interface rather than a single `validateToken` function:

```typescript
interface CredentialVerifier {
  verify(rawCredential: string): Promise<ValidationResult | null>
}

// Current implementation
const jwtVerifier: CredentialVerifier = { ... }

// Future
const walletVerifier: CredentialVerifier = { ... }
const onChainVerifier: CredentialVerifier = { ... }
```

`resolveAgentScope` calls `selectVerifier(credentialType).verify(rawCredential)` — everything else is unchanged.

This is a small change in Phase 111 that avoids a breaking refactor in Phase 112/113.

---

## On the HS256 Choice Specifically

One thing worth flagging: HS256 uses a shared secret. If you ever issue tokens to external AI agents that run outside your infrastructure (which the discussion log implies is the direction), HS256 is the wrong algorithm. The agent could theoretically sign its own tokens if it learned the secret.

**RS256 or ES256** (asymmetric) would be safer even before Web3 — your server holds the private key, agents can verify with the public key, no secret exposure. The migration from HS256 to ES256 is non-trivial once tokens are in the wild, so it's worth deciding now.

For Web3 specifically, **ES256K** (secp256k1) is the Ethereum curve — a credential signed with ES256K by an owner's wallet is natively verifiable by Ethereum smart contracts. That's the natural bridge between your current JWT system and on-chain verification.

---

## Bottom Line

You're on the right track architecturally — the `resolveAgentScope` abstraction point is exactly where credential verification should live. Two changes would make Phase 111 genuinely future-proof rather than just working:

1. **Switch HS256 → ES256 now** (or at minimum document HS256 as a known migration target)
2. **Add `credentialType` + verifier interface abstraction** so Phase 113 is "add a new verifier" not "rewrite the pipeline"

Neither requires significant rework of Plans 02-04. They're both contained in Plan 01's `agent-token.ts` and the schema. Want me to draft the specific changes to Plan 01 that encode this?
