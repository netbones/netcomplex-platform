---
title: ADVISORY-034: Introduce a Platform Identity Layer (Decouple Identity from Authentication and Tenant Membership)
status: current
reviewed: 2026-07-28
tags: [advisory, architecture]
audience: developer
---

# ADVISORY-034: Introduce a Platform Identity Layer (Decouple Identity from Authentication and Tenant Membership)

**Status:** Proposed
**Priority:** High (Architectural)
**Related Phases:** Phase 09 (Real-time Chat), Phase 28 (Proxy Consolidation), Phase 34 (Admin Layer), Phase 46 (Provider Platform), Phase 46.2 (Address Registry), Phase 47 (dWallet), Phase 111 (Agent Gateway / Delegation)
**Related ADRs:** ADR-002 (Better Auth), ADR-003 (Dual ORM), ADR-019 (RLS on sensitive tables), ADR-020 (server.ts sub-barrels)
**Related Advisories:** ADVISORY-029/030 (tenant provisioning, `tenantId: null` as valid durable state), ADVISORY-032 (tenant resolution / RLS fail-open defect)
**Source discussion:** `CREDENTIALS_DISCUSSION.md`

## READ IN CONJUNCTION WITH: [SUPPLEMENTAL](./ADVISORY-034-SUPPLEMENTAL-1.md)

---

## 1. Problem Statement

Netcomplex's `user` model currently conflates five distinct concepts into a single row and a single `tenantId`:

1. **Authentication identity** — the thing Better Auth authenticates (email/password, passkey)
2. **Platform identity** — "this is the same human across time"
3. **Tenant membership** — residency/employment in a specific community
4. **Seat/capability** — what the person is allowed to hold (Standard/Solo/Premium seat, provider, agent)
5. **RBAC role** — what the person can do inside a tenant

This conflation is not yet causing a production incident, but it actively blocks or complicates four items already on Netcomplex's roadmap:

