-- Create enum type
DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('info', 'warning', 'success', 'error');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Alter type column to use enum
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType" USING "type"::"NotificationType";

-- Add new columns
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "senderId" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "payload" JSONB;
