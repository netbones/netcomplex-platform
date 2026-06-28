-- Add deletedAt column to Setting table (soft-delete support)
-- Schema change from commit 641aac9a (tRPC audit tranche-3)
-- Applied manually 2026-06-28
ALTER TABLE public."Setting" ADD COLUMN "deletedAt" timestamp(3) without time zone;
ALTER TABLE public."AchievementDefinition" ADD COLUMN "deletedAt" timestamp(3) without time zone;
