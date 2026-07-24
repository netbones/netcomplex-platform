CREATE TYPE "public"."SettingValueType" AS ENUM('STRING', 'NUMBER', 'BOOLEAN', 'JSON');--> statement-breakpoint
DROP INDEX "TenantFeatureFlag_tenantId_featureKey_key";--> statement-breakpoint
DROP INDEX "TenantFeatureFlag_tenantId_idx";--> statement-breakpoint
ALTER TABLE "Setting" ADD COLUMN "type" "SettingValueType" DEFAULT 'STRING' NOT NULL;