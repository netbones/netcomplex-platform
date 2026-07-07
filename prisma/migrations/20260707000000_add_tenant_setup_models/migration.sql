-- CreateTable
CREATE TABLE "TenantSetup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "completionPercent" INTEGER NOT NULL DEFAULT 0,
    "completedSections" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "launchedAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TenantSetup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantSetup_tenantId_key" ON "TenantSetup"("tenantId");

-- CreateTable
CREATE TABLE "SetupMission" (
    "id" TEXT NOT NULL,
    "tenantSetupId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "missionKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SetupMission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SetupMission_tenantSetupId_missionKey_key" ON "SetupMission"("tenantSetupId", "missionKey");

-- CreateIndex
CREATE INDEX "SetupMission_tenantSetupId_section_idx" ON "SetupMission"("tenantSetupId", "section");

-- CreateTable
CREATE TABLE "SetupSetting" (
    "id" TEXT NOT NULL,
    "tenantSetupId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SetupSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SetupSetting_tenantSetupId_key_key" ON "SetupSetting"("tenantSetupId", "key");

-- AddForeignKey
ALTER TABLE "TenantSetup" ADD CONSTRAINT "TenantSetup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetupMission" ADD CONSTRAINT "SetupMission_tenantSetupId_fkey" FOREIGN KEY ("tenantSetupId") REFERENCES "TenantSetup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetupSetting" ADD CONSTRAINT "SetupSetting_tenantSetupId_fkey" FOREIGN KEY ("tenantSetupId") REFERENCES "TenantSetup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
