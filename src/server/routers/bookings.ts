import { z } from 'zod';
import {
  router,
  tenantProcedure,
  rateLimitMiddleware,
  db,
  bookings,
  users,
  revalidateDashboard,
  emitEvent,
  now,
} from '@api/server';

import { toEnvelope } from '@api/server';

import { bookingDto } from '@api/server';

import { TRPCError } from '@trpc/server';
import { hasPermission } from '@shared/lib';

import { eq, and } from 'drizzle-orm';

import {
  getTenantFacilities,
  validateFacility,
  listBookings as entityListBookings,
  createBooking as entityCreateBooking,
  checkBookingConflict,
} from '@entities/booking/server';

import { toBookingDTO } from '@api/server';

// ──────────────────────────────────────────
// Input schemas
// ──────────────────────────────────────────

const BookingIdInput = z.object({ id: z.string() });

const FacilityInput = z.object({ facility: z.string() });

const ListBookingsInput = z
  .object({
    facility: z.string().optional(),
    date: z
      .union([
        z.literal('today'),
        z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Date must be YYYY-MM-DD format'),
      ])
      .optional()
      .describe('Date in YYYY-MM-DD format, or "today" for current date'),
  })
  .optional();

const CreateBookingInput = z
  .object({
    facility: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Date must be ISO 8601 format (YYYY-MM-DD)'),
    startTime: z.string().regex(/^\d{2}:\d{2}/, 'Time must be HH:MM format'),
    endTime: z.string().regex(/^\d{2}:\d{2}/, 'Time must be HH:MM format'),
    purpose: z.string().max(500).optional().default(''),
  })
  .refine(
    data => {
      if (!data.startTime || !data.endTime) return true;
      const [sh, sm] = data.startTime.split(':').map(Number);
      const [eh, em] = data.endTime.split(':').map(Number);
      return sh * 60 + sm < eh * 60 + em;
    },
    { message: 'Start time must be before end time', path: ['startTime'] }
  );

// ──────────────────────────────────────────
// Shared helpers
// ──────────────────────────────────────────

/** Get tenant-scoped booking by ID, or throw NOT_FOUND */
async function getTenantBooking(bookingId: string, tenantId: string) {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.tenantId, tenantId)));
  if (!booking) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });
  }
  return booking;
}

// ──────────────────────────────────────────
// Router
// ──────────────────────────────────────────

export const bookingsRouter = router({
  /**
   * List available facilities for the current tenant.
   * @tenant
   */
  listFacilities: tenantProcedure
    .meta({
      openapi: { method: 'GET', path: '/bookings/facilities', protect: true, tags: ['bookings'] },
    })
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId;

      const facilities = await getTenantFacilities(tenantId);
      return facilities;
    }),

  /**
   * Get details for a specific facility.
   * @tenant
   */
  getFacility: tenantProcedure
    .input(FacilityInput)
    .meta({
      openapi: { method: 'GET', path: '/bookings/facility', protect: true, tags: ['bookings'] },
    })
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const facilities = await getTenantFacilities(tenantId);
      const facility = facilities.find(f => f.value === input.facility);
      if (!facility) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Facility not found' });
      }

      return facility;
    }),

  /**
   * List bookings for the current tenant.
   * @tenant
   */
  listBookings: tenantProcedure
    .input(ListBookingsInput)
    .meta({ openapi: { method: 'GET', path: '/bookings/list', protect: true, tags: ['bookings'] } })
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const canViewAll = hasPermission(ctx.role, 'bookings');

      let date = input?.date;
      if (date === 'today') {
        date = now().toISOString().split('T')[0];
      }

      const bookingResults = await entityListBookings({
        tenantId,
        userId: ctx.userId,
        canViewAll,
        facility: input?.facility || null,
        date: date || null,
      });

      const transformed = bookingResults.map(row => {
        const b = row.Booking;
        const u = row.user;
        return {
          ...toBookingDTO(b),
          user: u
            ? {
                id: u.id,
                name: u.name,
              }
            : null,
        };
      });

      return toEnvelope(transformed.map(r => bookingDto.parse(r)));
    }),

  /**
   * Get a single booking by ID.
   * @tenant
   */
  getBooking: tenantProcedure
    .input(BookingIdInput)
    .meta({ openapi: { method: 'GET', path: '/bookings/get', protect: true, tags: ['bookings'] } })
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const booking = await getTenantBooking(input.id, tenantId);

      // Residents can only see their own bookings
      if (!hasPermission(ctx.role, 'bookings') && booking.userId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      const [user] = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(eq(users.id, booking.userId));

      return toEnvelope(
        bookingDto.parse({
          ...toBookingDTO(booking),
          user: user || null,
        })
      );
    }),

  /**
   * Create a new booking — authenticated user action.
   * @tenant
   */
  createBooking: tenantProcedure
    .use(rateLimitMiddleware({ windowMs: 60_000, maxRequests: 10 }))
    .input(CreateBookingInput)
    .meta({
      openapi: { method: 'POST', path: '/bookings/create', protect: true, tags: ['bookings'] },
    })
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const validation = await validateFacility(input.facility, tenantId);
      if (!validation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Invalid facility. Valid options: ${validation.validOptions.join(', ')}`,
        });
      }

      const conflictId = await checkBookingConflict({
        tenantId,
        facility: input.facility,
        date: new Date(input.date),
        startTime: input.startTime,
        endTime: input.endTime,
      });

      if (conflictId) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This time slot is no longer available. Please choose another time.',
        });
      }

      const [booking] = await entityCreateBooking({
        tenantId,
        userId: ctx.userId,
        facility: input.facility,
        date: new Date(input.date),
        startTime: input.startTime,
        endTime: input.endTime,
        purpose: input.purpose,
      });

      revalidateDashboard();

      emitEvent('booking.created', {
        tenantId,
        userId: ctx.userId,
        bookingId: booking.id,
        facility: input.facility,
      });

      return toEnvelope(bookingDto.parse(booking));
    }),

  /**
   * Cancel a booking — authenticated user action.
   * @tenant
   */
  cancelBooking: tenantProcedure
    .input(BookingIdInput)
    .meta({
      openapi: { method: 'POST', path: '/bookings/cancel', protect: true, tags: ['bookings'] },
    })
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const booking = await getTenantBooking(input.id, tenantId);

      // Residents can only cancel their own bookings
      if (!hasPermission(ctx.role, 'bookings') && booking.userId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      if (booking.status === 'CANCELLED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Booking is already cancelled' });
      }

      const [updated] = await db
        .update(bookings)
        .set({ status: 'CANCELLED', updatedAt: now() })
        .where(and(eq(bookings.id, input.id), eq(bookings.tenantId, tenantId)))
        .returning();

      revalidateDashboard();

      return toEnvelope({ success: true, booking: bookingDto.parse(updated) });
    }),
});
