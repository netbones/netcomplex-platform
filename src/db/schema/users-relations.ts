import { relations } from 'drizzle-orm';
import { users } from './users';
import { agentAccesses } from './agent-accesses';
import { agentProfiles } from './agent-profiles';
import { agentTokens } from './agent-tokens';
import { agentReviews } from './agent-reviews';
import { albums } from './albums';
import { assistSessions } from './assist-sessions';
import { bookings } from './bookings';
import { communityMerits } from './community-merits';
import { communityServiceInquiries } from './community-service-inquiries';
import { communityServiceListings } from './community-service-listings';
import { communityServiceReviews } from './community-service-reviews';
import { competitionEntries } from './competition-entries';
import { contents } from './contents';
import { contentLikes } from './content-likes';
import { contentVersions } from './content-versions';
import { comments } from './comments';
import { commentVotes } from './comment-votes';
import { commentReports } from './comment-reports';
import { contentAuditLogs } from './content-audit-logs';
import { conversationParticipants } from './conversation-participants';
import { dWallets } from './d-wallets';
import { delegationActions } from './delegation-actions';
import { disputeCases } from './dispute-cases';
import { disputeEvents } from './dispute-events';
import { disputeEvidences } from './dispute-evidences';
import { disputeMessages } from './dispute-messages';
import { disputeNotifications } from './dispute-notifications';
import { eventAttendees } from './event-attendees';
import { groups } from './groups';
import { groupMembers } from './group-members';
import { groupMembershipRequests } from './group-membership-requests';
import { maintenanceTeamMembers } from './maintenance-team-members';
import { internalMaintenanceNotes } from './internal-maintenance-notes';
import { invitations } from './invitations';
import { maintenanceRequests } from './maintenance-requests';
import { mediaUploads } from './media-uploads';
import { members } from './members';
import { messages } from './messages';
import { notifications } from './notifications';
import { platformSuspensions } from './platform-suspensions';
import { premiumSeats } from './premium-seats';
import { profiles } from './profiles';
import { properties } from './properties';
import { propertyListings } from './property-listings';
import { requestHistories } from './request-histories';
import { requestNotes } from './request-notes';
import { residentDelegations } from './resident-delegations';
import { resources } from './resources';
import { serviceBookings } from './service-bookings';
import { serviceProviders } from './service-providers';
import { soloSeats } from './solo-seats';
import { standardSeats } from './standard-seats';
import { supports } from './supports';
import { tenants } from './tenants';
import { userAchievements } from './user-achievements';
import { userAchievementProgresses } from './user-achievement-progresses';
import { userDevices } from './user-devices';
import { userKeys } from './user-keys';
import { accounts } from './accounts';
import { passkeys } from './passkeys';
import { sessions } from './sessions';
import { twoFactors } from './two-factors';
import { meetingProxies } from './meeting-proxies';
import { securityAlerts } from './security-alerts';
import { securityContacts } from './security-contacts';

