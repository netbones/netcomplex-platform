-- CreateEnum
CREATE TYPE "AiOveragePolicy" AS ENUM ('HARD_STOP', 'THROTTLE', 'SURCHARGE');

-- CreateEnum
CREATE TYPE "AiUsageStatus" AS ENUM ('ACTIVE', 'SETTLED', 'OVERRIDDEN');

-- CreateTable
CREATE TABLE "PlatformAiTierQuota" (
    "id" TEXT NOT NULL,
    "tier" "Tier" NOT NULL,
    "monthlyTokens" INTEGER NOT NULL,
    "overagePolicy" "AiOveragePolicy" NOT NULL DEFAULT 'HARD_STOP',
    "overageTokens" INTEGER NOT NULL DEFAULT 0,
    "overagePriceZAR" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,

    CONSTRAINT "PlatformAiTierQuota_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAiTierQuota_tier_key" ON "PlatformAiTierQuota"("tier");

-- CreateTable
CREATE TABLE "AiCapabilityCost" (
    "id" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "estimatedTokens" INTEGER NOT NULL,
    "maxTokens" INTEGER NOT NULL,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCapabilityCost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiCapabilityCost_capability_key" ON "AiCapabilityCost"("capability");

-- CreateTable
CREATE TABLE "TenantAiUsage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "billingMonth" TEXT NOT NULL,
    "tokensAllotted" INTEGER NOT NULL,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "overageTokens" INTEGER NOT NULL DEFAULT 0,
    "overageCostZAR" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "status" "AiUsageStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantAiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantAiUsage_tenantId_idx" ON "TenantAiUsage"("tenantId");

-- CreateIndex
CREATE INDEX "TenantAiUsage_billingMonth_idx" ON "TenantAiUsage"("billingMonth");

-- CreateIndex
CREATE UNIQUE INDEX "TenantAiUsage_tenantId_billingMonth_key" ON "TenantAiUsage"("tenantId", "billingMonth");

-- CreateTable
CREATE TABLE "AiUsageEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "usageId" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "userId" TEXT,
    "referenceId" TEXT,
    "durationMs" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiUsageEvent_tenantId_createdAt_idx" ON "AiUsageEvent"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsageEvent_capability_idx" ON "AiUsageEvent"("capability");

-- CreateIndex
CREATE INDEX "AiUsageEvent_usageId_idx" ON "AiUsageEvent"("usageId");

-- AddForeignKey
ALTER TABLE "AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_usageId_fkey" FOREIGN KEY ("usageId") REFERENCES "TenantAiUsage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
