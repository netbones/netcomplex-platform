-- Make tenantId nullable in Better Auth identity tables
-- This fixes the signup failure where Better Auth doesn't set tenantId on account/session/verification records
-- The user.tenantId is handled by additionalFields in Better Auth config

ALTER TABLE "account" ALTER COLUMN "tenantId" DROP NOT NULL;
ALTER TABLE "session" ALTER COLUMN "tenantId" DROP NOT NULL;
ALTER TABLE "verification" ALTER COLUMN "tenantId" DROP NOT NULL;