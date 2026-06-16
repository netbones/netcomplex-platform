-- category is now free-text, validated at application layer based on providerType
-- Old enum values will be preserved as text

ALTER TABLE "communityServiceListing"
  ALTER COLUMN "category" DROP DEFAULT,
  ALTER COLUMN "category" TYPE text USING "category"::text;

-- Drop the old enum types no longer used by any column
DROP TYPE IF EXISTS "CommunityServiceCategory";
DROP TYPE IF EXISTS "ServiceCategory";
