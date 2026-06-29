# Row-Level Security (RLS) Runbook

This document is the operational reference for the Soralia Village RLS rollout. It supersedes the notes in `prisma/migrations/add_rls_note.md` (which contained a connection-role claim that is **wrong** and would break login if implemented).

The plan behind this runbook is at `.commandcode/plans/rls-migration.md`. The migration files are at `prisma/migrations/20260604000000_add_rls_policies/migration.sql` and `prisma/migrations/20260604000001_add_rls_composite_indexes/migration.sql`.

## Step 0 — Connection role model (CRITICAL)

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
5. `add_rls_note.md` contradicts this with _"Your DATABASE_URL in production uses app_user"_. That note is **wrong** and was replaced by this runbook.

This section is the single source of truth for the connection-role model. It must be reproduced verbatim in any future runbook and referenced from `AGENTS.md` and `ADR-019`.

## Step 1 — One-time `app_user` role setup

Run this **once per environment** as the Postgres owner role. Substitute the real password via `psql -v` rather than committing a literal to git.

```bash
psql "$DATABASE_URL" -v app_password="$DB_APP_PASSWORD" <<'SQL'
DO $setup$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    EXECUTE format('CREATE ROLE app_user LOGIN PASSWORD %L', current_setting('app.app_password'));
  END IF;
END
$setup$;

GRANT USAGE ON SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Future tables created by the owner role also become accessible to app_user.
-- Supabase uses 'postgres' as the owner. Replace if your owner differs.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE ON SEQUENCES TO app_user;

-- Run this after any schema migration that adds new tables:
--   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
SQL
```

**Verify:**

```sql
SELECT rolname, rolcanlogin, rolbypassrls FROM pg_roles WHERE rolname IN ('app_user', current_user);
-- Expect: app_user rolcanlogin=true rolbypassrls=false
-- Expect: postgres rolcanlogin=true rolbypassrls=true
```

```sql
-- All tables must be accessible to app_user. Expect: 0 rows (no missing grants)
SELECT t.tablename
  FROM pg_tables t
 WHERE t.schemaname = 'public'
   AND NOT has_table_privilege('app_user', quote_ident(t.tablename), 'SELECT');
```

## Step 2 — Apply the RLS migration

```bash
psql "$DATABASE_URL" -f prisma/migrations/20260604000000_add_rls_policies/migration.sql
psql "$DATABASE_URL" -f prisma/migrations/20260604000001_add_rls_composite_indexes/migration.sql
```

The first migration includes a `DO $$ ... RAISE EXCEPTION` block at the end that aborts loudly if RLS is not enabled on any of the 15 expected tables. If you see `RLS not enabled on: ...`, the migration has drifted from the schema — investigate before re-running.

**Verify:**

```sql
-- All 15 expected tables should have rowsecurity = true
SELECT tablename, rowsecurity, forcerowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'user', 'session', 'account', 'passkey', 'twoFactor', 'profile',
    'Notification', 'MaintenanceRequest', 'Content', 'Survey', 'Event',
    'GroupMembershipRequest', 'Announcement', 'Competition', 'Setting'
  )
ORDER BY tablename;
-- Expect: 15 rows, all with rowsecurity = true and forcerowsecurity = true
```

## Step 3 — Confirm app is still on the owner role

The app is dormant against RLS as long as `DATABASE_URL` uses the owner role. The owner role bypasses RLS even on tables with `FORCE ROW LEVEL SECURITY`, so existing routes that don't use `runWithRLS` continue to work unchanged.

```bash
psql "$DATABASE_URL" -c "SELECT current_user;"
# Expect: the owner role, NOT app_user
```

## Stage A — Dormant (this migration lands here)

After Step 2, the migration is **dormant**: the policies exist, but no application code path uses `app_user`. All queries still run as the owner and bypass RLS. The Vitest suite, E2E suite, and manual QA should all pass unchanged.

This is the verification gate before moving to Stage B.

## Stage B — Wire `runWithRLS()` to the 5 admin routes (Phase 43 plan 43-04)

Once Stage A is verified, Phase 43 plan 43-04 (BD `oqw`) wraps the 5 admin routes in `runWithRLS(ctx, async (tx) => ...)`. After that lands:

- `GET /api/admin/activity` (uses `maintenanceRequests, users, contents, surveys, events`)
- `GET /api/admin/board-members` (uses `users`)
- `GET /api/admin/maintenance-stats` (uses `users, maintenanceRequests`)
- `GET /api/admin/urgency` (uses `maintenanceRequests, groupMembershipRequests, surveys, announcements, contents, competitions`)
- `GET/POST /api/admin/settings/page-flags` (uses `settings` via `platform-flags.ts`)

Each `tx.*` call inside the wrap executes under `app_user` and is subject to the policies. The 14 other tables in the migration scope (sensitive + admin-route) are also live for any code that wraps them in `runWithRLS`.

**Verify after 43-04 lands:**

