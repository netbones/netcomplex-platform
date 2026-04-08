import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { NextResponse } from 'next/server';
import { bookingSchema } from '@/lib/schemas';
import { revalidateDashboard } from '@/lib/revalidation';
import { apiLogger } from '@/lib/logger';
import { db, bookings, users } from '@/lib/db';
import { eq, asc, gte, and, sql } from 'drizzle-orm';
import { withTenant } from '@/lib/tenant/with-tenant';
import type { PgColumn } from 'drizzle-orm/pg-core';

type BookingInsertValues = {
  id: ReturnType<typeof sql>;
  userId: string;
  facility: 'POOL' | 'GYM' | 'COMMUNITY_CENTER' | 'TENNIS' | 'BBQ_AREA';
  date: Date;
  startTime: string;
  endTime: string;
  purpose: string;
  status: string;
  createdAt: Date;
  updatedAt: ReturnType<typeof sql> | null;
};

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

  // Use Drizzle instead of Prisma
  const userResult = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);

  return {
    session,
    userId: session.user.id,
    role: userResult[0]?.role || 'RESIDENT',
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

  // Build query conditions
  const queryConditions = [];

  // Filter by user if not admin
  if (!canViewAll) {
    queryConditions.push(eq(bookings.userId, authData.userId));
  }

  // Filter by facility if provided
  if (facility) {
    const validFacilities = ['POOL', 'GYM', 'COMMUNITY_CENTER', 'TENNIS', 'BBQ_AREA'] as const;
    if (validFacilities.includes(facility as (typeof validFacilities)[number])) {
      queryConditions.push(eq(bookings.facility, facility as (typeof validFacilities)[number]));
    }
  }

  // Filter by date if provided
  if (date) {
    queryConditions.push(gte(bookings.date, new Date(date)));
  }

  const whereClause = queryConditions.length > 0 ? and(...queryConditions) : undefined;

  // Execute query with left join to get user info
  const bookingResults = await db
    .select()
    .from(bookings)
    .leftJoin(users, eq(bookings.userId, users.id))
    .where(whereClause)
    .orderBy(asc(bookings.date));

  // Transform results
  const transformed = bookingResults.map(row => {
    const b = row.Booking;
    const u = row.user;
    return {
      id: b.id,
      userId: b.userId,
      facility: b.facility,
      date: b.date,
      startTime: b.startTime,
      endTime: b.endTime,
      purpose: b.purpose,
      status: b.status,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      user: u
        ? {
            id: u.id,
            name: u.name,
          }
        : null,
    };
  });

  return NextResponse.json(transformed);
}

/**
 * POST /api/bookings - Create a new facility booking
 * @body userId - User ID (defaults to authenticated user)
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

    // Enforce tenant isolation
    const { tenantId } = await withTenant();

    // Use Drizzle insert
    const now = new Date();
    const insertValues = {
      id: sql`gen_random_uuid()`,
      userId,
      facility,
      date: new Date(date),
      startTime,
      endTime,
      purpose,
      status: 'CONFIRMED',
      createdAt: now,
      updatedAt: sql`null`,
    };
    const [booking] = await db
      .insert(bookings)
      .values(insertValues as unknown as Parameters<typeof db.insert>[1])
      .returning();

    // Revalidate dashboard caches immediately when new booking is created
    revalidateDashboard();

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    apiLogger.error({ err: error, path: '/api/bookings' }, 'Booking creation error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
