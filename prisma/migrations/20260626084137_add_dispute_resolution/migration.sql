-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'MEDIATION_OFFERED', 'MEDIATION_ACTIVE', 'MEDIATED_RESOLVED', 'FORMAL_RULING', 'RESOLVED', 'WITHDRAWN', 'ESCALATED_CSOS', 'CSOS_CLOSED');

-- CreateEnum
CREATE TYPE "DisputeCategory" AS ENUM ('NOISE', 'PETS', 'PARKING', 'BOUNDARIES', 'COMMON_PROPERTY', 'LEVY_DISPUTE', 'RULE_ENFORCEMENT', 'GOVERNANCE', 'CONDUCT', 'DAMAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "DisputeSeverity" AS ENUM ('MINOR', 'MODERATE', 'SERIOUS', 'URGENT');

-- CreateEnum
CREATE TYPE "DisputeRespondent" AS ENUM ('RESIDENT', 'HOA', 'BOARD_MEMBER', 'TENANT_PROVIDER');

-- CreateEnum
CREATE TYPE "DisputeEventType" AS ENUM ('CREATED', 'SUBMITTED', 'ASSIGNED', 'MEDIATION_OFFERED', 'MEDIATION_ACCEPTED', 'MEDIATION_DECLINED', 'MEDIATION_CONCLUDED', 'RULING_ISSUED', 'RESOLVED', 'WITHDRAWN', 'ESCALATED_CSOS', 'CSOS_CLOSED', 'NOTE_ADDED', 'EVIDENCE_ADDED', 'STATUS_CHANGED');

-- CreateTable
CREATE TABLE "DisputeCase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "complainantId" TEXT NOT NULL,
    "respondentId" TEXT,
    "respondentType" "DisputeRespondent" NOT NULL DEFAULT 'RESIDENT',
    "category" "DisputeCategory" NOT NULL,
    "subcategory" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "desiredOutcome" TEXT,
    "severity" "DisputeSeverity" NOT NULL DEFAULT 'MODERATE',
    "status" "DisputeStatus" NOT NULL DEFAULT 'DRAFT',
    "intakeCompletedAt" TIMESTAMP(3),
    "coolingOffEndsAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "assignedModeratorId" TEXT,
    "mediationOfferedAt" TIMESTAMP(3),
    "mediationAcceptedAt" TIMESTAMP(3),
    "rulingIssuedAt" TIMESTAMP(3),
    "rulingDescription" TEXT,
    "csosReferenceNumber" TEXT,
    "csosEscalatedAt" TIMESTAMP(3),
    "csosClosedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "closedReason" TEXT,
    "isConfidential" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DisputeCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisputeEvidence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DisputeEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisputeEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "actorId" TEXT,
    "eventType" "DisputeEventType" NOT NULL,
    "fromStatus" "DisputeStatus",
    "toStatus" "DisputeStatus",
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisputeMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DisputeMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisputeMessageVersion" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "originalContent" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeMessageVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisputeNotification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DisputeCase_referenceNumber_key" ON "DisputeCase"("referenceNumber");

-- CreateIndex
CREATE INDEX "DisputeCase_tenantId_idx" ON "DisputeCase"("tenantId");

-- CreateIndex
CREATE INDEX "DisputeCase_complainantId_idx" ON "DisputeCase"("complainantId");

-- CreateIndex
CREATE INDEX "DisputeCase_respondentId_idx" ON "DisputeCase"("respondentId");

-- CreateIndex
CREATE INDEX "DisputeCase_status_idx" ON "DisputeCase"("status");

-- CreateIndex
CREATE INDEX "DisputeCase_category_idx" ON "DisputeCase"("category");

-- CreateIndex
CREATE INDEX "DisputeCase_assignedModeratorId_idx" ON "DisputeCase"("assignedModeratorId");

-- CreateIndex
CREATE INDEX "DisputeEvidence_disputeId_idx" ON "DisputeEvidence"("disputeId");

-- CreateIndex
CREATE INDEX "DisputeEvidence_uploadedBy_idx" ON "DisputeEvidence"("uploadedBy");

-- CreateIndex
CREATE INDEX "DisputeEvent_disputeId_idx" ON "DisputeEvent"("disputeId");

-- CreateIndex
CREATE INDEX "DisputeEvent_eventType_idx" ON "DisputeEvent"("eventType");

-- CreateIndex
CREATE INDEX "DisputeMessage_disputeId_idx" ON "DisputeMessage"("disputeId");

-- CreateIndex
CREATE INDEX "DisputeMessage_senderId_idx" ON "DisputeMessage"("senderId");

-- CreateIndex
CREATE INDEX "DisputeMessageVersion_messageId_idx" ON "DisputeMessageVersion"("messageId");

-- CreateIndex
CREATE INDEX "DisputeNotification_disputeId_idx" ON "DisputeNotification"("disputeId");

-- CreateIndex
CREATE INDEX "DisputeNotification_userId_idx" ON "DisputeNotification"("userId");

-- AddForeignKey
ALTER TABLE "DisputeCase" ADD CONSTRAINT "DisputeCase_complainantId_fkey" FOREIGN KEY ("complainantId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeCase" ADD CONSTRAINT "DisputeCase_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeCase" ADD CONSTRAINT "DisputeCase_assignedModeratorId_fkey" FOREIGN KEY ("assignedModeratorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeCase" ADD CONSTRAINT "DisputeCase_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeEvidence" ADD CONSTRAINT "DisputeEvidence_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "DisputeCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeEvidence" ADD CONSTRAINT "DisputeEvidence_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeEvent" ADD CONSTRAINT "DisputeEvent_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "DisputeCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeEvent" ADD CONSTRAINT "DisputeEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeMessage" ADD CONSTRAINT "DisputeMessage_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "DisputeCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeMessage" ADD CONSTRAINT "DisputeMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeMessageVersion" ADD CONSTRAINT "DisputeMessageVersion_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "DisputeMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeNotification" ADD CONSTRAINT "DisputeNotification_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "DisputeCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeNotification" ADD CONSTRAINT "DisputeNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

