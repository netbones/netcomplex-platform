import { db, events, notDeleted } from '@api/server';

import { eq, and, desc, asc, gte } from 'drizzle-orm';

/**
 * Lists events for a tenant with optional filtering.
 */
export async function listEvents(params: { tenantId: string; limit?: number; upcoming?: boolean }) {
  if (params.upcoming) {
    const now = new Date();
    const query = db
      .select()
      .from(events)
      .where(and(eq(events.tenantId, params.tenantId), gte(events.date, now), notDeleted(events)))
      .orderBy(asc(events.date));
    return params.limit ? query.limit(params.limit) : query;
  }

  const query = db
    .select()
    .from(events)
    .where(and(eq(events.tenantId, params.tenantId), notDeleted(events)))
    .orderBy(desc(events.date));

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
  location: string;
  organizer: string;
  image?: string | null;
  isPublic: boolean;
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
      location: data.location,
      organizer: data.organizer,
      image: data.image || null,
      isPublic: data.isPublic,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return event;
}
