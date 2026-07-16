-- Add category and maxAttendees to Event model, update indexes

-- Drop old indexes (may not exist in all environments)
DROP INDEX IF EXISTS "Event_tenantId_idx";
DROP INDEX IF EXISTS "EventAttendee_eventId_idx";

-- Add new columns
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "maxAttendees" INTEGER;

-- Create new composite indexes
CREATE INDEX IF NOT EXISTS "Event_tenantId_date_idx" ON "Event"("tenantId", "date");
CREATE INDEX IF NOT EXISTS "Event_tenantId_category_idx" ON "Event"("tenantId", "category");
CREATE INDEX IF NOT EXISTS "EventAttendee_eventId_userId_idx" ON "EventAttendee"("eventId", "userId");
CREATE INDEX IF NOT EXISTS "EventAttendee_eventId_tenantId_idx" ON "EventAttendee"("eventId", "tenantId");
