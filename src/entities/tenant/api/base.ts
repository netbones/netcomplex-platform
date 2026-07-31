/**
 * Tenant Resolution Library
 *
 * Soralia Village is the flagship tenant (#1):
 * - slug: "soralia" (or "soralia-village" for new setups)
 * - subscriptionTier: "flagship" (Soralia Village gets all features)
 * - primaryColor: "#4F46E5"
 * - accentColor: "#F59E0B"
 *
 * All feature flags should be enabled for Soralia Village.
 * The LOCAL_TENANT_SLUG env var allows local development to work
 * with the multi-tenant system.
 */

import { eq, and } from 'drizzle-orm';
import 'server-only';

import type { TierLevel } from '@entities/tenant';
import { unstable_cache } from 'next/cache';
import { headers } from 'next/headers';
import { cache } from 'react';
import type { Tenant, TenantTier } from '@shared/lib';
import {
  db,
  tenants,
  tenantFeatureFlags,
  users,
  households,
  bookings,
  maintenanceRequests,
  notifications,
  events,
  conversations,
  messages,
  surveys,
  announcements,
  groups,
  albums,
  contents,
  invitations,
  communityServiceListings,
  communityServiceInquiries,
  communityServiceReviews,
  propertyListings,
  agentProfiles,
  agentAccesses,
  profiles,
  settings,
  platformSuspensions,
  externalSurveys,
  standardSeats,
  premiumSeats,
  soloSeats,
  members,
  groupMembers,
  groupMembershipRequests,
  conversationParticipants,
  questions,
  responses,
} from '@api/server';
import { createId } from '@shared/lib/id';
import { dbLogger } from '@shared/lib';
import { revalidateTenant } from '@api/server';

export type { Tenant };

/**
 * Maps short-name subdomains (from *.netbones.co.za wildcard) to full tenant slugs.
 *
 * The wildcard domain `*.netbones.co.za` derives the tenant slug from the
 * subdomain (e.g. `soralia.netbones.co.za` → slug `soralia`). When the
 * subdomain differs from the slug (e.g. `solaris.netbones.co.za` → slug
 * `solaris-heights`), add an entry here.
 *
 * New tenants should prefer slug == subdomain to avoid needing an alias.
 */
const SUBDOMAIN_ALIASES: Record<string, string> = {
  solaris: 'solaris-heights',
};

const NETBONES_WILDCARD_SUFFIX = '.netbones.co.za';

/**
 * Canonical tenant resolution from incoming request headers.
 * Shared by getCurrentTenant() (layouts) and withTenant() (API routes).
 * See ADVISORY-032 — order must stay identical in both call paths.
 */
export async function resolveTenantFromRequestHeaders(
  headersList: Headers
): Promise<Tenant | undefined> {
  const tenantId = headersList.get('x-tenant-id');
  if (tenantId) return getTenantById(tenantId);

  // 1. Resolve by full host as custom domain.
  //    Catches branded domains like solaris.co.za → Solaris Heights,
  //    soralia.co.za → Soralia Village.
  const host = headersList.get('host') || '';
  if (host) {
    const hostWithoutPort = host.split(':')[0] || '';
    const byDomain = await getTenantByDomain(hostWithoutPort);
    if (byDomain) return byDomain;
  }

  // 2. Resolve by slug from middleware x-tenant-slug header.
  //    Catches soralia.netbones.co.za where subdomain == slug.
  const slug = headersList.get('x-tenant-slug');
  if (slug) {
    const bySlug = await getTenantBySlug(slug);
    if (bySlug) return bySlug;
  }

  // 3. Resolve *.netbones.co.za wildcard subdomain → slug (with alias mapping).
  //    Catches solaris.netbones.co.za where subdomain ≠ slug.
  if (host) {
    const hostWithoutPort = host.split(':')[0] || '';
    if (hostWithoutPort.endsWith(NETBONES_WILDCARD_SUFFIX)) {
      const subdomain = hostWithoutPort.slice(0, -NETBONES_WILDCARD_SUFFIX.length);
      if (subdomain) {
        const bySubdomainSlug = await getTenantBySlug(subdomain);
        if (bySubdomainSlug) return bySubdomainSlug;
        const aliasSlug = SUBDOMAIN_ALIASES[subdomain];
        if (aliasSlug) {
          const byAlias = await getTenantBySlug(aliasSlug);
          if (byAlias) return byAlias;
        }
      }
    }
  }

  // 4. Fallback for development: LOCAL_TENANT_SLUG env or 'soralia'.
  const localTenantSlug = process.env.LOCAL_TENANT_SLUG || 'soralia';
  return getTenantBySlug(localTenantSlug);
}

