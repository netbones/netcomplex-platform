-- AlterTable: Fix Setting key uniqueness (global unique -> composite unique per tenant)
ALTER TABLE "Setting" DROP CONSTRAINT IF EXISTS "Setting_key_key";
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_tenantId_key_key" UNIQUE ("tenantId", "key");

-- AlterTable: Add ownerId to Tenant
ALTER TABLE "Tenant" ADD COLUMN "ownerId" TEXT;

-- AlterTable: Add isPlatformAdmin to user
ALTER TABLE "user" ADD COLUMN "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false;
