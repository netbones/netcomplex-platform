-- =============================================================================
-- Add missing FK indexes (Supabase Performance Lint 0001_unindexed_foreign_keys)
--
-- 20 FK columns across various tables that lack a covering index. One flagged
-- FK (Notification_userId) is already covered by the composite
-- (tenantId, userId) index and intentionally skipped.
-- =============================================================================

CREATE INDEX IF NOT EXISTS "AgentAccess_grantedById_idx" ON "AgentAccess"("grantedById");

CREATE INDEX IF NOT EXISTS "Announcement_resourceId_idx" ON "Announcement"("resourceId");

CREATE INDEX IF NOT EXISTS "Booking_propertyId_idx" ON "Booking"("propertyId");
CREATE INDEX IF NOT EXISTS "Booking_userId_idx" ON "Booking"("userId");

CREATE INDEX IF NOT EXISTS "Content_authorId_idx" ON "Content"("authorId");
CREATE INDEX IF NOT EXISTS "Content_groupId_idx" ON "Content"("groupId");

CREATE INDEX IF NOT EXISTS "Group_ownerId_idx" ON "Group"("ownerId");

CREATE INDEX IF NOT EXISTS "GroupMember_groupId_idx" ON "GroupMember"("groupId");
CREATE INDEX IF NOT EXISTS "GroupMember_userId_idx" ON "GroupMember"("userId");

CREATE INDEX IF NOT EXISTS "Invitation_inviterId_idx" ON "Invitation"("inviterId");

CREATE INDEX IF NOT EXISTS "MaintenanceRequest_propertyId_idx" ON "MaintenanceRequest"("propertyId");
CREATE INDEX IF NOT EXISTS "MaintenanceRequest_userId_idx" ON "MaintenanceRequest"("userId");

CREATE INDEX IF NOT EXISTS "Message_senderId_idx" ON "Message"("senderId");

CREATE INDEX IF NOT EXISTS "RequestHistory_userId_idx" ON "RequestHistory"("userId");

CREATE INDEX IF NOT EXISTS "RequestNote_userId_idx" ON "RequestNote"("userId");

CREATE INDEX IF NOT EXISTS "Resource_authorId_idx" ON "Resource"("authorId");

CREATE INDEX IF NOT EXISTS "Response_surveyId_idx" ON "Response"("surveyId");

CREATE INDEX IF NOT EXISTS "SoloSeat_userId_idx" ON "SoloSeat"("userId");

CREATE INDEX IF NOT EXISTS "Tenant_ownerId_idx" ON "Tenant"("ownerId");

CREATE INDEX IF NOT EXISTS "TenantModule_moduleKey_idx" ON "TenantModule"("moduleKey");
