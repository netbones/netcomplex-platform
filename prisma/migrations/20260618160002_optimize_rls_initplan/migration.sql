-- =============================================================================
-- Optimize RLS initplan (Supabase Performance Lint 0003_auth_rls_initplan)
--
-- Wraps current_setting() and helper function calls in (select ...) to force
-- PostgreSQL to evaluate them once as an initplan per query, rather than
-- re-evaluating per row. Affects all 14 tenant_isolation policies.
--
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
-- =============================================================================

-- ADR-019 sensitive tables (6)

DROP POLICY IF EXISTS tenant_isolation ON "user";
CREATE POLICY tenant_isolation ON "user"
  USING ("tenantId" = (select current_setting('app.tenant_id', true)))
  WITH CHECK ("tenantId" = (select current_setting('app.tenant_id', true)));

DROP POLICY IF EXISTS tenant_isolation ON "session";
CREATE POLICY tenant_isolation ON "session"
  USING ("tenantId" = (select current_setting('app.tenant_id', true)))
  WITH CHECK ("tenantId" = (select current_setting('app.tenant_id', true)));

DROP POLICY IF EXISTS tenant_isolation ON "account";
CREATE POLICY tenant_isolation ON "account"
  USING ("tenantId" = (select current_setting('app.tenant_id', true)))
  WITH CHECK ("tenantId" = (select current_setting('app.tenant_id', true)));

DROP POLICY IF EXISTS tenant_isolation ON "passkey";
CREATE POLICY tenant_isolation ON "passkey"
  USING ("tenantId" = (select current_setting('app.tenant_id', true)))
  WITH CHECK ("tenantId" = (select current_setting('app.tenant_id', true)));

DROP POLICY IF EXISTS tenant_isolation ON "twoFactor";
CREATE POLICY tenant_isolation ON "twoFactor"
  USING ("tenantId" = (select current_setting('app.tenant_id', true)))
  WITH CHECK ("tenantId" = (select current_setting('app.tenant_id', true)));

DROP POLICY IF EXISTS tenant_isolation ON "Profile";
CREATE POLICY tenant_isolation ON "Profile"
  USING ("tenantId" = (select current_setting('app.tenant_id', true)))
  WITH CHECK ("tenantId" = (select current_setting('app.tenant_id', true)));

-- Phase 43 43-04 admin-route tables (8)

DROP POLICY IF EXISTS tenant_isolation ON "Notification";
CREATE POLICY tenant_isolation ON "Notification"
  USING (
    "tenantId" = (select current_setting('app.tenant_id', true))
    AND (
      "userId" = (select current_setting('app.user_id', true))
      OR (select is_tenant_admin())
      OR (select is_platform_admin())
    )
  )
  WITH CHECK (
    "tenantId" = (select current_setting('app.tenant_id', true))
    AND (
      "userId" = (select current_setting('app.user_id', true))
      OR (select is_tenant_admin())
    )
  );

DROP POLICY IF EXISTS tenant_isolation ON "MaintenanceRequest";
CREATE POLICY tenant_isolation ON "MaintenanceRequest"
  USING ("tenantId" = (select current_setting('app.tenant_id', true)))
  WITH CHECK ("tenantId" = (select current_setting('app.tenant_id', true)));

DROP POLICY IF EXISTS tenant_isolation ON "Content";
CREATE POLICY tenant_isolation ON "Content"
  USING ("tenantId" = (select current_setting('app.tenant_id', true)))
  WITH CHECK ("tenantId" = (select current_setting('app.tenant_id', true)));

DROP POLICY IF EXISTS tenant_isolation ON "Survey";
CREATE POLICY tenant_isolation ON "Survey"
  USING ("tenantId" = (select current_setting('app.tenant_id', true)))
  WITH CHECK ("tenantId" = (select current_setting('app.tenant_id', true)));

DROP POLICY IF EXISTS tenant_isolation ON "Event";
CREATE POLICY tenant_isolation ON "Event"
  USING ("tenantId" = (select current_setting('app.tenant_id', true)))
  WITH CHECK ("tenantId" = (select current_setting('app.tenant_id', true)));

DROP POLICY IF EXISTS tenant_isolation ON "GroupMembershipRequest";
CREATE POLICY tenant_isolation ON "GroupMembershipRequest"
  USING ("tenantId" = (select current_setting('app.tenant_id', true)))
  WITH CHECK ("tenantId" = (select current_setting('app.tenant_id', true)));

DROP POLICY IF EXISTS tenant_isolation ON "Announcement";
CREATE POLICY tenant_isolation ON "Announcement"
  USING ("tenantId" = (select current_setting('app.tenant_id', true)))
  WITH CHECK ("tenantId" = (select current_setting('app.tenant_id', true)));

DROP POLICY IF EXISTS tenant_isolation ON "Competition";
CREATE POLICY tenant_isolation ON "Competition"
  USING ("tenantId" = (select current_setting('app.tenant_id', true)))
  WITH CHECK ("tenantId" = (select current_setting('app.tenant_id', true)));

DROP POLICY IF EXISTS tenant_isolation ON "Setting";
CREATE POLICY tenant_isolation ON "Setting"
  USING ("tenantId" = (select current_setting('app.tenant_id', true)))
  WITH CHECK ("tenantId" = (select current_setting('app.tenant_id', true)));
