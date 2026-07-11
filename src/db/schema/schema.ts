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
import * as serviceBookings from './service-bookings';
import * as agentProfiles from './agent-profiles';
import * as premiumSeats from './premium-seats';
import * as soloSeats from './solo-seats';
import * as standardSeats from './standard-seats';
import * as userKeys from './user-keys';
import * as userDevices from './user-devices';
import * as platformModules from './platform-modules';
import * as tenantModules from './tenant-modules';
import * as settings from './settings';
import * as tenantSetups from './tenant-setups';
import * as setupMissions from './setup-missions';
import * as setupSettings from './setup-settings';
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
import * as supports from './supports';
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
import * as maintenanceTeamMembers from './maintenance-team-members';
import * as maintenanceCategories from './maintenance-categories';
import * as bursaryFields from './bursary-fields';
import * as requestNotes from './request-notes';
import * as internalMaintenanceNotes from './internal-maintenance-notes';
import * as requestHistories from './request-histories';
import * as serviceProviders from './service-providers';
import * as communityServiceInquiries from './community-service-inquiries';
import * as communityServiceListings from './community-service-listings';
import * as communityServiceReviews from './community-service-reviews';
import * as providerVerifications from './provider-verifications';
import * as providerLegalAgreements from './provider-legal-agreements';
import * as providerReputations from './provider-reputations';
import * as providerMerits from './provider-merits';
import * as providerSubscriptions from './provider-subscriptions';
import * as paymentTransactions from './payment-transactions';
import * as revenueRecords from './revenue-records';
import * as providerCharges from './provider-charges';
import * as providerInvoices from './provider-invoices';
import * as billingPlans from './billing-plans';
import * as tenantSubscriptions from './tenant-subscriptions';
import * as tenantInvoices from './tenant-invoices';
import * as tenantPayments from './tenant-payments';
import * as billingAdjustments from './billing-adjustments';
import * as billingEvents from './billing-events';
import * as coupons from './coupons';
import * as couponRedemptions from './coupon-redemptions';
import * as taxRates from './tax-rates';
import * as taxJurisdictions from './tax-jurisdictions';
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
import * as agentTokens from './agent-tokens';
import * as delegationActions from './delegation-actions';
import * as residentDelegations from './resident-delegations';
import * as platformSuspensions from './platform-suspensions';
import * as subscriptionTiers from './subscription-tiers';
import * as achievementDefinitions from './achievement-definitions';
import * as tenantAchievements from './tenant-achievements';
import * as userAchievementProgresses from './user-achievement-progresses';
import * as userAchievements from './user-achievements';
import * as dWallets from './d-wallets';
import * as walletTransactions from './wallet-transactions';
import * as dataConsents from './data-consents';
import * as payoutRequests from './payout-requests';
import * as dataRevenueStreams from './data-revenue-streams';
import * as dataShareBatches from './data-share-batches';
import * as addresses from './addresses';
import * as handles from './handles';
import * as addressEndpoints from './address-endpoints';
import * as platformAiTierQuotas from './platform-ai-tier-quotas';
import * as aiCapabilityCosts from './ai-capability-costs';
import * as tenantAiUsages from './tenant-ai-usages';
import * as aiUsageEvents from './ai-usage-events';
import * as disputeCases from './dispute-cases';
import * as disputeEvidences from './dispute-evidences';
import * as disputeEvents from './dispute-events';
import * as disputeMessages from './dispute-messages';
import * as disputeMessageVersions from './dispute-message-versions';
import * as disputeNotifications from './dispute-notifications';
import * as bursaries from './bursaries';
import * as tenants from './tenants';
import * as accountsRelations from './accounts-relations';
import * as passkeysRelations from './passkeys-relations';
import * as sessionsRelations from './sessions-relations';
import * as twoFactorsRelations from './two-factors-relations';
import * as usersRelations from './users-relations';
import * as profilesRelations from './profiles-relations';
import * as membersRelations from './members-relations';
import * as organizationsRelations from './organizations-relations';
import * as notificationsRelations from './notifications-relations';
import * as serviceBookingsRelations from './service-bookings-relations';
import * as agentProfilesRelations from './agent-profiles-relations';
import * as premiumSeatsRelations from './premium-seats-relations';
import * as soloSeatsRelations from './solo-seats-relations';
import * as standardSeatsRelations from './standard-seats-relations';
import * as userKeysRelations from './user-keys-relations';
import * as userDevicesRelations from './user-devices-relations';
import * as platformModulesRelations from './platform-modules-relations';
import * as tenantModulesRelations from './tenant-modules-relations';
import * as settingsRelations from './settings-relations';
import * as tenantSetupsRelations from './tenant-setups-relations';
import * as setupMissionsRelations from './setup-missions-relations';
import * as setupSettingsRelations from './setup-settings-relations';
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
import * as supportsRelations from './supports-relations';
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
import * as maintenanceTeamMembersRelations from './maintenance-team-members-relations';
import * as maintenanceCategoriesRelations from './maintenance-categories-relations';
import * as bursaryFieldsRelations from './bursary-fields-relations';
import * as requestNotesRelations from './request-notes-relations';
import * as internalMaintenanceNotesRelations from './internal-maintenance-notes-relations';
import * as requestHistoriesRelations from './request-histories-relations';
import * as serviceProvidersRelations from './service-providers-relations';
import * as communityServiceInquiriesRelations from './community-service-inquiries-relations';
import * as communityServiceListingsRelations from './community-service-listings-relations';
import * as communityServiceReviewsRelations from './community-service-reviews-relations';
import * as providerVerificationsRelations from './provider-verifications-relations';
import * as providerLegalAgreementsRelations from './provider-legal-agreements-relations';
import * as providerReputationsRelations from './provider-reputations-relations';
import * as providerMeritsRelations from './provider-merits-relations';
import * as providerSubscriptionsRelations from './provider-subscriptions-relations';
import * as paymentTransactionsRelations from './payment-transactions-relations';
import * as revenueRecordsRelations from './revenue-records-relations';
import * as providerChargesRelations from './provider-charges-relations';
import * as providerInvoicesRelations from './provider-invoices-relations';
import * as billingPlansRelations from './billing-plans-relations';
import * as tenantSubscriptionsRelations from './tenant-subscriptions-relations';
import * as tenantInvoicesRelations from './tenant-invoices-relations';
import * as tenantPaymentsRelations from './tenant-payments-relations';
import * as billingAdjustmentsRelations from './billing-adjustments-relations';
import * as billingEventsRelations from './billing-events-relations';
import * as couponsRelations from './coupons-relations';
import * as couponRedemptionsRelations from './coupon-redemptions-relations';
import * as taxRatesRelations from './tax-rates-relations';
import * as taxJurisdictionsRelations from './tax-jurisdictions-relations';
import * as surveysRelations from './surveys-relations';
import * as questionsRelations from './questions-relations';
import * as responsesRelations from './responses-relations';
import * as surveySectionsRelations from './survey-sections-relations';
import * as externalSurveysRelations from './external-surveys-relations';
import * as communityMeritsRelations from './community-merits-relations';
import * as competitionsRelations from './competitions-relations';
import * as competitionEntriesRelations from './competition-entries-relations';
import * as assistSessionsRelations from './assist-sessions-relations';
import * as agentAccessesRelations from './agent-accesses-relations';
import * as agentTokensRelations from './agent-tokens-relations';
import * as delegationActionsRelations from './delegation-actions-relations';
import * as residentDelegationsRelations from './resident-delegations-relations';
import * as platformSuspensionsRelations from './platform-suspensions-relations';
import * as subscriptionTiersRelations from './subscription-tiers-relations';
import * as achievementDefinitionsRelations from './achievement-definitions-relations';
import * as tenantAchievementsRelations from './tenant-achievements-relations';
import * as userAchievementProgressesRelations from './user-achievement-progresses-relations';
import * as userAchievementsRelations from './user-achievements-relations';
import * as dWalletsRelations from './d-wallets-relations';
import * as walletTransactionsRelations from './wallet-transactions-relations';
import * as dataConsentsRelations from './data-consents-relations';
import * as payoutRequestsRelations from './payout-requests-relations';
import * as dataRevenueStreamsRelations from './data-revenue-streams-relations';
import * as dataShareBatchesRelations from './data-share-batches-relations';
import * as addressesRelations from './addresses-relations';
import * as handlesRelations from './handles-relations';
import * as addressEndpointsRelations from './address-endpoints-relations';
import * as tenantAiUsagesRelations from './tenant-ai-usages-relations';
import * as aiUsageEventsRelations from './ai-usage-events-relations';
import * as disputeCasesRelations from './dispute-cases-relations';
import * as disputeEvidencesRelations from './dispute-evidences-relations';
import * as disputeEventsRelations from './dispute-events-relations';
import * as disputeMessagesRelations from './dispute-messages-relations';
import * as disputeMessageVersionsRelations from './dispute-message-versions-relations';
import * as disputeNotificationsRelations from './dispute-notifications-relations';
import * as bursariesRelations from './bursaries-relations';
import * as tenantsRelations from './tenants-relations';

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
  ...serviceBookings,
  ...agentProfiles,
  ...premiumSeats,
  ...soloSeats,
  ...standardSeats,
  ...userKeys,
  ...userDevices,
  ...platformModules,
  ...tenantModules,
  ...settings,
  ...tenantSetups,
  ...setupMissions,
  ...setupSettings,
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
  ...supports,
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
  ...maintenanceTeamMembers,
  ...maintenanceCategories,
  ...bursaryFields,
  ...requestNotes,
  ...internalMaintenanceNotes,
  ...requestHistories,
  ...serviceProviders,
  ...communityServiceInquiries,
  ...communityServiceListings,
  ...communityServiceReviews,
  ...providerVerifications,
  ...providerLegalAgreements,
  ...providerReputations,
  ...providerMerits,
  ...providerSubscriptions,
  ...paymentTransactions,
  ...revenueRecords,
  ...providerCharges,
  ...providerInvoices,
  ...billingPlans,
  ...tenantSubscriptions,
  ...tenantInvoices,
  ...tenantPayments,
  ...billingAdjustments,
  ...billingEvents,
  ...coupons,
  ...couponRedemptions,
  ...taxRates,
  ...taxJurisdictions,
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
  ...agentTokens,
  ...delegationActions,
  ...residentDelegations,
  ...platformSuspensions,
  ...subscriptionTiers,
  ...achievementDefinitions,
  ...tenantAchievements,
  ...userAchievementProgresses,
  ...userAchievements,
  ...dWallets,
  ...walletTransactions,
  ...dataConsents,
  ...payoutRequests,
  ...dataRevenueStreams,
  ...dataShareBatches,
  ...addresses,
  ...handles,
  ...addressEndpoints,
  ...platformAiTierQuotas,
  ...aiCapabilityCosts,
  ...tenantAiUsages,
  ...aiUsageEvents,
  ...disputeCases,
  ...disputeEvidences,
  ...disputeEvents,
  ...disputeMessages,
  ...disputeMessageVersions,
  ...disputeNotifications,
  ...bursaries,
  ...tenants,
  ...accountsRelations,
  ...passkeysRelations,
  ...sessionsRelations,
  ...twoFactorsRelations,
  ...usersRelations,
  ...profilesRelations,
  ...membersRelations,
  ...organizationsRelations,
  ...notificationsRelations,
  ...serviceBookingsRelations,
  ...agentProfilesRelations,
  ...premiumSeatsRelations,
  ...soloSeatsRelations,
  ...standardSeatsRelations,
  ...userKeysRelations,
  ...userDevicesRelations,
  ...platformModulesRelations,
  ...tenantModulesRelations,
  ...settingsRelations,
  ...tenantSetupsRelations,
  ...setupMissionsRelations,
  ...setupSettingsRelations,
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
  ...supportsRelations,
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
  ...maintenanceTeamMembersRelations,
  ...maintenanceCategoriesRelations,
  ...bursaryFieldsRelations,
  ...requestNotesRelations,
  ...internalMaintenanceNotesRelations,
  ...requestHistoriesRelations,
  ...serviceProvidersRelations,
  ...communityServiceInquiriesRelations,
  ...communityServiceListingsRelations,
  ...communityServiceReviewsRelations,
  ...providerVerificationsRelations,
  ...providerLegalAgreementsRelations,
  ...providerReputationsRelations,
  ...providerMeritsRelations,
  ...providerSubscriptionsRelations,
  ...paymentTransactionsRelations,
  ...revenueRecordsRelations,
  ...providerChargesRelations,
  ...providerInvoicesRelations,
  ...billingPlansRelations,
  ...tenantSubscriptionsRelations,
  ...tenantInvoicesRelations,
  ...tenantPaymentsRelations,
  ...billingAdjustmentsRelations,
  ...billingEventsRelations,
  ...couponsRelations,
  ...couponRedemptionsRelations,
  ...taxRatesRelations,
  ...taxJurisdictionsRelations,
  ...surveysRelations,
  ...questionsRelations,
  ...responsesRelations,
  ...surveySectionsRelations,
  ...externalSurveysRelations,
  ...communityMeritsRelations,
  ...competitionsRelations,
  ...competitionEntriesRelations,
  ...assistSessionsRelations,
  ...agentAccessesRelations,
  ...agentTokensRelations,
  ...delegationActionsRelations,
  ...residentDelegationsRelations,
  ...platformSuspensionsRelations,
  ...subscriptionTiersRelations,
  ...achievementDefinitionsRelations,
  ...tenantAchievementsRelations,
  ...userAchievementProgressesRelations,
  ...userAchievementsRelations,
  ...dWalletsRelations,
  ...walletTransactionsRelations,
  ...dataConsentsRelations,
  ...payoutRequestsRelations,
  ...dataRevenueStreamsRelations,
  ...dataShareBatchesRelations,
  ...addressesRelations,
  ...handlesRelations,
  ...addressEndpointsRelations,
  ...tenantAiUsagesRelations,
  ...aiUsageEventsRelations,
  ...disputeCasesRelations,
  ...disputeEvidencesRelations,
  ...disputeEventsRelations,
  ...disputeMessagesRelations,
  ...disputeMessageVersionsRelations,
  ...disputeNotificationsRelations,
  ...bursariesRelations,
  ...tenantsRelations,
};
