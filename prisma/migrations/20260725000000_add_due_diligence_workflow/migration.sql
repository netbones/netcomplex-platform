-- CreateEnum
CREATE TYPE "ProviderDueDiligenceStatus" AS ENUM ('PENDING_REVIEW', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DueDiligenceItemStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DueDiligenceDocumentCategory" AS ENUM ('IDENTITY_DOC', 'BUSINESS_LICENSE', 'INSURANCE', 'REFERENCE', 'OTHER');

-- CreateTable
CREATE TABLE "ProviderDueDiligenceWorkflow" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" "ProviderDueDiligenceStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "assignedTo" TEXT,
    "submittedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProviderDueDiligenceWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderDueDiligenceItem" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "status" "DueDiligenceItemStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderDueDiligenceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderDueDiligenceDocument" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "itemId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "category" "DueDiligenceDocumentCategory" NOT NULL DEFAULT 'OTHER',
    "uploadedBy" TEXT NOT NULL,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProviderDueDiligenceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderDueDiligenceEvent" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderDueDiligenceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProviderDueDiligenceWorkflow_providerId_key" ON "ProviderDueDiligenceWorkflow"("providerId");

-- CreateIndex
CREATE INDEX "ProviderDueDiligenceWorkflow_tenantId_idx" ON "ProviderDueDiligenceWorkflow"("tenantId");

-- CreateIndex
CREATE INDEX "ProviderDueDiligenceWorkflow_providerId_idx" ON "ProviderDueDiligenceWorkflow"("providerId");

-- CreateIndex
CREATE INDEX "ProviderDueDiligenceWorkflow_status_idx" ON "ProviderDueDiligenceWorkflow"("status");

-- CreateIndex
CREATE INDEX "ProviderDueDiligenceItem_workflowId_idx" ON "ProviderDueDiligenceItem"("workflowId");

-- CreateIndex
CREATE INDEX "ProviderDueDiligenceItem_itemKey_idx" ON "ProviderDueDiligenceItem"("itemKey");

-- CreateIndex
CREATE INDEX "ProviderDueDiligenceDocument_workflowId_idx" ON "ProviderDueDiligenceDocument"("workflowId");

-- CreateIndex
CREATE INDEX "ProviderDueDiligenceDocument_itemId_idx" ON "ProviderDueDiligenceDocument"("itemId");

-- CreateIndex
CREATE INDEX "ProviderDueDiligenceEvent_workflowId_idx" ON "ProviderDueDiligenceEvent"("workflowId");

-- AddForeignKey
ALTER TABLE "ProviderDueDiligenceWorkflow" ADD CONSTRAINT "ProviderDueDiligenceWorkflow_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderDueDiligenceWorkflow" ADD CONSTRAINT "ProviderDueDiligenceWorkflow_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ServiceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderDueDiligenceItem" ADD CONSTRAINT "ProviderDueDiligenceItem_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ProviderDueDiligenceWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderDueDiligenceDocument" ADD CONSTRAINT "ProviderDueDiligenceDocument_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ProviderDueDiligenceWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderDueDiligenceDocument" ADD CONSTRAINT "ProviderDueDiligenceDocument_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ProviderDueDiligenceItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderDueDiligenceEvent" ADD CONSTRAINT "ProviderDueDiligenceEvent_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ProviderDueDiligenceWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
