-- Batch C: Tenant FK relations + indexes for Surveys & Merits + dWallet & Data + AgentProfile (14 models)
-- ADVISORY-024: onDelete: Restrict, bidirectional relations

ALTER TABLE "AgentProfile" ADD CONSTRAINT "AgentProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "Question" ADD CONSTRAINT "Question_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "Response" ADD CONSTRAINT "Response_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "SurveySection" ADD CONSTRAINT "SurveySection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "ExternalSurvey" ADD CONSTRAINT "ExternalSurvey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "CommunityMerit" ADD CONSTRAINT "CommunityMerit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "DWallet" ADD CONSTRAINT "DWallet_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "DataConsent" ADD CONSTRAINT "DataConsent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "DataRevenueStream" ADD CONSTRAINT "DataRevenueStream_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "DataShareBatch" ADD CONSTRAINT "DataShareBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;

-- New indexes (4 models did not have @@index([tenantId]))
CREATE INDEX "AgentProfile_tenantId_idx" ON "AgentProfile"("tenantId");
CREATE INDEX "Question_tenantId_idx" ON "Question"("tenantId");
CREATE INDEX "Response_tenantId_idx" ON "Response"("tenantId");
CREATE INDEX "SurveySection_tenantId_idx" ON "SurveySection"("tenantId");
