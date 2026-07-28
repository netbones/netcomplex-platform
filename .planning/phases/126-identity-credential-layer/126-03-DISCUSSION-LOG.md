# Phase 126-03: User.identityId Backfill - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-28
**Phase:** 126-03 (sub-plan of 126-identity-credential-layer)
**Areas discussed:** Backfill key strategy; RLS policy for Identity/Credential; Better Auth adapter tolerance

---

## Backfill key strategy

| Option                                                            | Description                                                                                                                                     | Selected |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Distinct email = one Identity                                     | GROUP BY lower(user.email); one Identity + EMAIL Credential per group; multiple user rows → same Identity. Aligns with ADVISORY-034 §6 Phase 2. | ✓        |
| Per user.id = one Identity                                        | Identity.id = user.id (1:1). PREVENTS future Phase 3 multi-tenant provisioning.                                                                 |          |
| Email-grouped now + identity-id reused per tenant (Phase 3 ready) | Same as option 1 + explicit invariant doc. Effectively option 1 with extra doc.                                                                 |          |

**User's choice:** Distinct email = one Identity (Recommended)

| Option                                     | Description                                                                      | Selected |
| ------------------------------------------ | -------------------------------------------------------------------------------- | -------- |
| Fold to lowercase before grouping          | GROUP BY lower(user.email). Matches Better Auth case-insensitive login.          | ✓        |
| Trust existing data + UNIQUE on user.email | Two users with same email at different cases → two Identities. Latent dedup gap. |          |
| CITEXT extension on Identity.email         | Most rigorous; adds extension dependency.                                        |          |

**User's choice:** Fold to lowercase before grouping (Recommended)

| Option                                   | Description                                                           | Selected |
| ---------------------------------------- | --------------------------------------------------------------------- | -------- |
| Merge into one Identity on collision     | Both user rows → same Identity. Preserves both tenants' user records. | ✓        |
| Skip + BD-file for manual reconciliation | Safer audit trail; Phase 2 ships 'partial'.                           |          |
| Hard-fail migration on duplicates        | Forces 100% clean data. Adds explicit data-cleanup step.              |          |

**User's choice:** Merge into one Identity on collision (Recommended)

| Option                                                 | Description                                                                                 | Selected |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------- | -------- |
| Identity.email = derived from primary EMAIL Credential | Email lives ONLY on Credential row. Multi-credential humans have no single canonical email. | ✓        |
| Add Identity.email (CITEXT, nullable)                  | Fast dedup queries. Diverges from additive-only intent.                                     |          |
| Defer to 126-04 if a query needs it                    | Phase 3 backfill only writes Credential; Identity stays id + timestamps only.               |          |

**User's choice:** Identity.email = derived from primary EMAIL Credential (Recommended)

**Notes:** §5 discovery in 126-DISCOVERY.md confirmed 0 latent cross-tenant seat duplication, 0 cross-tenant email duplication, and Better Auth uses `drizzleAdapter` (not Prisma) — meaning the email-keyed path is safe AND the email column lives on the Credential, not the Identity. All four decisions in this area align with ADVISORY-034 §4 + §6 Phase 2 architecture.

---

## RLS policy for Identity / Credential

| Option                                                  | Description                                                                                                     | Selected |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------- |
| Identity-scoped only (Recommended)                      | Visible to user rows whose identityId matches OR platform-admin. Phase 3 multi-tenant case falls out naturally. | ✓        |
| Tenant-scoped                                           | Visible only to same-tenant user rows. Phase 3 breaks because Solaris user can't see Soralia's Credential.      |          |
| Hybrid: platform-admin bypass + identity-only otherwise | Same-tenant user rows + platform-admin. Future Phase 3 requires extra migration.                                |          |

**User's choice:** Identity-scoped only (Recommended)

| Option                                                  | Description                                                                                                         | Selected |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------- |
| Server-only writes via runWithRLS context (Recommended) | All Credential writes through tRPC procedures; raw INSERT/UPDATE/DELETE blocked at the connection-pool owner level. | ✓        |
| User-self-write on EMAIL type they own                  | User can self-insert if Credential is for an Identity they own. Blocks invite flow.                                 |          |
| Platform-admin-only writes                              | Adds platform-admin step to routine onboarding. Defeats 'add a passkey' UX.                                         |          |

**User's choice:** Server-only writes via runWithRLS context (Recommended)

| Option                                            | Description                                                                        | Selected |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- | -------- |
| Global table, identity-scoped reads (Recommended) | No tenantId column. Phase 3 case = multiple user rows pointing to same identityId. | ✓        |
| Tenant-bound Identity (phase-3 migration risk)    | Add nullable tenantId. Phase 3 forces 1→N row split.                               |          |
| Global table, no RLS                              | Skip RLS on Identity. Any future bug leaks ALL Identity rows.                      |          |

**User's choice:** Global table, identity-scoped reads (Recommended)

