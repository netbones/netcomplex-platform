# RLS Migration Plan

## Goal

Move `prisma/migrations/add_rls.sql` and `prisma/migrations/add_rls_note.md` into the proper Prisma migration directory layout, fix the bugs the script contains, align it with the in-flight Phase 43 work, and document the rollout so the migration is runnable by `prisma migrate deploy` and consistent with the `runWithRLS` helper in `src/shared/api/db.ts`.

## Phase 43 context (this changes the plan)

Phase 43 (`m4-5-blockers`) is the in-flight blocker phase for the M4.5 soak. It has 5 plans:

| Plan      | Issue          | What it does                                                                                 |
| --------- | -------------- | -------------------------------------------------------------------------------------------- |
| 43-01     | `tc4` (P1)     | Replace broken `prisma/seed.ts` with re-export shim to `scripts/seed-drizzle.ts`             |
| 43-02     | `cs5` (P2)     | Fix MyHomeSpace property linking                                                             |
| 43-03     | `e0w` (P2)     | Programmatic tenant-isolation audit script + `docs/SECURITY_AUDIT_M4.5.md`                   |
| **43-04** | **`oqw` (P2)** | **Wrap 5 admin routes in `runWithRLS()` — this is the only plan that actually consumes RLS** |
| 43-05     | `ltn` (P2)     | `validation-better-auth` plugin                                                              |

**The `add_rls.sql` file is a precursor that was created ahead of the phase and never integrated.** It is referenced in 43-04-PLAN.md (line 54) as if it already exists in the proper migration directory: _"RLS policies (defined in `prisma/migrations/.../rls-policies.sql`)"_. It does not. 43-04 is **dependent on this work** — the 5-route wrap will be a no-op against the current DB because (a) the policy file isn't in the proper migration directory, (b) it has bugs that would silently lock out staff, and (c) the GUC names don't match what `runWithRLS` actually sets.

**ADR-019** ("Focused RLS on Sensitive Tables + Application-Layer Audit") explicitly says _"No full RLS: Deliberately not implementing RLS on all 47 tables."_ The original `add_rls.sql` covers **45** unique `CREATE POLICY` statements (every table with a `tenantId` column) — that's the full-table RLS approach ADR-019 rejected. We need to reconcile this. **The plan below scopes the migration to the 6 sensitive tables from ADR-019 + the 8 unique tables the Phase 43 43-04 routes actually touch.** This stays within the ADR's "focused" mandate and is the only set the 43-04 work depends on.

The remaining 31 tables from the original `add_rls.sql` (45 unique policies, minus the 14 in scope) can be reviewed as a separate future phase (likely M6+ Post-Launch) once second-tenant onboarding makes the "second tenant" trigger from `netcomplex_migration_planv1.md:198` relevant.

## Critical findings (from exploration)

1. **GUC name mismatch — silently breaks admin/manager access.** `src/shared/api/db.ts:189-198` sets `app.user_role`, but `add_rls.sql:107` reads `app.role`. If this migration is applied as-is, the `is_tenant_admin()` helper returns `false` for every user, and `ADMIN`/`MANAGER`/`BOARD`/`COMMITTEE` lose read access to all their staff-scoped data (`Notification`, `MaintenanceRequest`, `RequestNote`, `RequestHistory`, `Booking`, `Conversation`, `Message`, `ConversationParticipant`). Plan 43-04 depends on this working.

2. **`app.is_platform_admin` is set by the app but never read by the SQL.** Platform admins lose cross-tenant access. The `AssistSession` and platform admin flows in `src/app/api/admin/platform/**` rely on this.

3. **`runWithRLS` is defined but never called** outside of plan 43-04's planned usage. Every other route in the codebase (103 files) uses `withTenant()` and applies `tenantId` in `where` clauses via `tenantQueries.<table>(tenantId)` in `src/entities/tenant/api/base.ts`. RLS is therefore a **defense-in-depth** layer that activates only when handlers are migrated to use `runWithRLS()`. Plan 43-04 migrates the first 5 routes; the rest is future work.

4. **`Role` enum** (`prisma/schema.prisma:1284`) is `RESIDENT | GROUP_ADMIN | COMMITTEE | BOARD | ADMIN | AGENT | MANAGER | ASSOCIATE`. The SQL's `is_tenant_admin()` checks `['ADMIN','MANAGER','BOARD','COMMITTEE']`, missing `GROUP_ADMIN`. The plan adds `GROUP_ADMIN` (group management) and documents the deliberate exclusions of `AGENT` and `ASSOCIATE`.

