-- Phase 47 Plan 01: dWallet schema and migration
-- Adds 6 tables (DWallet, WalletTransaction, DataConsent, PayoutRequest,
-- DataRevenueStream, DataShareBatch) and 5 enums (WalletStatus, TransactionType,
-- TransactionSource, PayoutStatus, BatchStatus).

-- Create dWallet enums
DO $$ BEGIN
  CREATE TYPE "WalletStatus" AS ENUM ('ACTIVE', 'FROZEN', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TransactionType" AS ENUM ('CREDIT', 'DEBIT', 'ROLLOVER', 'ADJUSTMENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TransactionSource" AS ENUM ('RESIDENT_DATA_SHARE', 'COMMUNITY_MERITS', 'REFERRAL_REWARD', 'VOLUNTEER_CREDIT', 'AI_CREDIT', 'MARKETPLACE_CREDIT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BatchStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create DWallet table
CREATE TABLE "DWallet" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "lifetimeEarned" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lifetimePaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "WalletStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DWallet_pkey" PRIMARY KEY ("id")
);

-- Create WalletTransaction table (immutable append-only ledger)
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "description" TEXT NOT NULL,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "balanceBefore" DECIMAL(12,2) NOT NULL,
    "balanceAfter" DECIMAL(12,2) NOT NULL,
    "sourceType" "TransactionSource" NOT NULL DEFAULT 'RESIDENT_DATA_SHARE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- Create DataConsent table (append-only consent records)
CREATE TABLE "DataConsent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "streamKey" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "grantedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataConsent_pkey" PRIMARY KEY ("id")
);

-- Create PayoutRequest table
CREATE TABLE "PayoutRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "method" TEXT,
    "bankReference" TEXT,
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutRequest_pkey" PRIMARY KEY ("id")
);

-- Create DataRevenueStream table
CREATE TABLE "DataRevenueStream" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "residentSharePct" DECIMAL(5,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataRevenueStream_pkey" PRIMARY KEY ("id")
);

-- Create DataShareBatch table
CREATE TABLE "DataShareBatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "streamKey" TEXT NOT NULL,
    "totalRevenue" DECIMAL(12,2) NOT NULL,
    "residentPool" DECIMAL(12,2) NOT NULL,
    "participantCount" INTEGER NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataShareBatch_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "DWallet" ADD CONSTRAINT "DWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "DWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DataConsent" ADD CONSTRAINT "DataConsent_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "DWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "DWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create unique constraints
ALTER TABLE "DWallet" ADD CONSTRAINT "DWallet_tenantId_userId_key" UNIQUE ("tenantId", "userId");
ALTER TABLE "DWallet" ADD CONSTRAINT "DWallet_userId_key" UNIQUE ("userId");
ALTER TABLE "DataRevenueStream" ADD CONSTRAINT "DataRevenueStream_tenantId_key_key" UNIQUE ("tenantId", "key");

-- Create indexes
CREATE INDEX "DWallet_tenantId_idx" ON "DWallet"("tenantId");
CREATE INDEX "DWallet_userId_idx" ON "DWallet"("userId");
CREATE INDEX "DWallet_status_idx" ON "DWallet"("status");
CREATE INDEX "WalletTransaction_walletId_idx" ON "WalletTransaction"("walletId");
CREATE INDEX "WalletTransaction_tenantId_idx" ON "WalletTransaction"("tenantId");
CREATE INDEX "WalletTransaction_referenceId_idx" ON "WalletTransaction"("referenceId");
CREATE INDEX "WalletTransaction_createdAt_idx" ON "WalletTransaction"("createdAt");
CREATE INDEX "DataConsent_walletId_idx" ON "DataConsent"("walletId");
CREATE INDEX "DataConsent_tenantId_streamKey_idx" ON "DataConsent"("tenantId", "streamKey");
CREATE INDEX "DataConsent_userId_idx" ON "DataConsent"("userId");
CREATE INDEX "PayoutRequest_walletId_idx" ON "PayoutRequest"("walletId");
CREATE INDEX "PayoutRequest_tenantId_idx" ON "PayoutRequest"("tenantId");
CREATE INDEX "PayoutRequest_status_idx" ON "PayoutRequest"("status");
CREATE INDEX "DataRevenueStream_tenantId_idx" ON "DataRevenueStream"("tenantId");
CREATE INDEX "DataShareBatch_tenantId_idx" ON "DataShareBatch"("tenantId");
CREATE INDEX "DataShareBatch_status_idx" ON "DataShareBatch"("status");
