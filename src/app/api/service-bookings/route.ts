import { NextRequest } from 'next/server';
import {
  auth,
  db,
  serviceBookings,
  communityServiceListings,
  users,
  apiError,
  apiInternalError,
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
  apiForbidden,
  apiConflict,
  apiValidationError,
  now,
  rateLimitByUser,
} from '@api/server';

import { eq, desc, and, sql, ne } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';
import {
  serviceBookingSchema,
  calculatePlatformFee,
  getProviderRecordForUser,
} from '@entities/marketplace/server';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

type BookingStatus = (typeof serviceBookings.status.enumValues)[number];

// Allowed status transitions
const VALID_TRANSITIONS: Record<string, BookingStatus[]> = {
  PENDING_CONFIRMATION: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
};

/**
 * GET /api/service-bookings — List bookings by role
 *
 * Query params:
 *   role=resident — filter by session user's bookings (default)
 *   role=provider — filter by provider's bookings
 *   limit / offset — pagination
 * @deprecated Use trpc.marketplace.listServiceBookings instead.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || 'resident';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { tenantId } = await withTenant();

    const conditions = [eq(serviceBookings.tenantId, tenantId)];

    if (role === 'provider') {
      // Fetch provider record for session user
      const provider = await getProviderRecordForUser(tenantId, session.user.email);
      if (!provider) {
        // User is not a provider — return empty result
        return apiSuccess({
          bookings: [],
          pagination: { total: 0, limit, offset, hasMore: false },
        });
      }
      conditions.push(eq(serviceBookings.providerId, provider.id));
    } else {
      // Resident: filter by userId
      conditions.push(eq(serviceBookings.userId, session.user.id));
    }

    const bookings = await db
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
      .limit(limit)
      .offset(offset);

    // Pagination total
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(serviceBookings)
      .where(and(...conditions));

    const total = totalResult?.count || 0;

    return apiSuccess({
      bookings,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logError(
      { component: 'service-bookings-api', operation: 'GET' },
      'Service bookings fetch error',
      error
    );
    return apiInternalError();
  }
}

/**
 * POST /api/service-bookings — Create a new booking
 *
 * Per D-11: book-first-then-pay flow
 * Booking created with status=PENDING_CONFIRMATION, paymentStatus=PENDING
 * Per T-50-14: userId from session, providerId from listing (not request body)
 * Per T-50-15: conflict check on (listingId, date, startTime) where status != CANCELLED
 * @deprecated Use trpc.marketplace.createServiceBooking instead.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const rateLimit = await rateLimitByUser(session.user.id, {
      windowMs: 60_000,
      maxRequests: 10,
    });
    if (rateLimit) return rateLimit;

    const body = await request.json();

    // Validate body with Zod schema
    const parsed = serviceBookingSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error.errors[0]?.message || 'Invalid booking data');
    }

    const { listingId, date, startTime, endTime } = parsed.data;

    // Enforce tenant isolation
    const { tenantId } = await withTenant();

    // Fetch listing to verify it exists and is published
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
      return apiNotFound('Service listing not found');
    }

    // T-50-14: providerId from listing, not request body
    const providerId = listing.providerId;

    // Prevent self-bookings
    if (providerId === session.user.id) {
      return apiError('VALIDATION_ERROR', 'Cannot book your own service', 400);
    }

    // T-50-15: Time-slot conflict check
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
      return apiConflict('This time slot is no longer available. Please choose another time.');
    }

    // Calculate platform fee
    const bookingPrice = listing.price ? Number(listing.price) : 0;
    const platformFeeAmount = await calculatePlatformFee(providerId, bookingPrice);

    // Create booking
    const bookingId = createId();
    const ts = now();

    await db.insert(serviceBookings).values({
      id: bookingId,
      tenantId,
      listingId,
      providerId,
      userId: session.user.id,
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

    // Fetch created booking with joins
    const [created] = await db
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
      })
      .from(serviceBookings)
      .where(eq(serviceBookings.id, bookingId))
      .limit(1);

    return apiSuccess({ success: true, booking: created });
  } catch (error) {
    logError(
      { component: 'service-bookings-api', operation: 'CREATE' },
      'Service booking creation error',
      error
    );
    return apiInternalError();
  }
}

/**
 * PATCH /api/service-bookings — Update booking status
 *
 * Per T-50-17: provider can CONFIRM/COMPLETE; either party can CANCEL
 * Validates status transitions server-side
 * @deprecated Use trpc.marketplace.cancelServiceBooking instead.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const rateLimit = await rateLimitByUser(session.user.id, {
      windowMs: 60_000,
      maxRequests: 10,
    });
    if (rateLimit) return rateLimit;

    const body = await request.json();
    const { bookingId, status } = body;

    if (!bookingId || !status) {
      return apiValidationError('bookingId and status are required');
    }

    const { tenantId } = await withTenant();

    // Fetch booking
    const [booking] = await db
      .select()
      .from(serviceBookings)
      .where(and(eq(serviceBookings.id, bookingId), eq(serviceBookings.tenantId, tenantId)))
      .limit(1);

    if (!booking) {
      return apiNotFound('Booking not found');
    }

    // T-50-17: Enforce status transitions server-side
    const allowedTransitions = VALID_TRANSITIONS[booking.status] || [];
    if (!allowedTransitions.includes(status as BookingStatus)) {
      return apiValidationError(`Invalid status transition: ${booking.status} → ${status}`);
    }

    // Check provider role for CONFIRM/COMPLETE
    if (status === 'CONFIRMED' || status === 'COMPLETED') {
      const provider = await getProviderRecordForUser(tenantId, session.user.email);
      if (!provider || provider.id !== booking.providerId) {
        return apiForbidden('Only the provider can confirm or complete a booking');
      }
    }

    // CANCEL: either party can cancel (but must be the booking user or provider)
    if (status === 'CANCELLED') {
      const isBookingUser = booking.userId === session.user.id;
      const provider = await getProviderRecordForUser(tenantId, session.user.email);
      const isProvider = provider?.id === booking.providerId;
      if (!isBookingUser && !isProvider) {
        return apiForbidden('Not authorized to cancel this booking');
      }
    }

    const ts = now();
    await db
      .update(serviceBookings)
      .set({
        status: status as BookingStatus,
        updatedAt: ts,
      })
      .where(and(eq(serviceBookings.id, bookingId), eq(serviceBookings.tenantId, tenantId)));

    const [updated] = await db
      .select()
      .from(serviceBookings)
      .where(eq(serviceBookings.id, bookingId))
      .limit(1);

    return apiSuccess({ success: true, booking: updated });
  } catch (error) {
    logError(
      { component: 'service-bookings-api', operation: 'PATCH' },
      'Service booking status update error',
      error
    );
    return apiInternalError();
  }
}