export const usersRelations = relations(users, helpers => ({
  agentAccess_agentAccess_agentIdTouser: helpers.many(agentAccesses, {
    relationName: 'agentAccess_agentIdTouser',
  }),
  agentAccess_agentAccess_grantedByIdTouser: helpers.many(agentAccesses, {
    relationName: 'agentAccess_grantedByIdTouser',
  }),
  agentProfile: helpers.one(agentProfiles),
  agentTokensAsAgent: helpers.many(agentTokens, { relationName: 'agentToken_agentIdTouser' }),
  agentTokensIssued: helpers.many(agentTokens, { relationName: 'agentToken_issuedByIdTouser' }),
  agentReviewsAsReviewer: helpers.many(agentReviews, {
    relationName: 'AgentReview_reviewerToUser',
  }),
  album: helpers.many(albums, { relationName: 'AlbumTouser' }),
  assistSessions: helpers.many(assistSessions, { relationName: 'AssistSessionTouser' }),
  Booking: helpers.many(bookings, { relationName: 'BookingTouser' }),
  communityMeritsCreatedBy: helpers.many(communityMerits, {
    relationName: 'CommunityMeritCreatedBy',
  }),
  communityMeritsResolvedBy: helpers.many(communityMerits, {
    relationName: 'CommunityMeritResolvedBy',
  }),
  communityMeritsSubject: helpers.many(communityMerits, { relationName: 'CommunityMeritSubject' }),
  communityServiceInquiry: helpers.many(communityServiceInquiries, {
    relationName: 'CommunityServiceInquiryTouser',
  }),
  communityServiceListing: helpers.many(communityServiceListings, {
    relationName: 'CommunityServiceListingTouser',
  }),
  communityServiceReview: helpers.many(communityServiceReviews, {
    relationName: 'CommunityServiceReviewTouser',
  }),
  CompetitionEntry: helpers.many(competitionEntries, { relationName: 'CompetitionEntryTouser' }),
  Content: helpers.many(contents, { relationName: 'ContentTouser' }),
  ContentLike: helpers.many(contentLikes, { relationName: 'ContentLikeTouser' }),
  ContentVersion: helpers.many(contentVersions, { relationName: 'ContentVersionTouser' }),
  comments: helpers.many(comments, { relationName: 'CommentTouser' }),
  commentVotes: helpers.many(commentVotes, { relationName: 'CommentVoteTouser' }),
  commentReports: helpers.many(commentReports, { relationName: 'CommentReportTouser' }),
  ContentAuditLog: helpers.many(contentAuditLogs, { relationName: 'ContentAuditLogTouser' }),
  ConversationParticipant: helpers.many(conversationParticipants, {
    relationName: 'ConversationParticipantTouser',
  }),
  dWallet: helpers.one(dWallets),
  delegationActionsAsActor: helpers.many(delegationActions, {
    relationName: 'DelegationActionTouser',
  }),
  disputeCases_moderator: helpers.many(disputeCases, { relationName: 'DisputeModerator' }),
  disputeCases_closedBy: helpers.many(disputeCases, { relationName: 'DisputeClosedBy' }),
  disputeCases_complainant: helpers.many(disputeCases, { relationName: 'DisputeComplainant' }),
  disputeCases_respondent: helpers.many(disputeCases, { relationName: 'DisputeRespondent' }),
  disputeEvent_actor: helpers.many(disputeEvents, { relationName: 'DisputeEventActor' }),
  disputeEvidence_uploader: helpers.many(disputeEvidences, {
    relationName: 'DisputeEvidenceUploader',
  }),
  disputeMessage_sender: helpers.many(disputeMessages, { relationName: 'DisputeMessageSender' }),
  disputeNotification_user: helpers.many(disputeNotifications, {
    relationName: 'DisputeNotificationUser',
  }),
  EventAttendee: helpers.many(eventAttendees, { relationName: 'EventAttendeeTouser' }),
  Group: helpers.many(groups, { relationName: 'GroupTouser' }),
  GroupMember: helpers.many(groupMembers, { relationName: 'GroupMemberTouser' }),
  GroupMembershipRequest: helpers.many(groupMembershipRequests, {
    relationName: 'GroupMembershipRequestTouser',
  }),
  MaintenanceTeamMember: helpers.many(maintenanceTeamMembers, {
    relationName: 'MaintenanceTeamMemberTouser',
  }),
  InternalMaintenanceNote: helpers.many(internalMaintenanceNotes, {
    relationName: 'InternalMaintenanceNoteTouser',
  }),
  invitation: helpers.many(invitations, { relationName: 'InvitationTouser' }),
  maintenanceRequestsAsLandlord: helpers.many(maintenanceRequests, {
    relationName: 'MaintenanceRequest_landlord',
  }),
  MaintenanceRequest: helpers.many(maintenanceRequests, {
    relationName: 'MaintenanceRequestTouser',
  }),
  mediaUploads: helpers.many(mediaUploads, { relationName: 'MediaUploadTouser' }),
  member: helpers.many(members, { relationName: 'MemberTouser' }),
  Message: helpers.many(messages, { relationName: 'MessageTouser' }),
  Notification: helpers.many(notifications, { relationName: 'NotificationTouser' }),
  platformSuspension: helpers.many(platformSuspensions, {
    relationName: 'PlatformSuspensionTouser',
  }),
  premiumSeat: helpers.one(premiumSeats),
  profile_profile_landlordIdTouser: helpers.many(profiles, {
    relationName: 'profile_landlordIdTouser',
  }),
  profile_profile_userIdTouser: helpers.many(profiles, { relationName: 'profile_userIdTouser' }),
  ownedProperties: helpers.many(properties, { relationName: 'PropertyOwner' }),
  propertyListing_propertyListing_assignedAgentIdTouser: helpers.many(propertyListings, {
    relationName: 'propertyListing_assignedAgentIdTouser',
  }),
  propertyListing_propertyListing_ownerIdTouser: helpers.many(propertyListings, {
    relationName: 'propertyListing_ownerIdTouser',
  }),
  RequestHistory: helpers.many(requestHistories, { relationName: 'RequestHistoryTouser' }),
  RequestNote: helpers.many(requestNotes, { relationName: 'RequestNoteTouser' }),
  residentDelegationsGranted: helpers.many(residentDelegations, {
    relationName: 'ResidentDelegation_owner',
  }),
  Resource: helpers.many(resources, { relationName: 'ResourceTouser' }),
  serviceBooking: helpers.many(serviceBookings, { relationName: 'ServiceBookingToUser' }),
  serviceProviders: helpers.many(serviceProviders, { relationName: 'ServiceProviderTouser' }),
  soloSeat: helpers.many(soloSeats, { relationName: 'SoloSeatTouser' }),
  standardSeat: helpers.many(standardSeats, { relationName: 'StandardSeatTouser' }),
  receivedSupports: helpers.many(supports, { relationName: 'ReceivedSupports' }),
  sentSupports: helpers.many(supports, { relationName: 'SentSupports' }),
  ownedTenants: helpers.many(tenants, { relationName: 'TenantOwner' }),
  UserAchievement: helpers.many(userAchievements, { relationName: 'UserAchievementTouser' }),
  UserAchievementProgress: helpers.many(userAchievementProgresses, {
    relationName: 'UserAchievementProgressTouser',
  }),
  UserDevice: helpers.many(userDevices, { relationName: 'UserDeviceTouser' }),
  UserKey: helpers.many(userKeys, { relationName: 'UserKeyTouser' }),
  account: helpers.many(accounts, { relationName: 'accountTouser' }),
  passkey: helpers.many(passkeys, { relationName: 'passkeyTouser' }),
  session: helpers.many(sessions, { relationName: 'sessionTouser' }),
  twoFactor: helpers.many(twoFactors, { relationName: 'twoFactorTouser' }),
  meetingProxiesOwner: helpers.many(meetingProxies, { relationName: 'MeetingProxyOwner' }),
  meetingProxiesProxy: helpers.many(meetingProxies, { relationName: 'MeetingProxyProxy' }),
  meetingProxiesApprover: helpers.many(meetingProxies, { relationName: 'MeetingProxyApprover' }),
  securityAlertsTriggered: helpers.many(securityAlerts, {
    relationName: 'SecurityAlertTriggeredBy',
  }),
  securityAlertsAcknowledged: helpers.many(securityAlerts, {
    relationName: 'SecurityAlertAcknowledgedBy',
  }),
  securityAlertsResolved: helpers.many(securityAlerts, {
    relationName: 'SecurityAlertResolvedBy',
  }),
  securityContactsCreated: helpers.many(securityContacts, {
    relationName: 'SecurityContactCreatedBy',
  }),
}));
