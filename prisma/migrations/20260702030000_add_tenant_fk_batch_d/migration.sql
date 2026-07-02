-- Batch D: Tenant FK relations + indexes for Admin & Agents + Achievements & Disputes + Address & AI (19 models)
-- ADVISORY-024: onDelete: Restrict, bidirectional relations

ALTER TABLE "Setting" ADD CONSTRAINT "Setting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "AgentAccess" ADD CONSTRAINT "AgentAccess_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "AgentToken" ADD CONSTRAINT "AgentToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "DelegationAction" ADD CONSTRAINT "DelegationAction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "ResidentDelegation" ADD CONSTRAINT "ResidentDelegation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "PlatformSuspension" ADD CONSTRAINT "PlatformSuspension_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "SubscriptionTier" ADD CONSTRAINT "SubscriptionTier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "UserAchievementProgress" ADD CONSTRAINT "UserAchievementProgress_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "Address" ADD CONSTRAINT "Address_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "Handle" ADD CONSTRAINT "Handle_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "Bursary" ADD CONSTRAINT "Bursary_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "TenantAiUsage" ADD CONSTRAINT "TenantAiUsage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "DisputeCase" ADD CONSTRAINT "DisputeCase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "DisputeEvidence" ADD CONSTRAINT "DisputeEvidence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "DisputeEvent" ADD CONSTRAINT "DisputeEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "DisputeMessage" ADD CONSTRAINT "DisputeMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "DisputeNotification" ADD CONSTRAINT "DisputeNotification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;

-- New indexes (10 models did not have @@index([tenantId]))
CREATE INDEX "Setting_tenantId_idx" ON "Setting"("tenantId");
CREATE INDEX "AgentAccess_tenantId_idx" ON "AgentAccess"("tenantId");
CREATE INDEX "AgentToken_tenantId_idx" ON "AgentToken"("tenantId");
CREATE INDEX "ResidentDelegation_tenantId_idx" ON "ResidentDelegation"("tenantId");
CREATE INDEX "PlatformSuspension_tenantId_idx" ON "PlatformSuspension"("tenantId");
CREATE INDEX "Handle_tenantId_idx" ON "Handle"("tenantId");
CREATE INDEX "DisputeEvidence_tenantId_idx" ON "DisputeEvidence"("tenantId");
CREATE INDEX "DisputeEvent_tenantId_idx" ON "DisputeEvent"("tenantId");
CREATE INDEX "DisputeMessage_tenantId_idx" ON "DisputeMessage"("tenantId");
CREATE INDEX "DisputeNotification_tenantId_idx" ON "DisputeNotification"("tenantId");
