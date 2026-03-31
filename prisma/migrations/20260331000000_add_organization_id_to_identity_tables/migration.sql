-- Add organizationId (nullable) to identity tables for multi-tenancy / RLS preparation
-- Safe migration: nullable column, no default required, no data loss
ALTER TABLE "household"
ADD COLUMN "organization_id" TEXT;
ALTER TABLE "standardSeat"
ADD COLUMN "organization_id" TEXT;
ALTER TABLE "profile"
ADD COLUMN "organization_id" TEXT;
ALTER TABLE "soloSeat"
ADD COLUMN "organization_id" TEXT;
ALTER TABLE "agentAccess"
ADD COLUMN "organization_id" TEXT;
-- Indexes for efficient tenant-scoped queries
CREATE INDEX "household_organization_id_idx" ON "household"("organization_id");
CREATE INDEX "standardSeat_organization_id_idx" ON "standardSeat"("organization_id");
CREATE INDEX "profile_organization_id_idx" ON "profile"("organization_id");
CREATE INDEX "soloSeat_organization_id_idx" ON "soloSeat"("organization_id");
CREATE INDEX "agentAccess_organization_id_idx" ON "agentAccess"("organization_id");