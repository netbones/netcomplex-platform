---
phase: 126-identity-credential-layer
type: execute
status: ready_for_execution
created: 2026-07-25
milestone: M5+ Post-Launch
source:
  - docs/advisories/ADVISORY-034-platform-identity-layer.md
  - docs/advisories/ADVISORY-034-SUPPLEMENTAL-1.md
depends_on:
  - Phase 125-complete (MeetingProxy in production as of c93c976c)
  - ADVISORY-032-resolution (Gate G2, deferred to plan 126-03)
---

# Phase 126: Platform Identity Layer + MeetingProxy Remediation

## Goal

Introduce the additive `Identity` + `Credential` entity layer that decouples
"this is the same human" from "this is a per-tenant profile" (ADVISORY-034 Phase
0–1). Simultaneously remediate two defects introduced with the `MeetingProxy`
schema in Phase 125 (ADVISORY-034-SUPPLEMENTAL-1 Gate S1): `SignatureProvider`
overlap with `CredentialType` and missing `deletedAt` on a governance audit
record.

## What This Phase Does (ADVISORY-034 Phase 0 + Phase 1 + Supplemental Gate S1)

1. **Add `Identity` model** (id, createdAt, updatedAt) — additive, zero behavior change
2. **Add `Credential` model** (identityId, type, publicKey?, fingerprint?, metadata?, revokedAt?, lastUsedAt?)
3. **Add `CredentialType` enum:** `EMAIL | PASSKEY | NOSTR | LNURL | OIDC`
4. **Narrow `SignatureProvider`** from 8 values → 5 (drop PASSKEY, NOSTR, LIGHTNING), keeping INTERNAL | DOCUSIGN | ADOBE_SIGN | PGP | GOV_EID
5. **Add `credentialId String?`** on `MeetingProxy` (nullable FK → Credential), populated when `signatureProvider = INTERNAL` and traceable to the platform credential row that authenticated the session
6. **Add `deletedAt DateTime?`** on `MeetingProxy` — soft-delete parity with ~66 tables already carrying it; governance/consent record = five-year audit minimum
7. **Pre-execution discovery** (§5 checklist in ADVISORY-034) to confirm no latent cross-tenant violations before Phase 2 backfill

### What Remains Out of Scope (gated)

- **ADVISORY-034 Phase 2** — backfill `user.identityId`, RLS addendum, is gated on ADVISORY-032 resolution (G2). This is a separate plan in _this_ phase (126-03), not deferred to a future phase.
- **ADVISORY-034 Phase 3+4** — multi-tenant providers/agents, DWallet portability — stay deferred behind their original gates (G3, G4) per the advisory. Dropping `DWallet` portability from immediate scope avoids the data-loss-adjacent financial ledger work.
- **Open-supplemental questions Q2 (GOV_EID scope), Q4 (enum-vs-lookup-table general pattern)** — filed as BD follow-up issues. They neither block schema creation nor migration.

## Why Remediation, Not Prevention

**Phase 125 is complete** (9/9 plans, nyquist_compliant, STATUS = ✅ Complete).
The `MeetingProxy` table with its 8-value `SignatureProvider`, `signatureEvidence
Json @default("{}")`, and no `deletedAt` **is already applied in production**
(commit `c93c976c`). The supplemental's "before push" framing is thus stale.

There are currently **zero production rows** in `meeting_proxies` (proxy voting
has no UI yet). This narrows the remediation risk dramatically: we are narrowing
an enum and adding columns on an _empty_ table, not rewriting live data. Once
rows arrive, `SignatureProvider` change becomes breaking, `deletedAt` absence
becomes a soft-delete gap, and `credentialId` absence freezes into a JSONB-only
evidentiary model. Doing it now lets us bring the schema into alignment before
any data is written.

## Phase Breakdown

### 126-01 — Additive Identity/Credential to schema + pre-execution discovery

