-- Batch D: Tenant FK relations + indexes for Admin & Agents + Achievements & Disputes + Address & AI (19 models)
-- ADVISORY-024: onDelete: Restrict, bidirectional relations

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Setting') THEN ALTER TABLE "Setting" ADD CONSTRAINT "Setting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'AgentAccess') THEN ALTER TABLE "AgentAccess" ADD CONSTRAINT "AgentAccess_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'AgentToken') THEN ALTER TABLE "AgentToken" ADD CONSTRAINT "AgentToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'DelegationAction') THEN ALTER TABLE "DelegationAction" ADD CONSTRAINT "DelegationAction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ResidentDelegation') THEN ALTER TABLE "ResidentDelegation" ADD CONSTRAINT "ResidentDelegation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'PlatformSuspension') THEN ALTER TABLE "PlatformSuspension" ADD CONSTRAINT "PlatformSuspension_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'SubscriptionTier') THEN ALTER TABLE "SubscriptionTier" ADD CONSTRAINT "SubscriptionTier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'UserAchievementProgress') THEN ALTER TABLE "UserAchievementProgress" ADD CONSTRAINT "UserAchievementProgress_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'UserAchievement') THEN ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Address') THEN ALTER TABLE "Address" ADD CONSTRAINT "Address_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Handle') THEN ALTER TABLE "Handle" ADD CONSTRAINT "Handle_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Bursary') THEN ALTER TABLE "Bursary" ADD CONSTRAINT "Bursary_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'TenantAiUsage') THEN ALTER TABLE "TenantAiUsage" ADD CONSTRAINT "TenantAiUsage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'AiUsageEvent') THEN ALTER TABLE "AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'DisputeCase') THEN ALTER TABLE "DisputeCase" ADD CONSTRAINT "DisputeCase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'DisputeEvidence') THEN ALTER TABLE "DisputeEvidence" ADD CONSTRAINT "DisputeEvidence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'DisputeEvent') THEN ALTER TABLE "DisputeEvent" ADD CONSTRAINT "DisputeEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'DisputeMessage') THEN ALTER TABLE "DisputeMessage" ADD CONSTRAINT "DisputeMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'DisputeNotification') THEN ALTER TABLE "DisputeNotification" ADD CONSTRAINT "DisputeNotification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT; END IF; END $$;

-- New indexes (10 models did not have @@index([tenantId]))
CREATE INDEX "Setting_tenantId_idx" ON "Setting"("tenantId");
CREATE INDEX "AgentAccess_tenantId_idx" ON "AgentAccess"("tenantId");
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'AgentToken') THEN CREATE INDEX "AgentToken_tenantId_idx" ON "AgentToken"("tenantId"); END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ResidentDelegation') THEN CREATE INDEX "ResidentDelegation_tenantId_idx" ON "ResidentDelegation"("tenantId"); END IF; END $$;
CREATE INDEX "PlatformSuspension_tenantId_idx" ON "PlatformSuspension"("tenantId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Handle_tenantId_idx') THEN
    CREATE INDEX "Handle_tenantId_idx" ON "Handle"("tenantId");
  END IF;
END $$;
CREATE INDEX "DisputeEvidence_tenantId_idx" ON "DisputeEvidence"("tenantId");
CREATE INDEX "DisputeEvent_tenantId_idx" ON "DisputeEvent"("tenantId");
CREATE INDEX "DisputeMessage_tenantId_idx" ON "DisputeMessage"("tenantId");
CREATE INDEX "DisputeNotification_tenantId_idx" ON "DisputeNotification"("tenantId");
