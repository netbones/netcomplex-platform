-- Rename table
ALTER TABLE "provider_credits" RENAME TO "provider_reputation";

-- Rename column total_credits to total_score
ALTER TABLE "provider_reputation" RENAME COLUMN "total_credits" TO "total_score";