const getCurrentTenantImpl = cache(async (): Promise<Tenant | undefined> => {
  const headersList = await headers();
  return resolveTenantFromRequestHeaders(headersList);
});

/**
 * Connection-resilient wrapper around {@link getCurrentTenantImpl}.
 *
 * `getCurrentTenant` is called from the root and auth layouts — both already
 * handle a `undefined` return by rendering a default fallback tenant. The raw
 * impl, however, lets a transient DB failure (e.g. pg pool connection
 * timeout, Supavisor blip) throw, which Next.js surfaces as a 500 for the
 * entire layout. That turns a brief upstream hiccup into a hard outage for
 * every page.
 *
 * This wrapper catches connection-class errors, logs them via `dbLogger`, and
 * returns `undefined` so the caller's fallback tenant kicks in. Non-connection
 * errors (programming bugs, bad schema) still propagate so they surface in dev.
 *
 * `getCurrentTenantImpl` is wrapped with React `cache()` (ADVISORY-037 Layer 1)
 * so a single render that calls `getCurrentTenant` from layout + sidebar +
 * header + content pays for one DB resolution pass instead of four.
 */
export const getCurrentTenant = async (): Promise<Tenant | undefined> => {
  try {
    return await getCurrentTenantImpl();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const looksLikeConnectionError =
      /connection timeout|connection terminated|terminat|ECONNRESET|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|getaddrinfo|socket hang up/i.test(
        msg
      );
    if (!looksLikeConnectionError) throw err;
    dbLogger.warn(
      { err: msg, slug: process.env.LOCAL_TENANT_SLUG || 'soralia' },
      'Tenant lookup failed (DB connection error) — degrading to default tenant'
    );
    return undefined;
  }
};

// Type helper to convert Drizzle result to Tenant
function toTenant(
  row: Record<string, unknown>,
  featureFlagsOverride?: Record<string, boolean>
): Tenant {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    customDomain: row.customDomain as string | null,
    logoUrl: row.logoUrl as string | null,
    faviconUrl: row.faviconUrl as string | null,
    tagline: row.tagline as string | null,
    description: row.description as string | null,
    address: row.address as string | null,
    telephone: row.telephone as string | null,
    email: row.email as string | null,
    governanceLabel: row.governanceLabel as string | null,
    primaryColor: row.primaryColor as string,
    accentColor: row.accentColor as string | null,
    secondaryColor: row.secondaryColor as string | null,
    fontFamily: row.fontFamily as string | null,
    customCss: row.customCss as string | null,
    active: row.active as boolean,
    subscriptionTier: row.subscriptionTier as TierLevel,
    tier: (row.tier as TenantTier) || 'STANDARD',
    maxPages: row.maxPages as number,
    pageCount: row.pageCount as number,
    featureFlags: featureFlagsOverride ?? (row.featureFlags as Record<string, boolean>),
    modules:
      (row.modules as
        | Record<string, { enabled: boolean; config?: Record<string, unknown> }>
        | undefined) ?? undefined,
    createdAt: new Date(row.createdAt as string),
    updatedAt: row.updatedAt ? new Date(row.updatedAt as string) : null,
  };
}

async function loadTenantWithFlags(
  row: Record<string, unknown> | undefined
): Promise<Tenant | undefined> {
  if (!row) return undefined;
  const flags = await getTenantFeatureFlags(row.id as string);
  return toTenant(row, flags);
}

export const getTenantById = unstable_cache(
  async (id: string): Promise<Tenant | undefined> => {
    const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    return loadTenantWithFlags(result[0]);
  },
  ['tenant-by-id'],
  { revalidate: 60, tags: ['tenant-lookup'] }
);

export const getTenantBySlug = unstable_cache(
  async (slug: string): Promise<Tenant | undefined> => {
    const result = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    return loadTenantWithFlags(result[0]);
  },
  ['tenant-by-slug'],
  { revalidate: 60, tags: ['tenant-lookup'] }
);

