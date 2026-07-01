-- Add new enum value to TransactionSource
ALTER TYPE "TransactionSource" ADD VALUE 'COMMUNITY_SUPPORT';

-- CreateEnum
CREATE TYPE "SupportTarget" AS ENUM ('CONTENT', 'RESOURCE', 'EVENT', 'GROUP', 'SERVICE', 'PROJECT', 'CAMPAIGN', 'PROFILE');

-- CreateTable
CREATE TABLE "Support" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "targetType" "SupportTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "chips" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Support_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Support_tenantId_idx" ON "Support"("tenantId");

-- CreateIndex
CREATE INDEX "Support_targetType_targetId_idx" ON "Support"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "Support_senderUserId_idx" ON "Support"("senderUserId");

-- CreateIndex
CREATE INDEX "Support_recipientUserId_idx" ON "Support"("recipientUserId");

-- CreateIndex
CREATE INDEX "Support_createdAt_idx" ON "Support"("createdAt");

-- AddForeignKey
ALTER TABLE "Support"
  ADD CONSTRAINT "Support_senderUserId_fkey"
  FOREIGN KEY ("senderUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Support"
  ADD CONSTRAINT "Support_recipientUserId_fkey"
  FOREIGN KEY ("recipientUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
