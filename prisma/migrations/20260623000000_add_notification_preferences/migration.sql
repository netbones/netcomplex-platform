-- Add notificationPreferences JSONB column to user table
ALTER TABLE "user" ADD COLUMN "notificationPreferences" JSONB DEFAULT '{"info":{"inApp":true,"email":true},"warning":{"inApp":true,"email":true},"success":{"inApp":true,"email":true},"error":{"inApp":true,"email":true}}'::jsonb;
