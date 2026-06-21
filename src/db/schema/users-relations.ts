import { relations } from 'drizzle-orm';
import { users } from './users';
import { assistSessions } from './assist-sessions';
import { bookings } from './bookings';
import { competitionEntries } from './competition-entries';
import { contents } from './contents';
import { contentLikes } from './content-likes';
import { eventAttendees } from './event-attendees';
import { conversationParticipants } from './conversation-participants';
import { groups } from './groups';
import { groupMembershipRequests } from './group-membership-requests';
import { maintenanceRequests } from './maintenance-requests';
import { requestNotes } from './request-notes';
import { requestHistories } from './request-histories';
import { messages } from './messages';
import { notifications } from './notifications';
import { properties } from './properties';
import { resources } from './resources';
import { tenants } from './tenants';
import { groupMembers } from './group-members';
import { accounts } from './accounts';
import { agentAccesses } from './agent-accesses';
import { agentProfiles } from './agent-profiles';
import { albums } from './albums';
import { communityServiceInquiries } from './community-service-inquiries';
import { communityServiceListings } from './community-service-listings';
import { communityServiceReviews } from './community-service-reviews';
import { invitations } from './invitations';
import { members } from './members';
import { passkeys } from './passkeys';
import { platformSuspensions } from './platform-suspensions';
import { communityMerits } from './community-merits';
import { premiumSeats } from './premium-seats';
import { profiles } from './profiles';
import { propertyListings } from './property-listings';
import { sessions } from './sessions';
import { soloSeats } from './solo-seats';
import { standardSeats } from './standard-seats';
import { twoFactors } from './two-factors';

export const usersRelations = relations(users, helpers => ({
  assistSessions: helpers.many(assistSessions, { relationName: 'AssistSessionTouser' }),
  Booking: helpers.many(bookings, { relationName: 'BookingTouser' }),
  CompetitionEntry: helpers.many(competitionEntries, { relationName: 'CompetitionEntryTouser' }),
  Content: helpers.many(contents, { relationName: 'ContentTouser' }),
  ContentLike: helpers.many(contentLikes, { relationName: 'ContentLikeTouser' }),
  EventAttendee: helpers.many(eventAttendees, { relationName: 'EventAttendeeTouser' }),
  ConversationParticipant: helpers.many(conversationParticipants, {
    relationName: 'ConversationParticipantTouser',
  }),
  Group: helpers.many(groups, { relationName: 'GroupTouser' }),
  GroupMembershipRequest: helpers.many(groupMembershipRequests, {
    relationName: 'GroupMembershipRequestTouser',
  }),
  MaintenanceRequest: helpers.many(maintenanceRequests, {
    relationName: 'MaintenanceRequestTouser',
  }),
  RequestNote: helpers.many(requestNotes, { relationName: 'RequestNoteTouser' }),
  RequestHistory: helpers.many(requestHistories, { relationName: 'RequestHistoryTouser' }),
  Message: helpers.many(messages, { relationName: 'MessageTouser' }),
  Notification: helpers.many(notifications, { relationName: 'NotificationTouser' }),
  ownedProperties: helpers.many(properties, { relationName: 'PropertyOwner' }),
  Resource: helpers.many(resources, { relationName: 'ResourceTouser' }),
  ownedTenants: helpers.many(tenants, { relationName: 'TenantOwner' }),
  GroupMember: helpers.many(groupMembers, { relationName: 'GroupMemberTouser' }),
  account: helpers.many(accounts, { relationName: 'accountTouser' }),
  agentAccess_agentAccess_agentIdTouser: helpers.many(agentAccesses, {
    relationName: 'agentAccess_agentIdTouser',
  }),
  agentAccess_agentAccess_grantedByIdTouser: helpers.many(agentAccesses, {
    relationName: 'agentAccess_grantedByIdTouser',
  }),
  agentProfile: helpers.one(agentProfiles),
  album: helpers.many(albums, { relationName: 'AlbumTouser' }),
  communityServiceInquiry: helpers.many(communityServiceInquiries, {
    relationName: 'CommunityServiceInquiryTouser',
  }),
  communityServiceListing: helpers.many(communityServiceListings, {
    relationName: 'CommunityServiceListingTouser',
  }),
  communityServiceReview: helpers.many(communityServiceReviews, {
    relationName: 'CommunityServiceReviewTouser',
  }),
  invitation: helpers.many(invitations, { relationName: 'InvitationTouser' }),
  member: helpers.many(members, { relationName: 'MemberTouser' }),
  passkey: helpers.many(passkeys, { relationName: 'passkeyTouser' }),
  platformSuspension: helpers.many(platformSuspensions, {
    relationName: 'PlatformSuspensionTouser',
  }),
  communityMeritsSubject: helpers.many(communityMerits, { relationName: 'CommunityMeritSubject' }),
  communityMeritsCreatedBy: helpers.many(communityMerits, {
    relationName: 'CommunityMeritCreatedBy',
  }),
  communityMeritsResolvedBy: helpers.many(communityMerits, {
    relationName: 'CommunityMeritResolvedBy',
  }),
  premiumSeat: helpers.one(premiumSeats),
  profile_profile_landlordIdTouser: helpers.many(profiles, {
    relationName: 'profile_landlordIdTouser',
  }),
  profile_profile_userIdTouser: helpers.many(profiles, { relationName: 'profile_userIdTouser' }),
  propertyListing_propertyListing_assignedAgentIdTouser: helpers.many(propertyListings, {
    relationName: 'propertyListing_assignedAgentIdTouser',
  }),
  propertyListing_propertyListing_ownerIdTouser: helpers.many(propertyListings, {
    relationName: 'propertyListing_ownerIdTouser',
  }),
  session: helpers.many(sessions, { relationName: 'sessionTouser' }),
  soloSeat: helpers.many(soloSeats, { relationName: 'SoloSeatTouser' }),
  standardSeat: helpers.many(standardSeats, { relationName: 'StandardSeatTouser' }),
  twoFactor: helpers.many(twoFactors, { relationName: 'twoFactorTouser' }),
}));