```sql
-- As RESIDENT: should see only own notifications
SET ROLE app_user;
SELECT set_config('app.tenant_id', '<tenant-A-id>', true);
SELECT set_config('app.user_id', '<resident-in-A-id>', true);
SELECT set_config('app.user_role', 'RESIDENT', true);
SELECT set_config('app.is_platform_admin', 'false', true);
SELECT count(*) FROM "Notification";
-- Expect: only rows where userId = <resident-in-A-id>

-- As ADMIN: should see all rows in tenant
SELECT set_config('app.user_role', 'ADMIN', true);
SELECT count(*) FROM "Notification";
-- Expect: all rows where tenantId = <tenant-A-id>

-- As PLATFORM_ADMIN: should see all rows across tenants
SELECT set_config('app.user_role', 'RESIDENT', true);  -- role doesn't matter
SELECT set_config('app.is_platform_admin', 'true', true);
SELECT count(*) FROM "Notification";
-- Expect: all rows in the database
```

**Synthetic test (no app code):**

```sql
SET ROLE app_user;
SELECT set_config('app.tenant_id', '<tenant-A-id>', true);
SELECT set_config('app.user_id', '<some-user-in-A>', true);
SELECT set_config('app.user_role', 'RESIDENT', true);
SELECT set_config('app.is_platform_admin', 'false', true);

-- MaintenanceRequest: tenant-only, should see all in tenant
SELECT count(*) FROM "MaintenanceRequest";
-- Expect: all rows where tenantId = <tenant-A-id>

-- Content: tenant-only, should see all in tenant
SELECT count(*) FROM "Content";
-- Expect: all rows where tenantId = <tenant-A-id>

-- Setting: tenant-only, should see all in tenant
SELECT count(*) FROM "Setting";
-- Expect: all rows where tenantId = <tenant-A-id>
```

**Idempotency test:**

```bash
psql "$DATABASE_URL" -f prisma/migrations/20260604000000_add_rls_policies/migration.sql
# Expect: 0 errors. Every CREATE POLICY is preceded by DROP POLICY IF EXISTS.
```

## Stage C — Roll out to remaining ~100 routes (BD `57d`)

Future work, post-Phase 43. Wrap the remaining tenant-scoped routes in `runWithRLS()` one family at a time. Suggested order (highest privilege-leak risk first):

1. Messaging: Conversation, Message, ConversationParticipant (cross-user access)
2. Maintenance: routes under `/api/maintenance/*` (excl. stats, already in 43-04)
3. Bookings: `/api/bookings/*` (user-scoping)
4. Notifications: `/api/notifications/*` (user-scoping)
5. Content, Surveys, Resources, Groups, Competitions, Events, Directory, Community Services, Premium

Each route migration is its own small PR. Add a per-route test that verifies:

- Resident can read their own rows
- Resident CANNOT read other users' rows (RLS returns empty)
- ADMIN/BOARD/MANAGER can read all rows in tenant
- Cross-tenant access returns zero rows

## Operational notes

- **`app_user` does not have `CREATEROLE` or schema-migration privileges.** Migrations must run as the owner role. Prisma's migration commands connect via `DATABASE_URL` (which is the owner), so this is automatic.
- **`set_config(..., true)` is transaction-scoped** — the GUC values reset on commit/rollback. Safe by construction.
- **The "skipped" auth tables (`session`, `account`, `verification`, `passkey`)** are explicitly out of scope. Better Auth connects as the owner role. Adding RLS to these tables would break login.
- **30 non-sensitive tenant tables** (Announcement was added back to the in-scope set, but the 30 others — Booking, Group, Resource, Household, Property, etc.) are deliberately not in this migration. They follow ADR-019's application-layer auth model. A future phase (BD `t78`, M6+ second-tenant onboarding) should revisit this.
- **If a new sensitive or admin-route table is added to the schema**, a follow-up migration must add the matching RLS policy. Add a CI check that diffs `pg_tables WHERE rowsecurity = false` against the 15-table whitelist.

## Rollback

If something goes wrong, RLS can be disabled per-table without dropping the policies:

```sql
ALTER TABLE "Notification" DISABLE ROW LEVEL SECURITY;
```

Or globally for a faster emergency rollback:

```sql
-- Generate a DISABLE statement for every policy
SELECT format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY;', tablename)
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true
  AND tablename IN (
    'user', 'session', 'account', 'passkey', 'twoFactor', 'profile',
    'Notification', 'MaintenanceRequest', 'Content', 'Survey', 'Event',
    'GroupMembershipRequest', 'Announcement', 'Competition', 'Setting'
  );
```

After running the generated statements, the migration is dormant again (Stage A). Re-enable with `ENABLE ROW LEVEL SECURITY` per table.

## References

- Plan: `.commandcode/plans/rls-migration.md`
- ADR: `docs/STEERING/ADR.md` ADR-019 (Focused RLS on Sensitive Tables + Application-Layer Audit)
- BD: `4a6` (this migration), `oqw` (Phase 43 43-04, Stage B), `t78` (M6+ expansion), `57d` (Stage C rollout)
- Phase 43 plans: `.planning/phases/43-m4-5-blockers/43-04-PLAN.md`
- App code: `src/shared/api/db.ts` (lines 189-198 `runWithRLS`, 209-224 `getRLSContext`)
