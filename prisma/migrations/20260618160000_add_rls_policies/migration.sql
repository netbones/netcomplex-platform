-- =============================================================================
-- RLS Migration (BD soralia-village-4a6)
--
-- Scope: 15 tables from ADR-019 (6 sensitive) + Phase 43 plan 43-04 (9
-- admin-route tables, with `user` overlapping the sensitive set). 30
-- non-sensitive tables are deliberately deferred to M6+ (see BD
-- soralia-village-t78).
--
-- Connection role model (CRITICAL — see docs/STEERING/RLS.md step 0):
--   * DATABASE_URL continues to use the OWNER role (BYPASSRLS).
--   * app_user is only active inside runWithRLS(ctx, async (tx) => ...).
--   * The app_user role + grants are created in a separate runbook step
--     BEFORE this migration is applied.
--   * If DATABASE_URL is ever changed to use app_user directly, Better Auth
--     login and getRLSContext both break. Do not change DATABASE_URL.
--
-- This migration is dormant at the app layer: routes that do not use
-- runWithRLS continue to connect as the owner and bypass RLS. RLS becomes
-- live for the 5 admin routes once Phase 43 plan 43-04 wraps them in
-- runWithRLS (BD soralia-village-oqw).
-- =============================================================================


-- =============================================================================
-- 1. Helper functions
-- =============================================================================

-- is_tenant_admin() — centralises the staff/admin role check.
-- Reads app.user_role (the GUC runWithRLS actually sets) and falls back to
-- app.is_platform_admin. GROUP_ADMIN is included for group management
-- visibility. AGENT and ASSOCIATE are deliberately excluded — those roles
-- do not have cross-user tenant visibility in the application layer.
CREATE OR REPLACE FUNCTION is_tenant_admin() RETURNS boolean
  LANGUAGE sql STABLE AS
$func$
  SELECT
    current_setting('app.is_platform_admin', true) = 'true'
    OR current_setting('app.user_role', true) = ANY(
      ARRAY['ADMIN','MANAGER','BOARD','COMMITTEE','GROUP_ADMIN']
    )
$func$;

-- is_platform_admin() — read-across-tenants for support operations.
-- Used in USING clauses (read path). Deliberately NOT used in WITH CHECK
-- clauses — a platform admin must not accidentally write to a tenant
-- they're inspecting.
CREATE OR REPLACE FUNCTION is_platform_admin() RETURNS boolean
  LANGUAGE sql STABLE AS
$func$
  SELECT current_setting('app.is_platform_admin', true) = 'true'
$func$;


-- =============================================================================
-- 2. ADR-019 sensitive tables (6)
--    PII + auth credentials. RLS enforced when app_user is the active role.
--    Note: Better Auth connects as the OWNER role (DATABASE_URL), so login
--    flows are not affected. getRLSContext also uses the owner connection
--    for its user lookup at src/shared/api/db.ts:214.
-- =============================================================================

-- user — covered by admin routes (board-members, activity, maintenance-stats)
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "user";
CREATE POLICY tenant_isolation ON "user"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

-- session
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "session";
CREATE POLICY tenant_isolation ON "session"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

-- account
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "account" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "account";
CREATE POLICY tenant_isolation ON "account"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

-- passkey
ALTER TABLE "passkey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "passkey" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "passkey";
CREATE POLICY tenant_isolation ON "passkey"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

-- twoFactor
ALTER TABLE "twoFactor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "twoFactor" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "twoFactor";
CREATE POLICY tenant_isolation ON "twoFactor"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

-- profile
ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Profile" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Profile";
CREATE POLICY tenant_isolation ON "Profile"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));


-- =============================================================================
-- 3. Phase 43 plan 43-04 admin-route tables (8 unique)
--    Read by 5 admin routes wrapping in runWithRLS (BD oqw). The
--    notification table is the only user-scoped one — admins/managers see
--    all rows in tenant, residents see only their own. All other tables
--    are tenant-only.
-- =============================================================================

-- Notification — users see only their own; admins/managers see all in tenant
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Notification";
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

-- MaintenanceRequest — used by activity, maintenance-stats, urgency
ALTER TABLE "MaintenanceRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MaintenanceRequest" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "MaintenanceRequest";
CREATE POLICY tenant_isolation ON "MaintenanceRequest"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

-- Content — used by activity, urgency
ALTER TABLE "Content" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Content" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Content";
CREATE POLICY tenant_isolation ON "Content"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

-- Survey — used by activity, urgency
ALTER TABLE "Survey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Survey" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Survey";
CREATE POLICY tenant_isolation ON "Survey"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

-- Event — used by activity
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Event";
CREATE POLICY tenant_isolation ON "Event"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

-- GroupMembershipRequest — used by urgency
ALTER TABLE "GroupMembershipRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GroupMembershipRequest" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "GroupMembershipRequest";
CREATE POLICY tenant_isolation ON "GroupMembershipRequest"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

-- Announcement — used by urgency
ALTER TABLE "Announcement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Announcement" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Announcement";
CREATE POLICY tenant_isolation ON "Announcement"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

-- Competition — used by urgency
ALTER TABLE "Competition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Competition" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Competition";
CREATE POLICY tenant_isolation ON "Competition"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

-- Setting — used by page-flags (via platform-flags helper)
ALTER TABLE "Setting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Setting" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Setting";
CREATE POLICY tenant_isolation ON "Setting"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));


-- =============================================================================
-- 4. Verification
--    The migration aborts loudly if any of the 14 expected tables is missing
--    RLS. This catches drift between the migration and the schema.
-- =============================================================================
DO $verify$
DECLARE
  missing TEXT;
BEGIN
  SELECT string_agg(expected.tablename, ', ')
    INTO missing
    FROM (VALUES
      -- ADR-019 sensitive (6)
      ('user'), ('session'), ('account'), ('passkey'),
      ('twoFactor'), ('Profile'),
      -- Phase 43 43-04 admin routes (8) — note PascalCase (quoted)
      ('Notification'), ('MaintenanceRequest'), ('Content'), ('Survey'),
      ('Event'), ('GroupMembershipRequest'), ('Announcement'),
      ('Competition'), ('Setting')
    ) AS expected(tablename)
    LEFT JOIN pg_tables t
      ON t.schemaname = 'public' AND t.tablename = expected.tablename
    WHERE t.tablename IS NULL OR t.rowsecurity = false;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'RLS not enabled on: %', missing;
  END IF;
END
$verify$;
