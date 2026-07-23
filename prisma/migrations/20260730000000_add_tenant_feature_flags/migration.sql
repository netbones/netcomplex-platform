-- Create TenantFeatureFlag table
CREATE TABLE "TenantFeatureFlag" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    CONSTRAINT "TenantFeatureFlag_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX "TenantFeatureFlag_tenantId_featureKey_key" ON "TenantFeatureFlag"("tenantId", "featureKey");
CREATE INDEX "TenantFeatureFlag_tenantId_idx" ON "TenantFeatureFlag"("tenantId");

-- Add foreign key
ALTER TABLE "TenantFeatureFlag" ADD CONSTRAINT "TenantFeatureFlag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing data from Tenant.featureFlags JSONB
INSERT INTO "TenantFeatureFlag" ("id", "tenantId", "featureKey", "enabled", "createdAt")
SELECT
    gen_random_uuid()::text,
    "id",
    key,
    (value::text = 'true'),
    NOW()
FROM "Tenant",
LATERAL jsonb_each_text(COALESCE("featureFlags", '{}'::jsonb)) AS ff(key, value);
