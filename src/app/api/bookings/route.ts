import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * GET /api/bookings - List facility bookings
 * @query facility - Filter by POOL, GYM, COMMUNITY_CENTER, TENNIS, BBQ_AREA
 * @query date - Filter bookings from this date onwards
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const facility = searchParams.get('facility');
  const date = searchParams.get('date');

  const where: Record<string, unknown> = {};
  if (facility) where.facility = facility;
  if (date) where.date = { gte: new Date(date) };

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      user: {
        select: { name: true, unit: true },
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
  const body = await request.json();

  const userId = body.userId || 'demo-user-id';

  const booking = await prisma.booking.create({
    data: {
      userId,
      facility: body.facility,
      date: new Date(body.date),
      startTime: body.startTime,
      endTime: body.endTime,
      purpose: body.purpose,
    },
  });

  return NextResponse.json(booking, { status: 201 });
}
