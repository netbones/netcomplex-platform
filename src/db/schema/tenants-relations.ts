import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';
import { albums } from './albums';
import { announcements } from './announcements';
import { bookings } from './bookings';
import { contents } from './contents';
import { contentLikes } from './content-likes';
import { comments } from './comments';
import { commentReports } from './comment-reports';
import { commentVotes } from './comment-votes';
import { conversations } from './conversations';
import { conversationParticipants } from './conversation-participants';
import { events } from './events';
import { eventAttendees } from './event-attendees';
import { groups } from './groups';
import { groupMembers } from './group-members';
import { groupMembershipRequests } from './group-membership-requests';
import { households } from './households';
import { invitations } from './invitations';
import { members } from './members';
import { messages } from './messages';
import { notifications } from './notifications';
import { organizations } from './organizations';
import { premiumSeats } from './premium-seats';
import { profiles } from './profiles';
import { properties } from './properties';
import { propertyListings } from './property-listings';
import { propertyPremiumSeats } from './property-premium-seats';
import { resources } from './resources';
import { serviceBookings } from './service-bookings';
import { soloSeats } from './solo-seats';
import { standardSeats } from './standard-seats';
import { addresses } from './addresses';
import { agentAccesses } from './agent-accesses';
import { agentTokens } from './agent-tokens';
import { aiUsageEvents } from './ai-usage-events';
import { bursaries } from './bursaries';
import { delegationActions } from './delegation-actions';
import { disputeCases } from './dispute-cases';
import { disputeEvidences } from './dispute-evidences';
import { disputeEvents } from './dispute-events';
import { disputeMessages } from './dispute-messages';
import { disputeNotifications } from './dispute-notifications';
import { handles } from './handles';
import { platformSuspensions } from './platform-suspensions';
import { residentDelegations } from './resident-delegations';
import { settings } from './settings';
import { subscriptionTiers } from './subscription-tiers';
import { tenantAiUsages } from './tenant-ai-usages';
import { userAchievements } from './user-achievements';
import { userAchievementProgresses } from './user-achievement-progresses';
import { agentProfiles } from './agent-profiles';
import { communityMerits } from './community-merits';
import { competitions } from './competitions';
import { dataConsents } from './data-consents';
import { dataRevenueStreams } from './data-revenue-streams';
import { dataShareBatches } from './data-share-batches';
import { dWallets } from './d-wallets';
import { externalSurveys } from './external-surveys';
import { payoutRequests } from './payout-requests';
import { questions } from './questions';
import { responses } from './responses';
import { surveys } from './surveys';
import { surveySections } from './survey-sections';
import { walletTransactions } from './wallet-transactions';
import { amenities } from './amenities';
import { billingAdjustments } from './billing-adjustments';
import { billingEvents } from './billing-events';
import { billingPlans } from './billing-plans';
import { bursaryFields } from './bursary-fields';
import { communityServiceInquiries } from './community-service-inquiries';
import { communityServiceListings } from './community-service-listings';
import { communityServiceReviews } from './community-service-reviews';
import { coupons } from './coupons';
import { couponRedemptions } from './coupon-redemptions';
import { maintenanceCategories } from './maintenance-categories';
import { maintenanceRequests } from './maintenance-requests';
import { maintenanceTeams } from './maintenance-teams';
import { maintenanceTeamMembers } from './maintenance-team-members';
import { paymentTransactions } from './payment-transactions';
import { providerCharges } from './provider-charges';
import { providerInvoices } from './provider-invoices';
import { providerLegalAgreements } from './provider-legal-agreements';
import { providerMerits } from './provider-merits';
import { providerReputations } from './provider-reputations';
import { providerSubscriptions } from './provider-subscriptions';
import { providerVerifications } from './provider-verifications';
import { providerDueDiligenceWorkflows } from './provider-due-diligence-workflows';
import { revenueRecords } from './revenue-records';
import { serviceProviders } from './service-providers';
import { supports } from './supports';
import { tenantInvoices } from './tenant-invoices';
import { tenantPayments } from './tenant-payments';
import { tenantSubscriptions } from './tenant-subscriptions';
import { mediaUploads } from './media-uploads';
import { assistSessions } from './assist-sessions';
import { tenantAchievements } from './tenant-achievements';
import { tenantModules } from './tenant-modules';
import { tenantSetups } from './tenant-setups';
import { tenantFeatureFlags } from './tenant-feature-flags';
import { meetingProxies } from './meeting-proxies';
import { agentReviews } from './agent-reviews';
import { securityAlerts } from './security-alerts';
import { securityContacts } from './security-contacts';

