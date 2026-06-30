import { z } from 'zod';
import {
  router,
  protectedProcedure,
  tenantProcedure,
  privilegedProcedure,
  rateLimitMiddleware,
  db,
  events,
  eventAttendees,
  users,
  revalidateContent,
  revalidateAdminChanges,
  notDeleted,
  now,
  emitEvent,
} from '@api/server';

import { toEnvelope } from '@api/server';

import { eventDto } from '@server/dto';

import { TRPCError } from '@trpc/server';
import { requireContentPermission } from './content';

import { eq, and, count, inArray } from 'drizzle-orm';

import { listEvents, createEvent } from '@entities/event/server';

// ──────────────────────────────────────────
// Input schemas
// ──────────────────────────────────────────

const EventIdInput = z.object({ id: z.string() });

const ListEventsInput = z
  .object({
    upcoming: z.coerce.boolean().optional(),
    category: z.string().optional(),
    groupId: z.string().optional(),
    limit: z.coerce.number().optional(),
  })
  .optional();

const CreateEventInput = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().min(1).max(5000).trim(),
  date: z.string().min(1),
  location: z.string().min(1).max(200).trim(),
  organizer: z.string().min(1).max(200).trim(),
  image: z.string().optional().nullable(),
  isPublic: z.boolean().default(true),
});

const UpdateEventInput = z.object({
  id: z.string(),
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().min(1).max(5000).trim().optional(),
  date: z.string().optional(),
  location: z.string().min(1).max(200).trim().optional(),
  organizer: z.string().min(1).max(200).trim().optional(),
  image: z.string().optional().nullable(),
  isPublic: z.boolean().optional(),
});

// ──────────────────────────────────────────
// Shared helpers
// ──────────────────────────────────────────

/** Verify an event exists in the user's tenant */
async function getTenantEvent(eventId: string, tenantId: string) {
  const [event] = await db
    .select()
    .from(events)
    .where(and(notDeleted(events), eq(events.id, eventId), eq(events.tenantId, tenantId)));
  if (!event) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
  }
  return event;
}

/** Enrich events with attendee counts and registration status */
async function enrichEvents<T extends Record<string, unknown>>(
  rows: T[],
  userId: string,
  tenantId: string
): Promise<(T & { registered: boolean; attendeeCount: number })[]> {
  if (rows.length === 0) return [];

  const eventIds = rows.map(e => e.id as string);

  const rawCounts = await db
    .select({
      eventId: eventAttendees.eventId,
      count: count(),
    })
    .from(eventAttendees)
    .where(and(eq(eventAttendees.tenantId, tenantId), inArray(eventAttendees.eventId, eventIds)))
    .groupBy(eventAttendees.eventId);

  const countMap = new Map<string, number>();
  for (const c of rawCounts) {
    countMap.set(c.eventId, c.count);
  }

  const userRegs = await db
    .select({ eventId: eventAttendees.eventId })
    .from(eventAttendees)
    .where(and(eq(eventAttendees.userId, userId), eq(eventAttendees.tenantId, tenantId)));
  const regSet = new Set(userRegs.map(r => r.eventId));

  return rows.map(event => ({
    ...event,
    registered: regSet.has(event.id as string),
    attendeeCount: countMap.get(event.id as string) ?? 0,
  }));
}

// ──────────────────────────────────────────
// Router
// ──────────────────────────────────────────

