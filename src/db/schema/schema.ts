import * as platformModules from './platform-modules';
import * as tenantModules from './tenant-modules';
import * as assistSessions from './assist-sessions';
import * as tenants from './tenants';
import * as announcements from './announcements';
import * as bookings from './bookings';
import * as contents from './contents';
import * as contentLikes from './content-likes';
import * as conversations from './conversations';
import * as conversationParticipants from './conversation-participants';
import * as competitions from './competitions';
import * as competitionEntries from './competition-entries';
import * as events from './events';
import * as eventAttendees from './event-attendees';
import * as externalSurveys from './external-surveys';
import * as groups from './groups';
import * as groupMembershipRequests from './group-membership-requests';
import * as maintenanceRequests from './maintenance-requests';
import * as maintenanceTeams from './maintenance-teams';
import * as serviceProviders from './service-providers';
import * as maintenanceCategories from './maintenance-categories';
import * as requestNotes from './request-notes';
import * as requestHistories from './request-histories';
import * as messages from './messages';
import * as notifications from './notifications';
import * as questions from './questions';
import * as responses from './responses';
import * as settings from './settings';
import * as surveySections from './survey-sections';
import * as surveys from './surveys';
import * as groupMembers from './group-members';
import * as accounts from './accounts';
import * as agentAccesses from './agent-accesses';
import * as agentProfiles from './agent-profiles';
import * as albums from './albums';
import * as communityServiceInquiries from './community-service-inquiries';
import * as communityServiceListings from './community-service-listings';
import * as communityServiceReviews from './community-service-reviews';
import * as properties from './properties';
import * as households from './households';
import * as invitations from './invitations';
import * as members from './members';
import * as organizations from './organizations';
import * as passkeys from './passkeys';
import * as platformSuspensions from './platform-suspensions';
import * as communityMerits from './community-merits';
import * as premiumSeats from './premium-seats';
import * as propertyPremiumSeats from './property-premium-seats';
import * as profiles from './profiles';
import * as propertyListings from './property-listings';
import * as sessions from './sessions';
import * as soloSeats from './solo-seats';
import * as standardSeats from './standard-seats';
import * as twoFactors from './two-factors';
import * as users from './users';
import * as verifications from './verifications';
import * as resources from './resources';
import * as resourceVersions from './resource-versions';
import * as providerVerifications from './provider-verifications';
import * as providerLegalAgreements from './provider-legal-agreements';
import * as providerCredits from './provider-credits';
import * as providerMerits from './provider-merits';
import * as subscriptionTiers from './subscription-tiers';
import * as providerSubscriptions from './provider-subscriptions';
import * as paymentTransactions from './payment-transactions';
import * as revenueRecords from './revenue-records';
import * as platformModulesRelations from './platform-modules-relations';
import * as tenantModulesRelations from './tenant-modules-relations';
import * as assistSessionsRelations from './assist-sessions-relations';
import * as tenantsRelations from './tenants-relations';
import * as announcementsRelations from './announcements-relations';
import * as bookingsRelations from './bookings-relations';
import * as contentsRelations from './contents-relations';
import * as contentLikesRelations from './content-likes-relations';
import * as conversationsRelations from './conversations-relations';
import * as conversationParticipantsRelations from './conversation-participants-relations';
import * as competitionsRelations from './competitions-relations';
import * as competitionEntriesRelations from './competition-entries-relations';
import * as eventsRelations from './events-relations';
import * as eventAttendeesRelations from './event-attendees-relations';
import * as groupsRelations from './groups-relations';
import * as groupMembershipRequestsRelations from './group-membership-requests-relations';
import * as maintenanceRequestsRelations from './maintenance-requests-relations';
import * as maintenanceTeamsRelations from './maintenance-teams-relations';
import * as serviceProvidersRelations from './service-providers-relations';
import * as requestNotesRelations from './request-notes-relations';
import * as requestHistoriesRelations from './request-histories-relations';
import * as messagesRelations from './messages-relations';
import * as notificationsRelations from './notifications-relations';
import * as questionsRelations from './questions-relations';
import * as responsesRelations from './responses-relations';
import * as surveySectionsRelations from './survey-sections-relations';
import * as surveysRelations from './surveys-relations';
import * as groupMembersRelations from './group-members-relations';
import * as accountsRelations from './accounts-relations';
import * as agentAccessesRelations from './agent-accesses-relations';
import * as agentProfilesRelations from './agent-profiles-relations';
import * as albumsRelations from './albums-relations';
import * as communityServiceInquiriesRelations from './community-service-inquiries-relations';
import * as communityServiceListingsRelations from './community-service-listings-relations';
import * as communityServiceReviewsRelations from './community-service-reviews-relations';
import * as propertiesRelations from './properties-relations';
import * as householdsRelations from './households-relations';
import * as invitationsRelations from './invitations-relations';
import * as membersRelations from './members-relations';
import * as organizationsRelations from './organizations-relations';
import * as passkeysRelations from './passkeys-relations';
import * as platformSuspensionsRelations from './platform-suspensions-relations';
import * as communityMeritsRelations from './community-merits-relations';
import * as premiumSeatsRelations from './premium-seats-relations';
import * as propertyPremiumSeatsRelations from './property-premium-seats-relations';
import * as profilesRelations from './profiles-relations';
import * as propertyListingsRelations from './property-listings-relations';
import * as sessionsRelations from './sessions-relations';
import * as soloSeatsRelations from './solo-seats-relations';
import * as standardSeatsRelations from './standard-seats-relations';
import * as twoFactorsRelations from './two-factors-relations';
import * as usersRelations from './users-relations';
import * as resourcesRelations from './resources-relations';
import * as resourceVersionsRelations from './resource-versions-relations';

