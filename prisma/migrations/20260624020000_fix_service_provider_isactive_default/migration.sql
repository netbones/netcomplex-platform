-- GAP-10: Change ServiceProvider.isActive default from true to false
-- All creation code paths already set isActive=false explicitly.

ALTER TABLE "ServiceProvider" ALTER COLUMN "isActive" SET DEFAULT false;
