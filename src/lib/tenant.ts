import { eq, and } from 'drizzle-orm';
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
  requestNotes,
  standardSeats,
  premiumSeats,
  soloSeats,
  members,
  userGroups,
  groupMembershipRequests,
  conversationParticipants,
  questions,
  responses,
} from './db';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  accentColor: string | null;
  secondaryColor: string | null;
  fontFamily: string | null;
  customCss: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date | null;
}

export async function getTenantById(id: string): Promise<Tenant | undefined> {
  const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return result[0];
}

export async function getTenantBySlug(slug: string): Promise<Tenant | undefined> {
  const result = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  return result[0];
}

export async function getTenantByDomain(domain: string): Promise<Tenant | undefined> {
  const result = await db.select().from(tenants).where(eq(tenants.customDomain, domain)).limit(1);
  return result[0];
}

export async function getTenantByUserId(userId: string): Promise<Tenant | undefined> {
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user[0]) return undefined;
  return getTenantById(user[0].tenantId);
}

export async function listTenants(): Promise<Tenant[]> {
  return db.select().from(tenants);
}

export async function createTenant(data: Omit<Tenant, 'createdAt' | 'updatedAt'>): Promise<Tenant> {
  const result = await db.insert(tenants).values(data).returning();
  return result[0];
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
  return result[0];
}

export async function deleteTenant(id: string): Promise<void> {
  await db.delete(tenants).where(eq(tenants.id, id));
}

export function withTenant<T>(tenantId: string, conditions: T[]): T[] {
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
  requestNotes: (tenantId: string) => eq(requestNotes.tenantId, tenantId),
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
