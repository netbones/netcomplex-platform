import * as accounts from './accounts';
import * as verifications from './verifications';
import * as passkeys from './passkeys';
import * as sessions from './sessions';
import * as twoFactors from './two-factors';
import * as users from './users';
import * as profiles from './profiles';
import * as members from './members';
import * as organizations from './organizations';
import * as notifications from './notifications';
import * as agentProfiles from './agent-profiles';
import * as premiumSeats from './premium-seats';
import * as soloSeats from './solo-seats';
import * as standardSeats from './standard-seats';
import * as userKeys from './user-keys';
import * as userDevices from './user-devices';
import * as platformModules from './platform-modules';
import * as tenantModules from './tenant-modules';
import * as tenants from './tenants';
import * as settings from './settings';
import * as properties from './properties';
import * as households from './households';
import * as propertyListings from './property-listings';
import * as propertyPremiumSeats from './property-premium-seats';
import * as invitations from './invitations';
import * as conversations from './conversations';
import * as conversationParticipants from './conversation-participants';
import * as messages from './messages';
import * as contents from './contents';
import * as contentLikes from './content-likes';
import * as groups from './groups';
import * as groupMembers from './group-members';
import * as groupMembershipRequests from './group-membership-requests';
import * as albums from './albums';
import * as resources from './resources';
import * as resourceVersions from './resource-versions';
import * as announcements from './announcements';
import * as events from './events';
import * as eventAttendees from './event-attendees';
import * as bookings from './bookings';
import * as maintenanceRequests from './maintenance-requests';
import * as maintenanceTeams from './maintenance-teams';
import * as maintenanceCategories from './maintenance-categories';
import * as requestNotes from './request-notes';
import * as requestHistories from './request-histories';
import * as serviceProviders from './service-providers';
import * as communityServiceInquiries from './community-service-inquiries';
import * as communityServiceListings from './community-service-listings';
import * as communityServiceReviews from './community-service-reviews';
import * as providerVerifications from './provider-verifications';
import * as providerLegalAgreements from './provider-legal-agreements';
import * as providerCredits from './provider-credits';
import * as providerMerits from './provider-merits';
import * as providerSubscriptions from './provider-subscriptions';
import * as paymentTransactions from './payment-transactions';
import * as revenueRecords from './revenue-records';
import * as providerCharges from './provider-charges';
import * as providerInvoices from './provider-invoices';
import * as surveys from './surveys';
import * as questions from './questions';
import * as responses from './responses';
import * as surveySections from './survey-sections';
import * as externalSurveys from './external-surveys';
import * as communityMerits from './community-merits';
import * as competitions from './competitions';
import * as competitionEntries from './competition-entries';
import * as assistSessions from './assist-sessions';
import * as agentAccesses from './agent-accesses';
import * as platformSuspensions from './platform-suspensions';
import * as subscriptionTiers from './subscription-tiers';
import * as accountsRelations from './accounts-relations';
import * as passkeysRelations from './passkeys-relations';
import * as sessionsRelations from './sessions-relations';
import * as twoFactorsRelations from './two-factors-relations';
import * as usersRelations from './users-relations';
import * as profilesRelations from './profiles-relations';
import * as membersRelations from './members-relations';
import * as organizationsRelations from './organizations-relations';
import * as notificationsRelations from './notifications-relations';
import * as agentProfilesRelations from './agent-profiles-relations';
import * as premiumSeatsRelations from './premium-seats-relations';
import * as soloSeatsRelations from './solo-seats-relations';
import * as standardSeatsRelations from './standard-seats-relations';
import * as userKeysRelations from './user-keys-relations';
import * as userDevicesRelations from './user-devices-relations';
import * as platformModulesRelations from './platform-modules-relations';
import * as tenantModulesRelations from './tenant-modules-relations';
import * as tenantsRelations from './tenants-relations';
import * as propertiesRelations from './properties-relations';
import * as householdsRelations from './households-relations';
import * as propertyListingsRelations from './property-listings-relations';
import * as propertyPremiumSeatsRelations from './property-premium-seats-relations';
import * as invitationsRelations from './invitations-relations';
import * as conversationsRelations from './conversations-relations';
import * as conversationParticipantsRelations from './conversation-participants-relations';
import * as messagesRelations from './messages-relations';
import * as contentsRelations from './contents-relations';
import * as contentLikesRelations from './content-likes-relations';
import * as groupsRelations from './groups-relations';
import * as groupMembersRelations from './group-members-relations';
import * as groupMembershipRequestsRelations from './group-membership-requests-relations';
import * as albumsRelations from './albums-relations';
import * as resourcesRelations from './resources-relations';
import * as resourceVersionsRelations from './resource-versions-relations';
import * as announcementsRelations from './announcements-relations';
import * as eventsRelations from './events-relations';
import * as eventAttendeesRelations from './event-attendees-relations';
import * as bookingsRelations from './bookings-relations';
import * as maintenanceRequestsRelations from './maintenance-requests-relations';
import * as maintenanceTeamsRelations from './maintenance-teams-relations';
import * as requestNotesRelations from './request-notes-relations';
import * as requestHistoriesRelations from './request-histories-relations';
import * as serviceProvidersRelations from './service-providers-relations';
import * as communityServiceInquiriesRelations from './community-service-inquiries-relations';
import * as communityServiceListingsRelations from './community-service-listings-relations';
import * as communityServiceReviewsRelations from './community-service-reviews-relations';
import * as providerVerificationsRelations from './provider-verifications-relations';
import * as providerLegalAgreementsRelations from './provider-legal-agreements-relations';
import * as providerCreditsRelations from './provider-credits-relations';
import * as providerMeritsRelations from './provider-merits-relations';
import * as providerSubscriptionsRelations from './provider-subscriptions-relations';
import * as paymentTransactionsRelations from './payment-transactions-relations';
import * as revenueRecordsRelations from './revenue-records-relations';
import * as providerChargesRelations from './provider-charges-relations';
import * as providerInvoicesRelations from './provider-invoices-relations';
import * as surveysRelations from './surveys-relations';
import * as questionsRelations from './questions-relations';
import * as responsesRelations from './responses-relations';
import * as surveySectionsRelations from './survey-sections-relations';
import * as communityMeritsRelations from './community-merits-relations';
import * as competitionsRelations from './competitions-relations';
import * as competitionEntriesRelations from './competition-entries-relations';
import * as assistSessionsRelations from './assist-sessions-relations';
import * as agentAccessesRelations from './agent-accesses-relations';
import * as platformSuspensionsRelations from './platform-suspensions-relations';
import * as subscriptionTiersRelations from './subscription-tiers-relations';