export const schema = {
  ...platformModules,
  ...tenantModules,
  ...assistSessions,
  ...tenants,
  ...announcements,
  ...bookings,
  ...contents,
  ...contentLikes,
  ...conversations,
  ...conversationParticipants,
  ...competitions,
  ...competitionEntries,
  ...events,
  ...eventAttendees,
  ...externalSurveys,
  ...groups,
  ...groupMembershipRequests,
  ...maintenanceRequests,
  ...maintenanceTeams,
  ...serviceProviders,
  ...maintenanceCategories,
  ...requestNotes,
  ...requestHistories,
  ...messages,
  ...notifications,
  ...questions,
  ...responses,
  ...settings,
  ...surveySections,
  ...surveys,
  ...groupMembers,
  ...accounts,
  ...agentAccesses,
  ...agentProfiles,
  ...albums,
  ...communityServiceInquiries,
  ...communityServiceListings,
  ...communityServiceReviews,
  ...properties,
  ...households,
  ...invitations,
  ...members,
  ...organizations,
  ...passkeys,
  ...platformSuspensions,
  ...communityMerits,
  ...premiumSeats,
  ...propertyPremiumSeats,
  ...profiles,
  ...propertyListings,
  ...sessions,
  ...soloSeats,
  ...standardSeats,
  ...twoFactors,
  ...users,
  ...verifications,
  ...resources,
  ...resourceVersions,
  ...providerVerifications,
  ...providerLegalAgreements,
  ...providerCredits,
  ...providerMerits,
  ...subscriptionTiers,
  ...providerSubscriptions,
  ...paymentTransactions,
  ...revenueRecords,
  ...platformModulesRelations,
  ...tenantModulesRelations,
  ...assistSessionsRelations,
  ...tenantsRelations,
  ...announcementsRelations,
  ...bookingsRelations,
  ...contentsRelations,
  ...contentLikesRelations,
  ...conversationsRelations,
  ...conversationParticipantsRelations,
  ...competitionsRelations,
  ...competitionEntriesRelations,
  ...eventsRelations,
  ...eventAttendeesRelations,
  ...groupsRelations,
  ...groupMembershipRequestsRelations,
  ...maintenanceRequestsRelations,
  ...maintenanceTeamsRelations,
  ...serviceProvidersRelations,
  ...requestNotesRelations,
  ...requestHistoriesRelations,
  ...messagesRelations,
  ...notificationsRelations,
  ...questionsRelations,
  ...responsesRelations,
  ...surveySectionsRelations,
  ...surveysRelations,
  ...groupMembersRelations,
  ...accountsRelations,
  ...agentAccessesRelations,
  ...agentProfilesRelations,
  ...albumsRelations,
  ...communityServiceInquiriesRelations,
  ...communityServiceListingsRelations,
  ...communityServiceReviewsRelations,
  ...propertiesRelations,
  ...householdsRelations,
  ...invitationsRelations,
  ...membersRelations,
  ...organizationsRelations,
  ...passkeysRelations,
  ...platformSuspensionsRelations,
  ...communityMeritsRelations,
  ...premiumSeatsRelations,
  ...propertyPremiumSeatsRelations,
  ...profilesRelations,
  ...propertyListingsRelations,
  ...sessionsRelations,
  ...soloSeatsRelations,
  ...standardSeatsRelations,
  ...twoFactorsRelations,
  ...usersRelations,
  ...resourcesRelations,
  ...resourceVersionsRelations,
};
