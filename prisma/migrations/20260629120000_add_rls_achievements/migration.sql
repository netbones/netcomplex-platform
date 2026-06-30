-- =============================================================================
-- RLS Migration: Achievements System + Schema USAGE fix
--
-- Scope: 4 achievement tables + schema-level grant missing from the original
-- runbook. The original RLS migration's runbook step granted per-table SELECT
-- on the 15 base tables to app_user but omitted GRANT USAGE ON SCHEMA public,
-- making every table inaccessible to app_user ("relation does not exist").
--
-- Connection role model — see docs/STEERING/RLS.md step 0.
-- =============================================================================

-- =============================================================================
-- 1. Schema-level USAGE (CRITICAL — was missing from the original runbook step)
--    Without this, app_user cannot resolve ANY table in the public schema,
--    causing "relation does not exist" on every query inside runWithRLS.
-- =============================================================================

GRANT USAGE ON SCHEMA public TO "app_user";

-- =============================================================================
-- 2. Grant base access to app_user
--    AchievementDefinition is a global catalog — no RLS, all app_users read.
-- =============================================================================

GRANT SELECT ON "AchievementDefinition" TO "app_user";
GRANT SELECT ON "TenantAchievement" TO "app_user";
GRANT SELECT ON "UserAchievementProgress" TO "app_user";
GRANT SELECT ON "UserAchievement" TO "app_user";

-- =============================================================================
-- 2. Tenant-scoped tables (3)
--    TenantAchievement: tenant-only isolation (admins manage per-tenant config)
--    UserAchievementProgress / UserAchievement: users see own rows, admins see
--    all in tenant (same pattern as Notification).
-- =============================================================================

-- TenantAchievement — tenant-isolated, admins manage per-tenant config
ALTER TABLE "TenantAchievement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantAchievement" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "TenantAchievement";
CREATE POLICY tenant_isolation ON "TenantAchievement"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)
    AND is_tenant_admin());

-- UserAchievementProgress — tenant + user isolated
ALTER TABLE "UserAchievementProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserAchievementProgress" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "UserAchievementProgress";
CREATE POLICY tenant_isolation ON "UserAchievementProgress"
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

-- UserAchievement — tenant + user isolated
ALTER TABLE "UserAchievement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserAchievement" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "UserAchievement";
CREATE POLICY tenant_isolation ON "UserAchievement"
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

-- =============================================================================
-- 3. Verification
-- =============================================================================
DO $verify$
DECLARE
  missing TEXT;
BEGIN
  SELECT string_agg(expected.tablename, ', ')
    INTO missing
    FROM (VALUES
      ('TenantAchievement'),
      ('UserAchievementProgress'),
      ('UserAchievement')
    ) AS expected(tablename)
    LEFT JOIN pg_tables t
      ON t.schemaname = 'public' AND t.tablename = expected.tablename
    WHERE t.tablename IS NULL OR t.rowsecurity = false;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'RLS not enabled on: %', missing;
  END IF;
END
$verify$;
