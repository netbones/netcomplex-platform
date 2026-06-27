-- CreateTable
CREATE TABLE "InternalMaintenanceNote" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalMaintenanceNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InternalMaintenanceNote_requestId_idx" ON "InternalMaintenanceNote"("requestId");

-- CreateIndex
CREATE INDEX "InternalMaintenanceNote_userId_idx" ON "InternalMaintenanceNote"("userId");

-- AddForeignKey
ALTER TABLE "InternalMaintenanceNote" ADD CONSTRAINT "InternalMaintenanceNote_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MaintenanceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalMaintenanceNote" ADD CONSTRAINT "InternalMaintenanceNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
