-- Add endDate, isDraft, and createdByUserId to Event

ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "isDraft" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT;

DO $$ BEGIN
    ALTER TABLE "Event" ADD CONSTRAINT "Event_createdByUserId_fkey"
        FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Event_createdByUserId_idx" ON "Event"("createdByUserId");
