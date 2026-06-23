-- CreateEnum
CREATE TYPE "AchievementCategory" AS ENUM ('ENGAGEMENT', 'CONTRIBUTION', 'MILESTONE');

-- CreateTable
CREATE TABLE "AchievementDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "eventType" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL DEFAULT 1,
    "category" "AchievementCategory" NOT NULL DEFAULT 'ENGAGEMENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AchievementDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantAchievement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "customThreshold" INTEGER,

    CONSTRAINT "TenantAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievementProgress" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAchievementProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AchievementDefinition_key_key" ON "AchievementDefinition"("key");

-- CreateIndex
CREATE UNIQUE INDEX "TenantAchievement_tenantId_definitionId_key" ON "TenantAchievement"("tenantId", "definitionId");

-- CreateIndex
CREATE INDEX "TenantAchievement_tenantId_idx" ON "TenantAchievement"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievementProgress_userId_definitionId_key" ON "UserAchievementProgress"("userId", "definitionId");

-- CreateIndex
CREATE INDEX "UserAchievementProgress_tenantId_idx" ON "UserAchievementProgress"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_definitionId_key" ON "UserAchievement"("userId", "definitionId");

-- CreateIndex
CREATE INDEX "UserAchievement_tenantId_idx" ON "UserAchievement"("tenantId");

-- CreateIndex
CREATE INDEX "UserAchievement_userId_idx" ON "UserAchievement"("userId");

-- AddForeignKey
ALTER TABLE "TenantAchievement" ADD CONSTRAINT "TenantAchievement_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "AchievementDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantAchievement" ADD CONSTRAINT "TenantAchievement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievementProgress" ADD CONSTRAINT "UserAchievementProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
