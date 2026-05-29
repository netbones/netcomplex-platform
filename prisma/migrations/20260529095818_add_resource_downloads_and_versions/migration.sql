-- AlterTable
ALTER TABLE "Resource" ADD COLUMN "downloadCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ResourceVersion" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "version" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResourceVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResourceVersion_resourceId_idx" ON "ResourceVersion"("resourceId");

-- AddForeignKey
ALTER TABLE "ResourceVersion" ADD CONSTRAINT "ResourceVersion_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
