-- Convert values that don't exist in the new ServiceCategory enum to 'OTHER'
-- Old enum: TUTORING, PET_CARE, CHILDCARE, TRANSPORT, HEALTH_WELLNESS, TECHNOLOGY, CREATIVE_ARTS, HOME_HELP, LEGAL_FINANCIAL, OTHER
-- New enum: GARDENING, MAINTENANCE, PLUMBING, ELECTRICAL, CLEANING, SECURITY, PEST_CONTROL, APPLIANCE_REPAIR, OTHER
-- Only 'OTHER' is common. Existing data: TECHNOLOGY(1), HEALTH_WELLNESS(1), OTHER(12)

UPDATE "communityServiceListing"
SET "category" = 'OTHER'
WHERE "category"::text NOT IN ('GARDENING', 'MAINTENANCE', 'PLUMBING', 'ELECTRICAL', 'CLEANING', 'SECURITY', 'PEST_CONTROL', 'APPLIANCE_REPAIR', 'OTHER');

-- Convert column to text first (to break enum binding), then to the new enum
ALTER TABLE "communityServiceListing"
  ALTER COLUMN "category" DROP DEFAULT,
  ALTER COLUMN "category" TYPE "ServiceCategory" USING "category"::text::"ServiceCategory";

-- Drop the old enum
DROP TYPE "CommunityServiceCategory";
