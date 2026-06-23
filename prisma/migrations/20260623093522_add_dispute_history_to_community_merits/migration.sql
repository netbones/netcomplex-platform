ALTER TABLE "community_merits" ADD COLUMN IF NOT EXISTS "dispute_history" JSONB DEFAULT '[]'::jsonb;
