import type { TenantSeedData } from '../types';
import { tenant } from './tenant';
import { users } from './people';
import {
  properties,
  households,
  profiles,
  standardSeats,
  soloSeats,
  premiumSeats,
} from './housing';
import { serviceListings, serviceReviews } from './marketplace';
import { groups, groupMembers } from './groups';
import { resources } from './resources';
import { content } from './content';
import { events, surveys, surveyQuestions, surveyResponses, competitions } from './events-surveys';
import {
  maintenanceCategories,
  bursaryFields,
  educationBursaries,
  educationResources,
  maintenanceTeams,
  serviceProviders,
  maintenanceRequests,
} from './maintenance';
import { settings } from './settings';
import {
  subscriptionTiers,
  providerReputations,
  providerMerits,
  providerSubscriptions,
  paymentTransactions,
  providerCharges,
  providerInvoices,
  revenueRecords,
} from './billing';
import { announcements } from './announcements';

export const SORALIA_VILLAGE: TenantSeedData = {
  tenant,
  users,
  properties,
  households,
  profiles,
  standardSeats,
  soloSeats,
  premiumSeats,
  serviceListings,
  serviceReviews,
  groups,
  groupMembers,
  resources,
  content,
  events,
  surveys,
  surveyQuestions,
  surveyResponses,
  competitions,
  maintenanceCategories,
  maintenanceTeams,
  bursaryFields,
  educationBursaries,
  educationResources,
  serviceProviders,
  maintenanceRequests,
  settings,
  announcements,
  subscriptionTiers,
  providerReputations,
  providerMerits,
  providerSubscriptions,
  paymentTransactions,
  providerCharges,
  providerInvoices,
  revenueRecords,
};