export const eventsRouter = router({
  /**
   * List events for the current tenant.
   * @tenant
   */
  listEvents: tenantProcedure
    .input(ListEventsInput)
    .meta({ openapi: { method: 'GET', path: '/events/list', protect: true, tags: ['events'] } })
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const eventItems = await listEvents({
        tenantId,
        limit: input?.limit,
        upcoming: input?.upcoming,
      });

      const enriched = await enrichEvents(eventItems, ctx.userId, tenantId);

      return toEnvelope(enriched.map(r => eventDto.parse(r)));
    }),

  /**
   * Get a single event by ID.
   * @tenant
   */
  getEvent: tenantProcedure
    .input(EventIdInput)
    .meta({ openapi: { method: 'GET', path: '/events/get', protect: true, tags: ['events'] } })
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const event = await getTenantEvent(input.id, tenantId);

      const enriched = await enrichEvents([event!], ctx.userId, tenantId);

      return toEnvelope(eventDto.parse(enriched[0]));
    }),

  /**
   * Create a new event — staff only.
   * @privileged
   */
  createEvent: privilegedProcedure
    .input(CreateEventInput)
    .meta({ openapi: { method: 'POST', path: '/events/create', protect: true, tags: ['events'] } })
    .mutation(async ({ input, ctx }) => {
      requireContentPermission(ctx.role);

      const tenantId = ctx.tenantId;

      const event = await createEvent({
        id: crypto.randomUUID(),
        tenantId,
        title: input.title,
        description: input.description,
        date: new Date(input.date),
        location: input.location,
        organizer: input.organizer,
        image: input.image || null,
        isPublic: input.isPublic,
      });

      revalidateContent();

      emitEvent('event.rsvp', {
        tenantId,
        userId: ctx.userId,
        eventId: event.id,
      });

      return toEnvelope(eventDto.parse(event));
    }),

  /**
   * Update an existing event — staff only.
   * @privileged
   */
  updateEvent: privilegedProcedure
    .input(UpdateEventInput)
    .meta({ openapi: { method: 'PATCH', path: '/events/update', protect: true, tags: ['events'] } })
    .mutation(async ({ input, ctx }) => {
      requireContentPermission(ctx.role);

      await getTenantEvent(input.id, ctx.tenantId);

      const tenantId = ctx.tenantId;
      const updateData: Record<string, unknown> = {
        updatedAt: now(),
      };

      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.date !== undefined) updateData.date = new Date(input.date);
      if (input.location !== undefined) updateData.location = input.location;
      if (input.organizer !== undefined) updateData.organizer = input.organizer;
      if (input.image !== undefined) updateData.image = input.image || null;
      if (input.isPublic !== undefined) updateData.isPublic = input.isPublic;

      const [updated] = await db
        .update(events)
        .set(updateData)
        .where(and(eq(events.id, input.id), eq(events.tenantId, tenantId)))
        .returning();

      revalidateContent();

      return toEnvelope(eventDto.parse(updated));
    }),

  /**
   * Soft-delete an event — staff only.
   * @privileged
   */
  deleteEvent: privilegedProcedure
    .input(EventIdInput)
    .meta({
      openapi: { method: 'DELETE', path: '/events/delete', protect: true, tags: ['events'] },
    })
    .mutation(async ({ input, ctx }) => {
      requireContentPermission(ctx.role);

      const tenantId = ctx.tenantId;

      await getTenantEvent(input.id, tenantId);

      await db
        .update(events)
        .set({ deletedAt: now(), updatedAt: now() })
        .where(and(eq(events.id, input.id), eq(events.tenantId, tenantId)));

      revalidateContent();

      return toEnvelope({ success: true });
    }),

  // ────────── REGISTRATIONS ──────────

  /**
   * List registrations for an event.
   * @tenant
   */
  listRegistrations: tenantProcedure
    .input(EventIdInput)
    .meta({
      openapi: { method: 'GET', path: '/events/registrations', protect: true, tags: ['events'] },
    })
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      await getTenantEvent(input.id, tenantId);

      const attendees = await db
        .select({
          id: eventAttendees.id,
          userId: eventAttendees.userId,
          name: users.name,
          avatar: users.avatar,
          createdAt: eventAttendees.createdAt,
        })
        .from(eventAttendees)
        .innerJoin(users, eq(users.id, eventAttendees.userId))
        .where(and(eq(eventAttendees.eventId, input.id), eq(eventAttendees.tenantId, tenantId)))
        .orderBy(eventAttendees.createdAt);

      const registered = attendees.some(a => a.userId === ctx.userId);

      return toEnvelope({ attendees, registered });
    }),

  /**
   * Register for an event — authenticated user action.
   * @tenant
   */
  registerForEvent: tenantProcedure
    .use(rateLimitMiddleware({ windowMs: 60_000, maxRequests: 10 }))
    .input(EventIdInput)
    .meta({
      openapi: { method: 'POST', path: '/events/register', protect: true, tags: ['events'] },
    })
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      await getTenantEvent(input.id, tenantId);

      const [existing] = await db
        .select({ id: eventAttendees.id })
        .from(eventAttendees)
        .where(and(eq(eventAttendees.eventId, input.id), eq(eventAttendees.userId, ctx.userId)))
        .limit(1);

      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Already registered for this event' });
      }

      const [attendee] = await db
        .insert(eventAttendees)
        .values({
          id: crypto.randomUUID(),
          tenantId,
          eventId: input.id,
          userId: ctx.userId,
        })
        .returning();

      emitEvent('event.rsvp', {
        tenantId,
        userId: ctx.userId,
        eventId: input.id,
      });

      revalidateAdminChanges();
      return toEnvelope(attendee);
    }),

  /**
   * Cancel event registration — authenticated user action.
   * @tenant
   */
  cancelRegistration: tenantProcedure
    .input(EventIdInput)
    .meta({
      openapi: { method: 'DELETE', path: '/events/register', protect: true, tags: ['events'] },
    })
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const [deleted] = await db
        .delete(eventAttendees)
        .where(
          and(
            eq(eventAttendees.eventId, input.id),
            eq(eventAttendees.userId, ctx.userId),
            eq(eventAttendees.tenantId, tenantId)
          )
        )
        .returning();

      if (!deleted) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Not registered for this event' });
      }

      revalidateAdminChanges();
      return toEnvelope({ success: true });
    }),
});
