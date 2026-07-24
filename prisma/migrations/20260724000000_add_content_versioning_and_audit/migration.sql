-- Create ContentAuditAction enum
CREATE TYPE "ContentAuditAction" AS ENUM('CREATED', 'UPDATED', 'PUBLISHED', 'UNPUBLISHED', 'FLAGGED', 'DELETED', 'RESTORED');

-- Create ContentVersion table
CREATE TABLE "ContentVersion" (
    "id" TEXT PRIMARY KEY,
    "contentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "userId" TEXT,
    "changeSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContentVersion_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE,
    CONSTRAINT "ContentVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL
);

-- Create ContentAuditLog table
CREATE TABLE "ContentAuditLog" (
    "id" TEXT PRIMARY KEY,
    "contentId" TEXT NOT NULL,
    "userId" TEXT,
    "action" "ContentAuditAction" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContentAuditLog_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE,
    CONSTRAINT "ContentAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX "ContentVersion_contentId_idx" ON "ContentVersion"("contentId");
CREATE INDEX "ContentVersion_contentId_version_idx" ON "ContentVersion"("contentId", "version");
CREATE INDEX "ContentAuditLog_contentId_idx" ON "ContentAuditLog"("contentId");
CREATE INDEX "ContentAuditLog_contentId_createdAt_idx" ON "ContentAuditLog"("contentId", "createdAt");
CREATE INDEX "ContentAuditLog_action_idx" ON "ContentAuditLog"("action");
