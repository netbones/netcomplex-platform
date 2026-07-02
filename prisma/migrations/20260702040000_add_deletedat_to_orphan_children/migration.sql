-- Add deletedAt to 15 orphan child models for soft-delete parent-child consistency
-- See docs/STEERING/SOFT_DELETE.md for policy

ALTER TABLE "ConversationParticipant" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "EventAttendee" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "RequestNote" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "ProviderVerification" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "ProviderLegalAgreement" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "ProviderReputation" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "ProviderMerit" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "ProviderSubscription" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "PaymentTransaction" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "RevenueRecord" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "ProviderCharge" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "ProviderInvoice" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "DisputeEvent" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "DisputeMessageVersion" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "DisputeNotification" ADD COLUMN "deletedAt" TIMESTAMPTZ;
