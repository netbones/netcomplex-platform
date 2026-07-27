# Phase 126 Discovery — AdVISORY-034 §5 Checklist

**Generated:** 2026-07-26
**Plan:** 126-01 (Additive Identity + Credential schema)
**Source:** ADVISORY-034-platform-identity-layer.md §5
**Plan scope:** Additive only — no behavior change, no FK changes to `user`.

---

## 1. user.tenantId usage in src/

```bash
grep -rn "user.tenantId" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__" | wc -l
# → 6
grep -rln "getRLSContext" src/shared/api/
# → src/shared/api/rls-context.ts
# → src/shared/api/require-tenant-rls.ts
# → src/shared/api/server/index.ts
```

**Six `user.tenantId` callsites** (all compare to a contextual tenantId, e.g. session / resolvedTenantId — they expect the current `user` row to belong to exactly one tenant at a time):

| File                                           | Line | Use                                                                        |
| ---------------------------------------------- | ---- | -------------------------------------------------------------------------- | --- | ------------------------------------------------- |
| `src/entities/tenant/api/with-tenant.ts`       | 25   | `if (!user.tenantId                                                        |     | user.isPlatformAdmin) return;` — early-exit guard |
| `src/entities/tenant/api/with-tenant.ts`       | 26   | `if (user.tenantId !== resolvedTenantId) throw new TenantMismatchError();` |
| `src/app/(platform)/home/page.tsx`             | 48   | `if (session.user.tenantId !== null) { ... }`                              |
| `src/app/(platform)/create-community/page.tsx` | 48   | Same null-check                                                            |
| `src/shared/api/rls-context.ts`                | 16   | `tenantId: user.tenantId` — passes to RLSC context                         |
| `src/shared/api/trpc/server.ts`                | 40   | `tenantId = user.tenantId;` — tRPC context init                            |

**`userTenantId` mentions:** 0 occurrences in `src/`. Alias name not in use anywhere.

**`getRLSContext` callers:** `rls-context.ts` defines the helper and is re-used by `require-tenant-rls.ts` + `server/index.ts`. Treats `user.tenantId` as a per-session scalar property of the session user row — **not** a derived projection across seats.

---

## 2. Latent multi-tenancy violation check (seat cross-tenant)

```sql
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

**Result: 0 rows.** No `user` row spans more than one tenant via any seat table. Confirms assumption: at present, `user.id` ↔ `user.tenantId` is 1:1 per seat, so the existing `user.tenantId` usage in §1 above is not an undocumented multi-tenancy footprint — there is no live data contradicting that assumption today.

**Caveat:** the advisory's concern is forward-looking (Identity layer would let a human hold seats in multiple tenants under one Identity row, which would only become visible after Identity migration is wired). The empty result is therefore a **confirmation of the current baseline**, not a guarantee for post-migration behavior.

---

## 3. ServiceProvider duplication by email (human-workaround check)

```sql
SELECT u.email, COUNT(DISTINCT sp."tenantId") AS provider_tenant_count
FROM "ServiceProvider" sp
JOIN "user" u ON u.id = sp."userId"
GROUP BY u.email
HAVING COUNT(DISTINCT sp."tenantId") > 1;
```

**Result: 0 rows.** No provider human is duplicated across multiple tenants under a single email. Confirms the informal multi-tenant workaround described in ADVISORY-034's risk register is **not yet present** in this tenant dataset. The Identity layer is not back-filling existing duplicates.

---

## 4. user.id as "global human id proxy" — usage survey

```bash
grep -rn "user.id\b" src/ --include="*.ts" | grep -v "__tests__" | wc -l
# → 55
```

55 callsites use `user.id`. **None of them treat user.id as a globally-unique-per-human proxy.** All assume `user.id` is platform-local (a Better Auth–issued auth subject). Sampled patterns:

- `src/entities/tenant/api/guards.ts:22` — `eq(users.id, session.user.id)` — auth lookup, identity-by-session.
- `src/server/routers/core/content.ts:889` — `userId: user.id` — audit-log target, stored as a corporate-scoped user reference.
- `src/server/routers/core/identity.ts:627-630` — seat/profile hydration keyed off `user.id` from a single auth response.
- `src/app/api/platform/setup/missions/route.ts:65` — `if (session.user.id !== tenant[0].ownerId)` — ownership check; compares two `user.id` values within the same tenant query result.

**Observation:** every `user.id` usage is **session-derived** (Better Auth identity for the current request) or **same-query** (`user.id` vs. `ownerId` from the same join). No call site reads `user.id` expecting "the same human across tenants" — the right semantic for `Identity.id` going forward is currently absent and **must wait for plan 126-03+** to introduce FK references from `Credential.identityId`.

---

## 5. Better Auth Prisma adapter tolerance — VERSION REALITY CHECK

```bash
cat node_modules/better-auth/package.json | grep '"version"'
# → "version": "1.6.23"

