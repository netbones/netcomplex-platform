-- Add BookingStatus enum values (safe — no-op if already present)
DO $$ BEGIN
    ALTER TYPE "BookingStatus" ADD VALUE 'WAITLISTED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE "BookingStatus" ADD VALUE 'NO_SHOW';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create Amenity table
CREATE TABLE IF NOT EXISTS "Amenity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL,
    "photoUrl" TEXT,
    "hoursOpen" TEXT,
    "hoursClose" TEXT,
    "bookable" BOOLEAN NOT NULL DEFAULT true,
    "contactEnabled" BOOLEAN NOT NULL DEFAULT true,
    "contactPhone" TEXT,
    "maxOccupancy" INTEGER,
    "slotDurationMins" INTEGER,
    "rulesText" TEXT,
    "waitlistEnabled" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Amenity_pkey" PRIMARY KEY ("id")
);

-- Add Tenant FK for Amenity
DO $$ BEGIN
    ALTER TABLE "Amenity" ADD CONSTRAINT "Amenity_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Alter Booking: add new columns (safe — no-op if already present)
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "amenityId" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "startAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "endAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);

-- Make facility column nullable
ALTER TABLE "Booking" ALTER COLUMN "facility" DROP NOT NULL;

-- Add FK from Booking to Amenity (nullable)
DO $$ BEGIN
    ALTER TABLE "Booking" ADD CONSTRAINT "Booking_amenityId_fkey"
        FOREIGN KEY ("amenityId") REFERENCES "Amenity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Indexes on Amenity
CREATE INDEX IF NOT EXISTS "Amenity_tenantId_idx" ON "Amenity"("tenantId");
CREATE INDEX IF NOT EXISTS "Amenity_tenantId_active_idx" ON "Amenity"("tenantId", "active");

-- Indexes on Booking for new columns
CREATE INDEX IF NOT EXISTS "Booking_amenityId_date_startTime_idx" ON "Booking"("amenityId", "date", "startTime");
CREATE INDEX IF NOT EXISTS "Booking_amenityId_startAt_idx" ON "Booking"("amenityId", "startAt");
CREATE INDEX IF NOT EXISTS "Booking_userId_status_idx" ON "Booking"("userId", "status");
