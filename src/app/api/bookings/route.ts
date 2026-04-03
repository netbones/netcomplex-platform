import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { bookingSchema } from '@/lib/schemas';
import { revalidateDashboard } from '@/lib/revalidation';
import { apiLogger } from '@/lib/logger';

// Limit execution time to 8 seconds for booking operations
export const maxDuration = 8;

/**
 * Retrieves session and role from the request for API routes.
 * @param request - Incoming HTTP request
 * @returns Session data with user ID and role, or null if not authenticated
 */
async function getSessionAndRole(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  return {
    session,
    userId: session.user.id,
    role: user?.role || 'RESIDENT',
  };
}

/**
 * GET /api/bookings - List facility bookings
 * Residents see only their own, admins see all
 * @query facility - Filter by POOL, GYM, COMMUNITY_CENTER, TENNIS, BBQ_AREA
 * @query date - Filter bookings from this date onwards
 */
export async function GET(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canViewAll = hasPermission(authData.role, 'bookings');

  const { searchParams } = new URL(request.url);
  const facility = searchParams.get('facility');
  const date = searchParams.get('date');

  const where: Record<string, unknown> = canViewAll ? {} : { userId: authData.userId };
  if (facility) where.facility = facility;
  if (date) where.date = { gte: new Date(date) };

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
    orderBy: { date: 'asc' },
  });

  return NextResponse.json(bookings);
}

/**
 * POST /api/bookings - Create a new facility booking
 * @body userId - User ID (defaults to demo-user-id)
 * @body facility - Facility to book
 * @body date - Booking date
 * @body startTime - Start time
 * @body endTime - End time
 * @body purpose - Purpose of booking
 */
export async function POST(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Validate input with Zod schema
    const validationResult = bookingSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { facility, date, startTime, endTime, purpose } = validationResult.data;
    const userId = body.userId || authData.userId;

    const booking = await prisma.booking.create({
      data: {
        userId,
        facility,
        date: new Date(date),
        startTime,
        endTime,
        purpose,
      },
    });

    // Revalidate dashboard caches immediately when new booking is created
    revalidateDashboard();

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    apiLogger.error({ err: error, path: '/api/bookings' }, 'Booking creation error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
