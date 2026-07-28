---
phase: 126-03
type: execute
status: ready_for_planning
created: 2026-07-28
milestone: M5+ Post-Launch
parent_phase: 126-identity-credential-layer
depends_on:
  - 126-01 complete (Identity + Credential tables in place)
  - 126-02 complete (MeetingProxy remediation applied)
  - ADVISORY-032 Phases 1-4 complete; Phases 5-6 (staging regression + production curl verification) MUST be green before 126-03 executes (G2 per 126-CONTEXT.md)
---

# Phase 126-03: User.identityId Backfill - Context

**Gathered:** 2026-07-28
**Status:** Ready for planning

## Phase Boundary

Backfill every existing `user` row with exactly one `Identity` and one
`EMAIL`-type `Credential`, then tighten `user.identityId` from nullable to
required. Add an RLS addendum to ADR-019 covering `Identity` and `Credential`
tables, plus the application-layer signup wrapper that creates an
`Identity` + `EMAIL` `Credential` atomically for new signups. Fix the
pre-existing `drizzle/meta/_journal.json` collision as 126-03 prep so
`drizzle-kit generate/check` runs cleanly for the first time since Phase 39.

This is **ADVISORY-034 Phase 2**. Phase 3 (multi-tenant provisioning) and
Phase 4 (DWallet portability) are explicitly out of scope and gated on their
own gates (G3, G4).

## Implementation Decisions

### Backfill key strategy

- **D-01:** Backfill key is `DISTINCT lower(user.email)` — one `Identity` per
  distinct lowercased email. §5 discovery confirmed zero cross-tenant seat
  duplication and zero cross-tenant email duplication, so the email-keyed path
  is mechanically safe and aligns with ADVISORY-034 §6 Phase 2 wording.
- **D-02:** Email normalization is `lower(user.email)` — must match Better
  Auth's case-insensitive login behavior (§5.4). Two users with
  `Alice@x.com` and `alice@x.com` collapse to one `Identity`.
- **D-03:** Collision policy: when two `user` rows already share the same
  lowercased email, both rows point to the **same** `Identity` (merge).
  Preserves both tenants' user records. Defensive only — §5 discovery shows
  zero collisions today.
- **D-04:** No `Identity.email` column. Email lives ONLY on the `EMAIL`
  `Credential` row. `Identity` stays as just `(id, createdAt, updatedAt)`.
  Consistent with ADVISORY-034 §4 architecture; multi-credential humans have
  no single canonical email.

### RLS policy for Identity / Credential

- **D-05:** `Credential` RLS is **identity-scoped only**: visible to `user`
  rows whose `identityId` matches the row's `identityId`, OR to sessions with
  `isPlatformAdmin = true`. Cross-tenant reads blocked by policy. Phase 3's
  multi-tenant case falls out naturally because all of the human's `user`
  rows share the same `identityId`.
- **D-06:** `Credential` writes are **server-only** via `runWithRLS` context
  (or per-procedure elevation). No client-side INSERT/UPDATE/DELETE. New
  Credentials added through the signup wrapper or passkey enrollment flows;
  revocation via explicit user action with audit log.
- **D-07:** `Identity` table is **global** — no `tenantId` column. RLS reads
  are identity-scoped (same rule as D-05). Phase 3 multi-tenant provisioning
  is a future row split in `user` (two `user` rows, one `identityId`), not a
  schema change on `Identity`.
- **D-08:** Fail-closed polarity matches ADVISORY-032: any role-switch
  failure on an `Identity` or `Credential` query surfaces as a 500, not a
  silent leak. Add an explicit `CROSS-TENANT` assertion per query as
  defense-in-depth — even if a future caller forgets to wrap in `runWithRLS`,
  the assertion catches the role bypass.

### Better Auth adapter tolerance

- **D-09:** `user.identityId` is added as `String?` (nullable FK →
  `identities.id`, `ON DELETE RESTRICT`) in the first migration. A follow-up
  ALTER COLUMN SET NOT NULL after a verification query confirms zero null
  rows. Two migrations, one plan. Matches ADVISORY-034 §6 Phase 2 + Risk
  Register row 1.
- **D-10:** Window-closing strategy is **application-layer signup wrapper
  only** — no DB trigger. The wrapper creates `Identity` + `EMAIL`
  `Credential` before the `user` insert. If any code path bypasses the
  wrapper (manual SQL, future endpoints), the window opens; accept that risk
  and rely on the verification query + code review.
