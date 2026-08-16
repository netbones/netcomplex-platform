-- ADVISORY-038 Phase 1: PropertyJoinRequest + Vehicle + enums + Property uniqueness

CREATE TYPE "JoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');
CREATE TYPE "RelationshipType" AS ENUM ('OWNER_RESIDENT', 'OWNER_LEASING', 'TENANT_RENTER', 'ADDITIONAL_USER');

CREATE TABLE IF NOT EXISTS "PropertyJoinRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT,
    "propertyNumberRaw" TEXT NOT NULL,
    "relationshipType" "RelationshipType" NOT NULL,
    "requestedName" TEXT NOT NULL,
    "requestedSurname" TEXT,
    "requestedEmail" TEXT NOT NULL,
    "requestedPhone" TEXT,
    "rulesAcceptedAt" TIMESTAMP(3),
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "resultingInvitationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PropertyJoinRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Vehicle" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "joinRequestId" TEXT,
    "profileId" TEXT,
    "standardSeatId" TEXT,
    "make" TEXT,
    "model" TEXT,
    "color" TEXT,
    "registration" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE "PropertyJoinRequest" ADD CONSTRAINT "PropertyJoinRequest_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "PropertyJoinRequest" ADD CONSTRAINT "PropertyJoinRequest_propertyId_fkey"
        FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_joinRequestId_fkey"
        FOREIGN KEY ("joinRequestId") REFERENCES "PropertyJoinRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_profileId_fkey"
        FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_standardSeatId_fkey"
        FOREIGN KEY ("standardSeatId") REFERENCES "StandardSeat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Property uniqueness (discovery confirmed 0 duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS "Property_tenantId_street_unit_key"
    ON "Property"("tenantId", "street", "unit");

CREATE INDEX IF NOT EXISTS "PropertyJoinRequest_tenantId_status_idx"
    ON "PropertyJoinRequest"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "PropertyJoinRequest_propertyId_idx"
    ON "PropertyJoinRequest"("propertyId");
CREATE INDEX IF NOT EXISTS "PropertyJoinRequest_requestedEmail_idx"
    ON "PropertyJoinRequest"("requestedEmail");

CREATE INDEX IF NOT EXISTS "Vehicle_tenantId_idx" ON "Vehicle"("tenantId");
CREATE INDEX IF NOT EXISTS "Vehicle_joinRequestId_idx" ON "Vehicle"("joinRequestId");
CREATE INDEX IF NOT EXISTS "Vehicle_profileId_idx" ON "Vehicle"("profileId");
CREATE INDEX IF NOT EXISTS "Vehicle_registration_idx" ON "Vehicle"("registration");
