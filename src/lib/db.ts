import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

import { messages } from '../../prisma/drizzle/messages';
import { conversations } from '../../prisma/drizzle/conversations';
import { conversationParticipants } from '../../prisma/drizzle/conversation-participants';
import { users } from '../../prisma/drizzle/users';
import { profiles } from '../../prisma/drizzle/profiles';
import { settings } from '../../prisma/drizzle/settings';
import { albums } from '../../prisma/drizzle/albums';
import { standardSeats } from '../../prisma/drizzle/standard-seats';
import { soloSeats } from '../../prisma/drizzle/solo-seats';
import { households } from '../../prisma/drizzle/households';
import { premiumSeats } from '../../prisma/drizzle/premium-seats';
import { contents } from '../../prisma/drizzle/contents';
import { propertyListings } from '../../prisma/drizzle/property-listings';
import { communityServiceListings } from '../../prisma/drizzle/community-service-listings';
import { communityServiceReviews } from '../../prisma/drizzle/community-service-reviews';
import { communityServiceInquiries } from '../../prisma/drizzle/community-service-inquiries';
import { groups } from '../../prisma/drizzle/groups';
import { userGroups } from '../../prisma/drizzle/user-groups';
import { surveys } from '../../prisma/drizzle/surveys';
import { questions } from '../../prisma/drizzle/questions';
import { responses } from '../../prisma/drizzle/responses';
import { externalSurveys } from '../../prisma/drizzle/external-surveys';
import { invitations } from '../../prisma/drizzle/invitations';
import { bookings } from '../../prisma/drizzle/bookings';
import { maintenanceRequests } from '../../prisma/drizzle/maintenance-requests';
import { notifications } from '../../prisma/drizzle/notifications';
import { agentProfiles } from '../../prisma/drizzle/agent-profiles';
import { householdsTopremiumSeats } from '../../prisma/drizzle/households-topremium-seats';
import { verifications } from '../../prisma/drizzle/verifications';
import { accounts } from '../../prisma/drizzle/accounts';
import { sessions } from '../../prisma/drizzle/sessions';
import { passkeys } from '../../prisma/drizzle/passkeys';
import { twoFactors } from '../../prisma/drizzle/two-factors';
import { members } from '../../prisma/drizzle/members';
import { organizations } from '../../prisma/drizzle/organizations';
import { tenants } from '../../prisma/drizzle/tenants';
import { events } from '../../prisma/drizzle/events';
import { announcements } from '../../prisma/drizzle/announcements';
import { agentAccesses } from '../../prisma/drizzle/agent-accesses';
import { platformSuspensions } from '../../prisma/drizzle/platform-suspensions';
import { requestNotes } from '../../prisma/drizzle/request-notes';
import { groupMembershipRequests } from '../../prisma/drizzle/group-membership-requests';

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
    householdsTopremiumSeats,
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
    requestNotes,
    groupMembershipRequests,
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
  householdsTopremiumSeats,
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
  requestNotes,
  groupMembershipRequests,
};
