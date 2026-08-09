-- DropForeignKey
ALTER TABLE "Address" DROP CONSTRAINT "Address_canonicalAddressId_fkey";

-- DropForeignKey
ALTER TABLE "Address" DROP CONSTRAINT "Address_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "AddressEndpoint" DROP CONSTRAINT "AddressEndpoint_addressId_fkey";

-- DropForeignKey
ALTER TABLE "AgentAccess" DROP CONSTRAINT "AgentAccess_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "AgentProfile" DROP CONSTRAINT "AgentProfile_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "AiUsageEvent" DROP CONSTRAINT "AiUsageEvent_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Album" DROP CONSTRAINT "Album_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Announcement" DROP CONSTRAINT "Announcement_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "BillingAdjustment" DROP CONSTRAINT "BillingAdjustment_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "BillingEvent" DROP CONSTRAINT "BillingEvent_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "BillingPlan" DROP CONSTRAINT "BillingPlan_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "CommunityMerit" DROP CONSTRAINT "CommunityMerit_createdById_fkey";

-- DropForeignKey
ALTER TABLE "CommunityMerit" DROP CONSTRAINT "CommunityMerit_resolvedById_fkey";

-- DropForeignKey
ALTER TABLE "CommunityMerit" DROP CONSTRAINT "CommunityMerit_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "CommunityMerit" DROP CONSTRAINT "CommunityMerit_userId_fkey";

-- DropForeignKey
ALTER TABLE "CommunityServiceInquiry" DROP CONSTRAINT "CommunityServiceInquiry_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "CommunityServiceListing" DROP CONSTRAINT "CommunityServiceListing_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "CommunityServiceReview" DROP CONSTRAINT "CommunityServiceReview_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Competition" DROP CONSTRAINT "Competition_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Content" DROP CONSTRAINT "Content_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ContentAuditLog" DROP CONSTRAINT "ContentAuditLog_contentId_fkey";

-- DropForeignKey
ALTER TABLE "ContentAuditLog" DROP CONSTRAINT "ContentAuditLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "ContentLike" DROP CONSTRAINT "ContentLike_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ContentVersion" DROP CONSTRAINT "ContentVersion_contentId_fkey";

-- DropForeignKey
ALTER TABLE "ContentVersion" DROP CONSTRAINT "ContentVersion_userId_fkey";

-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ConversationParticipant" DROP CONSTRAINT "ConversationParticipant_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Coupon" DROP CONSTRAINT "Coupon_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "CouponRedemption" DROP CONSTRAINT "CouponRedemption_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "DWallet" DROP CONSTRAINT "DWallet_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "DataConsent" DROP CONSTRAINT "DataConsent_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "DataRevenueStream" DROP CONSTRAINT "DataRevenueStream_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "DataShareBatch" DROP CONSTRAINT "DataShareBatch_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "DisputeCase" DROP CONSTRAINT "DisputeCase_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "DisputeEvent" DROP CONSTRAINT "DisputeEvent_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "DisputeEvidence" DROP CONSTRAINT "DisputeEvidence_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "DisputeMessage" DROP CONSTRAINT "DisputeMessage_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "DisputeNotification" DROP CONSTRAINT "DisputeNotification_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "EventAttendee" DROP CONSTRAINT "EventAttendee_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ExternalSurvey" DROP CONSTRAINT "ExternalSurvey_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Group" DROP CONSTRAINT "Group_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "GroupMember" DROP CONSTRAINT "GroupMember_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "GroupMembershipRequest" DROP CONSTRAINT "GroupMembershipRequest_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Handle" DROP CONSTRAINT "Handle_addressId_fkey";

-- DropForeignKey
ALTER TABLE "Handle" DROP CONSTRAINT "Handle_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Household" DROP CONSTRAINT "Household_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceCategory" DROP CONSTRAINT "MaintenanceCategory_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceRequest" DROP CONSTRAINT "MaintenanceRequest_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceTeam" DROP CONSTRAINT "MaintenanceTeam_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Member" DROP CONSTRAINT "Member_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Organization" DROP CONSTRAINT "Organization_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentTransaction" DROP CONSTRAINT "PaymentTransaction_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "PayoutRequest" DROP CONSTRAINT "PayoutRequest_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "PlatformSuspension" DROP CONSTRAINT "PlatformSuspension_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "PremiumSeat" DROP CONSTRAINT "PremiumSeat_addressId_fkey";

-- DropForeignKey
ALTER TABLE "PremiumSeat" DROP CONSTRAINT "PremiumSeat_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Profile" DROP CONSTRAINT "Profile_aliasAddressId_fkey";

-- DropForeignKey
ALTER TABLE "Profile" DROP CONSTRAINT "Profile_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Property" DROP CONSTRAINT "Property_addressId_fkey";

