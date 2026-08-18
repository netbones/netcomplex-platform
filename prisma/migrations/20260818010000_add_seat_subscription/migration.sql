-- ADVISORY-040 Phase 2: SeatSubscription + PaymentTransaction FK loosening
-- providerId/subscriptionId become optional; seatSubscriptionId added.
-- Exactly-one CHECK guards against orphaned transactions (advisory §5.2 discovery,
-- G2). Verified against live PaymentTransaction: 0 existing rows.

-- DropForeignKey
ALTER TABLE "PaymentTransaction" DROP CONSTRAINT "PaymentTransaction_providerId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentTransaction" DROP CONSTRAINT "PaymentTransaction_subscriptionId_fkey";

-- AlterTable
ALTER TABLE "PaymentTransaction" ADD COLUMN     "seatSubscriptionId" TEXT,
ALTER COLUMN "providerId" DROP NOT NULL,
ALTER COLUMN "subscriptionId" DROP NOT NULL;

-- CreateTable
CREATE TABLE IF NOT EXISTS "SeatSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seatType" "SeatType" NOT NULL,
    "soloSeatId" TEXT,
    "premiumSeatId" TEXT,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "isComplimentary" BOOLEAN NOT NULL DEFAULT false,
    "grantedByUserId" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "nextBillingDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SeatSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SeatSubscription_tenantId_userId_idx" ON "SeatSubscription"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "SeatSubscription_soloSeatId_idx" ON "SeatSubscription"("soloSeatId");

-- CreateIndex
CREATE INDEX "SeatSubscription_premiumSeatId_idx" ON "SeatSubscription"("premiumSeatId");

-- CreateIndex
CREATE INDEX "SeatSubscription_planId_idx" ON "SeatSubscription"("planId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_seatSubscriptionId_idx" ON "PaymentTransaction"("seatSubscriptionId");

-- Exactly one billing subject: provider billing OR seat billing, never both
-- (and never neither).
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_exactly_one_subject_check"
CHECK (num_nonnulls("providerId", "seatSubscriptionId") = 1);

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ServiceProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "ProviderSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_seatSubscriptionId_fkey" FOREIGN KEY ("seatSubscriptionId") REFERENCES "SeatSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatSubscription" ADD CONSTRAINT "SeatSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatSubscription" ADD CONSTRAINT "SeatSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatSubscription" ADD CONSTRAINT "SeatSubscription_soloSeatId_fkey" FOREIGN KEY ("soloSeatId") REFERENCES "SoloSeat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatSubscription" ADD CONSTRAINT "SeatSubscription_premiumSeatId_fkey" FOREIGN KEY ("premiumSeatId") REFERENCES "PremiumSeat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatSubscription" ADD CONSTRAINT "SeatSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SeatPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;