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

import { eq } from 'drizzle-orm';
import 'server-only';

import type { TierLevel } from '@entities/tenant';
// import { unstable_cache } from 'next/cache';
import { headers } from 'next/headers';
import type { Tenant, TenantTier } from './types';
import {
  db,
  tenants,
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
  userGroups,
  groupMembershipRequests,
  conversationParticipants,
  questions,
  responses,
} from '@api/db';

export type { Tenant };

const getCurrentTenantImpl = async (): Promise<Tenant | undefined> => {
  const headersList = await headers();

  const tenantId = headersList.get('x-tenant-id');
  if (tenantId) return getTenantById(tenantId);

  const slug = headersList.get('x-tenant-slug');
  if (slug) return getTenantBySlug(slug);

  // Fallback for development: use LOCAL_TENANT_SLUG env or default to 'soralia'
  // This allows Soralia development to work with the multi-tenant system
  const localTenantSlug = process.env.LOCAL_TENANT_SLUG || 'soralia';
  return getTenantBySlug(localTenantSlug);
};

export const getCurrentTenant = getCurrentTenantImpl;

// Type helper to convert Drizzle result to Tenant
function toTenant(row: Record<string, unknown>): Tenant {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    customDomain: row.customDomain as string | null,
    logoUrl: row.logoUrl as string | null,
    faviconUrl: row.faviconUrl as string | null,
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
    featureFlags: row.featureFlags as Record<string, boolean>,
    modules:
      (row.modules as
        | Record<string, { enabled: boolean; config?: Record<string, unknown> }>
        | undefined) ?? undefined,
    createdAt: new Date(row.createdAt as string),
    updatedAt: row.updatedAt ? new Date(row.updatedAt as string) : null,
  };
}

export async function getTenantById(id: string): Promise<Tenant | undefined> {
  const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return result[0] ? toTenant(result[0]) : undefined;
}

export async function getTenantBySlug(slug: string): Promise<Tenant | undefined> {
  const result = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  return result[0] ? toTenant(result[0]) : undefined;
}

export async function getTenantByDomain(domain: string): Promise<Tenant | undefined> {
  const result = await db.select().from(tenants).where(eq(tenants.customDomain, domain)).limit(1);
  return result[0] ? toTenant(result[0]) : undefined;
}

export async function getTenantByUserId(userId: string): Promise<Tenant | undefined> {
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user[0]) return undefined;
  return getTenantById(user[0].tenantId);
}

export async function listTenants(): Promise<Tenant[]> {
  const result = await db.select().from(tenants);
  return result.map(toTenant);
}

export async function createTenant(
  data: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Tenant> {
  const result = await db.insert(tenants).values(data).returning();
  return toTenant(result[0]);
}

export async function updateTenant(
  id: string,
  data: Partial<Omit<Tenant, 'id' | 'createdAt'>>
): Promise<Tenant> {
  const result = await db
    .update(tenants)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tenants.id, id))
    .returning();
  return toTenant(result[0]);
}

export async function deleteTenant(id: string): Promise<void> {
  await db.delete(tenants).where(eq(tenants.id, id));
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
  userGroups: (tenantId: string) => eq(userGroups.tenantId, tenantId),
  groupMembershipRequests: (tenantId: string) => eq(groupMembershipRequests.tenantId, tenantId),
  conversationParticipants: (tenantId: string) => eq(conversationParticipants.tenantId, tenantId),
  questions: (tenantId: string) => eq(questions.tenantId, tenantId),
  responses: (tenantId: string) => eq(responses.tenantId, tenantId),
};
