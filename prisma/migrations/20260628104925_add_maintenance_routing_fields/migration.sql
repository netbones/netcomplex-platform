-- CreateEnum
CREATE TYPE "MaintenanceRouting" AS ENUM ('HOA', 'LANDLORD');

-- AlterTable
ALTER TABLE "MaintenanceRequest" ADD COLUMN     "landlordId" TEXT,
ADD COLUMN     "routingType" "MaintenanceRouting" NOT NULL DEFAULT 'HOA';

-- CreateIndex
CREATE INDEX "MaintenanceRequest_routingType_idx" ON "MaintenanceRequest"("routingType");

-- CreateIndex
CREATE INDEX "MaintenanceRequest_landlordId_idx" ON "MaintenanceRequest"("landlordId");

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
