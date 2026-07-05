import 'server-only';

import { createComponentLogger } from '@shared/lib';
import { sql, isNull, eq } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { SQLWrapper } from 'drizzle-orm';

const log = createComponentLogger('runWithRLS');

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
import { contentLikes } from '@schema/content-likes';
import { contents } from '@schema/contents';
import { propertyListings } from '@schema/property-listings';
import { communityServiceListings } from '@schema/community-service-listings';
import { communityServiceReviews } from '@schema/community-service-reviews';
import { communityServiceInquiries } from '@schema/community-service-inquiries';
import { serviceBookings } from '@schema/service-bookings';
import { groups } from '@schema/groups';
import { groupMembers } from '@schema/group-members';
import { surveys } from '@schema/surveys';
import { questions } from '@schema/questions';
import { responses } from '@schema/responses';
import { surveySections } from '@schema/survey-sections';
import { supports } from '@schema/supports';
import { externalSurveys } from '@schema/external-surveys';
import { invitations } from '@schema/invitations';
import { bookings } from '@schema/bookings';
import { maintenanceRequests } from '@schema/maintenance-requests';
import { notifications } from '@schema/notifications';
import { agentProfiles } from '@schema/agent-profiles';
import { propertyPremiumSeats } from '@schema/property-premium-seats';
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
import { communityMerits } from '@schema/community-merits';
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
import { bursaryFields } from '@schema/bursary-fields';
import { bursaries } from '@schema/bursaries';
import { requestNotes } from '@schema/request-notes';
import { internalMaintenanceNotes } from '@schema/internal-maintenance-notes';
import { requestHistories } from '@schema/request-histories';
import { providerVerifications } from '@schema/provider-verifications';
import { providerLegalAgreements } from '@schema/provider-legal-agreements';
import { providerReputations } from '@schema/provider-reputations';
import { providerMerits } from '@schema/provider-merits';
import { subscriptionTiers } from '@schema/subscription-tiers';
import { providerSubscriptions } from '@schema/provider-subscriptions';
import { paymentTransactions } from '@schema/payment-transactions';
import { providerCharges } from '@schema/provider-charges';
import { providerInvoices } from '@schema/provider-invoices';
import { revenueRecords } from '@schema/revenue-records';
import { achievementDefinitions } from '@schema/achievement-definitions';
import { tenantAchievements } from '@schema/tenant-achievements';
import { userAchievementProgresses } from '@schema/user-achievement-progresses';
import { userAchievements } from '@schema/user-achievements';
import { platformAiTierQuotas } from '@schema/platform-ai-tier-quotas';
import { aiCapabilityCosts } from '@schema/ai-capability-costs';
import { tenantAiUsages } from '@schema/tenant-ai-usages';
import { aiUsageEvents } from '@schema/ai-usage-events';
import { disputeCases } from '@schema/dispute-cases';
import { disputeEvents } from '@schema/dispute-events';
import { disputeEvidences } from '@schema/dispute-evidences';
import { disputeMessageVersions } from '@schema/dispute-message-versions';
import { disputeMessages } from '@schema/dispute-messages';
import { disputeNotifications } from '@schema/dispute-notifications';
import { dataConsents } from '@schema/data-consents';
import { dataRevenueStreams } from '@schema/data-revenue-streams';
import { dataShareBatches } from '@schema/data-share-batches';
import { dWallets } from '@schema/d-wallets';
import { payoutRequests } from '@schema/payout-requests';
import { walletTransactions } from '@schema/wallet-transactions';
import { residentDelegations } from '@schema/resident-delegations';
import { agentTokens } from '@schema/agent-tokens';
import { delegationActions } from '@schema/delegation-actions';
import { addresses } from '@schema/addresses';
import { addressesRelations } from '@schema/addresses-relations';
import { handles } from '@schema/handles';
import { handlesRelations } from '@schema/handles-relations';
import { addressEndpoints } from '@schema/address-endpoints';
import { addressEndpointsRelations } from '@schema/address-endpoints-relations';

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
  contentLikes,
  contents,
  dataConsents,
  dataRevenueStreams,
  dataShareBatches,
  dWallets,
  propertyListings,
  communityServiceListings,
  communityServiceReviews,
  communityServiceInquiries,
  serviceBookings,
  groups,
  groupMembers,
  surveys,
  questions,
  responses,
  surveySections,
  supports,
  externalSurveys,
  invitations,
  bookings,
  maintenanceRequests,
  notifications,
  agentProfiles,
  propertyPremiumSeats,
  verifications,
  accounts,
  sessions,
  passkeys,
  twoFactors,
  members,
  organizations,
  payoutRequests,
  tenants,
  events,
  eventAttendees,
  announcements,
  agentAccesses,
  platformSuspensions,
  communityMerits,
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
  bursaryFields,
  bursaries,
  requestNotes,
  internalMaintenanceNotes,
  requestHistories,
  providerVerifications,
  providerLegalAgreements,
  providerReputations,
  providerMerits,
  subscriptionTiers,
  providerSubscriptions,
  paymentTransactions,
  walletTransactions,
  providerCharges,
  providerInvoices,
  revenueRecords,
  achievementDefinitions,
  tenantAchievements,
  userAchievementProgresses,
  userAchievements,
  platformAiTierQuotas,
  aiCapabilityCosts,
  tenantAiUsages,
  aiUsageEvents,
  disputeCases,
  disputeEvents,
  disputeEvidences,
  disputeMessageVersions,
  disputeMessages,
  disputeNotifications,
  addresses,
  addressesRelations,
  handles,
  handlesRelations,
  addressEndpoints,
  addressEndpointsRelations,
} as const;

