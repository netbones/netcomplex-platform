import { z } from 'zod';
import {
  router,
  protectedProcedure,
  db,
  bookings,
  users,
  revalidateDashboard,
  emitEvent,
  now,
} from '@api/server';

import { TRPCError } from '@trpc/server';
import { hasPermission } from '@shared/lib';

import { eq, and } from 'drizzle-orm';

import {
  getTenantFacilities,
  validateFacility,
  listBookings as entityListBookings,
  createBooking as entityCreateBooking,
} from '@entities/booking/server';

import { toBookingDTO } from '@api/shared';

// ──────────────────────────────────────────
// Input schemas
// ──────────────────────────────────────────

const BookingIdInput = z.object({ id: z.string() });

const FacilityInput = z.object({ facility: z.string() });

const ListBookingsInput = z
  .object({
    facility: z.string().optional(),
    date: z.string().optional(),
  })
  .optional();

const CreateBookingInput = z.object({
  facility: z.string().min(1),
  date: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  purpose: z.string().max(500).optional().default(''),
});

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
  listFacilities: protectedProcedure
    .meta({
      openapi: { method: 'GET', path: '/bookings/facilities', protect: true, tags: ['bookings'] },
    })
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const facilities = await getTenantFacilities(tenantId);
      return facilities;
    }),

  getFacility: protectedProcedure
    .input(FacilityInput)
    .meta({
      openapi: { method: 'GET', path: '/bookings/facility', protect: true, tags: ['bookings'] },
    })
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const facilities = await getTenantFacilities(tenantId);
      const facility = facilities.find(f => f.value === input.facility);
      if (!facility) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Facility not found' });
      }

      return facility;
    }),

  listBookings: protectedProcedure
    .input(ListBookingsInput)
    .meta({ openapi: { method: 'GET', path: '/bookings/list', protect: true, tags: ['bookings'] } })
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const canViewAll = hasPermission(ctx.role, 'bookings');

      let date = input?.date;
      if (date === 'today') {
        date = now().toISOString().split('T')[0];
      }

      const bookingResults = await entityListBookings({
        tenantId,
        userId: ctx.userId!,
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

      return transformed;
    }),

  getBooking: protectedProcedure
    .input(BookingIdInput)
    .meta({ openapi: { method: 'GET', path: '/bookings/get', protect: true, tags: ['bookings'] } })
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const booking = await getTenantBooking(input.id, tenantId);

      // Residents can only see their own bookings
      if (!hasPermission(ctx.role, 'bookings') && booking.userId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      const [user] = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(eq(users.id, booking.userId));

      return {
        ...toBookingDTO(booking),
        user: user || null,
      };
    }),

  createBooking: protectedProcedure
    .input(CreateBookingInput)
    .meta({
      openapi: { method: 'POST', path: '/bookings/create', protect: true, tags: ['bookings'] },
    })
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const validation = await validateFacility(input.facility, tenantId);
      if (!validation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Invalid facility. Valid options: ${validation.validOptions.join(', ')}`,
        });
      }

      const [booking] = await entityCreateBooking({
        tenantId,
        userId: ctx.userId!,
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

      return booking;
    }),

  cancelBooking: protectedProcedure
    .input(BookingIdInput)
    .meta({
      openapi: { method: 'POST', path: '/bookings/cancel', protect: true, tags: ['bookings'] },
    })
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

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

      return updated;
    }),
});
