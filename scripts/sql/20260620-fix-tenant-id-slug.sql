-- Fix users whose tenantId was stored as a slug ("soralia") instead of the
-- tenant UUID. The Better Auth additionalFields defaultValue was incorrectly
-- set to tenantConfig.defaultSlug (a slug string) instead of the tenant UUID.
--
-- Run against the dev database with:
--   psql "$DATABASE_URL" -f scripts/sql/20260620-fix-tenant-id-slug.sql

UPDATE "user"
SET "tenantId" = subquery.id
FROM (
  SELECT id, slug FROM "Tenant"
) AS subquery
WHERE "user"."tenantId" = subquery.slug;