- Add `Identity` model (id, createdAt, updatedAt)
- Add `Credential` model (id, identityId, type, email?, publicKey?, fingerprint?, metadata?, revokedAt?, lastUsedAt?)
- Add `CredentialType` enum: `EMAIL | PASSKEY | NOSTR | LNURL | OIDC`
- Apply migration. This is additive-only: zero behavior change, no new RLS, no existing code paths affected.
- Run the §5 discovery checklist from ADVISORY-034 (latent multi-tenancy check, Better Auth adapter check, plan RLS plan)
- Gate: G0 (confirm advisory # now resolved — suppress 034 → produce finding from discovery) + G1 (confirm CredentialType enum now final, given this phase tightens it to `LNURL` and adds `email`, `metadata?`, `public?`)

### 126-02 — MeetingProxy remediation: narrow SignatureProvider, add credentialId, add deletedAt, align drizzle

- Drop `PASSKEY`, `NOSTR`, `LIGHTNING` from `SignatureProvider` enum → 5 values  
  Enum values on each `meetingProxies` row remain valid (table is empty; no unique constraint on `signatureProvider` other than `@default(INTERNAL)` — if any rows exist, this requires an ALTER TYPE and is scoped to the plan).
- Add `credentialId String?` FK → Credential (optional, for internal/`INTERNAL` rows only)
- Add `deletedAt DateTime?` (follows existing soft-delete pattern on ~66 other models)
- Push migration, regenerate Drizzle schema, update `src/db/schema/meeting-proxies.ts` (add nullable credentialId, deletedAt columns)
- Update `src/features/proxy-vote/lib/constants.ts` (if it re-exports enum values) and `src/server/routers/community/proxy-vote.ts` (if it validates)
- Verifies no active tRPC/UIRoutes use the deleted enum values
- If any proxy-vote test fixtures reference PASSKEY, NOSTKR, or LIGHTNING, update them to INTERNAL or remove

### 126-03 — Backfill user.identityId (Phase 2) — **gated on G2 (ADVISORY-032 resolution)**

This plan executes only if ADVISORY-032 is resolved (tenant resolution / RLS fail-open). If unresolved, it is filed as a blocking follow-up in 126-04. It backfills:

- Add nullable `user.identityId String` on `user` table
- Migration script: one `Identity` per distinct `user.email`
- One `Credential` row of type `EMAIL` per existing `user`
- Tighten `identityId` to required after backfill confirmed clean
- RLS policy coverage for `Identity`, `Credential` (ADR-019 addendum)
- Unit test: public DTO allowlist confirms no sensitive fields leaked cross-tenant

If G2 blocks, this plan produces a gate status doc + BD follow-up issue; nothing else ships.

## Dependencies

- **Phase 125 (complete):** Gov module exists (post phase 125), items in `meeting_proxies` (empty currently)
- **ADVISORY-032 resolution:** blocks plan 126-03 (backfill); plan 126-03 is gated
- **No other phases:**Phases 3–4 are deferred separately

## Gate Summary

| Gate | Description                                                | Resolution                                                                                                                                    |
| ---- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| G0   | Confirm advisory number, scope, Gate S1 direction          | Resolved in this session (Advisory #034, scope Phases 0–1+Gate S1 confirm §3 "bundle plus credentialId", confirm crossover Gate via Q2/Q4/Q5) |
| G1   | Confirm `CredentialType` enum shape (lookup table or enum) | Resolved in this session — following existing enum pattern                                                                                    |
| G2   | ADVISORY-032 resolved before backfill                      | Open (blocks 126-03)                                                                                                                          |
| S1   | SignatureProvider narrowed + credentialId + deletedAt      | Resolved: bundle "bundle both + credentialId"                                                                                                 |

## Products

- `Identity` model (Prisma + Drizzle)
- `Credential` model (Prisma + Drizzle)
- `CredentialType` enum (`EMAIL`, `PASSKEY`, `NOSTR`, `LN URL`, `OIDC`)
- Narrowed `SignatureProvider` enum (5 values)
- `MeetingProxy.credentialId` (nullable FK → Credential)
- `MeetingProxy.deletedAt` (soft-delete column)
- Discovery report (§5)
- RLS addendum (stub, deferred to 126-03 gates)
- DTO allowlist test stub

## Verification Targets

- `npx prisma validate` exits 0 on the modified schema
- `npx prisma db push` applies additive migration without data loss
- Drizzle schema regen matches Prisma (no drift)
- No broken imports or TypeScript errors in proxy-vote module
- Zero production rows in `meeting_proxies` at time of migration (pre-flight check in 126-02)
- BD issue for unresolved meetings 126-03 gates created with blocking links