export const getTenantByDomain = unstable_cache(
  async (domain: string): Promise<Tenant | undefined> => {
    const result = await db.select().from(tenants).where(eq(tenants.customDomain, domain)).limit(1);
    return loadTenantWithFlags(result[0]);
  },
  ['tenant-by-domain'],
  { revalidate: 60, tags: ['tenant-lookup'] }
);

/**
 * Get tenant for a user.
 * - Returns `Tenant` if user has a valid tenant.
 * - Returns `null` if user exists but has no tenant (deferred-provisioning).
 * - Returns `undefined` if user not found.
 */
export async function getTenantByUserId(userId: string): Promise<Tenant | null | undefined> {
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user[0]) return undefined;
  const tenantId = user[0].tenantId;
  if (tenantId === null) return null;
  return getTenantById(tenantId);
}

export async function listTenants(): Promise<Tenant[]> {
  const result = await db.select().from(tenants);
  return result.map(row => toTenant(row));
}

// ── TenantFeatureFlag CRUD ──

export async function getTenantFeatureFlags(tenantId: string): Promise<Record<string, boolean>> {
  const rows = await db
    .select({ featureKey: tenantFeatureFlags.featureKey, enabled: tenantFeatureFlags.enabled })
    .from(tenantFeatureFlags)
    .where(eq(tenantFeatureFlags.tenantId, tenantId));
  const flags: Record<string, boolean> = {};
  for (const row of rows) {
    flags[row.featureKey] = row.enabled;
  }
  return flags;
}

export async function setTenantFeatureFlag(
  tenantId: string,
  featureKey: string,
  enabled: boolean
): Promise<void> {
  await db
    .insert(tenantFeatureFlags)
    .values({
      id: createId(),
      tenantId,
      featureKey,
      enabled,
    })
    .onConflictDoUpdate({
      target: [tenantFeatureFlags.tenantId, tenantFeatureFlags.featureKey],
      set: { enabled, updatedAt: new Date() },
    });
}

export async function setTenantFeatureFlags(
  tenantId: string,
  flags: Record<string, boolean>
): Promise<void> {
  for (const [featureKey, enabled] of Object.entries(flags)) {
    await setTenantFeatureFlag(tenantId, featureKey, enabled);
  }
}

export async function deleteTenantFeatureFlag(tenantId: string, featureKey: string): Promise<void> {
  await db
    .delete(tenantFeatureFlags)
    .where(
      and(eq(tenantFeatureFlags.tenantId, tenantId), eq(tenantFeatureFlags.featureKey, featureKey))
    );
}

export async function createTenant(data: {
  id?: string;
  name: string;
  slug: string;
  customDomain?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string;
  accentColor?: string | null;
  secondaryColor?: string | null;
  fontFamily?: string | null;
  customCss?: string | null;
  active?: boolean;
  subscriptionTier?: string;
  modules?: unknown;
  maxPages?: number;
  pageCount?: number;
  featureFlags?: unknown;
  tier?: TenantTier;
  ownerId?: string | null;
}): Promise<Tenant> {
  const row: typeof tenants.$inferInsert = {
    id: data.id ?? createId(),
    name: data.name,
    slug: data.slug,
    customDomain: data.customDomain ?? null,
    logoUrl: data.logoUrl ?? null,
    faviconUrl: data.faviconUrl ?? null,
    primaryColor: data.primaryColor ?? '#4F46E5',
    accentColor: data.accentColor ?? null,
    secondaryColor: data.secondaryColor ?? null,
    fontFamily: data.fontFamily ?? null,
    customCss: data.customCss ?? null,
    active: data.active ?? true,
    subscriptionTier: data.subscriptionTier ?? 'core',
    modules: (data.modules ?? {}) as typeof tenants.$inferInsert.modules,
    maxPages: data.maxPages ?? 5,
    pageCount: data.pageCount ?? 0,
    featureFlags: (data.featureFlags ?? {}) as typeof tenants.$inferInsert.featureFlags,
    tier: data.tier ?? 'STANDARD',
    ownerId: data.ownerId ?? null,
  };
  const result = await db.insert(tenants).values(row).returning();
  const tenant = toTenant(result[0] as unknown as Record<string, unknown>);

  // Seed feature flags into normalized table
  const flags = (data.featureFlags ?? {}) as Record<string, boolean>;
  if (Object.keys(flags).length > 0) {
    await setTenantFeatureFlags(tenant.id, flags);
  }

  // Invalidate tenant-lookup cache so subsequent resolutions see the new
  // tenant immediately rather than waiting for the 60s unstable_cache TTL.
  revalidateTenant(tenant.id);

  return tenant;
}

