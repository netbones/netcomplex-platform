import 'server-only';

import { sql, eq } from 'drizzle-orm';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

export type RLSContext = {
  userId: string;
  tenantId: string;
  role: string;
  isPlatformAdmin: boolean;
};

/**
 * Postgres connection-pool sizing.
 *
 * Why `max: 10` (not 1): Better Auth's `auth.api.getSession()` issues a
 * session-table lookup on every authenticated request. With `max: 1`, a
 * single Node.js process can only run one session lookup at a time; the
 * second concurrent request waits for the first to release the connection,
 * and the 5s `connectionTimeoutMillis` fires under any modest load
 * (reported in BD `03kz` during Phase 48 visual verification — intermittent
 * "timeout exceeded when trying to connect" from getSessionAndRole on
 * /api/admin/urgency). 10 is safe for Supabase's pgbouncer transaction-mode
 * pooler (each Node.js process is independent; the pooler multiplexes
 * across processes), and matches Vercel's serverless-function concurrency
 * budget for typical Next.js routes.
 *
 * If you lower this, also lower the 5s `connectionTimeoutMillis` so
 * exhausted-pool requests fail fast instead of blocking for the full timeout.
 */
const POOL_CONFIG = {
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
};

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
import { surveySections } from '@schema/survey-sections';
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
import { eventAttendees } from '@schema/event-attendees';
import { announcements } from '@schema/announcements';
import { agentAccesses } from '@schema/agent-accesses';
import { platformSuspensions } from '@schema/platform-suspensions';
import { platformModules } from '@schema/platform-modules';
import { tenantModules } from '@schema/tenant-modules';
import { groupMembershipRequests } from '@schema/group-membership-requests';
import { assistSessions } from '@schema/assist-sessions';
import { resources } from '@schema/resources';
import { resourceVersions } from '@schema/resource-versions';
import { competitions } from '@schema/competitions';
import { competitionEntries } from '@schema/competition-entries';
import { maintenanceTeams } from '@schema/maintenance-teams';
import { serviceProviders } from '@schema/service-providers';
import { maintenanceCategories } from '@schema/maintenance-categories';
import { requestNotes } from '@schema/request-notes';
import { requestHistories } from '@schema/request-histories';

import { ENV } from 'varlock/env';
import { dbLogger } from '@shared/lib';

const dbSchema = {
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
  surveySections,
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
  eventAttendees,
  announcements,
  agentAccesses,
  platformSuspensions,
  groupMembershipRequests,
  platformModules,
  tenantModules,
  assistSessions,
  resources,
  resourceVersions,
  competitions,
  competitionEntries,
  maintenanceTeams,
  serviceProviders,
  maintenanceCategories,
  requestNotes,
  requestHistories,
} as const;

export type DbSchema = typeof dbSchema;

let dbInstance: ReturnType<typeof drizzle> | undefined;

function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const pooledUrl = ENV.DATABASE_URL;
  const directUrl = ENV.DIRECT_URL;

  if (!pooledUrl && !directUrl) {
    throw new Error('DATABASE_URL or DIRECT_URL is not set');
  }

  if (!pooledUrl) {
    dbLogger.warn(
      'DATABASE_URL is not set — falling back to DIRECT_URL (unpooled). ' +
        'This bypasses Supavisor/pgbouncer and will exhaust the connection ' +
        'ceiling under serverless concurrency. Set DATABASE_URL to the pooled connection string.'
    );
  }

  const envUrl = pooledUrl || directUrl!;
  const connectionString = envUrl.replace('sslmode=require', 'sslmode=no-verify');
  const pool = new Pool({ connectionString, ...POOL_CONFIG });

  dbInstance = drizzle(pool, { schema: dbSchema });

  return dbInstance;
}

/**
 * Singleton Drizzle client instance.
 * All application queries should use this exported 'db' instance.
 */
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzle>];
  },
});

/**
 * Execute database operations within an RLS-aware transaction.
 *
 * Sets Postgres session-local configuration variables (app.user_id,
 * app.tenant_id, app.user_role) so that RLS policies can reference them
 * via current_setting('app.user_id') etc.
 *
 * The config is scoped to the transaction via set_config(..., true),
 * so it is automatically cleaned up on commit or rollback.
 *
 * Usage:
 *   const result = await runWithRLS(
 *     { userId: '...', tenantId: '...', role: 'ADMIN' },
 *     async (tx) => {
 *       return tx.select().from(users).where(eq(users.id, userId));
 *     }
 *   );
 */
export async function runWithRLS<T>(
  ctx: RLSContext,
  fn: (tx: NodePgDatabase<DbSchema>) => Promise<T>
): Promise<T> {
  return getDb().transaction(async tx => {
    await tx.execute(sql`SET LOCAL ROLE app_user`);
    await tx.execute(sql`SELECT set_config('app.user_id', ${ctx.userId}, true)`);
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${ctx.tenantId}, true)`);
    await tx.execute(sql`SELECT set_config('app.user_role', ${ctx.role}, true)`);
    await tx.execute(
      sql`SELECT set_config('app.is_platform_admin', ${ctx.isPlatformAdmin ? 'true' : 'false'}, true)`
    );
    return fn(tx as unknown as NodePgDatabase<DbSchema>);
  });
}

/**
 * Derive RLS context from a Next.js request by authenticating the session.
 * Must be called within a route handler.
 */
export async function getRLSContext(request: Request): Promise<RLSContext | null> {
  const { auth } = await import('./auth');
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return null;

  const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);

  if (!user) return null;

  return {
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    isPlatformAdmin: user.isPlatformAdmin,
  };
}

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
  surveySections,
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
  eventAttendees,
  announcements,
  agentAccesses,
  platformSuspensions,
  groupMembershipRequests,
  platformModules,
  tenantModules,
  assistSessions,
  resources,
  resourceVersions,
  competitions,
  competitionEntries,
  maintenanceTeams,
  serviceProviders,
  maintenanceCategories,
  requestNotes,
  requestHistories,
};
