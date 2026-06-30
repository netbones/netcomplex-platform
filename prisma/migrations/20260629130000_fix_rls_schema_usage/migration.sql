-- =============================================================================
-- RLS Fix: Schema-level USAGE for app_user
--
-- The original runbook granted per-table SELECT on 15 tables to app_user but
-- omitted GRANT USAGE ON SCHEMA public. Without schema USAGE, PostgreSQL
-- cannot resolve ANY table name for app_user ("relation does not exist").
--
-- This affects every query inside runWithRLS().
-- =============================================================================

GRANT USAGE ON SCHEMA public TO "app_user";