grep -i "adapter\|database" src/shared/api/auth.ts | head -10
# → import { drizzleAdapter } from '@better-auth/drizzle-adapter';
# → database: drizzleAdapter(authDb, { ... });
```

**Better Auth version: 1.6.23 (v1.x range, not v2.x).** Even though ADVISORY-034 §5 framed the adapter as "Prisma adapter", **this project uses `drizzleAdapter`, not Prisma**. The Bolts changed since the advisory was drafted — Phase 18 (Better Auth onboarding) wired via Drizzle.

**Better Auth introspects only 6 Drizzle tables** (per `src/shared/api/auth.ts:50-56`):

```ts
schema: {
  user: users,
  session: sessions,
  account: accounts,
  verification: verifications,
  passkey: passkeys,
  twoFactor: twoFactors,
}
```

The new `identities` and `credentials` tables are **not in this list**, so Better Auth is **completely uninvolved** with them. They are also **not referenced from any of the 6 tables** (additive only — no FK back to `user` from Identity/Credential in this phase). The two-introduces-new-FK-on-user risk described in §5's bullet 4 does **not apply** to this plan.

**Adapter-version note for BD jira tracking:** `better-auth@1.6.23` is the version installed. No migration concern for **additive** Identity/Credential tables. If a later plan introduces an FK from `user.id` → `Identity.id` (e.g. `user.identityId String?`), the Drizzle adapter's introspection on the 6 base tables is unaffected — that FK lives on `user`, which is already in the schema map; the only constraint is that the column be nullable to avoid breakage on existing user rows (or a one-shot backfill). **Plan 126-01 deliberately stops at the additive boundary.**

---

## 6. DWallet uniqueness scope (forward-track sizing)

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = '"DWallet"'::regclass;
```

```text
        conname        |              pg_get_constraintdef
-----------------------+--------------------------------------------------------------------
 DWallet_pkey          | PRIMARY KEY (id)
 DWallet_tenantId_fkey | FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT
 DWallet_userId_fkey   | FOREIGN KEY ("userId") REFERENCES "user"(id) ON UPDATE CASCADE ON DELETE CASCADE
```

**Finding:** `DWallet` has no compound uniqueness — only `id` (PK) and FKs to `Tenant` and `user`. No `(userId)` unique, no `(userId, tenantId)` unique — a `userId` can technically hold multiple `DWallet` rows in the same tenant today.

**Risk for ADVISORY-034 Phase 3 (telemetry consent deduplication):** if Identity is meant to make DWallet 1:1 with a human, today it is **N:1 at the tenant scope** and **(N at any scope)** — both relationships need compound-uniqueness tightening and a migration. Recommend: build that into a named follow-up plan (126-04+), **not** into 126-01 or 126-02.

---

## 7. Table existence checks (informational)

```sql
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='MultiTenancySeat');   -- false
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='service_providers');   -- false
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='DWallet');            -- true
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='identities');        -- true  (new, this plan)
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='credentials');        -- true  (new, this plan)
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='ServiceProvider');    -- true  (PascalCase — the JS query in §3 was correct)
```

`MultiTenancySeat` table does not exist. The §2 seat-union query above is correct against the actual schema (`StandardSeat`, `SoloSeat`, `PremiumSeat`). `service_providers` lowercase does not exist; ADVISORY-034 §5's example query joins `FROM "ServiceProvider"` which is the actual PascalCase table.

---

## Summary — Gate readiness (per ADVISORY-034 §5 deliverable)

