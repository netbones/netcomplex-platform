import { auth } from '@/lib/auth';
import { hasPermission, Permission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

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
 * GET /api/users - List users with optional filters
 * @query search - Search by name or email
 * @query street - Filter by street
 * @query interest - Filter by interest
 * @query residentType - Filter by OWNER or RENTER
 * @query role - Filter by role
 * @query page - Page number (default 1)
 * @query limit - Items per page (max 50)
 */
export async function GET(request: Request) {
  const authData = await getSessionAndRole(request);
  const isAuthenticated = authData !== null;
  const canViewAll = isAuthenticated && hasPermission(authData.role, 'directory');

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const street = searchParams.get('street') || '';
  const interest = searchParams.get('interest') || '';
  const residentType = searchParams.get('residentType') || '';
  const role = searchParams.get('role') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '6'), 50);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = canViewAll ? {} : { isPublic: true };

  // Apply resident type filtering with explicit identity model
  // Logic: A user can have multiple identities (owner + renter)
  // - OWNER: has StandardSeat with isPrimaryOwner OR SoloSeat
  // - RENTER: has Profile with residencyType='RENTER'
  if (residentType === 'OWNER') {
    // Owners: have standardSeats with isPrimaryOwner OR soloSeat
    where.OR = [
      { standardSeats: { some: { isPrimaryOwner: true } } },
      { soloSeat: { isNot: null } },
    ];
  } else if (residentType === 'RENTER') {
    // Renters: have profiles with residencyType='RENTER'
    // Exclude users who are owners (have primary standard seats)
    where.AND = [
      { profiles: { some: { status: 'ACTIVE', residencyType: 'RENTER' } } },
      { NOT: { standardSeats: { some: { isPrimaryOwner: true } } } },
    ];
  } else {
    // Default: show all actual residents
    where.OR = [
      { standardSeats: { some: {} } },
      { soloSeat: { isNot: null } },
      { profiles: { some: { status: 'ACTIVE' } } },
    ];
  }

  if (search) {
    // Handle search with different filter types
    if (where.AND && Array.isArray(where.AND)) {
      // For specific resident types (OWNER/RENTER) with AND conditions
      where.AND.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      });
    } else {
      // For default case with OR conditions
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
  }

  if (street) {
    // Query Household via StandardSeat join
    where.standardSeats = { some: { household: { street } } };
  }

  if (interest) {
    where.interests = { has: interest };
  }

  if (role) {
    where.role = role;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        interests: true,
        avatar: true,
        isPublic: true,
        isActive: true,
        role: true,
        standardSeats: {
          select: {
            household: { select: { id: true, street: true, unit: true, homeImage: true } },
            isPrimaryOwner: true,
          },
          take: 1,
        },
        soloSeat: {
          select: {
            household: { select: { id: true, street: true, unit: true, homeImage: true } },
            seatType: true,
          },
        },
        profiles: {
          where: { status: 'ACTIVE' },
          select: {
            household: {
              select: {
                id: true,
                street: true,
                unit: true,
                homeImage: true,
              },
            },
            occupantType: true,
            residencyType: true,
            rentalImage: true,
            occupantImage: true,
            landlord: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, limit });
}

/**
 * POST /api/users - Create a new user (admin only)
 * @body email - User email
 * @body name - User name
 * @body street - Street address
 * @body unit - Unit number
 * @body phone - Phone number
 * @body interests - Array of interests
 * @body isPublic - Whether profile is public
 */
export async function POST(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(authData.role, 'users')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();

  const user = await prisma.user.create({
    data: {
      email: body.email,
      name: body.name,
      phone: body.phone,
      interests: body.interests || [],
      isPublic: body.isPublic ?? true,
    },
  });

  return NextResponse.json(user, { status: 201 });
}
