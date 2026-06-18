-- Add deletedAt to D-05 domain entities
ALTER TABLE "Announcement" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "Booking" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "Content" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "Conversation" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "Event" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "GroupMembershipRequest" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "Household" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "member" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "Notification" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "Property" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "propertyListing" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "Question" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "Resource" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "ResourceVersion" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "Survey" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "communityServiceInquiry" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "communityServiceListing" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "communityServiceReview" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "Competition" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "GroupMember" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "MaintenanceTeam" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "ServiceProvider" ADD COLUMN "deletedAt" TIMESTAMPTZ;
ALTER TABLE "MaintenanceCategory" ADD COLUMN "deletedAt" TIMESTAMPTZ;

-- Migrate existing isDeleted=true records to deletedAt before dropping the column
UPDATE "Message" SET "deletedAt" = "createdAt" WHERE "isDeleted" = true;
ALTER TABLE "Message" DROP COLUMN "isDeleted";
ALTER TABLE "Message" ADD COLUMN "deletedAt" TIMESTAMPTZ;

-- Drop existing unique constraints and replace with partial unique indexes
DROP INDEX IF EXISTS "communityServiceListing_slug_key";
CREATE UNIQUE INDEX "communityServiceListing_slug_key" ON "communityServiceListing"("slug") WHERE "deletedAt" IS NULL;

DROP INDEX IF EXISTS "Property_platformAddress_key";
CREATE UNIQUE INDEX "Property_platformAddress_key" ON "Property"("platformAddress") WHERE "deletedAt" IS NULL;

DROP INDEX IF EXISTS "Property_street_unit_key";
CREATE UNIQUE INDEX "Property_street_unit_key" ON "Property"("street", "unit") WHERE "deletedAt" IS NULL;

DROP INDEX IF EXISTS "MaintenanceCategory_tenantId_value_key";
CREATE UNIQUE INDEX "MaintenanceCategory_tenantId_value_key" ON "MaintenanceCategory"("tenantId", "value") WHERE "deletedAt" IS NULL;

DROP INDEX IF EXISTS "GroupMember_userId_groupId_key";
CREATE UNIQUE INDEX "GroupMember_userId_groupId_key" ON "GroupMember"("userId", "groupId") WHERE "deletedAt" IS NULL;