| §   | Question                                                                      | Result                                                                                                                                                                                                  |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Are there existing code paths that assume one user row = one tenant, forever? | **Yes.** 6 callsites use `user.tenantId` as a single-tenant scalar. Baseline checks (§2) confirm the assumption is true today. Identity migration does not change this assumption in 126-01 (additive). |
| 2   | Latent multi-tenancy violation in seat data?                                  | **No.** 0 rows.                                                                                                                                                                                         |
| 3   | ServiceProvider duplication across tenants by email?                          | **No.** 0 rows. The informal multi-tenant workaround is not present.                                                                                                                                    |
| 4   | Does Better Auth Prisma adapter tolerate new required FK on `user`?           | **N/A** — the project uses `drizzleAdapter`, not Prisma; and 126-01 adds **no** FK to `user`.                                                                                                           |
| 5   | DWallet uniqueness scope clarity?                                             | **Compound uniqueness missing.** No `(userId)` unique, no `(userId, tenantId)` unique. Squeezing N:1→1:1 belongs in a forward plan (126-04+).                                                           |

**Net result: §5 baseline clean. 126-01's additive only boundary is safe. No gates resolved or broken by this plan.**

---

## Appendix — deviations encountered during execution

### A. `prisma migrate dev` non-interactive TTY lock

`npx prisma migrate dev` rejects in non-TTY environments. This is the same TTY-detect behavior that caused every prior phase to use `prisma db push` (see Phase 19-01, 50-01, 105-01, 111-01, 123-01 summaries each citing a Shadow DB / interactive/Role-enum issue).

**Workaround applied:**

1. `npx prisma migrate diff --from-schema-datasource prisma/schema --to-schema-datamodel prisma/schema --script --shadow-database-url="$DIRECT_URL"` produced the precise additive SQL (just CredentialType + identities + credentials + index + FK).
2. Wrote the SQL to `prisma/migrations/20260726192240_126_01_add_identity_credential_layer/migration.sql` (timestamp YYYYMMDDhhmmss, `_` separators, matching the project's existing 60-migration conventions).
3. Applied via `npx prisma migrate deploy` — non-interactive, runs SQL only, registers the migration in `_prisma_migrations`.

Verified post-state:

- `SELECT typname FROM pg_type WHERE typname='CredentialType';` → 1 row.
- `SELECT count(*) FROM _prisma_migrations WHERE migration_name='20260726192240_126_01_add_identity_credential_layer' AND finished_at IS NOT NULL;` → 1 row (applied).
- `SELECT count(*) FROM identities;` → 0
- `SELECT count(*) FROM credentials;` → 0

### B. `drizzle-kit generate/check` blocked by pre-existing journal collision

```text
Error: [drizzle/meta/0002_snapshot.json, drizzle/meta/0003_snapshot.json]
are pointing to a parent snapshot: drizzle/meta/0002_snapshot.json/snapshot.json
which is a collision.
```

Inspecting `_journal.json`: entries idx=0 (`0000_dusty_cassandra_nova`), idx=1 (`0002_cool_susan_delgado`), idx=2 (`0002_rare_revanche`), idx=3 (`0003_wonderful_abomination`). Both `0002_*.sql` entries reference `0002_snapshot.json` as their parent (missing the original `0001_snapshot.json` slot). The collision was introduced in commit `fdd3d349` (Phase 39 achievements).

Per the plan's hard constraint ("Do NOT drop or rename any existing drizzle/_.sql file"), I cannot repair the journal without violating the no-rename rule. **Resolution: no Drizzle journal entry added for this plan.** The Drizzle TypeScript files (`identities.ts`, `credentials.ts`, `credential-type-enum.ts`, `identities-relations.ts`, `credentials-relations.ts`) were emitted by `prisma-generator-drizzle` during `prisma generate` and match the existing format exactly. Runtime code behavior is identical regardless of whether `drizzle/_.sql`contains a matching entry. Recommend reconciling the`\_journal.json` in a dedicated Phase 126 follow-up plan (or as part of the next phase that needs a Drizzle migration on top of this baseline).

### C. Pre-existing uncommitted modifications in working tree

The git working tree contained ~40 modified Drizzle files (`comments.ts`, `comment-votes.ts`, etc.) — re-emitted at minified form by `prisma-generator-drizzle` during prior sessions. These are **out of scope** for 126-01 per the AGENTS.md "Never use git -A, only commit your own files" rule. They are documented for orchestrator awareness but **not touched** in any commit in this plan.

Also present in working tree but untracked: `docs/advisories/ADVISORY-036.md`, `docs/check.md`, deletion of `src/db/schema/proxy-vote.ts` — all from prior sessions, **not touched**.