-- DropForeignKey
ALTER TABLE "Property" DROP CONSTRAINT "Property_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "PropertyListing" DROP CONSTRAINT "PropertyListing_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "PropertyPremiumSeat" DROP CONSTRAINT "PropertyPremiumSeat_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ProviderCharge" DROP CONSTRAINT "ProviderCharge_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ProviderInvoice" DROP CONSTRAINT "ProviderInvoice_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ProviderLegalAgreement" DROP CONSTRAINT "ProviderLegalAgreement_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ProviderMerit" DROP CONSTRAINT "ProviderMerit_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ProviderReputation" DROP CONSTRAINT "ProviderReputation_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ProviderSubscription" DROP CONSTRAINT "ProviderSubscription_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ProviderVerification" DROP CONSTRAINT "ProviderVerification_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Resource" DROP CONSTRAINT "Resource_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Response" DROP CONSTRAINT "Response_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "RevenueRecord" DROP CONSTRAINT "RevenueRecord_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceProvider" DROP CONSTRAINT "ServiceProvider_addressId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceProvider" DROP CONSTRAINT "ServiceProvider_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Setting" DROP CONSTRAINT "Setting_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "SoloSeat" DROP CONSTRAINT "SoloSeat_addressId_fkey";

-- DropForeignKey
ALTER TABLE "SoloSeat" DROP CONSTRAINT "SoloSeat_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "StandardSeat" DROP CONSTRAINT "StandardSeat_addressId_fkey";

-- DropForeignKey
ALTER TABLE "StandardSeat" DROP CONSTRAINT "StandardSeat_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "SubscriptionTier" DROP CONSTRAINT "SubscriptionTier_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Support" DROP CONSTRAINT "Support_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Survey" DROP CONSTRAINT "Survey_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "SurveySection" DROP CONSTRAINT "SurveySection_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "TenantAiUsage" DROP CONSTRAINT "TenantAiUsage_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "TenantFeatureFlag" DROP CONSTRAINT "TenantFeatureFlag_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "TenantInvoice" DROP CONSTRAINT "TenantInvoice_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "TenantPayment" DROP CONSTRAINT "TenantPayment_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "TenantSubscription" DROP CONSTRAINT "TenantSubscription_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "UserAchievement" DROP CONSTRAINT "UserAchievement_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "UserAchievementProgress" DROP CONSTRAINT "UserAchievementProgress_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "WalletTransaction" DROP CONSTRAINT "WalletTransaction_tenantId_fkey";

-- DropIndex
DROP INDEX "Property_platformAddress_idx";

-- DropConstraint
ALTER TABLE "Property" DROP CONSTRAINT "Property_platformAddress_key";

-- DropIndex
DROP INDEX "ServiceProvider_userId_idx";

-- AlterTable
ALTER TABLE "AgentAccess" DROP COLUMN "isActive",
DROP COLUMN "permissions",
ADD COLUMN     "permissions" TEXT[],
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CommunityMerit" RENAME CONSTRAINT "community_merits_pkey" TO "CommunityMerit_pkey";

-- AlterTable
ALTER TABLE "PaymentTransaction" RENAME CONSTRAINT "payment_transactions_pkey" TO "PaymentTransaction_pkey";

-- AlterTable
ALTER TABLE "ProviderCharge" RENAME CONSTRAINT "provider_charges_pkey" TO "ProviderCharge_pkey";

-- AlterTable
ALTER TABLE "ProviderInvoice" RENAME CONSTRAINT "provider_invoices_pkey" TO "ProviderInvoice_pkey";

-- AlterTable
ALTER TABLE "ProviderLegalAgreement" RENAME CONSTRAINT "provider_legal_agreements_pkey" TO "ProviderLegalAgreement_pkey";

-- AlterTable
ALTER TABLE "ProviderMerit" RENAME CONSTRAINT "provider_merits_pkey" TO "ProviderMerit_pkey";

-- AlterTable
ALTER TABLE "ProviderReputation" RENAME CONSTRAINT "provider_reputation_pkey" TO "ProviderReputation_pkey";

-- AlterTable
ALTER TABLE "ProviderSubscription" RENAME CONSTRAINT "provider_subscriptions_pkey" TO "ProviderSubscription_pkey";

-- AlterTable
ALTER TABLE "ProviderVerification" RENAME CONSTRAINT "provider_verifications_pkey" TO "ProviderVerification_pkey";

-- AlterTable
ALTER TABLE "RevenueRecord" RENAME CONSTRAINT "revenue_records_pkey" TO "RevenueRecord_pkey";

-- AlterTable
ALTER TABLE "SubscriptionTier" RENAME CONSTRAINT "subscription_tiers_pkey" TO "SubscriptionTier_pkey";