- **Providers serving multiple tenants** (`ServiceProvider.tenantId` is a required, non-nullable single-tenant scope — a plumber working two HOAs needs two `ServiceProvider` rows and, in practice, two `user` rows, since `user.email` is globally unique)
- **Agents representing multiple tenants** (`AgentAccess` is tenant + property scoped via `Property.tenantId`, but `agentId` references a single tenant-homed `user`)
- **dWallet portability** (`DWallet` is `@@unique([tenantId, userId])` — a resident who moves communities does not carry wallet history with them; ADVISORY-034/discussion's stated goal of "wallet survives tenant change" is currently schema-incompatible)
- **Future credential types** (Nostr, Lightning/LNURL-auth, OIDC) — there is no `Credential` abstraction to attach these to; they would have to be bolted onto `user` as nullable columns, one per provider, which does not scale and pollutes the sensitive-table surface already under RLS scrutiny (ADR-019)

The discussion in `CREDENTIALS_DISCUSSION.md` correctly identifies the shape of the fix (Identity → Membership → Capability → RBAC) but was not written in NetComplex's canonical advisory format, does not perform source verification against the actual schema, and does not sequence against currently-open blocking work (ADVISORY-032). This advisory reframes that discussion into an actionable, gated plan.

---

## 2. Root Cause Analysis

Verified against `prisma/schema.prisma` and `tenant.prisma` (not assumed from the discussion):

| Finding                                                                                                                                                      | Evidence                                                                                                                                          | Consequence                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user.email` is globally unique across the platform (`email String @unique`)                                                                                 | `schema.prisma` model `user`                                                                                                                      | A single human already cannot hold two `user` rows under two emails-per-tenant; the platform silently relies on "one email = one person" but has no `Identity` concept to make that explicit or extend beyond email                                                                                                                                                           |
| `user.tenantId` is a single nullable field, but seat models carry their own independent `tenantId`                                                           | `StandardSeat`, `SoloSeat`, `PremiumSeat` each have their own `tenantId` + `userId`, with no cross-model constraint tying them to `user.tenantId` | The schema **already structurally permits** one `user` row to hold seats across multiple tenants — this is undocumented and untested, not a designed feature. Session/RLS context (`getRLSContext()`, ADR-019) assumes a single resolved tenant per request and likely a single "home" `tenantId` per user, so this latent multi-tenancy is probably unsafe today, not usable |
| `ServiceProvider` is tenant-scoped and required (`tenantId String` non-nullable)                                                                             | `schema.prisma` model `ServiceProvider`                                                                                                           | A provider cannot legitimately serve two tenants without either (a) two `user` rows (blocked by unique email) or (b) two `ServiceProvider` rows pointing at the same `userId` in different tenants (currently possible schema-wise but not what any UI/API models today)                                                                                                      |
| `AgentAccess` and `DelegationAction` are tenant-scoped via `Property.tenantId`, agent identity is a plain `user`                                             | `schema.prisma` model `AgentAccess`                                                                                                               | Same duplication risk as providers for multi-tenant agents (already flagged as an open gate in Phase 111 / agent gateway work)                                                                                                                                                                                                                                                |
| `DWallet` is `@@unique([tenantId, userId])`                                                                                                                  | `schema.prisma` model `DWallet`                                                                                                                   | Wallet balance/history does not follow a resident across a tenant move; this directly contradicts the stated dWallet portability goal                                                                                                                                                                                                                                         |
| No `Identity` or `Credential` model exists anywhere in the schema                                                                                            | Full-text review of `schema.prisma` / `tenant.prisma`                                                                                             | Nostr/Lightning/OIDC support has no landing zone; the only precedent (`account`, `passkey`, `twoFactor`) is entirely Better Auth-owned and tenant-nullable already, which is actually a decent existing foundation to build on rather than replace                                                                                                                            |
| ADVISORY-032 (open) documents that tenant resolution and RLS enforcement have live defects (`middleware.ts` header-forwarding bug; `runWithRLS()` fail-open) | Memory / ADVISORY-032                                                                                                                             | Any architecture change that widens the meaning of "user" relative to "tenant" **increases the blast radius** of an already-confirmed cross-tenant leakage class of bug. This is a sequencing dependency, not just a related item                                                                                                                                             |

**Root cause, stated simply:** `user` is doing the job of `Identity + Credential + Membership + Capability` simultaneously because no separate `Identity`/`Credential` entities were ever introduced. This was a reasonable simplification for a single-tenant HOA MVP and is now the limiting factor for provider/agent multi-tenancy, dWallet portability, and any non-Better-Auth-native credential type.

---

## 3. Options

| #   | Option                                                                                                                                                  | Description                                                                                                                                                                                                   | Pros                                                                                                                                                                                                             | Cons                                                                                                                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Do nothing**                                                                                                                                          | Keep `user` as the sole identity/membership/capability record                                                                                                                                                 | No migration risk, no schema churn                                                                                                                                                                               | Blocks provider/agent multi-tenancy and dWallet portability roadmap items indefinitely; future credential types require repeated one-off schema patches                                                                                                                                                     |
| 2   | **Replace Better Auth with Nostr/crypto-native auth**                                                                                                   | Make the keypair the primary identifier platform-wide                                                                                                                                                         | Removes password/email dependency entirely                                                                                                                                                                       | Rejected outright — throws away ADR-002's rationale (TypeScript-first, plugin ecosystem, session/CSRF handling), breaks every existing session and RLS assumption, and conflates authentication with identity in the opposite direction from the actual goal                                                |
| 3   | **Bolt credential columns onto `user`** (e.g. `nostrPublicKey String?`, `lightningAddress String?`)                                                     | Minimal-diff approach                                                                                                                                                                                         | Fastest to ship for a single credential type                                                                                                                                                                     | Does not scale past 2 credential types, adds nullable columns to a table already under RLS (ADR-019 sensitive-table scope), no `revokedAt`/`lastUsedAt` lifecycle per credential, blocks the actual goal (multi-tenant identity) entirely — this only solves "add Nostr login," not the stated root problem |
| 4   | **Introduce `Identity` + `Credential` entities beneath Better Auth, leave `user` as a tenant-scoped profile, leave RBAC/seats untouched** (recommended) | Adds a new identity layer; `user` becomes 1:1 (or eventually many:1) with `Identity`; `Credential` holds email/passkey/nostr/lnurl/oidc records; Better Auth continues to own sessions/cookies/CSRF unchanged | Directly targets provider/agent/dWallet portability; extensible to future credential types without further schema migrations; Better Auth stack (ADR-002) is untouched; incremental, gated, reversible per phase | Requires new RLS policy work (extends ADR-019 scope), requires careful Better Auth adapter compatibility testing, is a multi-phase effort that must be sequenced against ADVISORY-032                                                                                                                       |

**Recommendation: Option 4**, phased, with Gate G2 requiring ADVISORY-032 resolution (or an explicit accepted-risk sign-off) before Phase 2 begins.

---

## 4. Architecture: Before / After

### Before (current, verified against schema)

```
Credential (implicit, embedded in `user` + Better Auth tables)
  email / password / passkey ──► account / session / passkey / twoFactor
                                        │
                                        ▼
                                      user  ── tenantId (nullable, singular)
                                        │       role (Role enum, tenant RBAC)
                                        ├──► StandardSeat (own tenantId)
                                        ├──► SoloSeat (own tenantId)
                                        ├──► PremiumSeat (own tenantId)
                                        ├──► ServiceProvider (own tenantId, required)
                                        ├──► AgentAccess (via Property.tenantId)
                                        └──► DWallet (@@unique [tenantId, userId])
```

Everything downstream of `user` is nominally tenant-scoped, but nothing prevents (or supports) the same `user.id` from being reused across tenants except the global `email` uniqueness constraint, which was never designed as an identity mechanism.

### After (Phase 1–3 target state)

```
Credential                              Identity
─────────────                           ──────────
id                                      id (UUID/cuid)
identityId ──────────────────────────►  createdAt
type: EMAIL | PASSKEY | NOSTR | LNURL   updatedAt
       | OIDC
publicKey?
fingerprint?
metadata?
revokedAt?
lastUsedAt?                                   │
                                               ▼
                                             user  (becomes a per-tenant PROFILE,
                                                     not the identity root)
                                               │  identityId (new FK, required)
                                               │  tenantId (unchanged, nullable)
                                               │  role (unchanged, tenant RBAC)
                                               ├──► StandardSeat / SoloSeat / PremiumSeat (unchanged)
                                               ├──► ServiceProvider (unchanged, still tenant-scoped —
                                               │      multi-tenant providers get one `user` row per
                                               │      tenant, all sharing one `identityId`)
                                               └──► AgentAccess (unchanged)

DWallet migrates from @@unique([tenantId, userId]) to keying off identityId
(separate, sequenced migration — Phase 3+, not in initial scope)
```

Better Auth's `account`, `session`, `passkey`, `twoFactor` tables are **untouched**. They continue to authenticate a `user` row exactly as today. The new layer sits logically _above_ `user` (as the thing that ties multiple `user` rows — one per tenant — back to one human) rather than replacing anything Better Auth owns.

This is a deliberate divergence from the discussion's original diagram (which put `Identity` directly above `Credential` and treated `User` as a pure "profile" child of `Identity` with no tenant scope of its own). NetComplex's actual schema already tenant-scopes `user` via seats and RBAC in ways that are load-bearing across ~150 REST routes and the tRPC routers (ADR-021). Keeping `user` as the tenant-scoped join point and adding `identityId` as a new FK is a materially smaller, safer diff than promoting `user` to a global profile and re-scoping RBAC.

---

## 5. Pre-Execution Discovery Checklist

To be run and results reviewed **before any schema change**, per standing practice (Phase 0 discovery precedes code).

```bash
# 1. Confirm there is no existing code path that already assumes one user row = one tenant, forever
grep -rn "user.tenantId" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__" | wc -l
grep -rln "getRLSContext" src/shared/api/

# 2. Confirm whether any user row currently has seats in more than one tenant (latent multi-tenancy check)
```

```sql
-- Run against a read replica / non-prod snapshot only
SELECT "userId", COUNT(DISTINCT "tenantId") AS tenant_count
FROM (
  SELECT "userId", "tenantId" FROM "StandardSeat"
  UNION ALL
  SELECT "userId", "tenantId" FROM "SoloSeat"
  UNION ALL
  SELECT "userId", "tenantId" FROM "PremiumSeat"
) seats
GROUP BY "userId"
HAVING COUNT(DISTINCT "tenantId") > 1;
```

```sql
-- Confirm ServiceProvider duplication pattern for the same human (matched by user.email) across tenants
SELECT u.email, COUNT(DISTINCT sp."tenantId") AS provider_tenant_count
FROM "ServiceProvider" sp
JOIN "user" u ON u.id = sp."userId"
GROUP BY u.email
HAVING COUNT(DISTINCT sp."tenantId") > 1;
```

```bash
# 3. Inventory every place that reads user.id and assumes it is globally unique per human
#    (this becomes identityId's job going forward)
grep -rln "prisma.user.findUnique" src/ --include="*.ts"
grep -rln "better-auth" src/shared/api/auth.ts

# 4. Confirm Better Auth's Prisma adapter does not hardcode assumptions about the `user` table
#    shape that would break if a new required FK (identityId) were added
cat node_modules/better-auth/package.json | grep '"version"'
grep -rn "prismaAdapter" src/shared/api/auth.ts
```

```sql
-- Confirm current DWallet uniqueness scope, to size the Phase 3 migration separately
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = '"DWallet"'::regclass;
```

**Discovery deliverable:** a short findings note (not a full advisory) confirming:

- Whether any `userId` already spans multiple tenants (expected: none, but must be verified — if any exist, they are either test-data artifacts or an undocumented feature that changes this advisory's risk profile)
- Whether any provider/agent human is already duplicated across `user` rows under near-identical emails (would confirm the workaround is already happening informally)
- Better Auth adapter version and whether it tolerates an additional required FK on `user` without a coordinated migration

---

## 6. Phased Execution Plan

Each phase ends at a named decision gate. No phase begins execution without DavDev sign-off at the preceding gate, per standard gate-controlled execution.

### Phase 0 — Discovery (prerequisite, this advisory)

- Run the checklist in §5
- Produce findings note
- **Gate: G0**

### Phase 1 — Introduce `Identity` and `Credential` entities (additive only)

- Add `Identity` model (`id`, `createdAt`, `updatedAt`)
- Add `Credential` model (`id`, `identityId`, `type`, `publicKey?`, `fingerprint?`, `metadata?`, `revokedAt?`, `lastUsedAt?`)
- Add `CredentialType` enum: `EMAIL | PASSKEY | NOSTR | LNURL | OIDC`
- **No changes to `user`, Better Auth tables, or any existing route.** This phase is purely additive and should ship with zero behavior change.
- **Gate: G1** — confirm `CredentialType` enum is the right shape given the open `NotificationType` enum-extension precedent already flagged on the horizon (avoid repeating that unresolved pattern here)

### Phase 2 — Backfill: link existing `user` rows to `Identity`

- Add `user.identityId` (nullable initially, then required after backfill)
- Migration script: one `Identity` per distinct `user.email` (or per `user.id` if the discovery step in §5 shows no cross-tenant duplication to reconcile)
- One `Credential` row of type `EMAIL` created per existing `user`
- **This phase directly touches the sensitive-table set from ADR-019.** RLS policies on `user` must be reviewed for whether `identityId` needs its own policy or inherits `user`'s existing tenant-isolation policy.
- **Gate: G2 — hard dependency:** ADVISORY-032 (tenant resolution / RLS fail-open) must either be resolved or explicitly risk-accepted by DavDev before this phase executes, since Phase 2 changes what "the same person" means across the exact tenant-boundary code paths ADVISORY-032 found leaking

### Phase 3 — Multi-tenant support for providers and agents

- Allow one `Identity` to back multiple `user` rows (one per tenant), each with its own `ServiceProvider`/`AgentAccess`
- No change to `ServiceProvider`/`AgentAccess` schema required — they already correctly scope to `user`/tenant; this phase is about _provisioning workflow_ (invite an existing `Identity` into a new tenant rather than requiring a new email)
- **Gate: G3**

### Phase 4 — `DWallet` portability

- Migrate `DWallet` from `@@unique([tenantId, userId])` toward `identityId`-keyed balance continuity, with tenant-scoped transaction history preserved for audit (POPIA five-year retention still applies per standing principle)
- This is the highest-risk, financial-data-adjacent phase and should be its own advisory + migration plan, not folded into this one
- **Gate: G4 — separate advisory required before execution** (data-loss-adjacent decision, DavDev sign-off mandatory per standing working model)

### Phase 5 (future, out of scope for this advisory) — Additional credential types

- Nostr challenge/response login
- LNURL-auth
- OIDC
- Each ships as an additive `Credential` type once Phase 1–3 are stable; no schema changes needed beyond the `CredentialType` enum

---

## 7. Risk Register

| Risk                                                                                                            | Likelihood                                                                       | Impact   | Mitigation                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Better Auth's Prisma adapter breaks or silently ignores a new required FK on `user`                             | Medium                                                                           | High     | Verify in Phase 0 discovery (§5, item 4); add `identityId` as nullable first, backfill, then tighten to required only after adapter compatibility is confirmed in a non-prod environment                                         |
| Identity backfill collides with undocumented latent multi-tenant seat usage                                     | Low (per current schema review, but unverified)                                  | High     | Discovery query in §5 must return zero rows before Phase 2 proceeds; if non-zero, this advisory must be revised before continuing                                                                                                |
| Widening "user" semantics increases the blast radius of the ADVISORY-032 tenant-resolution/RLS defect           | Medium                                                                           | Critical | Hard gate (G2) blocking Phase 2 on ADVISORY-032 resolution or explicit DavDev risk acceptance                                                                                                                                    |
| New sensitive table (`Identity`/`Credential`) falls outside current RLS scope (ADR-019 covers 6+9 named tables) | High (by default, until addressed)                                               | High     | Phase 2 must include an RLS policy addendum to ADR-019, not a silent gap; unit-test public DTO allowlists per standing principle to ensure `Credential.publicKey`/`metadata` are never exposed on cross-tenant read surfaces     |
| `DWallet` migration (Phase 4) touches financial ledger data under five-year audit retention requirements        | Low probability of data loss if gated correctly, but high severity if mishandled | Critical | Explicit separate advisory + G4 gate; no execution without dedicated migration plan and DavDev sign-off; this is a data-loss-adjacent decision per standing working model and must not be bundled into this advisory's execution |
| Scope creep: treating this as a 6-phase "big bang" identity rewrite instead of an incremental, reversible layer | Medium                                                                           | Medium   | Phases 1–3 are additive-only and independently shippable; Phase 4+ requires new advisories                                                                                                                                       |

---

## 8. Done Criteria

- [ ] ⏳ `Identity` and `Credential` models exist in `prisma/schema.prisma`, Drizzle schema regenerated (`npx prisma generate`)
- [ ] ⏳ Every existing `user` row has exactly one `Identity` and one `EMAIL`-type `Credential`, verified by a reconciliation script (row counts must match)
- [ ] ⏳ Better Auth login/session/CSRF flows pass existing e2e suite (`auth-flow.spec.ts`) unchanged
- [ ] ⏳ RLS policy addendum to ADR-019 covers `Identity` and `Credential` tables explicitly, with `WITH CHECK` clauses and idempotent policy creation (per the fixes already applied in the 2026-06-04 ADR-019 update)
- [ ] ⏳ Public DTO allowlist unit test confirms `Credential.publicKey`, `Credential.metadata`, `Credential.fingerprint` are never serialized on any cross-tenant read surface
- [ ] ⏳ No existing route, tRPC procedure, or widget references `user.id` as a proxy for "global human identity" without going through `identityId` where that distinction matters (providers, agents, dWallet)
- [ ] ⏳ Discovery findings note (§5) attached to this advisory before Phase 2 begins execution

---

## 9. Decision Gates

| Gate   | Question for DavDev                                                                                                                                                                                                                                               | Blocks        |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| **G0** | Confirm advisory number against the external register (this document is provisionally `ADVISORY-034`); confirm scope for this execution cycle — Phases 1–3 only, or full 6-phase vision now?                                                                      | All execution |
| **G1** | Is the `CredentialType` enum (`EMAIL \| PASSKEY \| NOSTR \| LNURL \| OIDC`) final for Phase 1, or should it be a lookup table instead of a Prisma enum (mirroring the still-open `NotificationType` enum-vs-lookup-table tension already flagged on the horizon)? | Phase 1       |
| **G2** | Must ADVISORY-032 (tenant resolution / RLS fail-open) be fully resolved before Phase 2 backfill runs, or does DavDev explicitly accept the residual risk of widening user-identity semantics while that defect is open?                                           | Phase 2       |
| **G3** | Confirm the provider/agent multi-tenant provisioning workflow (invite existing `Identity` into a second tenant) is the correct UX target for Phase 3, versus deferring until Phase 111 (agent gateway) lands                                                      | Phase 3       |
| **G4** | Confirm `DWallet` portability (Phase 4) is deferred to its own dedicated advisory with a separate migration plan, given its data-loss-adjacent, financial-ledger-audit-retention profile                                                                          | Phase 4       |