| Option                                                                          | Description                                                                                           | Selected |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------- |
| Match ADVISORY-032 fail-closed + per-query CROSS-TENANT assertion (Recommended) | Defense in depth: role-switch failure → 500; per-query assertion catches caller bugs.                 | ✓        |
| Match ADVISORY-032 fail-closed; no per-query assertions                         | Trust the role-switch to surface as 500. If caller forgets runWithRLS, owner bypass reads everything. |          |
| Fail-closed reads, fail-OPEN writes (with audit log)                            | Risky: silent insert is worse than 500 for PII tables.                                                |          |

**User's choice:** Match ADVISORY-032 fail-closed; add explicit CROSS-TENANT assertion in queries

**Notes:** Decisions D-05 through D-08 align with ADVISORY-034 Risk Register row 4 ("Phase 2 must include an RLS policy addendum to ADR-019, not a silent gap"). The fail-closed + assertion combination is the strongest defense under ADVISORY-032's still-open Phase 5/6 (staging regression + production curl verification).

---

## Better Auth adapter tolerance

| Option                                                           | Description                                                      | Selected |
| ---------------------------------------------------------------- | ---------------------------------------------------------------- | -------- |
| Nullable first, tighten to NOT NULL after backfill (Recommended) | Two migrations; matches ADVISORY-034 §6 + Risk Register row 1.   | ✓        |
| NOT NULL from day one                                            | Single transaction. Mid-migration signup → constraint violation. |          |
| No FK constraint; plain text column                              | Lose referential safety net.                                     |          |

**User's choice:** Nullable first, tighten to NOT NULL after backfill verified clean (Recommended)

| Option                                                  | Description                                                                 | Selected |
| ------------------------------------------------------- | --------------------------------------------------------------------------- | -------- |
| Application-layer signup wrapper only (Recommended)     | Wrapper creates Identity + EMAIL Credential before user insert. No trigger. | ✓        |
| DB trigger: NOT NULL on insert unless backfill flag set | Belt + suspenders.                                                          |          |
| Skip the window entirely by NOT NULL in one shot        | Single migration. Needs read-only maintenance window.                       |          |

**User's choice:** Application-layer signup wrapper only

| Option                                                                                                                       | Description                                                                                                  | Selected |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------- |
| Hand-edit Drizzle TS first; regenerate via prisma-generator-drizzle after journal fix (Recommended in CONTEXT, not selected) | Defer journal fix to 126-04.                                                                                 |          |
| Fix the drizzle journal collision first as 126-03 prep                                                                       | Pull 126-04's intended cleanup forward. Necessary so Phase 2 reaches Drizzle TS without hand-edit deviation. | ✓        |
| Skip Drizzle entirely                                                                                                        | Risky: future Drizzle queries silently return undefined columns.                                             |          |

**User's choice:** Fix the drizzle journal collision first as 126-03 prep

| Option                                                                      | Description                                                                                        | Selected |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------- |
| Unit test the wrapper + integration test against a running DB (Recommended) | Two-layer coverage; wrapper test catches ordering bugs, integration test catches real-signup bugs. | ✓        |
| Integration test only                                                       | Harder to debug if it fails.                                                                       |          |
| Defer all tests to 126-04                                                   | Phase 2 ships wrapper + backfill; tests follow. Risk: subtle bug ships as regression.              |          |

**User's choice:** Unit test the wrapper + integration test against a running DB (Recommended)

**Notes:** The Drizzle journal fix decision (D-11) expands scope into territory originally planned for 126-04. The user explicitly chose this over hand-editing because Phase 2's column reaches `user` (the table Better Auth reads) — a hand-edited Drizzle mismatch on `user.identityId` would create an immediate Better Auth adapter risk surface. Fixing the journal now is the correct trade-off. The ADVISORY-034 Risk Register row 1 ("Better Auth's Prisma adapter breaks or silently ignores a new required FK on user") was authored for the Prisma-adapter case; the drizzle adapter has a parallel but distinct risk surface, addressed by D-09 + D-11 + D-12.

---

## Agent's Discretion

- Exact wording of the `CROSS-TENANT` assertion helper (D-08) — name, error code, location under `src/shared/api/` vs `src/entities/tenant/api/`.
- Whether to add a separate `last_used_at` index on `Credential` — no; defer until credential-type work begins.
- Order of `INSERT` statements inside `db.transaction` — structurally determined by the FK chain (Identity → Credential → user).

## Deferred Ideas

- Multi-tenant provisioning (ADVISORY-034 Phase 3) — future phase, G3 gate.
- DWallet portability (ADVISORY-034 Phase 4) — requires separate advisory, G4 gate.
- Nostr / LNURL / OIDC credential types — Phase 5 per ADVISORY-034 §6.
- `identityId`-based user deduplication tooling (historical bulk dedup) — not Phase 2.
- Public DTO allowlist library (centralized) — scope creep; each tRPC router enforces allowlist ad-hoc.