-- DropEnum
DROP TYPE "AgentPermission";

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_aliasAddressId_fkey" FOREIGN KEY ("aliasAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentProfile" ADD CONSTRAINT "AgentProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PremiumSeat" ADD CONSTRAINT "PremiumSeat_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PremiumSeat" ADD CONSTRAINT "PremiumSeat_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoloSeat" ADD CONSTRAINT "SoloSeat_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoloSeat" ADD CONSTRAINT "SoloSeat_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandardSeat" ADD CONSTRAINT "StandardSeat_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandardSeat" ADD CONSTRAINT "StandardSeat_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Household" ADD CONSTRAINT "Household_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyListing" ADD CONSTRAINT "PropertyListing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyPremiumSeat" ADD CONSTRAINT "PropertyPremiumSeat_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentLike" ADD CONSTRAINT "ContentLike_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentVersion" ADD CONSTRAINT "ContentVersion_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentVersion" ADD CONSTRAINT "ContentVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentAuditLog" ADD CONSTRAINT "ContentAuditLog_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentAuditLog" ADD CONSTRAINT "ContentAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Support" ADD CONSTRAINT "Support_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMembershipRequest" ADD CONSTRAINT "GroupMembershipRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Album" ADD CONSTRAINT "Album_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAttendee" ADD CONSTRAINT "EventAttendee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTeam" ADD CONSTRAINT "MaintenanceTeam_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceCategory" ADD CONSTRAINT "MaintenanceCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProvider" ADD CONSTRAINT "ServiceProvider_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProvider" ADD CONSTRAINT "ServiceProvider_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityServiceInquiry" ADD CONSTRAINT "CommunityServiceInquiry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityServiceListing" ADD CONSTRAINT "CommunityServiceListing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityServiceReview" ADD CONSTRAINT "CommunityServiceReview_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderVerification" ADD CONSTRAINT "ProviderVerification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderLegalAgreement" ADD CONSTRAINT "ProviderLegalAgreement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderReputation" ADD CONSTRAINT "ProviderReputation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderMerit" ADD CONSTRAINT "ProviderMerit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSubscription" ADD CONSTRAINT "ProviderSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueRecord" ADD CONSTRAINT "RevenueRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCharge" ADD CONSTRAINT "ProviderCharge_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderInvoice" ADD CONSTRAINT "ProviderInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingPlan" ADD CONSTRAINT "BillingPlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantSubscription" ADD CONSTRAINT "TenantSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantInvoice" ADD CONSTRAINT "TenantInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantPayment" ADD CONSTRAINT "TenantPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingAdjustment" ADD CONSTRAINT "BillingAdjustment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveySection" ADD CONSTRAINT "SurveySection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalSurvey" ADD CONSTRAINT "ExternalSurvey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMerit" ADD CONSTRAINT "CommunityMerit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMerit" ADD CONSTRAINT "CommunityMerit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMerit" ADD CONSTRAINT "CommunityMerit_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMerit" ADD CONSTRAINT "CommunityMerit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAccess" ADD CONSTRAINT "AgentAccess_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformSuspension" ADD CONSTRAINT "PlatformSuspension_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionTier" ADD CONSTRAINT "SubscriptionTier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievementProgress" ADD CONSTRAINT "UserAchievementProgress_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DWallet" ADD CONSTRAINT "DWallet_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataConsent" ADD CONSTRAINT "DataConsent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataRevenueStream" ADD CONSTRAINT "DataRevenueStream_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataShareBatch" ADD CONSTRAINT "DataShareBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_canonicalAddressId_fkey" FOREIGN KEY ("canonicalAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handle" ADD CONSTRAINT "Handle_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handle" ADD CONSTRAINT "Handle_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddressEndpoint" ADD CONSTRAINT "AddressEndpoint_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantAiUsage" ADD CONSTRAINT "TenantAiUsage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeCase" ADD CONSTRAINT "DisputeCase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeEvidence" ADD CONSTRAINT "DisputeEvidence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeEvent" ADD CONSTRAINT "DisputeEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeMessage" ADD CONSTRAINT "DisputeMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeNotification" ADD CONSTRAINT "DisputeNotification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantFeatureFlag" ADD CONSTRAINT "TenantFeatureFlag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "community_merits_behaviorType_idx" RENAME TO "CommunityMerit_behaviorType_idx";

-- RenameIndex
ALTER INDEX "community_merits_category_idx" RENAME TO "CommunityMerit_category_idx";

-- RenameIndex
ALTER INDEX "community_merits_status_idx" RENAME TO "CommunityMerit_status_idx";

-- RenameIndex
ALTER INDEX "community_merits_tenantId_idx" RENAME TO "CommunityMerit_tenantId_idx";

-- RenameIndex
ALTER INDEX "community_merits_userId_idx" RENAME TO "CommunityMerit_userId_idx";

-- RenameIndex
ALTER INDEX "provider_verifications_tenantId_idx" RENAME TO "ProviderVerification_tenantId_idx";

