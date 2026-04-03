import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// Import individual tables directly to avoid module resolution issues
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
// Community service tables
import { communityServiceListings } from '../../prisma/drizzle/community-service-listings';
import { communityServiceReviews } from '../../prisma/drizzle/community-service-reviews';
import { communityServiceInquiries } from '../../prisma/drizzle/community-service-inquiries';
// Group-related tables
import { groups } from '../../prisma/drizzle/groups';
import { userGroups } from '../../prisma/drizzle/user-groups';
// Survey-related tables
import { surveys } from '../../prisma/drizzle/surveys';
import { questions } from '../../prisma/drizzle/questions';
import { responses } from '../../prisma/drizzle/responses';
import { externalSurveys } from '../../prisma/drizzle/external-surveys';
// Invitation tables
import { invitations } from '../../prisma/drizzle/invitations';
// Booking & maintenance
import { bookings } from '../../prisma/drizzle/bookings';
import { maintenanceRequests } from '../../prisma/drizzle/maintenance-requests';
// Notifications
import { notifications } from '../../prisma/drizzle/notifications';
// Agent profiles
import { agentProfiles } from '../../prisma/drizzle/agent-profiles';
// Junction tables
import { householdsTopremiumSeats } from '../../prisma/drizzle/households-topremium-seats';

/**
 * Drizzle ORM client using Neon serverless driver.
 * Uses the same DATABASE_URL as Prisma, configured for connection pooling.
 */
const sql = neon(process.env.DATABASE_URL!);

// Create schema object for drizzle
const schema = {
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
  propertyListings,
  contents,
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
};

export const db = drizzle(sql, { schema });

// Re-export individual tables for easier importing
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
  propertyListings,
  contents,
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
};
