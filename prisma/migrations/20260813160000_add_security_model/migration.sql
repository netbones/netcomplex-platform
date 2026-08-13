-- Security domain: panic alerts + tenant security contacts

CREATE TYPE "SecurityAlertType" AS ENUM ('PANIC', 'ANONYMOUS_TIP');
CREATE TYPE "SecurityAlertStatus" AS ENUM ('SENT', 'ACKNOWLEDGED', 'RESPONDING', 'RESOLVED', 'FAILED');
CREATE TYPE "SecurityContactType" AS ENUM ('INTERNAL_SECURITY', 'EMERGENCY_SERVICES', 'ARMED_RESPONSE');

CREATE TABLE IF NOT EXISTS "SecurityAlert" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT,
    "triggeredByUserId" TEXT,
    "alertType" "SecurityAlertType" NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "locationAccuracyM" DECIMAL(8,2),
    "withinBoundary" BOOLEAN,
    "message" TEXT,
    "status" "SecurityAlertStatus" NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityAlert_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SecurityContact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "contactType" "SecurityContactType" NOT NULL,
    "isDefaultCallTarget" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityContact_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE "SecurityAlert" ADD CONSTRAINT "SecurityAlert_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "SecurityAlert" ADD CONSTRAINT "SecurityAlert_propertyId_fkey"
        FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "SecurityAlert" ADD CONSTRAINT "SecurityAlert_triggeredByUserId_fkey"
        FOREIGN KEY ("triggeredByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "SecurityAlert" ADD CONSTRAINT "SecurityAlert_acknowledgedByUserId_fkey"
        FOREIGN KEY ("acknowledgedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "SecurityAlert" ADD CONSTRAINT "SecurityAlert_resolvedByUserId_fkey"
        FOREIGN KEY ("resolvedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "SecurityContact" ADD CONSTRAINT "SecurityContact_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "SecurityContact" ADD CONSTRAINT "SecurityContact_createdByUserId_fkey"
        FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "SecurityAlert_tenantId_status_createdAt_idx"
    ON "SecurityAlert"("tenantId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "SecurityAlert_tenantId_alertType_createdAt_idx"
    ON "SecurityAlert"("tenantId", "alertType", "createdAt");
CREATE INDEX IF NOT EXISTS "SecurityAlert_triggeredByUserId_idx"
    ON "SecurityAlert"("triggeredByUserId");

CREATE INDEX IF NOT EXISTS "SecurityContact_tenantId_idx" ON "SecurityContact"("tenantId");
CREATE INDEX IF NOT EXISTS "SecurityContact_tenantId_isDefaultCallTarget_idx"
    ON "SecurityContact"("tenantId", "isDefaultCallTarget");

-- Platform module for gating (idempotent)
INSERT INTO "PlatformModule" ("id", "key", "label", "description", "minTier", "defaultEnabled", "createdAt")
VALUES (
    gen_random_uuid()::text,
    'security',
    'Security & Panic',
    'Community security panic button and emergency contacts',
    'STANDARD',
    true,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;
