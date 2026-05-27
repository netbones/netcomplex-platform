import { auth } from '@api/auth';
import { hasPermission } from '@entities/tenant/api/permissions';
import {
  db,
  users,
  profiles,
  standardSeats,
  soloSeats,
  premiumSeats,
  properties,
  households,
} from '@api/db';
import { NextResponse } from 'next/server';
import { eq, and, or, asc, ilike, count, ne, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/api/with-tenant';

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
 */
export async function GET(request: Request) {
  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const authData = await getSessionAndRole(request);
  const isAuthenticated = authData !== null;
  const canViewAll = isAuthenticated && hasPermission(authData.role, 'directory');

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const role = searchParams.get('role') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '6'), 50);
  const skip = (page - 1) * limit;

  // Build base conditions - always filter by tenant and active users only
  // Exclude AGENT users (appear in Services tab)
  // Only include users with at least one seat or profile (filter out service accounts)
  const conditions: SQL<unknown>[] = [
    eq(users.tenantId, tenantId),
    eq(users.isActive, true),
    ne(users.role, 'AGENT'),
    sql`(
      EXISTS (SELECT 1 FROM "standardSeat" WHERE "userId" = ${users.id})
      OR EXISTS (SELECT 1 FROM "soloSeat" WHERE "userId" = ${users.id})
      OR EXISTS (SELECT 1 FROM "profile" WHERE "userId" = ${users.id} AND "status" = 'ACTIVE')
    )`,
  ];

  if (!canViewAll) {
    conditions.push(eq(users.isPublic, true));
  }

  if (search) {
    const searchCondition = or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`));
    if (searchCondition) conditions.push(searchCondition);
  }

  if (role) {
    const validRoles = ['ADMIN', 'BOARD', 'COMMITTEE', 'RESIDENT'] as const;
    type ValidRole = (typeof validRoles)[number];
    if ((validRoles as readonly string[]).includes(role)) {
      conditions.push(eq(users.role, role as ValidRole));
    }
  }

  // Resident type and street filtering would require complex joins
  // For now, let's get the base user list and then filter relations
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
      profileSlug: users.profileSlug,
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
      // Get standardSeats with property

      const seats = await db
        .select({
          property: {
            id: properties.id,
            street: properties.street,
            unit: properties.unit,
            homeImage: properties.homeImage,
          },
          isPrimaryOwner: standardSeats.isPrimaryOwner,
          platformAddress: standardSeats.platformAddress,
        })
        .from(standardSeats)
        .innerJoin(properties, eq(standardSeats.propertyId, properties.id))
        .where(eq(standardSeats.userId, user.id));

      // Get soloSeat with property

      const soloSeat = await db
        .select({
          property: {
            id: properties.id,
            street: properties.street,
            unit: properties.unit,
            homeImage: properties.homeImage,
          },
          seatType: soloSeats.seatType,
          platformAddress: soloSeats.platformAddress,
        })
        .from(soloSeats)
        .leftJoin(properties, eq(soloSeats.propertyId, properties.id))
        .where(eq(soloSeats.userId, user.id))
        .limit(1);

      // Get premiumSeat

      const premiumSeat = await db
        .select({
          id: premiumSeats.id,
          platformAddress: premiumSeats.platformAddress,
          portfolioName: premiumSeats.portfolioName,
          tier: premiumSeats.tier,
          isActive: premiumSeats.isActive,
        })
        .from(premiumSeats)
        .where(eq(premiumSeats.userId, user.id))
        .limit(1);

      // Get active profiles with household, property, and landlord

      const userProfiles = await db
        .select({
          householdId: profiles.householdId,
          occupantType: profiles.occupantType,
          residencyType: profiles.residencyType,
          rentalImage: profiles.rentalImage,
          occupantImage: profiles.occupantImage,
          property: {
            id: properties.id,
            street: properties.street,
            unit: properties.unit,
            homeImage: properties.homeImage,
          },
          landlord: {
            id: users.id,
            name: users.name,
            avatar: users.avatar,
          },
        })
        .from(profiles)
        .innerJoin(households, eq(profiles.householdId, households.id))
        .innerJoin(properties, eq(households.propertyId, properties.id))
        .leftJoin(users, eq(profiles.landlordId, users.id))
        .where(
          and(
            eq(profiles.tenantId, tenantId),
            eq(profiles.userId, user.id),
            eq(profiles.status, 'ACTIVE' as const)
          )
        );

      return {
        ...user,
        standardSeats: seats,
        soloSeat: soloSeat[0] || null,
        premiumSeat: premiumSeat[0] || null,
        profiles: userProfiles,
      };
    })
  );

  return NextResponse.json({ users: usersWithRelations, total, page, limit });
}

/**
 * POST /api/users - Create a new user (admin only)
 */
export async function POST(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData || !hasPermission(authData.role, 'users')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const now = new Date();
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
