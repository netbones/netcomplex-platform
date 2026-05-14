import 'server-only';

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

import { messages } from '@schema/messages';
import { conversations } from '@schema/conversations';
import { conversationParticipants } from '@schema/conversation-participants';
import { users } from '@schema/users';
import { profiles } from '@schema/profiles';
import { settings } from '@schema/settings';
import { albums } from '@schema/albums';
import { standardSeats } from '@schema/standard-seats';
import { soloSeats } from '@schema/solo-seats';
import { properties } from '@schema/properties';
import { households } from '@schema/households';
import { premiumSeats } from '@schema/premium-seats';
import { contents } from '@schema/contents';
import { propertyListings } from '@schema/property-listings';
import { communityServiceListings } from '@schema/community-service-listings';
import { communityServiceReviews } from '@schema/community-service-reviews';
import { communityServiceInquiries } from '@schema/community-service-inquiries';
import { groups } from '@schema/groups';
import { userGroups } from '@schema/user-groups';
import { surveys } from '@schema/surveys';
import { questions } from '@schema/questions';
import { responses } from '@schema/responses';
import { externalSurveys } from '@schema/external-surveys';
import { invitations } from '@schema/invitations';
import { bookings } from '@schema/bookings';
import { maintenanceRequests } from '@schema/maintenance-requests';
import { notifications } from '@schema/notifications';
import { agentProfiles } from '@schema/agent-profiles';
import { propertiesTopremiumSeats } from '@schema/properties-topremium-seats';
import { verifications } from '@schema/verifications';
import { accounts } from '@schema/accounts';
import { sessions } from '@schema/sessions';
import { passkeys } from '@schema/passkeys';
import { twoFactors } from '@schema/two-factors';
import { members } from '@schema/members';
import { organizations } from '@schema/organizations';
import { tenants } from '@schema/tenants';
import { events } from '@schema/events';
import { announcements } from '@schema/announcements';
import { agentAccesses } from '@schema/agent-accesses';
import { platformSuspensions } from '@schema/platform-suspensions';
import { platformModules } from '@schema/platform-modules';
import { tenantModules } from '@schema/tenant-modules';
import { groupMembershipRequests } from '@schema/group-membership-requests';

import { ENV } from 'varlock/env';

let dbInstance: ReturnType<typeof drizzle> | undefined;

function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const envUrl = ENV.DIRECT_URL || ENV.DATABASE_URL;
  if (!envUrl) {
    throw new Error('DATABASE_URL or DIRECT_URL is not set');
  }

  const connectionString = envUrl.replace('sslmode=require', 'sslmode=no-verify');
  const pool = new Pool({ connectionString });

  dbInstance = drizzle(pool, {
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
      platformModules,
      tenantModules,
    },
  });

  return dbInstance;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzle>];
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
  platformModules,
  tenantModules,
};
