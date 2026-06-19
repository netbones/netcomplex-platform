-- CreateEnum
CREATE TYPE "BehaviorType" AS ENUM ('MERIT', 'WARNING', 'INFRACTION');

-- CreateEnum
CREATE TYPE "BehaviorRecordStatus" AS ENUM ('ACTIVE', 'DISPUTED', 'UPHELD', 'OVERTURNED');

-- CreateEnum
CREATE TYPE "BehaviorCategory" AS ENUM ('COMMUNITY_SERVICE', 'VOLUNTEERISM', 'MAINTENANCE', 'NOISE', 'PARKING', 'SECURITY', 'PETS', 'COMPLIANCE', 'OTHER');

-- DropIndex
DROP INDEX "AgentAccess_grantedById_idx";

-- DropIndex
DROP INDEX "Announcement_resourceId_idx";

-- DropIndex
DROP INDEX "Booking_propertyId_idx";

-- DropIndex
DROP INDEX "Booking_userId_idx";

-- DropIndex
DROP INDEX "Content_authorId_idx";

-- DropIndex
DROP INDEX "Content_groupId_idx";

-- DropIndex
DROP INDEX "Group_ownerId_idx";

-- DropIndex
DROP INDEX "GroupMember_groupId_idx";

-- DropIndex
DROP INDEX "GroupMember_userId_idx";

-- DropIndex
DROP INDEX "Invitation_inviterId_idx";

-- DropIndex
DROP INDEX "MaintenanceRequest_propertyId_idx";

-- DropIndex
DROP INDEX "MaintenanceRequest_userId_idx";

-- DropIndex
DROP INDEX "Message_senderId_idx";

-- DropIndex
DROP INDEX "RequestHistory_userId_idx";

-- DropIndex
DROP INDEX "RequestNote_userId_idx";

-- DropIndex
DROP INDEX "Resource_authorId_idx";

-- DropIndex
DROP INDEX "Response_surveyId_idx";

-- DropIndex
DROP INDEX "SoloSeat_userId_idx";

-- DropIndex
DROP INDEX "Tenant_ownerId_idx";

-- DropIndex
DROP INDEX "TenantModule_moduleKey_idx";

-- CreateTable
CREATE TABLE "BehaviorRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "behaviorType" "BehaviorType" NOT NULL,
    "category" "BehaviorCategory" NOT NULL DEFAULT 'OTHER',
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "recognitionPoints" INTEGER NOT NULL DEFAULT 0,
    "disciplinaryPoints" INTEGER NOT NULL DEFAULT 0,
    "standingBefore" INTEGER,
    "standingAfter" INTEGER,
    "status" "BehaviorRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "disputeReason" TEXT,
    "disputedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BehaviorRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BehaviorRecord_userId_idx" ON "BehaviorRecord"("userId");

-- CreateIndex
CREATE INDEX "BehaviorRecord_tenantId_idx" ON "BehaviorRecord"("tenantId");

-- CreateIndex
CREATE INDEX "BehaviorRecord_behaviorType_idx" ON "BehaviorRecord"("behaviorType");

-- CreateIndex
CREATE INDEX "BehaviorRecord_status_idx" ON "BehaviorRecord"("status");

-- CreateIndex
CREATE INDEX "BehaviorRecord_category_idx" ON "BehaviorRecord"("category");

-- AddForeignKey
ALTER TABLE "BehaviorRecord" ADD CONSTRAINT "BehaviorRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviorRecord" ADD CONSTRAINT "BehaviorRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviorRecord" ADD CONSTRAINT "BehaviorRecord_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

