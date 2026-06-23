-- AlterEnum
ALTER TYPE "ContentCategory" ADD VALUE 'LEGAL';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ConversationType" ADD VALUE 'SECURE_DIRECT';
ALTER TYPE "ConversationType" ADD VALUE 'SECURE_GROUP';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MessageType" ADD VALUE 'VOICE';
ALTER TYPE "MessageType" ADD VALUE 'FILE';

-- DropForeignKey
ALTER TABLE "payment_transactions" DROP CONSTRAINT "payment_transactions_provider_id_fkey";

-- DropForeignKey
ALTER TABLE "payment_transactions" DROP CONSTRAINT "payment_transactions_subscription_id_fkey";

-- DropForeignKey
ALTER TABLE "provider_charges" DROP CONSTRAINT "provider_charges_provider_id_fkey";

-- DropForeignKey
ALTER TABLE "provider_charges" DROP CONSTRAINT "provider_charges_subscription_id_fkey";

-- DropForeignKey
ALTER TABLE "provider_charges" DROP CONSTRAINT "provider_charges_transaction_id_fkey";

-- DropForeignKey
ALTER TABLE "provider_invoices" DROP CONSTRAINT "provider_invoices_provider_id_fkey";

-- DropForeignKey
ALTER TABLE "provider_invoices" DROP CONSTRAINT "provider_invoices_subscription_id_fkey";

-- DropForeignKey
ALTER TABLE "provider_invoices" DROP CONSTRAINT "provider_invoices_transaction_id_fkey";

-- DropForeignKey
ALTER TABLE "provider_legal_agreements" DROP CONSTRAINT "provider_legal_agreements_provider_id_fkey";

-- DropForeignKey
ALTER TABLE "provider_merits" DROP CONSTRAINT "provider_merits_provider_id_fkey";

-- DropForeignKey
ALTER TABLE "provider_reputation" DROP CONSTRAINT "provider_credits_provider_id_fkey";

-- DropForeignKey
ALTER TABLE "provider_subscriptions" DROP CONSTRAINT "provider_subscriptions_provider_id_fkey";

-- DropForeignKey
ALTER TABLE "provider_subscriptions" DROP CONSTRAINT "provider_subscriptions_tier_id_fkey";

-- DropForeignKey
ALTER TABLE "provider_verifications" DROP CONSTRAINT "provider_verifications_provider_id_fkey";

-- DropForeignKey
ALTER TABLE "revenue_records" DROP CONSTRAINT "revenue_records_provider_id_fkey";

-- DropForeignKey
ALTER TABLE "revenue_records" DROP CONSTRAINT "revenue_records_transaction_id_fkey";

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "capabilities" JSONB;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "messageVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "payload" JSONB;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "type" SET DEFAULT 'info';

-- AlterTable
ALTER TABLE "community_merits" ALTER COLUMN "dispute_history" DROP DEFAULT;

-- AlterTable
ALTER TABLE "provider_reputation" RENAME CONSTRAINT "provider_credits_pkey" TO "provider_reputation_pkey";

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "banExpires" TIMESTAMP(3),
ADD COLUMN     "banReason" TEXT,
ADD COLUMN     "banned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profileData" JSONB DEFAULT '{}';

-- CreateTable
CREATE TABLE "UserKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "UserKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserKey_userId_idx" ON "UserKey"("userId");

-- CreateIndex
CREATE INDEX "UserDevice_userId_idx" ON "UserDevice"("userId");

-- CreateIndex
CREATE INDEX "AgentAccess_grantedById_idx" ON "AgentAccess"("grantedById");

-- CreateIndex
CREATE INDEX "Announcement_resourceId_idx" ON "Announcement"("resourceId");

-- CreateIndex
CREATE INDEX "Booking_propertyId_idx" ON "Booking"("propertyId");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- CreateIndex
CREATE INDEX "Content_authorId_idx" ON "Content"("authorId");

-- CreateIndex
CREATE INDEX "Content_groupId_idx" ON "Content"("groupId");

-- CreateIndex
CREATE INDEX "Group_ownerId_idx" ON "Group"("ownerId");

-- CreateIndex
CREATE INDEX "GroupMember_groupId_idx" ON "GroupMember"("groupId");

-- CreateIndex
CREATE INDEX "GroupMember_userId_idx" ON "GroupMember"("userId");

-- CreateIndex
CREATE INDEX "Invitation_inviterId_idx" ON "Invitation"("inviterId");

-- CreateIndex
CREATE INDEX "MaintenanceRequest_propertyId_idx" ON "MaintenanceRequest"("propertyId");

-- CreateIndex
CREATE INDEX "MaintenanceRequest_userId_idx" ON "MaintenanceRequest"("userId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "RequestHistory_userId_idx" ON "RequestHistory"("userId");

-- CreateIndex
CREATE INDEX "RequestNote_userId_idx" ON "RequestNote"("userId");

-- CreateIndex
CREATE INDEX "Resource_authorId_idx" ON "Resource"("authorId");

-- CreateIndex
CREATE INDEX "Response_surveyId_idx" ON "Response"("surveyId");

-- CreateIndex
CREATE INDEX "SoloSeat_userId_idx" ON "SoloSeat"("userId");

-- CreateIndex
CREATE INDEX "Tenant_ownerId_idx" ON "Tenant"("ownerId");

-- CreateIndex
CREATE INDEX "TenantModule_moduleKey_idx" ON "TenantModule"("moduleKey");

-- CreateIndex
CREATE INDEX "provider_verifications_provider_id_idx" ON "provider_verifications"("provider_id");

-- RenameForeignKey
ALTER TABLE "community_merits" RENAME CONSTRAINT "BehaviorRecord_createdById_fkey" TO "community_merits_createdById_fkey";

-- RenameForeignKey
ALTER TABLE "community_merits" RENAME CONSTRAINT "BehaviorRecord_resolvedById_fkey" TO "community_merits_resolvedById_fkey";

-- RenameForeignKey
ALTER TABLE "community_merits" RENAME CONSTRAINT "BehaviorRecord_userId_fkey" TO "community_merits_userId_fkey";

-- AddForeignKey
ALTER TABLE "UserKey" ADD CONSTRAINT "UserKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDevice" ADD CONSTRAINT "UserDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_verifications" ADD CONSTRAINT "provider_verifications_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_legal_agreements" ADD CONSTRAINT "provider_legal_agreements_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_reputation" ADD CONSTRAINT "provider_reputation_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_merits" ADD CONSTRAINT "provider_merits_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_subscriptions" ADD CONSTRAINT "provider_subscriptions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_subscriptions" ADD CONSTRAINT "provider_subscriptions_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "subscription_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "provider_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_records" ADD CONSTRAINT "revenue_records_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_records" ADD CONSTRAINT "revenue_records_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "payment_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_charges" ADD CONSTRAINT "provider_charges_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_charges" ADD CONSTRAINT "provider_charges_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "provider_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_charges" ADD CONSTRAINT "provider_charges_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_invoices" ADD CONSTRAINT "provider_invoices_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_invoices" ADD CONSTRAINT "provider_invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "provider_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_invoices" ADD CONSTRAINT "provider_invoices_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "payment_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "provider_credits_provider_id_key" RENAME TO "provider_reputation_provider_id_key";

-- RenameIndex
ALTER INDEX "provider_credits_tenant_id_idx" RENAME TO "provider_reputation_tenant_id_idx";
