-- CreateTable
CREATE TABLE "AgentReview" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "agentProfileId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT,
    "serviceDate" TIMESTAMP(3),
    "responseQuality" INTEGER,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "moderatedBy" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AgentReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentReview_agentProfileId_idx" ON "AgentReview"("agentProfileId");

-- CreateIndex
CREATE INDEX "AgentReview_tenantId_idx" ON "AgentReview"("tenantId");

-- CreateIndex
CREATE INDEX "AgentReview_rating_idx" ON "AgentReview"("rating");

-- CreateIndex
CREATE INDEX "AgentReview_reviewerId_idx" ON "AgentReview"("reviewerId");

-- AddForeignKey
ALTER TABLE "AgentReview" ADD CONSTRAINT "AgentReview_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentReview" ADD CONSTRAINT "AgentReview_agentProfileId_fkey" FOREIGN KEY ("agentProfileId") REFERENCES "AgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentReview" ADD CONSTRAINT "AgentReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;