- **D-11:** Drizzle sync: **fix the pre-existing `drizzle/meta/_journal.json`
  collision as 126-03 prep** so `drizzle-kit generate/check` runs cleanly for
  the first time since Phase 39. This pulls 126-04's intended cleanup work
  forward into 126-03 prerequisite, but is necessary so the
  `user.identityId` column reaches the Drizzle TS schema without a
  hand-edit deviation.
- **D-12:** Verification: **unit test the signup wrapper** (mock
  `db.transaction`; assert Identity row, EMAIL Credential row, user row
  created in that order with the right identityId linkage) **plus
  integration test against a test DB** (real signup endpoint; assert
  `user.identityId` is set AND the Identity has a matching EMAIL Credential).

### Agent's Discretion

- Order of `INSERT` statements inside `db.transaction` (Identity →
  Credential → user; chosen order is fixed by the FK chain, so this is
  structurally determined rather than discretionary).
- Exact wording of the `CROSS-TENANT` assertion helper (name, error code,
  whether it lives in `src/entities/tenant/api/` or
  `src/shared/api/rls-context.ts`).
- Whether to add a separate `last_used_at` index on `Credential` (no — only
  set when OIDC/passkey flows exist; defer until credential-type work
  begins).

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Identity/Credential architecture (this phase's source-of-truth)

- `docs/advisories/ADVISORY-034-platform-identity-layer.md` — full Phase 0–4
  architecture, Risk Register row 1 (Better Auth FK tolerance), Risk Register
  row 4 (RLS addendum to ADR-019), Decision Gates table. §6 Phase 2 is the
  authoritative description of what 126-03 delivers.
- `docs/advisories/ADVISORY-034-SUPPLEMENTAL-1.md` — Gate S1 (already
  shipped via 126-02); confirms that Gate S1 does not touch Phase 2's scope.

### RLS / ADR-019

- `docs/STEERING/RLS.md` — connection-role model; explains why
  `runWithRLS` switches to `app_user` and why `DATABASE_URL` must NEVER be
  swapped to `app_user` directly. Phase 2's RLS policies run under
  `app_user`.
- `prisma/migrations/20260604000000_add_rls_policies/` — the 6 ADR-019
  sensitive tables + 9 admin-route tables already covered. Phase 2 adds
  `Identity` and `Credential` as a new pair (becomes tables 7+8 in the
  sensitive set).
- `src/shared/api/db.ts` — `runWithRLS` implementation; the `try/catch` was
  flipped to fail-closed per ADVISORY-032 Phase 4. Phase 2 inherits the
  fail-closed polarity (D-08).
- `docs/advisories/ADVISORY-032-tenant-resolution-rls-fallback.md` §6 Phase
  5 (deferred) — staging regression test; the user/Phase 2 inherits G3
  verification (staging-verified `app_user` role switch succeeds) before
  Phase 2 touches production.

### Better Auth adapter

- `src/lib/auth.ts` — Better Auth setup using `drizzleAdapter`. §5.4 of
  126-DISCOVERY confirms this — Phase 2's FK tolerance assumption is
  different from what ADVISORY-034 originally anticipated (Prisma adapter).
  The drizzle adapter reads the user table directly via Drizzle, so the
  risk surface is Drizzle schema validation, not Prisma's.

### Phase 126 parent context

- `.planning/phases/126-identity-credential-layer/126-CONTEXT.md` — parent
  phase context; §Phase Breakdown §126-03 is the original scope description
  (slightly less detailed than this CONTEXT.md; defer to this file when in
  conflict).
- `.planning/phases/126-identity-credential-layer/126-DISCOVERY.md` §5 — the
  baseline-clean confirmation that enables D-01 (email-keyed backfill).

### Steering docs referenced by Phase 2

- `docs/STEERING/SOFT_DELETE.md` — soft-delete pattern (~66 tables); not
  directly relevant to `Identity`/`Credential` (no soft-delete requirement on
  those tables) but referenced by sibling work in 126-02.
- `docs/STEERING/SPEC.md` (if it exists; otherwise docs/STEERING/SPEC.md
  search) — soft-delete and RLS conventions consolidated.
- `docs/advisories/ADVISORY-019-multi-tenant-rls-strategy.md` (verify path)
  — the original ADR-019 advisory. The "sensitive table" list lives here.

## Existing Code Insights

### Reusable Assets

- `src/shared/api/db.ts` `runWithRLS(callback)` — the
  role-switch-and-isolate primitive. Phase 2's fail-closed wrapper and
  `CROSS-TENANT` assertion plug in here (D-08).
- `src/db/schema/identities.ts` + `credentials.ts` (created in 126-01) —
  the schema target. Phase 2 only ADDS `user.identityId` and the FK
  relation; does not modify these files unless the Drizzle journal fix
  (D-11) touches the surrounding barrel.
- `src/entities/tenant/api/with-tenant.ts` — Better Auth session → tenant
  resolver. Phase 2's signup wrapper must call this to acquire the
  tenantId for new `user` rows before computing `identityId`.

### Established Patterns

- **Enum narrowing migration** (126-02): `CREATE TYPE _new + ALTER TABLE
ALTER COLUMN ... TYPE _new USING text::_new + RENAME swap + DROP TYPE _old`
  inside a single transaction. Phase 2's FK add is a different shape but
  follows the same "compose SQL by hand, run via Prisma's `_prisma_migrations`
  table" pattern (per 126-01/02 deviation).
- **Hand-edited Drizzle TS** when `drizzle-kit` is blocked (126-01 D5,
  126-02 D5). D-11 explicitly pulls the journal fix forward so Phase 2
  avoids this pattern.
- **Backfill reconciliation script** (no prior pattern in repo; Phase 2
  establishes it). The script must be idempotent (`ON CONFLICT DO NOTHING`
  on Identity insert by deterministic id; same for EMAIL Credential) and
  produce a row-count report (`expected vs actual`).
- **Two-table schema for sensitive entities** (ADR-019): the
  `Identity`/`Credential` pair follows the same "entity + dependent" pattern
  already used for `Tenant`/`TenantModule`, `User`/`UserRole`, etc.

### Integration Points

- Better Auth signup flow (currently `src/server/routers/auth/...` or
  `src/app/(auth)/signup/...`) — the wrapper sits between Better Auth's
  user-create call and the `user` insert (D-10).
- Existing tRPC routers that read `user` (community, admin, platform) —
  the new `identityId` column is inert on the read path; nothing breaks.
  The DTO allowlist must NOT expose `identityId` cross-tenant (per
  ADVISORY-034 §8 done-criteria row 5) — verify by grep on every tRPC
  router that returns a user-shaped DTO.
- `meeting_proxies.credentialId` (added in 126-02) — when a `MeetingProxy`
  is created with `signatureProvider = INTERNAL`, the `credentialId` FK
  points to the platform credential that authenticated the session. Future
  Phase 3+ will populate this from session context; Phase 2 only sets up
  the table.

## Specific Ideas

- The Drizzle journal fix (D-11) should include a one-line `README.md`
  addition under `drizzle/meta/` explaining the regeneration command —
  prevents future collisions.
- The signup wrapper (D-10) should emit a structured log line
  (`{event: 'identity.created', identityId, credentialId, tenantId}`) so
  the audit trail covers every Identity/Credential creation post-backfill.

## Deferred Ideas

- **Multi-tenant provisioning (ADVISORY-034 Phase 3)** — explicit scope
  boundary. Future phase, gated on G3. Already noted in
  `126-CONTEXT.md` §"What Remains Out of Scope".
- **DWallet portability (ADVISORY-034 Phase 4)** — explicit scope boundary.
  Gated on G4, requires separate advisory per ADVISORY-034 §6 Phase 4.
  Already noted in `126-CONTEXT.md`.
- **Nostr / LNURL / OIDC credential types** — out of scope until Phase 5
  per ADVISORY-034 §6. The `CredentialType` enum already includes them.
- **`identityId`-based user deduplication tooling** — not a Phase 2 deliverable.
  The wrapper creates one Identity per signup; bulk dedup tooling across
  historical users is owned by the merge-on-collision logic in D-03 only.
- **Public DTO allowlist library** — currently each tRPC router enforces
  its own allowlist ad-hoc. A centralized allowlist helper would help, but
  is scope creep for 126-03.

---

_Phase: 126-03 — User.identityId Backfill_
_Context gathered: 2026-07-28_
