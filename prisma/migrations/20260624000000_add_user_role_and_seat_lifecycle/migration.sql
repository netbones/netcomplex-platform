-- ADVISORY-015 Phase 1 Migration
-- Add USER role, seat lifecycle fields, Property.platformAddress @unique

-- 1. Add USER to Role enum (before RESIDENT, as lowest-privilege staging value)
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'USER' BEFORE 'RESIDENT';

-- 2. Change default on user.role from RESIDENT to USER
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'USER';

-- 3. Add @unique on Property.platformAddress (G3 confirmed zero duplicates)
ALTER TABLE "Property" ADD CONSTRAINT "Property_platformAddress_key" UNIQUE ("platformAddress");

-- 4. Create SeatStatus enum
DO $$ BEGIN
  CREATE TYPE "SeatStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'COOLING_OFF');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Add status + archivedAt to seat tables
ALTER TABLE "StandardSeat" ADD COLUMN "status" "SeatStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "StandardSeat" ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "SoloSeat" ADD COLUMN "status" "SeatStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "SoloSeat" ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "PremiumSeat" ADD COLUMN "status" "SeatStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "PremiumSeat" ADD COLUMN "archivedAt" TIMESTAMP(3);
