import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

// Request notes table (for maintenance request notes)
const requestNotes = pgTable('RequestNote', {
  id: text('id').primaryKey(),
  requestId: text('requestId').notNull(),
  userId: text('userId').notNull(),
  content: text('content').notNull(),
  isInternal: boolean('isInternal').default(false).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});

// Request histories table (for maintenance request history/audit trail)
const requestHistories = pgTable('RequestHistory', {
  id: text('id').primaryKey(),
  requestId: text('requestId').notNull(),
  userId: text('userId').notNull(),
  field: text('field').notNull(),
  oldValue: text('oldValue'),
  newValue: text('newValue'),
  comment: text('comment'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});

export { requestNotes, requestHistories };

import { messages } from '@prisma/messages';
import { conversations } from '@prisma/conversations';
import { conversationParticipants } from '@prisma/conversation-participants';
import { users } from '@prisma/users';
import { profiles } from '@prisma/profiles';
import { settings } from '@prisma/settings';
import { albums } from '@prisma/albums';
import { standardSeats } from '@prisma/standard-seats';
import { soloSeats } from '@prisma/solo-seats';
import { properties } from '@prisma/properties';
import { households } from '@prisma/households';
import { premiumSeats } from '@prisma/premium-seats';
import { contents } from '@prisma/contents';
import { propertyListings } from '@prisma/property-listings';
import { communityServiceListings } from '@prisma/community-service-listings';
import { communityServiceReviews } from '@prisma/community-service-reviews';
import { communityServiceInquiries } from '@prisma/community-service-inquiries';
import { groups } from '@prisma/groups';
import { userGroups } from '@prisma/user-groups';
import { surveys } from '@prisma/surveys';
import { questions } from '@prisma/questions';
import { responses } from '@prisma/responses';
import { externalSurveys } from '@prisma/external-surveys';
import { invitations } from '@prisma/invitations';
import { bookings } from '@prisma/bookings';
import { maintenanceRequests } from '@prisma/maintenance-requests';
import { notifications } from '@prisma/notifications';
import { agentProfiles } from '@prisma/agent-profiles';
import { propertiesTopremiumSeats } from '@prisma/properties-topremium-seats';
import { verifications } from '@prisma/verifications';
import { accounts } from '@prisma/accounts';
import { sessions } from '@prisma/sessions';
import { passkeys } from '@prisma/passkeys';
import { twoFactors } from '@prisma/two-factors';
import { members } from '@prisma/members';
import { organizations } from '@prisma/organizations';
import { tenants } from '@prisma/tenants';
import { events } from '@prisma/events';
import { announcements } from '@prisma/announcements';
import { agentAccesses } from '@prisma/agent-accesses';
import { platformSuspensions } from '@prisma/platform-suspensions';
import { groupMembershipRequests } from '@prisma/group-membership-requests';

const envUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const connectionString = envUrl ? envUrl.replace('sslmode=require', 'sslmode=no-verify') : '';

if (!connectionString) {
  throw new Error('DATABASE_URL or DIRECT_URL is not set');
}

const pool = new Pool({
  connectionString,
});

export const db = drizzle(pool, {
  schema: {
    messages,
    conversations,
    conversationParticipants,
    users,
    profiles,
    settings,
    albums,
    standardSeats,
    soloSeats,
    properties,
    households,
    premiumSeats,
    contents,
    propertyListings,
    communityServiceListings,
    communityServiceReviews,
    communityServiceInquiries,
    groups,
    userGroups,
    surveys,
    questions,
    responses,
    externalSurveys,
    invitations,
    bookings,
    maintenanceRequests,
    notifications,
    agentProfiles,
    propertiesTopremiumSeats,
    verifications,
    accounts,
    sessions,
    passkeys,
    twoFactors,
    members,
    organizations,
    tenants,
    events,
    announcements,
    agentAccesses,
    platformSuspensions,
    groupMembershipRequests,
    requestNotes,
    requestHistories,
  },
});

export {
  messages,
  conversations,
  conversationParticipants,
  users,
  profiles,
  settings,
  albums,
  standardSeats,
  soloSeats,
  properties,
  households,
  premiumSeats,
  contents,
  propertyListings,
  communityServiceListings,
  communityServiceReviews,
  communityServiceInquiries,
  groups,
  userGroups,
  surveys,
  questions,
  responses,
  externalSurveys,
  invitations,
  bookings,
  maintenanceRequests,
  notifications,
  agentProfiles,
  propertiesTopremiumSeats,
  verifications,
  accounts,
  sessions,
  passkeys,
  twoFactors,
  members,
  organizations,
  tenants,
  events,
  announcements,
  agentAccesses,
  platformSuspensions,
  groupMembershipRequests,
};
