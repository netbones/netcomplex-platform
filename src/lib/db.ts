import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// Import individual tables directly to avoid module resolution issues
import { messages } from '../../prisma/drizzle/messages';
import { conversations } from '../../prisma/drizzle/conversations';
import { conversationParticipants } from '../../prisma/drizzle/conversation-participants';
import { users } from '../../prisma/drizzle/users';
import { premiumSeats } from '../../prisma/drizzle/premium-seats';
// Community service tables
import { communityServiceListings } from '../../prisma/drizzle/community-service-listings';
import { communityServiceReviews } from '../../prisma/drizzle/community-service-reviews';
import { communityServiceInquiries } from '../../prisma/drizzle/community-service-inquiries';

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
  premiumSeats,
  communityServiceListings,
  communityServiceReviews,
  communityServiceInquiries,
};

export const db = drizzle(sql, { schema });

// Re-export individual tables for easier importing
export {
  messages,
  conversations,
  conversationParticipants,
  users,
  premiumSeats,
  communityServiceListings,
  communityServiceReviews,
  communityServiceInquiries,
};