export async function updateTenant(
  id: string,
  data: Partial<Omit<Tenant, 'id' | 'createdAt'>>
): Promise<Tenant> {
  const { featureFlags, ...rest } = data;
  const result = await db
    .update(tenants)
    .set({
      ...rest,
      featureFlags: featureFlags ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, id))
    .returning();
  if (featureFlags) {
    await setTenantFeatureFlags(id, featureFlags as Record<string, boolean>);
  }

  // Invalidate tenant-lookup cache so resolution staleness is bounded by
  // tag invalidation rather than the 60s unstable_cache TTL alone.
  revalidateTenant(id);

  return toTenant(result[0]);
}

export async function deleteTenant(id: string): Promise<void> {
  await db.delete(tenants).where(eq(tenants.id, id));

  // Invalidate tenant-lookup cache so the deleted tenant is no longer
  // returned from cached resolvers.
  revalidateTenant(id);
}

export function drizzleTenantFilter<T>(tenantId: string, conditions: T[]): T[] {
  return conditions;
}

export const tenantQueries = {
  users: (tenantId: string) => eq(users.tenantId, tenantId),
  households: (tenantId: string) => eq(households.tenantId, tenantId),
  bookings: (tenantId: string) => eq(bookings.tenantId, tenantId),
  maintenanceRequests: (tenantId: string) => eq(maintenanceRequests.tenantId, tenantId),
  notifications: (tenantId: string) => eq(notifications.tenantId, tenantId),
  events: (tenantId: string) => eq(events.tenantId, tenantId),
  conversations: (tenantId: string) => eq(conversations.tenantId, tenantId),
  messages: (tenantId: string) => eq(messages.tenantId, tenantId),
  surveys: (tenantId: string) => eq(surveys.tenantId, tenantId),
  announcements: (tenantId: string) => eq(announcements.tenantId, tenantId),
  groups: (tenantId: string) => eq(groups.tenantId, tenantId),
  albums: (tenantId: string) => eq(albums.tenantId, tenantId),
  contents: (tenantId: string) => eq(contents.tenantId, tenantId),
  invitations: (tenantId: string) => eq(invitations.tenantId, tenantId),
  communityServiceListings: (tenantId: string) => eq(communityServiceListings.tenantId, tenantId),
  communityServiceInquiries: (tenantId: string) => eq(communityServiceInquiries.tenantId, tenantId),
  communityServiceReviews: (tenantId: string) => eq(communityServiceReviews.tenantId, tenantId),
  propertyListings: (tenantId: string) => eq(propertyListings.tenantId, tenantId),
  agentProfiles: (tenantId: string) => eq(agentProfiles.tenantId, tenantId),
  agentAccesses: (tenantId: string) => eq(agentAccesses.tenantId, tenantId),
  profiles: (tenantId: string) => eq(profiles.tenantId, tenantId),
  settings: (tenantId: string) => eq(settings.tenantId, tenantId),
  platformSuspensions: (tenantId: string) => eq(platformSuspensions.tenantId, tenantId),
  externalSurveys: (tenantId: string) => eq(externalSurveys.tenantId, tenantId),
  standardSeats: (tenantId: string) => eq(standardSeats.tenantId, tenantId),
  premiumSeats: (tenantId: string) => eq(premiumSeats.tenantId, tenantId),
  soloSeats: (tenantId: string) => eq(soloSeats.tenantId, tenantId),
  members: (tenantId: string) => eq(members.tenantId, tenantId),
  groupMembers: (tenantId: string) => eq(groupMembers.tenantId, tenantId),
  groupMembershipRequests: (tenantId: string) => eq(groupMembershipRequests.tenantId, tenantId),
  conversationParticipants: (tenantId: string) => eq(conversationParticipants.tenantId, tenantId),
  questions: (tenantId: string) => eq(questions.tenantId, tenantId),
  responses: (tenantId: string) => eq(responses.tenantId, tenantId),
};
