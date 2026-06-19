-- =============================================================================
-- Fix mutable search_path on helper functions
-- (Supabase Security Lint 0011_function_search_path_mutable)
--
-- Without an explicit search_path, an attacker with permissions to create
-- objects in a schema earlier in the search path (e.g. pg_temp) can hijack
-- these functions. Setting search_path = 'public' restricts lookups.
-- =============================================================================

CREATE OR REPLACE FUNCTION is_tenant_admin() RETURNS boolean
  LANGUAGE sql STABLE
  SET search_path = 'public'
AS $func$
  SELECT
    current_setting('app.is_platform_admin', true) = 'true'
    OR current_setting('app.user_role', true) = ANY(
      ARRAY['ADMIN','MANAGER','BOARD','COMMITTEE','GROUP_ADMIN']
    )
$func$;

CREATE OR REPLACE FUNCTION is_platform_admin() RETURNS boolean
  LANGUAGE sql STABLE
  SET search_path = 'public'
AS $func$
  SELECT current_setting('app.is_platform_admin', true) = 'true'
$func$;