export type DbSchema = typeof dbSchema;

let dbInstance: ReturnType<typeof drizzle> | undefined;
let authDbInstance: ReturnType<typeof drizzle> | undefined;

function createConnectionString() {
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
  return envUrl.replace('sslmode=require', 'sslmode=no-verify');
}

function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const pool = new Pool({ connectionString: createConnectionString(), ...POOL_CONFIG });
  dbInstance = drizzle(pool, { schema: dbSchema });

  return dbInstance;
}

function getAuthDb() {
  if (authDbInstance) {
    return authDbInstance;
  }

  const pool = new Pool({ connectionString: createConnectionString(), ...POOL_CONFIG });
  authDbInstance = drizzle(pool, { schema: dbSchema });

  return authDbInstance;
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
 * Separate Drizzle instance for Better Auth.
 * Uses its own pg Pool to avoid concurrent-query deprecation
 * warnings from pg when Auth and app queries share a pool.
 */
export const authDb = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return getAuthDb()[prop as keyof ReturnType<typeof drizzle>];
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
    try {
      await tx.execute(sql`SET LOCAL ROLE app_user`);
      await tx.execute(sql`SET LOCAL search_path TO public`);
    } catch {
      log.warn(
        {},
        'RLS role switch failed — proceeding without app_user role. RLS policies NOT enforced.'
      );
    }
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
export function notDeleted(table: { deletedAt: unknown }): SQL {
  return isNull(table.deletedAt as SQLWrapper);
}

/**
 * Phase 46.2: Canonical address uniqueness guard using the Address registry.
 * Replaces the 3-table seat check with a single Address table query — the source of truth.
 */
export async function assertAddressUnique(
  platformAddress: string,
  tx: NodePgDatabase<Record<string, unknown>>
): Promise<void> {
  const existing = await tx
    .select()
    .from(addresses)
    .where(eq(addresses.address, platformAddress))
    .limit(1);
  if (existing.length) {
    throw new Error(`Platform address '${platformAddress}' is already in use`);
  }
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
  contentLikes,
  contents,
  dataConsents,
  dataRevenueStreams,
  dataShareBatches,
  dWallets,
  propertyListings,
  communityServiceListings,
  communityServiceReviews,
  communityServiceInquiries,
  serviceBookings,
  groups,
  groupMembers,
  surveys,
  questions,
  responses,
  surveySections,
  supports,
  externalSurveys,
  invitations,
  bookings,
  maintenanceRequests,
  notifications,
  agentProfiles,
  propertyPremiumSeats,
  verifications,
  accounts,
  sessions,
  passkeys,
  twoFactors,
  members,
  organizations,
  payoutRequests,
  tenants,
  events,
  eventAttendees,
  announcements,
  agentAccesses,
  platformSuspensions,
  communityMerits,
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
  internalMaintenanceNotes,
  requestHistories,
  providerVerifications,
  providerLegalAgreements,
  providerReputations,
  providerMerits,
  subscriptionTiers,
  providerSubscriptions,
  paymentTransactions,
  walletTransactions,
  providerCharges,
  providerInvoices,
  revenueRecords,
  achievementDefinitions,
  tenantAchievements,
  userAchievementProgresses,
  userAchievements,
  platformAiTierQuotas,
  aiCapabilityCosts,
  tenantAiUsages,
  aiUsageEvents,
  disputeCases,
  disputeEvents,
  disputeEvidences,
  disputeMessageVersions,
  disputeMessages,
  disputeNotifications,
  residentDelegations,
  agentTokens,
  delegationActions,
  bursaryFields,
  bursaries,
  addresses,
  addressesRelations,
  handles,
  handlesRelations,
  addressEndpoints,
  addressEndpointsRelations,
};
