import { db, events, notDeleted } from '@api/server';

import { eq, and, or, desc, asc, gte } from 'drizzle-orm';

/**
 * Lists events for a tenant with optional filtering.
 *
 * When `viewerId` is provided the list is scoped to what that resident can
 * see: published public events plus their own events (including drafts and
 * restricted events). Omit `viewerId` for an unrestricted/admin view.
 */
export async function listEvents(params: {
  tenantId: string;
  limit?: number;
  upcoming?: boolean;
  category?: string;
  includeDrafts?: boolean;
  viewerId?: string;
}) {
  const conditions = [
    eq(events.tenantId, params.tenantId),
    notDeleted(events),
    params.viewerId
      ? or(
          and(eq(events.isPublic, true), eq(events.isDraft, false)),
          eq(events.createdByUserId, params.viewerId)
        )
      : params.includeDrafts
        ? undefined
        : eq(events.isDraft, false),
    params.upcoming ? gte(events.date, new Date()) : undefined,
    params.category ? eq(events.category, params.category) : undefined,
  ].filter(Boolean);

  const query = db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(params.upcoming ? asc(events.date) : desc(events.date));

  return params.limit ? query.limit(params.limit) : query;
}

/**
 * Validates required fields for an event.
 */
export function validateEventFields(body: Record<string, unknown>): {
  valid: boolean;
  missing?: string[];
} {
  const required = ['title', 'description', 'date', 'location', 'organizer'];
  const missing = required.filter(field => !body[field]);

  if (missing.length > 0) {
    return { valid: false, missing };
  }

  return { valid: true };
}

/**
 * Creates a new event.
 */
export async function createEvent(data: {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  date: Date;
  endDate?: Date | null;
  location: string;
  organizer: string;
  image?: string | null;
  isPublic: boolean;
  isDraft?: boolean;
  category?: string | null;
  maxAttendees?: number | null;
  createdByUserId?: string | null;
}) {
  const now = new Date();

  const [event] = await db
    .insert(events)
    .values({
      id: data.id,
      tenantId: data.tenantId,
      title: data.title,
      description: data.description,
      date: data.date,
      endDate: data.endDate ?? null,
      location: data.location,
      organizer: data.organizer,
      image: data.image || null,
      isPublic: data.isPublic,
      isDraft: data.isDraft ?? false,
      category: data.category ?? null,
      maxAttendees: data.maxAttendees ?? null,
      createdByUserId: data.createdByUserId ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return event;
}
