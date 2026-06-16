-- Create ProviderType enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE "ProviderType" AS ENUM ('COMMUNITY', 'THIRD_PARTY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add providerType column to communityServiceListing
ALTER TABLE "communityServiceListing"
  ADD COLUMN "providerType" "ProviderType" NOT NULL DEFAULT 'COMMUNITY';
