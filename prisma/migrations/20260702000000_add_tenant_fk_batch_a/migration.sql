-- Batch A: Tenant FK relations + indexes for Core Community + Seats & Listings (27 models)
-- Applied 2026-07-02 via Supabase MCP. Recovered 2026-07-02 after working-tree revert.
-- See ADVISORY-024 §3.1: onDelete: Restrict, bidirectional relations required by Prisma.

ALTER TABLE "Profile" ADD CONSTRAINT "Profile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "Member" ADD CONSTRAINT "Member_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "Property" ADD CONSTRAINT "Property_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "Household" ADD CONSTRAINT "Household_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "Message" ADD CONSTRAINT "Message_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "Content" ADD CONSTRAINT "Content_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "ContentLike" ADD CONSTRAINT "ContentLike_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "Group" ADD CONSTRAINT "Group_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "GroupMembershipRequest" ADD CONSTRAINT "GroupMembershipRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "Album" ADD CONSTRAINT "Album_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "Event" ADD CONSTRAINT "Event_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "EventAttendee" ADD CONSTRAINT "EventAttendee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "PremiumSeat" ADD CONSTRAINT "PremiumSeat_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "SoloSeat" ADD CONSTRAINT "SoloSeat_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "StandardSeat" ADD CONSTRAINT "StandardSeat_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "PropertyListing" ADD CONSTRAINT "PropertyListing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "PropertyPremiumSeat" ADD CONSTRAINT "PropertyPremiumSeat_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT;

CREATE INDEX "Profile_tenantId_idx" ON "Profile"("tenantId");
CREATE INDEX "Member_tenantId_idx" ON "Member"("tenantId");
CREATE INDEX "Property_tenantId_idx" ON "Property"("tenantId");
CREATE INDEX "Household_tenantId_idx" ON "Household"("tenantId");
CREATE INDEX "Invitation_tenantId_idx" ON "Invitation"("tenantId");
CREATE INDEX "ConversationParticipant_tenantId_idx" ON "ConversationParticipant"("tenantId");
CREATE INDEX "Message_tenantId_idx" ON "Message"("tenantId");
CREATE INDEX "ContentLike_tenantId_idx" ON "ContentLike"("tenantId");
CREATE INDEX "Group_tenantId_idx" ON "Group"("tenantId");
CREATE INDEX "GroupMember_tenantId_idx" ON "GroupMember"("tenantId");
CREATE INDEX "GroupMembershipRequest_tenantId_idx" ON "GroupMembershipRequest"("tenantId");
CREATE INDEX "Album_tenantId_idx" ON "Album"("tenantId");
CREATE INDEX "Announcement_tenantId_idx" ON "Announcement"("tenantId");
CREATE INDEX "EventAttendee_tenantId_idx" ON "EventAttendee"("tenantId");
CREATE INDEX "Booking_tenantId_idx" ON "Booking"("tenantId");
CREATE INDEX "PremiumSeat_tenantId_idx" ON "PremiumSeat"("tenantId");
CREATE INDEX "SoloSeat_tenantId_idx" ON "SoloSeat"("tenantId");
CREATE INDEX "StandardSeat_tenantId_idx" ON "StandardSeat"("tenantId");
CREATE INDEX "PropertyListing_tenantId_idx" ON "PropertyListing"("tenantId");
CREATE INDEX "PropertyPremiumSeat_tenantId_idx" ON "PropertyPremiumSeat"("tenantId");