export const tenantsRelations = relations(tenants, helpers => ({
  owner: helpers.one(users, {
    relationName: 'TenantOwner',
    fields: [tenants.ownerId],
    references: [users.id],
  }),
  Album: helpers.many(albums, { relationName: 'AlbumToTenant' }),
  Announcement: helpers.many(announcements, { relationName: 'AnnouncementToTenant' }),
  Booking: helpers.many(bookings, { relationName: 'BookingToTenant' }),
  Content: helpers.many(contents, { relationName: 'ContentToTenant' }),
  ContentLike: helpers.many(contentLikes, { relationName: 'ContentLikeToTenant' }),
  Comment: helpers.many(comments, { relationName: 'CommentToTenant' }),
  CommentReport: helpers.many(commentReports, { relationName: 'CommentReportToTenant' }),
  CommentVote: helpers.many(commentVotes, { relationName: 'CommentVoteToTenant' }),
  Conversation: helpers.many(conversations, { relationName: 'ConversationToTenant' }),
  ConversationParticipant: helpers.many(conversationParticipants, {
    relationName: 'ConversationParticipantToTenant',
  }),
  Event: helpers.many(events, { relationName: 'EventToTenant' }),
  EventAttendee: helpers.many(eventAttendees, { relationName: 'EventAttendeeToTenant' }),
  Group: helpers.many(groups, { relationName: 'GroupToTenant' }),
  GroupMember: helpers.many(groupMembers, { relationName: 'GroupMemberToTenant' }),
  GroupMembershipRequest: helpers.many(groupMembershipRequests, {
    relationName: 'GroupMembershipRequestToTenant',
  }),
  Household: helpers.many(households, { relationName: 'HouseholdToTenant' }),
  Invitation: helpers.many(invitations, { relationName: 'InvitationToTenant' }),
  Member: helpers.many(members, { relationName: 'MemberToTenant' }),
  Message: helpers.many(messages, { relationName: 'MessageToTenant' }),
  Notification: helpers.many(notifications, { relationName: 'NotificationToTenant' }),
  Organization: helpers.many(organizations, { relationName: 'OrganizationToTenant' }),
  PremiumSeat: helpers.many(premiumSeats, { relationName: 'PremiumSeatToTenant' }),
  Profile: helpers.many(profiles, { relationName: 'ProfileToTenant' }),
  Property: helpers.many(properties, { relationName: 'PropertyToTenant' }),
  PropertyListing: helpers.many(propertyListings, { relationName: 'PropertyListingToTenant' }),
  PropertyPremiumSeat: helpers.many(propertyPremiumSeats, {
    relationName: 'PropertyPremiumSeatToTenant',
  }),
  Resource: helpers.many(resources, { relationName: 'ResourceToTenant' }),
  ServiceBooking: helpers.many(serviceBookings, { relationName: 'ServiceBookingToTenant' }),
  SoloSeat: helpers.many(soloSeats, { relationName: 'SoloSeatToTenant' }),
  StandardSeat: helpers.many(standardSeats, { relationName: 'StandardSeatToTenant' }),
  Address: helpers.many(addresses, { relationName: 'AddressToTenant' }),
  AgentAccess: helpers.many(agentAccesses, { relationName: 'AgentAccessToTenant' }),
  AgentToken: helpers.many(agentTokens, { relationName: 'AgentTokenToTenant' }),
  AiUsageEvent: helpers.many(aiUsageEvents, { relationName: 'AiUsageEventToTenant' }),
  Bursary: helpers.many(bursaries, { relationName: 'BursaryToTenant' }),
  DelegationAction: helpers.many(delegationActions, { relationName: 'DelegationActionToTenant' }),
  DisputeCase: helpers.many(disputeCases, { relationName: 'DisputeCaseToTenant' }),
  DisputeEvidence: helpers.many(disputeEvidences, { relationName: 'DisputeEvidenceToTenant' }),
  DisputeEvent: helpers.many(disputeEvents, { relationName: 'DisputeEventToTenant' }),
  DisputeMessage: helpers.many(disputeMessages, { relationName: 'DisputeMessageToTenant' }),
  DisputeNotification: helpers.many(disputeNotifications, {
    relationName: 'DisputeNotificationToTenant',
  }),
  Handle: helpers.many(handles, { relationName: 'HandleToTenant' }),
  PlatformSuspension: helpers.many(platformSuspensions, {
    relationName: 'PlatformSuspensionToTenant',
  }),
  ResidentDelegation: helpers.many(residentDelegations, {
    relationName: 'ResidentDelegationToTenant',
  }),
  Setting: helpers.many(settings, { relationName: 'SettingToTenant' }),
  SubscriptionTier: helpers.many(subscriptionTiers, { relationName: 'SubscriptionTierToTenant' }),
  TenantAiUsage: helpers.many(tenantAiUsages, { relationName: 'TenantToTenantAiUsage' }),
  UserAchievement: helpers.many(userAchievements, { relationName: 'TenantToUserAchievement' }),
  UserAchievementProgress: helpers.many(userAchievementProgresses, {
    relationName: 'TenantToUserAchievementProgress',
  }),
  AgentProfile: helpers.many(agentProfiles, { relationName: 'AgentProfileToTenant' }),
  CommunityMerit: helpers.many(communityMerits, { relationName: 'CommunityMeritToTenant' }),
  Competition: helpers.many(competitions, { relationName: 'CompetitionToTenant' }),
  DataConsent: helpers.many(dataConsents, { relationName: 'DataConsentToTenant' }),
  DataRevenueStream: helpers.many(dataRevenueStreams, {
    relationName: 'DataRevenueStreamToTenant',
  }),
  DataShareBatch: helpers.many(dataShareBatches, { relationName: 'DataShareBatchToTenant' }),
  DWallet: helpers.many(dWallets, { relationName: 'DWalletToTenant' }),
  ExternalSurvey: helpers.many(externalSurveys, { relationName: 'ExternalSurveyToTenant' }),
  PayoutRequest: helpers.many(payoutRequests, { relationName: 'PayoutRequestToTenant' }),
  Question: helpers.many(questions, { relationName: 'QuestionToTenant' }),
  Response: helpers.many(responses, { relationName: 'ResponseToTenant' }),
  Survey: helpers.many(surveys, { relationName: 'SurveyToTenant' }),
  SurveySection: helpers.many(surveySections, { relationName: 'SurveySectionToTenant' }),
  WalletTransaction: helpers.many(walletTransactions, {
    relationName: 'TenantToWalletTransaction',
  }),
  Amenity: helpers.many(amenities, { relationName: 'AmenityToTenant' }),
  BillingAdjustment: helpers.many(billingAdjustments, {
    relationName: 'BillingAdjustmentToTenant',
  }),
  BillingEvent: helpers.many(billingEvents, { relationName: 'BillingEventToTenant' }),
  BillingPlan: helpers.many(billingPlans, { relationName: 'BillingPlanToTenant' }),
  BursaryField: helpers.many(bursaryFields, { relationName: 'BursaryFieldToTenant' }),
  CommunityServiceInquiry: helpers.many(communityServiceInquiries, {
    relationName: 'CommunityServiceInquiryToTenant',
  }),
  CommunityServiceListing: helpers.many(communityServiceListings, {
    relationName: 'CommunityServiceListingToTenant',
  }),
  CommunityServiceReview: helpers.many(communityServiceReviews, {
    relationName: 'CommunityServiceReviewToTenant',
  }),
  Coupon: helpers.many(coupons, { relationName: 'CouponToTenant' }),
  CouponRedemption: helpers.many(couponRedemptions, { relationName: 'CouponRedemptionToTenant' }),
  MaintenanceCategory: helpers.many(maintenanceCategories, {
    relationName: 'MaintenanceCategoryToTenant',
  }),
  MaintenanceRequest: helpers.many(maintenanceRequests, {
    relationName: 'MaintenanceRequestToTenant',
  }),
  MaintenanceTeam: helpers.many(maintenanceTeams, { relationName: 'MaintenanceTeamToTenant' }),
  MaintenanceTeamMember: helpers.many(maintenanceTeamMembers, {
    relationName: 'MaintenanceTeamMemberToTenant',
  }),
  PaymentTransaction: helpers.many(paymentTransactions, {
    relationName: 'PaymentTransactionToTenant',
  }),
  ProviderCharge: helpers.many(providerCharges, { relationName: 'ProviderChargeToTenant' }),
  ProviderInvoice: helpers.many(providerInvoices, { relationName: 'ProviderInvoiceToTenant' }),
  ProviderLegalAgreement: helpers.many(providerLegalAgreements, {
    relationName: 'ProviderLegalAgreementToTenant',
  }),
  ProviderMerit: helpers.many(providerMerits, { relationName: 'ProviderMeritToTenant' }),
  ProviderReputation: helpers.many(providerReputations, {
    relationName: 'ProviderReputationToTenant',
  }),
  ProviderSubscription: helpers.many(providerSubscriptions, {
    relationName: 'ProviderSubscriptionToTenant',
  }),
  ProviderVerification: helpers.many(providerVerifications, {
    relationName: 'ProviderVerificationToTenant',
  }),
  ProviderDueDiligenceWorkflow: helpers.many(providerDueDiligenceWorkflows, {
    relationName: 'ProviderDueDiligenceWorkflowToTenant',
  }),
  RevenueRecord: helpers.many(revenueRecords, { relationName: 'RevenueRecordToTenant' }),
  ServiceProvider: helpers.many(serviceProviders, { relationName: 'ServiceProviderToTenant' }),
  Support: helpers.many(supports, { relationName: 'SupportToTenant' }),
  TenantInvoice: helpers.many(tenantInvoices, { relationName: 'TenantToTenantInvoice' }),
  TenantPayment: helpers.many(tenantPayments, { relationName: 'TenantToTenantPayment' }),
  TenantSubscription: helpers.many(tenantSubscriptions, {
    relationName: 'TenantToTenantSubscription',
  }),
  MediaUpload: helpers.many(mediaUploads, { relationName: 'MediaUploadToTenant' }),
  assistSessions: helpers.many(assistSessions, { relationName: 'AssistSessionToTenant' }),
  tenantAchievements: helpers.many(tenantAchievements, {
    relationName: 'TenantToTenantAchievement',
  }),
  tenantModules: helpers.many(tenantModules, { relationName: 'TenantToTenantModule' }),
  tenantSetup: helpers.one(tenantSetups),
  tenantFeatureFlags: helpers.many(tenantFeatureFlags, {
    relationName: 'TenantToTenantFeatureFlag',
  }),
  meetingProxies: helpers.many(meetingProxies, { relationName: 'MeetingProxyToTenant' }),
  AgentReview: helpers.many(agentReviews, { relationName: 'AgentReviewToTenant' }),
  SecurityAlert: helpers.many(securityAlerts, { relationName: 'SecurityAlertToTenant' }),
  SecurityContact: helpers.many(securityContacts, { relationName: 'SecurityContactToTenant' }),
}));