5. **`CREATE POLICY` is not idempotent** for ~44 of 45 tables (only `Booking` is dropped first). Re-runs will fail.

6. **No `WITH CHECK` clauses.** Every policy defines only `USING`, so `INSERT`/`UPDATE` are not validated against the predicate. A user can write rows that the same transaction can no longer read. This is a correctness bug, not just a smell.

7. **Missing composite indexes.** `Notification`, `MaintenanceRequest`, `Booking`, `Message` have `@@index([userId])` but not `@@index([tenantId, userId])`. Once the RLS predicate filters by both, planner choices will degrade.

8. **Schema comment error.** `add_rls.sql` says "no tenantId — isolated via survey" for `SurveySection` and `Question` but the policy uses `"tenantId" = ...`. Schema has `tenantId` on both, so the comment is wrong (not a bug). Fix the comment.

9. **Prisma migration directory convention** is `YYYYMMDDHHMMSS_name/migration.sql`. The most recent migration is `20260531165500_add_competition_entries`. A new migration must use a later timestamp.

10. **`EventAttendee`, `GroupMembershipRequest`, `agentProfile`, `agentAccess` are tenant-only in the SQL** but the app's `withTenant()` does not constrain by `userId`. Consistent with today's app behavior, but worth flagging for product review.

11. **ADR-019 scope mismatch.** The current `add_rls.sql` covers 45 unique tables; ADR-019 limits RLS to 6 sensitive tables + 5 admin routes (the 43-04 set). The plan narrows the migration to 14 tables (6 sensitive + 8 admin-route-unique, with `user` overlapping) and defers the remaining 31 (= 45 − 14).

## Scope (revised based on ADR-019 + Phase 43)

The migration covers exactly the tables ADR-019 calls out as "sensitive" (PII + auth credentials) plus the unique tables the Phase 43 43-04 admin routes actually read. **Total: 14 tables, not 45.** Counted by reading the 5 route files in 43-04-PLAN.md:

### ADR-019 sensitive tables (6)

- `user` — Better Auth reads/writes during login via the owner connection; the policy must accept rows whose `tenantId` matches `app.tenant_id` and be bypassed for owner connections.
- `session`
- `account`
- `passkey`
- `twoFactor`
- `profile`

### Phase 43 43-04 admin-route tables (8 unique, derived from grep + import inspection)

| Route file                                       | Tables imported from `@api/db`                                                                           |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `src/app/api/admin/activity/route.ts`            | `maintenanceRequests`, `users`, `contents`, `surveys`, `events`                                          |
| `src/app/api/admin/board-members/route.ts`       | `users`                                                                                                  |
| `src/app/api/admin/maintenance-stats/route.ts`   | `users`, `maintenanceRequests`                                                                           |
| `src/app/api/admin/urgency/route.ts`             | `maintenanceRequests`, `groupMembershipRequests`, `surveys`, `announcements`, `contents`, `competitions` |
| `src/app/api/admin/settings/page-flags/route.ts` | `settings` (via `src/entities/tenant/api/flags/platform-flags.ts:1-2`)                                   |

**Unique admin-route set (8):** `maintenanceRequests`, `users` (dup with sensitive), `contents`, `surveys`, `events`, `groupMembershipRequests`, `announcements`, `competitions`, `settings`. After de-dup against the 6 sensitive tables (`users`), the net new is 8.

**Final scoped set = 6 + 8 = 14 tables.**

### Auth tables (4) — out of scope, by design

- `session`, `account`, `verification`, `passkey` — Better Auth manages these. **Better Auth needs to connect as the owner role**, so RLS on these tables is incompatible with the library's connection model. The existing `app_user` setup grants these tables SELECT/INSERT/UPDATE/DELETE to `app_user`, but policies are deliberately not enabled. Document this in `docs/STEERING/RLS.md`.
- `user` is in scope (admin routes read it) and is _not_ in this exclusion list. The owner connection's RLS bypass keeps Better Auth's login flow working. **Critical:** the `getRLSContext` function at `src/shared/api/db.ts:214` does `db.select().from(users)` outside any `runWithRLS` transaction. This read is safe _only_ because the pool's connection role is the table owner (BYPASSRLS). If `DATABASE_URL` is ever changed to use `app_user` directly, this read fails. Document this constraint in `docs/STEERING/RLS.md` step 0 and in `AGENTS.md`.

