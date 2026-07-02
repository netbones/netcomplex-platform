-- Batch B: Tenant FK relations + indexes for Maintenance & Providers + Billing & Commerce (26 models)
-- ADVISORY-024: onDelete: Restrict, bidirectional relations

ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "MaintenanceTeam" ADD CONSTRAINT "MaintenanceTeam_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "MaintenanceCategory" ADD CONSTRAINT "MaintenanceCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "BursaryField" ADD CONSTRAINT "BursaryField_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "ServiceProvider" ADD CONSTRAINT "ServiceProvider_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "CommunityServiceInquiry" ADD CONSTRAINT "CommunityServiceInquiry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "CommunityServiceListing" ADD CONSTRAINT "CommunityServiceListing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "CommunityServiceReview" ADD CONSTRAINT "CommunityServiceReview_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "ProviderVerification" ADD CONSTRAINT "ProviderVerification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "ProviderLegalAgreement" ADD CONSTRAINT "ProviderLegalAgreement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "ProviderReputation" ADD CONSTRAINT "ProviderReputation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "ProviderMerit" ADD CONSTRAINT "ProviderMerit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "ProviderSubscription" ADD CONSTRAINT "ProviderSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "Support" ADD CONSTRAINT "Support_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "RevenueRecord" ADD CONSTRAINT "RevenueRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "ProviderCharge" ADD CONSTRAINT "ProviderCharge_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "ProviderInvoice" ADD CONSTRAINT "ProviderInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "BillingPlan" ADD CONSTRAINT "BillingPlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "TenantSubscription" ADD CONSTRAINT "TenantSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "TenantInvoice" ADD CONSTRAINT "TenantInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "TenantPayment" ADD CONSTRAINT "TenantPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "BillingAdjustment" ADD CONSTRAINT "BillingAdjustment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;

-- New indexes (3 models did not have @@index([tenantId]))
CREATE INDEX "CommunityServiceInquiry_tenantId_idx" ON "CommunityServiceInquiry"("tenantId");
CREATE INDEX "CommunityServiceListing_tenantId_idx" ON "CommunityServiceListing"("tenantId");
CREATE INDEX "CommunityServiceReview_tenantId_idx" ON "CommunityServiceReview"("tenantId");
