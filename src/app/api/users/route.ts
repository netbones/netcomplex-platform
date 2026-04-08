import { auth } from '@/lib/auth';
import { hasPermission, Permission } from '@/lib/permissions';
import { db, users, profiles, standardSeats, soloSeats, households } from '@/lib/db';
import { NextResponse } from 'next/server';
import { eq, and, or, asc, desc, like, ilike, sql, count } from 'drizzle-orm';
import { withTenant } from '@/lib/tenant/with-tenant';

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

  const userResult = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return {
    session,
    userId: session.user.id,
    role: userResult[0]?.role || 'RESIDENT',
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
  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const authData = await getSessionAndRole(request);
  const isAuthenticated = authData !== null;
  const canViewAll = isAuthenticated && hasPermission(authData.role, 'directory');

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const street = searchParams.get('street') || '';
  const residentType = searchParams.get('residentType') || '';
  const role = searchParams.get('role') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '6'), 50);
  const skip = (page - 1) * limit;

  // Build base conditions - always filter by tenant
  const conditions: any[] = [eq(users.tenantId, tenantId)];

  if (!canViewAll) {
    conditions.push(eq(users.isPublic, true));
  }

  if (search) {
    conditions.push(or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`)));
  }

  if (role) {
    conditions.push(eq(users.role, role as any));
  }

  // Apply resident type filtering
  // This requires a more complex query with joins
  let userIds: string[] = [];

  if (residentType === 'OWNER') {
    // Owners: have standardSeats with isPrimaryOwner OR soloSeat
    const ownerResults = await db
      .select({ userId: standardSeats.userId })
      .from(standardSeats)
      .where(and(eq(standardSeats.tenantId, tenantId), eq(standardSeats.isPrimaryOwner, true)));

    const soloSeatResults = await db
      .select({ userId: soloSeats.userId })
      .from(soloSeats)
      .where(and(eq(soloSeats.tenantId, tenantId), sql`${soloSeats.userId} IS NOT NULL`));

    userIds = [
      ...new Set([
        ...ownerResults.map(r => r.userId).filter((id): id is string => id !== null),
        ...soloSeatResults.map(r => r.userId).filter((id): id is string => id !== null),
      ]),
    ];
  } else if (residentType === 'RENTER') {
    // Renters: have profiles with residencyType='RENTER'
    const renterResults = await db
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(
        and(
          eq(profiles.tenantId, tenantId),
          eq(profiles.status, 'ACTIVE' as any),
          eq(profiles.residencyType, 'RENTER' as any)
        )
      );
    userIds = renterResults.map(r => r.userId).filter((id): id is string => id !== null);
  } else {
    // Default: show all actual residents
    const ownerResults = await db
      .select({ userId: standardSeats.userId })
      .from(standardSeats)
      .where(eq(standardSeats.tenantId, tenantId));

    const soloSeatResults = await db
      .select({ userId: soloSeats.userId })
      .from(soloSeats)
      .where(and(eq(soloSeats.tenantId, tenantId), sql`${soloSeats.userId} IS NOT NULL`));

    const activeProfileResults = await db
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(and(eq(profiles.tenantId, tenantId), eq(profiles.status, 'ACTIVE' as any)));

    userIds = [
      ...new Set([
        ...ownerResults.map(r => r.userId).filter((id): id is string => id !== null),
        ...soloSeatResults.map(r => r.userId).filter((id): id is string => id !== null),
        ...activeProfileResults.map(r => r.userId).filter((id): id is string => id !== null),
      ]),
    ];
  }

  if (userIds.length > 0) {
    conditions.push(
      sql`${users.id} IN (${sql.join(
        userIds.map(id => sql`${id}`),
        sql`, `
      )})`
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get users with pagination
  const userResults = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      interests: users.interests,
      avatar: users.avatar,
      isPublic: users.isPublic,
      isActive: users.isActive,
      role: users.role,
    })
    .from(users)
    .where(whereClause)
    .orderBy(asc(users.name))
    .limit(limit)
    .offset(skip);

  // Get total count
  const totalResult = await db.select({ total: count() }).from(users).where(whereClause);

  const total = totalResult[0]?.total || 0;

  // Now fetch related data for each user
  const usersWithRelations = await Promise.all(
    userResults.map(async user => {
      // Get standardSeats with household
      const seats = await db
        .select({
          household: {
            id: households.id,
            street: households.street,
            unit: households.unit,
            homeImage: households.homeImage,
          },
          isPrimaryOwner: standardSeats.isPrimaryOwner,
        })
        .from(standardSeats)
        .innerJoin(households, eq(standardSeats.householdId, households.id))
        .where(and(eq(standardSeats.tenantId, tenantId), eq(standardSeats.userId, user.id)))
        .limit(1);

      // Get soloSeat with household
      const soloSeat = await db
        .select({
          household: {
            id: households.id,
            street: households.street,
            unit: households.unit,
            homeImage: households.homeImage,
          },
          seatType: soloSeats.seatType,
        })
        .from(soloSeats)
        .leftJoin(households, eq(soloSeats.householdId, households.id))
        .where(and(eq(soloSeats.tenantId, tenantId), eq(soloSeats.userId, user.id)))
        .limit(1);

      // Get active profiles with household and landlord
      const userProfiles = await db
        .select({
          household: {
            id: households.id,
            street: households.street,
            unit: households.unit,
            homeImage: households.homeImage,
          },
          occupantType: profiles.occupantType,
          residencyType: profiles.residencyType,
          rentalImage: profiles.rentalImage,
          occupantImage: profiles.occupantImage,
          landlord: {
            id: users.id,
            name: users.name,
            avatar: users.avatar,
          },
        })
        .from(profiles)
        .leftJoin(households, eq(profiles.householdId, households.id))
        .leftJoin(users, eq(profiles.landlordId, users.id))
        .where(
          and(
            eq(profiles.tenantId, tenantId),
            eq(profiles.userId, user.id),
            eq(profiles.status, 'ACTIVE' as any)
          )
        )
        .limit(1);

      return {
        ...user,
        standardSeats: seats,
        soloSeat: soloSeat[0] || null,
        profiles: userProfiles,
      };
    })
  );

  // Apply street filter if specified
  let filteredUsers = usersWithRelations;
  if (street) {
    filteredUsers = usersWithRelations.filter(user => {
      const hasStreet =
        user.standardSeats.some(s => s.household?.street === street) ||
        user.soloSeat?.household?.street === street ||
        user.profiles.some(p => p.household?.street === street);
      return hasStreet;
    });
  }

  return NextResponse.json({ users: filteredUsers, total, page, limit });
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
  const now = new Date();

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const newUser = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      tenantId,
      email: body.email,
      name: body.name,
      phone: body.phone || null,
      interests: body.interests || [],
      isPublic: body.isPublic ?? true,
      role: 'RESIDENT',
      isActive: true,
      showEmail: true,
      showPhone: true,
      emailVerified: false,
      twoFactorEnabled: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .then(rows => rows[0]);

  return NextResponse.json(newUser, { status: 201 });
}