### Tables deliberately not in this migration (deferred)

The 33 tables in the system `add_rls.sql` that are neither sensitive (per ADR-019) nor read by the 5 admin routes are out of scope. They will be re-evaluated in a future phase, likely M6+ (second-tenant onboarding) per `docs/migrations/netcomplex_migration_planv1.md:198`:

- `Announcement`, `Booking`, `Content`, `Competition`, `CompetitionEntry`, `Event`, `EventAttendee`, `ExternalSurvey`, `Group`, `MaintenanceCategory`, `MaintenanceTeam`, `Resource`, `ResourceVersion`, `ServiceProvider`, `Survey`, `SurveySection`, `Question`, `Response`, `TenantModule`, `UserGroup`, `Household`, `Property`, `propertyListing`, `soloSeat`, `standardSeat`, `invitation`, `agentProfile`, `agentAccess`, `communityServiceListing`, `communityServiceInquiry`, `communityServiceReview`, `album`, `AssistSession`

ADR-019 calls these "non-sensitive from a privilege-leak standpoint; the application-layer auth is robust." Re-affirm this in the RLS runbook.

**Note on the count:** The 14 in-scope + 33 deferred = 47, which matches the 47 tables ADR-019 cites as the total. The original `add_rls.sql` was a 32-table partial subset. The 33-deferred list above is the exhaustive set of tables in the system that are neither sensitive nor read by the 5 admin routes.

## Connection role model (CRITICAL — supersedes `add_rls_note.md`)

Two roles coexist in this system. They are **not interchangeable**.

- **Owner role** (the role in `DATABASE_URL`): full table access, `BYPASSRLS`. Used for:
  - Prisma migrations (`prisma migrate deploy`)
  - Better Auth reads/writes (login, session, account, passkey, twoFactor, verification)
  - `getRLSContext`'s user lookup at `src/shared/api/db.ts:214` (runs **outside** any `runWithRLS` transaction)
  - Any code path that does NOT go through `runWithRLS`

- **`app_user` role**: created by the runbook, has `GRANT`s to all tables but is subject to RLS policies. Used for:
  - All queries inside `runWithRLS(ctx, async (tx) => { ... })` — the `tx` parameter
  - Activated via `SET LOCAL ROLE app_user` at the start of the transaction in `src/shared/api/db.ts:191`

**Rules:**

1. `DATABASE_URL` continues to use the **owner role**. Do not change `DATABASE_URL` to use `app_user` directly.
2. `app_user` is only active inside transactions started by `runWithRLS`. Outside those transactions, the connection is always the owner role.
3. The `app_user` switch is transaction-scoped (`SET LOCAL` + `set_config`). It auto-resets on commit/rollback.
4. Breaking rule #1 by changing `DATABASE_URL` to `app_user` will:
   - Break Better Auth login (no RLS bypass, policies reject unauthenticated reads)
   - Break `getRLSContext` (its `db.select().from(users)` is outside `runWithRLS`)
   - Break Prisma migrations (`app_user` lacks `CREATE`/`ALTER` privileges)
5. `add_rls_note.md` contradicts this with _"Your DATABASE_URL in production uses app_user"_. That note is **wrong** and must be replaced.

This section is the single source of truth for the connection-role model. It must be reproduced verbatim in `docs/STEERING/RLS.md` step 0 and referenced from `AGENTS.md` and `ADR-019`.

## What we are NOT doing in this plan

- Wiring `runWithRLS` into the 100+ route handlers that currently use `withTenant()`. Plan 43-04 handles the first 5. The rest is future work, separately tracked.
- Adding RLS to Better Auth tables (`session`, `account`, `verification`, `passkey`). Better Auth connects as the owner role; adding RLS there breaks login.
- Creating the `app_user` role inside the migration. `CREATE ROLE` is not transactional in the way DDL is. The plan moves it to a separate manual step.
- Adding RLS to the 33 non-sensitive tenant tables deferred above.

## Plan

### Step 1 — Create the migration directory

