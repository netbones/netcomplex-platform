-- ADVISORY-040 Phase 1: SeatPlan + SeatType enum (four ADVISORY-041 rate rows seeded later)

CREATE TYPE "SeatType" AS ENUM ('STANDARD', 'SOLO', 'PREMIUM');

CREATE TABLE IF NOT EXISTS "SeatPlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "seatType" "SeatType" NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "multiplier" DECIMAL(4,2) NOT NULL DEFAULT 1,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "interval" "BillingPlanInterval" NOT NULL DEFAULT 'MONTHLY',
    "minimumHomes" INTEGER,
    "eligibilityRule" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeatPlan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SeatPlan_tenantId_seatType_idx" ON "SeatPlan"("tenantId", "seatType");

CREATE UNIQUE INDEX "SeatPlan_tenantId_seatType_minimumHomes_key" ON "SeatPlan"("tenantId", "seatType", "minimumHomes");

ALTER TABLE "SeatPlan" ADD CONSTRAINT "SeatPlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
