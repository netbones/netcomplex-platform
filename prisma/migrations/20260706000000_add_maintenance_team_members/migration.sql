-- CreateTable
CREATE TABLE "MaintenanceTeamMember" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceTeamMember_teamId_userId_key" ON "MaintenanceTeamMember"("teamId", "userId");

-- CreateIndex
CREATE INDEX "MaintenanceTeamMember_teamId_idx" ON "MaintenanceTeamMember"("teamId");

-- CreateIndex
CREATE INDEX "MaintenanceTeamMember_userId_idx" ON "MaintenanceTeamMember"("userId");

-- CreateIndex
CREATE INDEX "MaintenanceTeamMember_tenantId_idx" ON "MaintenanceTeamMember"("tenantId");

-- AddForeignKey
ALTER TABLE "MaintenanceTeamMember" ADD CONSTRAINT "MaintenanceTeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "MaintenanceTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTeamMember" ADD CONSTRAINT "MaintenanceTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTeamMember" ADD CONSTRAINT "MaintenanceTeamMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