```
prisma/migrations/20260604000000_add_rls_policies/
  migration.sql
```

Timestamp chosen: 2026-06-04 is today's date; `00:00:00` keeps it cleanly later than the last migration (`20260531165500`). The directory name matches the path referenced in 43-04-PLAN.md (`prisma/migrations/.../rls-policies.sql` → `prisma/migrations/.../add_rls_policies/migration.sql`).

### Step 2 — Narrow the migration to the 14 scoped tables

Remove the 33 tables in the "deferred" section above. Keep the structure (sections 1-4) but only for the scoped set. The 45 → 14 reduction is the most consequential change and the one that aligns with ADR-019.

### Step 3 — Fix the GUC name and add platform-admin bypass

Replace the helper function in the SQL:

```sql
CREATE OR REPLACE FUNCTION is_tenant_admin() RETURNS boolean
  LANGUAGE sql STABLE AS
$
  SELECT
    current_setting('app.is_platform_admin', true) = 'true'
    OR current_setting('app.user_role', true) = ANY(
      ARRAY['ADMIN','MANAGER','BOARD','COMMITTEE','GROUP_ADMIN']
    )
$;
```

This matches what `runWithRLS` actually sets (per `src/shared/api/db.ts:189-198`) and includes `GROUP_ADMIN` for group management data. `AGENT` and `ASSOCIATE` are deliberately excluded — those roles do not have cross-user tenant visibility in the application layer either.

Also expose a `is_platform_admin()` helper for policies that should be platform-only (used by `Notification` so platform admins see all notifications across tenants during support operations):

```sql
CREATE OR REPLACE FUNCTION is_platform_admin() RETURNS boolean
  LANGUAGE sql STABLE AS
$
  SELECT current_setting('app.is_platform_admin', true) = 'true'
$;
```

### Step 4 — Add `WITH CHECK` to every policy

For every `CREATE POLICY tenant_isolation ON "..."` block, add a `WITH CHECK` clause that mirrors the `USING` predicate. Example transformation for `Notification` (the only user-scoped table in the scoped set):

```sql
CREATE POLICY tenant_isolation ON "Notification"
  USING (
    "tenantId" = current_setting('app.tenant_id', true)
    AND (
      "userId" = current_setting('app.user_id', true)
      OR is_tenant_admin()
      OR is_platform_admin()
    )
  )
  WITH CHECK (
    "tenantId" = current_setting('app.tenant_id', true)
    AND (
      "userId" = current_setting('app.user_id', true)
      OR is_tenant_admin()
    )
  );
```

