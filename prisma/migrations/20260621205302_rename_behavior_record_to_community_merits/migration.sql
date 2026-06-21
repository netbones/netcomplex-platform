-- Rename BehaviorRecord table to community_merits (Community Merits rebranding)
ALTER TABLE "BehaviorRecord" RENAME TO "community_merits";

-- Rename FK constraints to match new table name
ALTER INDEX "BehaviorRecord_pkey" RENAME TO "community_merits_pkey";
ALTER INDEX "BehaviorRecord_userId_idx" RENAME TO "community_merits_userId_idx";
ALTER INDEX "BehaviorRecord_tenantId_idx" RENAME TO "community_merits_tenantId_idx";
ALTER INDEX "BehaviorRecord_behaviorType_idx" RENAME TO "community_merits_behaviorType_idx";
ALTER INDEX "BehaviorRecord_status_idx" RENAME TO "community_merits_status_idx";
ALTER INDEX "BehaviorRecord_category_idx" RENAME TO "community_merits_category_idx";