export const schema = {
  ...accounts,
  ...verifications,
  ...passkeys,
  ...sessions,
  ...twoFactors,
  ...users,
  ...profiles,
  ...members,
  ...organizations,
  ...notifications,
  ...agentProfiles,
  ...premiumSeats,
  ...soloSeats,
  ...standardSeats,
  ...userKeys,
  ...userDevices,
  ...platformModules,
  ...tenantModules,
  ...tenants,
  ...settings,
  ...properties,
  ...households,
  ...propertyListings,
  ...propertyPremiumSeats,
  ...invitations,
  ...conversations,
  ...conversationParticipants,
  ...messages,
  ...contents,
  ...contentLikes,
  ...groups,
  ...groupMembers,
  ...groupMembershipRequests,
  ...albums,
  ...resources,
  ...resourceVersions,
  ...announcements,
  ...events,
  ...eventAttendees,
  ...bookings,
  ...maintenanceRequests,
  ...maintenanceTeams,
  ...maintenanceCategories,
  ...requestNotes,
  ...requestHistories,
  ...serviceProviders,
  ...communityServiceInquiries,
  ...communityServiceListings,
  ...communityServiceReviews,
  ...providerVerifications,
  ...providerLegalAgreements,
  ...providerCredits,
  ...providerMerits,
  ...providerSubscriptions,
  ...paymentTransactions,
  ...revenueRecords,
  ...providerCharges,
  ...providerInvoices,
  ...surveys,
  ...questions,
  ...responses,
  ...surveySections,
  ...externalSurveys,
  ...communityMerits,
  ...competitions,
  ...competitionEntries,
  ...assistSessions,
  ...agentAccesses,
  ...platformSuspensions,
  ...subscriptionTiers,
  ...accountsRelations,
  ...passkeysRelations,
  ...sessionsRelations,
  ...twoFactorsRelations,
  ...usersRelations,
  ...profilesRelations,
  ...membersRelations,
  ...organizationsRelations,
  ...notificationsRelations,
  ...agentProfilesRelations,
  ...premiumSeatsRelations,
  ...soloSeatsRelations,
  ...standardSeatsRelations,
  ...userKeysRelations,
  ...userDevicesRelations,
  ...platformModulesRelations,
  ...tenantModulesRelations,
  ...tenantsRelations,
  ...propertiesRelations,
  ...householdsRelations,
  ...propertyListingsRelations,
  ...propertyPremiumSeatsRelations,
  ...invitationsRelations,
  ...conversationsRelations,
  ...conversationParticipantsRelations,
  ...messagesRelations,
  ...contentsRelations,
  ...contentLikesRelations,
  ...groupsRelations,
  ...groupMembersRelations,
  ...groupMembershipRequestsRelations,
  ...albumsRelations,
  ...resourcesRelations,
  ...resourceVersionsRelations,
  ...announcementsRelations,
  ...eventsRelations,
  ...eventAttendeesRelations,
  ...bookingsRelations,
  ...maintenanceRequestsRelations,
  ...maintenanceTeamsRelations,
  ...requestNotesRelations,
  ...requestHistoriesRelations,
  ...serviceProvidersRelations,
  ...communityServiceInquiriesRelations,
  ...communityServiceListingsRelations,
  ...communityServiceReviewsRelations,
  ...providerVerificationsRelations,
  ...providerLegalAgreementsRelations,
  ...providerCreditsRelations,
  ...providerMeritsRelations,
  ...providerSubscriptionsRelations,
  ...paymentTransactionsRelations,
  ...revenueRecordsRelations,
  ...providerChargesRelations,
  ...providerInvoicesRelations,
  ...surveysRelations,
  ...questionsRelations,
  ...responsesRelations,
  ...surveySectionsRelations,
  ...communityMeritsRelations,
  ...competitionsRelations,
  ...competitionEntriesRelations,
  ...assistSessionsRelations,
  ...agentAccessesRelations,
  ...platformSuspensionsRelations,
  ...subscriptionTiersRelations,
};