Note the asymmetry: `is_platform_admin` is in the `USING` clause (read across tenants during support) but **not** in the `WITH CHECK` clause (a platform admin must not accidentally write to a tenant they're inspecting). Apply this pattern to all 14 policies. The 13 tenant-only policies (no `userId` filter) get a simpler `WITH CHECK (tenantId = current_setting('app.tenant_id', true))`.

### Step 5 — Make every `CREATE POLICY` idempotent

Prepend each `CREATE POLICY` with `DROP POLICY IF EXISTS tenant_isolation ON "<Table>";`. Apply to all 14 tables.

### Step 6 — Fix the misleading comments on `SurveySection` and `Question`

These are not in the scoped set, so this is a no-op. If a future phase adds them back, fix the comments then.

### Step 7 — Add composite indexes to the Prisma schema

Edit `prisma/schema.prisma` to add `@@index([tenantId, userId])` on:

- `Notification` (already a `@@index([userId])` exists; add the composite)
- `MaintenanceRequest` (already a `@@index([userId])` exists; add the composite)

(User already has `@@index([tenantId, id])` and other indexes; verify with `prisma generate` whether a composite is needed for the RLS predicate plan. Out of the user-scoped tables in scope, only Notification and MaintenanceRequest have a `userId` column with a `@@index([userId])` but no composite.)

This requires a separate Prisma migration: `20260604000001_add_rls_composite_indexes/`. The DDL should match the format Prisma generates.

### Step 8 — Gate role setup with a password guard

The original `add_rls.sql` creates the `app_user` role with the literal password `'replace_with_strong_password'`. Move the role creation to a separate manual step (runbook), and harden it with a guard if it stays in the migration:

```sql
DO $
BEGIN
  IF current_setting('app.migration_password', true) = 'replace_with_strong_password' THEN
    RAISE EXCEPTION 'Refusing to create app_user with placeholder password. Set app.migration_password via psql -v or run the role setup manually first.';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    EXECUTE format('CREATE ROLE app_user LOGIN PASSWORD %L', current_setting('app.migration_password'));
  END IF;
END $;
```

**Recommendation:** move role creation to `docs/STEERING/RLS.md` step 0 and remove it from the migration entirely. `CREATE ROLE` does not belong in a Prisma migration that runs in a transaction.

### Step 9 — Add a verification query block

The trailing `SELECT ... FROM pg_tables` is fine. Wrap it in a `DO $$` block that raises if any of the 14 expected tables is missing RLS:

```sql
DO $
DECLARE
  missing TEXT;
BEGIN
  SELECT string_agg(tablename, ', ')
    INTO missing
    FROM (VALUES
      -- ADR-019 sensitive (6)
      ('"user"'), ('session'), ('account'), ('passkey'),
      ('twoFactor'), ('profile'),
      -- Phase 43 43-04 admin routes (8)
      ('maintenanceRequests'), ('contents'), ('surveys'),
      ('events'), ('groupMembershipRequests'), ('announcements'),
      ('competitions'), ('settings')
    ) AS expected(tablename)
    LEFT JOIN pg_tables t
      ON t.schemaname = 'public' AND t.tablename = expected.tablename
    WHERE t.tablename IS NULL OR t.rowsecurity = false;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'RLS not enabled on: %', missing;
  END IF;
END $;
```

(Verify the casing: Prisma's `@map`/snake_case mappings may mean the actual table name is `maintenance_requests` not `maintenanceRequests`. Adjust the `VALUES` list to match what's actually in `pg_tables` after Prisma's naming.)

### Step 10 — Document the rollout in `docs/STEERING/RLS.md`

Create a new document covering:

- **Stage A (this migration):** Apply `20260604000000_add_rls_policies` against a non-production tenant first. App continues connecting as owner; RLS is dormant. Purpose: validates SQL correctness, no behavioural change.
- **Stage B (Phase 43, plan 43-04):** Wrap the 5 admin routes in `runWithRLS()`. Once that lands, the policies in this migration become live for those routes. Verify with a `pnpm dev` session that hits each of the 5 routes as both `ADMIN` and `RESIDENT` — admins see all rows, residents see only their own.
- **Stage C (future work, not in this plan):** Wrap the remaining 100+ tenant-scoped routes in `runWithRLS()`. Track in a follow-up BD issue (likely `oqw` continuation).
- **Operational notes:**
  - `app_user` does not have `CREATEROLE` or schema-migration privileges. Migrations must run as the owner role.
  - `set_config(..., true)` is transaction-scoped; the GUC values reset on commit/rollback. Safe by construction.
  - The "skipped" auth tables (`session`, `account`, `verification`, `passkey`) are explicitly out of scope. Better Auth connects as the owner role.
  - 33 non-sensitive tenant tables (Announcement, Booking, Content, Competition, etc.) are deliberately not in this migration. They follow ADR-019's application-layer auth model. A future phase (likely M6+ second-tenant onboarding) should revisit this.
  - If a new sensitive table is added to the schema, a follow-up migration must add the matching RLS policy. Add a CI check that diffs `pg_tables WHERE rowsecurity = false` against the 14-table whitelist.

### Step 11 — Update AGENTS.md with the new RLS note

Add a short pointer under "Tech Stack → Database" in `AGENTS.md`:

```
- RLS lives in `prisma/migrations/20260604000000_add_rls_policies/`. Scope is the 14 tables
  from ADR-019 (6 sensitive) + Phase 43 43-04 admin routes (8). Stage A applied at rest;
  app connects as the table owner so policies are dormant. Stage B (Phase 43 plan 43-04)
  wires runWithRLS() to the first 5 admin routes. Stage C is deferred.
```

## Files to change

| File                                                                       | Change                                                                     |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `prisma/migrations/add_rls.sql`                                            | Delete (moved into proper migration directory, narrowed)                   |
| `prisma/migrations/add_rls_note.md`                                        | Delete (replaced by `docs/STEERING/RLS.md`)                                |
| `prisma/migrations/20260604000000_add_rls_policies/migration.sql`          | **New** — fixed, narrowed RLS DDL (14 tables, not 45)                      |
| `prisma/migrations/20260604000001_add_rls_composite_indexes/migration.sql` | **New** — composite index DDL on `Notification`, `MaintenanceRequest`      |
| `prisma/schema.prisma`                                                     | Add `@@index([tenantId, userId])` on `Notification`, `MaintenanceRequest`  |
| `docs/STEERING/RLS.md`                                                     | **New** — rollout runbook aligned with ADR-019 + Phase 43                  |
| `AGENTS.md`                                                                | One-line pointer under Tech Stack → Database                               |
| `docs/STEERING/ADR.md`                                                     | Append a note to ADR-019 linking to the new migration and confirming scope |

## Verification

1. **Local dry-run on a copy of production data.** Restore a prod snapshot to a scratch DB, run `psql -v migration_password=$DB_APP_PASSWORD -f prisma/migrations/20260604000000_add_rls_policies/migration.sql` and confirm all policies apply and the verification block passes.
2. **Behavioural parity test.** While the app still connects as the owner, run the full Vitest suite (`pnpm test`) and the E2E suite. There should be zero changes — the SQL is dormant because the owner role bypasses RLS.
3. **Synthetic RLS enforcement test.** Connect manually as `app_user` and run:
   ```sql
   SET ROLE app_user;
   SELECT set_config('app.tenant_id', '<tenant-A-id>', true);
   SELECT set_config('app.user_id', '<resident-in-A>', true);
   SELECT set_config('app.user_role', 'RESIDENT', true);
   SELECT set_config('app.is_platform_admin', 'false', true);
   -- Expect: only rows where tenantId = tenant-A AND (userId = <resident-in-A> OR is_tenant_admin())
   SELECT count(*) FROM "Notification";
   ```
4. **Admin escalation test.** Same connection, but with `app.user_role = 'ADMIN'`. Expect: all rows in tenant-A are visible for `Notification`, `MaintenanceRequest`. With `app.is_platform_admin = 'true'`, expect: cross-tenant reads also visible.
5. **Idempotency test.** Run the migration a second time on the same DB. Expect: zero errors. Every policy is dropped before being recreated.
6. **Phase 43 43-04 integration test.** Once 43-04 lands (wrapping the 5 admin routes in `runWithRLS()`), run the per-route E2E for each of the 5 routes as `ADMIN`, `BOARD`, and `RESIDENT`. Confirm role-based visibility matches the policy.
7. **BD tracking verification.** Run `bd ready` and confirm:
   - `4a6` is ready (no blockers) — this is the migration work itself
   - `oqw` shows `4a6` as a blocker — proves the prerequisite relationship
   - `t78` shows `4a6` as a blocker — proves the expansion is parked
   - `57d` shows `4a6` as a blocker — proves the rollout is parked
   - `.planning/BD.md` lists all four in the RLS Work cross-phase table
8. **Roadmap hygiene.** Run `gsd-sdk query validate.health` (or equivalent) against `.planning/`. Confirm no validation errors before committing the plan.

## Out of scope (follow-up work)

Tracked in BD:

- **BD `oqw` (Phase 43 43-04):** Wrap the 5 admin routes in `runWithRLS()`. Tracked separately in `.planning/phases/43-m4-5-blockers/43-04-PLAN.md`. **This plan is a prerequisite for 43-04 to work correctly.** `oqw` is now blocked by `4a6`.
- **BD `57d` (Stage C):** Wrapping the remaining ~100 routes in `runWithRLS()`. Future phase, post-43. Blocked by `4a6`.
- **BD `t78` (M6+):** Adding RLS to the 33 non-sensitive tenant tables (Booking, Group, Resource, Household, Property, etc.). Re-evaluate when second-tenant onboarding begins. Blocked by `4a6`.
- **Better Auth tables** (`session`, `account`, `verification`, `passkey`): Better Auth needs cross-tenant `email` lookups for login; solving this requires either a `SECURITY DEFINER` function or a separate auth database. Not currently tracked in BD; raise a P3 issue if it becomes a priority.
- **CI check** that diffs `pg_tables WHERE rowsecurity = false` against the 14-table whitelist. Should land in a follow-up phase to prevent new sensitive tables from shipping without RLS. Not currently tracked in BD.
  ut RLS. Not currently tracked in BD.
