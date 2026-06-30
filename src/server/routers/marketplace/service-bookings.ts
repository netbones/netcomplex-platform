import { z } from 'zod';
import {
  tenantProcedure,
  db,
  serviceBookings,
  communityServiceListings,
  users,
  now,
} from '@api/server';
import { toEnvelope } from '@api/server';
import { serviceBookingDto } from '@server/dto';
import { TRPCError } from '@trpc/server';
import { eq, and, or, desc, ne, sql } from 'drizzle-orm';
import {
  calculatePlatformFee,
  serviceBookingSchema,
  getProviderRecordForUser,
} from '@entities/marketplace/server';
import { createId } from '@shared/lib/id';

const ListServiceBookingsInput = z
  .object({
    role: z.enum(['resident', 'provider']).default('resident'),
    limit: z.number().int().positive().default(20),
    offset: z.number().int().min(0).default(0),
  })
  .default({ role: 'resident', limit: 20, offset: 0 });

const BookingIdParam = z.object({ bookingId: z.string().min(1) });

const CancelBookingInput = z.object({
  bookingId: z.string().min(1),
  status: z.literal('CANCELLED'),
});

export const serviceBookingProcedures = {
  listServiceBookings: tenantProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/marketplace/bookings',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .input(ListServiceBookingsInput)
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const conditions = [eq(serviceBookings.tenantId, tenantId)];

      if (input.role === 'provider') {
        const userEmail = ctx.session?.user?.email ?? '';
        const provider = await getProviderRecordForUser(tenantId, userEmail);
        if (!provider) {
          return toEnvelope({
            bookings: [],
            pagination: { total: 0, limit: input.limit, offset: input.offset, hasMore: false },
          });
        }
        conditions.push(eq(serviceBookings.providerId, provider.id));
      } else {
        conditions.push(eq(serviceBookings.userId, ctx.userId));
      }

      const bookingsData = await db
        .select({
          id: serviceBookings.id,
          tenantId: serviceBookings.tenantId,
          listingId: serviceBookings.listingId,
          providerId: serviceBookings.providerId,
          userId: serviceBookings.userId,
          date: serviceBookings.date,
          startTime: serviceBookings.startTime,
          endTime: serviceBookings.endTime,
          price: serviceBookings.price,
          platformFee: serviceBookings.platformFee,
          paymentStatus: serviceBookings.paymentStatus,
          status: serviceBookings.status,
          createdAt: serviceBookings.createdAt,
          updatedAt: serviceBookings.updatedAt,
          listingTitle: communityServiceListings.title,
          listingCategory: communityServiceListings.category,
          userName: users.name,
          userEmail: users.email,
        })
        .from(serviceBookings)
        .leftJoin(
          communityServiceListings,
          eq(serviceBookings.listingId, communityServiceListings.id)
        )
        .leftJoin(users, eq(serviceBookings.userId, users.id))
        .where(and(...conditions))
        .orderBy(desc(serviceBookings.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(serviceBookings)
        .where(and(...conditions));

      return toEnvelope(bookingsData.map(b => serviceBookingDto.parse(b)));
    }),

  createServiceBooking: tenantProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/marketplace/bookings',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .input(serviceBookingSchema)
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const { listingId, date, startTime, endTime } = input;

      const [listing] = await db
        .select({
          id: communityServiceListings.id,
          providerId: communityServiceListings.providerId,
          price: communityServiceListings.price,
          priceType: communityServiceListings.priceType,
          isPublished: communityServiceListings.isPublished,
          tenantId: communityServiceListings.tenantId,
        })
        .from(communityServiceListings)
        .where(
          and(
            eq(communityServiceListings.id, listingId),
            eq(communityServiceListings.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!listing || !listing.isPublished) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Service listing not found' });
      }

      const providerId = listing.providerId;

      if (providerId === ctx.userId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot book your own service' });
      }

      const [conflicting] = await db
        .select({ id: serviceBookings.id })
        .from(serviceBookings)
        .where(
          and(
            eq(serviceBookings.listingId, listingId),
            eq(serviceBookings.date, new Date(date)),
            eq(serviceBookings.startTime, startTime),
            ne(serviceBookings.status, 'CANCELLED')
          )
        )
        .limit(1);

      if (conflicting) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This time slot is no longer available. Please choose another time.',
        });
      }

      const bookingPrice = listing.price ? Number(listing.price) : 0;
      const platformFeeAmount = await calculatePlatformFee(providerId, bookingPrice);

      const bookingId = createId();
      const ts = now();

      await db.insert(serviceBookings).values({
        id: bookingId,
        tenantId,
        listingId,
        providerId,
        userId: ctx.userId,
        date: new Date(date),
        startTime,
        endTime,
        price: String(bookingPrice),
        platformFee: String(platformFeeAmount),
        paymentStatus: 'PENDING',
        status: 'PENDING_CONFIRMATION',
        createdAt: ts,
        updatedAt: ts,
      });

      const [created] = await db
        .select()
        .from(serviceBookings)
        .where(eq(serviceBookings.id, bookingId))
        .limit(1);

      return toEnvelope(serviceBookingDto.parse(created));
    }),

  getServiceBooking: tenantProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/marketplace/bookings/{bookingId}',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .input(BookingIdParam)
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const [booking] = await db
        .select()
        .from(serviceBookings)
        .where(
          and(
            eq(serviceBookings.id, input.bookingId),
            eq(serviceBookings.tenantId, tenantId),
            or(eq(serviceBookings.userId, ctx.userId), eq(serviceBookings.providerId, ctx.userId))
          )
        )
        .limit(1);

      if (!booking) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });
      }

      return toEnvelope(serviceBookingDto.parse(booking));
    }),

  cancelServiceBooking: tenantProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/marketplace/bookings/{bookingId}/cancel',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .input(CancelBookingInput)
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const [booking] = await db
        .select()
        .from(serviceBookings)
        .where(and(eq(serviceBookings.id, input.bookingId), eq(serviceBookings.tenantId, tenantId)))
        .limit(1);

      if (!booking) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });
      }

      const allowedTransitions = ['PENDING_CONFIRMATION', 'CONFIRMED'] as const;
      if (!allowedTransitions.includes(booking.status as (typeof allowedTransitions)[number])) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot cancel booking in status ${booking.status}`,
        });
      }

      const isBookingUser = booking.userId === ctx.userId;
      const provider = await getProviderRecordForUser(tenantId, ctx.session?.user?.email ?? '');
      const isProvider = provider?.id === booking.providerId;

      if (!isBookingUser && !isProvider) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized to cancel this booking',
        });
      }

      await db
        .update(serviceBookings)
        .set({ status: 'CANCELLED', updatedAt: now() })
        .where(
          and(eq(serviceBookings.id, input.bookingId), eq(serviceBookings.tenantId, tenantId))
        );

      const [updated] = await db
        .select()
        .from(serviceBookings)
        .where(eq(serviceBookings.id, input.bookingId))
        .limit(1);

      return toEnvelope(serviceBookingDto.parse(updated));
    }),
};
