import {
  db,
  users,
  standardSeats,
  soloSeats,
  premiumSeats,
  properties,
  contents,
  profiles,
  households,
} from '@api/db';
import { eq, and, desc } from 'drizzle-orm';
import { apiSuccess, apiNotFound, apiUnauthorized } from '@api/api-response';
import { withTenant } from '@entities/tenant/api/with-tenant';
import { requireAssistScope } from '@entities/tenant/api/assist-scope-guard';
import { throwIfSuspended } from '@api/auth-utils';
import { getLocalizedValue, getLocalizedContent, defaultLanguage } from '@shared/lib';
import { writeAuditLog } from '@api/audit-log';
import { auth } from '@api/auth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenantId } = await withTenant();

  // Determine if id is a UUID or a profile slug/string ID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // Build the where clause: match by UUID id, or by id/profileSlug for string identifiers
  const whereClause = isUUID
    ? and(eq(users.id, id), eq(users.tenantId, tenantId))
    : and(
        eq(users.tenantId, tenantId),
        eq(users.id, id) // Try matching by id first (e.g., 'user-anna-patel')
      );

  // Get user data (filter by tenantId)
  const userResult = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      interests: users.interests,
      avatar: users.avatar,
      image: users.image,
      books: users.books,
      dashboardLayout: users.dashboardLayout,
      isPublic: users.isPublic,
      showEmail: users.showEmail,
      showPhone: users.showPhone,
      role: users.role,
      createdAt: users.createdAt,
      profileSlug: users.profileSlug,
    })
    .from(users)
    .where(whereClause)
    .limit(1);

  // If not found by id, try profileSlug
  let user = userResult[0] as (typeof userResult)[number] | undefined;
  if (!user && !isUUID) {
    const slugResult = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        interests: users.interests,
        avatar: users.avatar,
        image: users.image,
        books: users.books,
        dashboardLayout: users.dashboardLayout,
        isPublic: users.isPublic,
        showEmail: users.showEmail,
        showPhone: users.showPhone,
        role: users.role,
        createdAt: users.createdAt,
        profileSlug: users.profileSlug,
      })
      .from(users)
      .where(and(eq(users.profileSlug, id), eq(users.tenantId, tenantId)))
      .limit(1);

    user = slugResult[0];
  }

  if (!user) {
    return apiNotFound('User not found');
  }

  const userId = user.id;

  // Get standardSeats with property
  const seats = await db
    .select({
      household: {
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
    .where(eq(standardSeats.userId, userId));

  // Get soloSeat with property
  const soloSeatsResult = await db
    .select({
      seatType: soloSeats.seatType,
      household: {
        id: properties.id,
        street: properties.street,
        unit: properties.unit,
        homeImage: properties.homeImage,
      },
      platformAddress: soloSeats.platformAddress,
    })
    .from(soloSeats)
    .leftJoin(properties, eq(soloSeats.propertyId, properties.id))
    .where(eq(soloSeats.userId, userId));

  // Get premiumSeat
  const premiumSeatResult = await db
    .select({
      id: premiumSeats.id,
      platformAddress: premiumSeats.platformAddress,
      portfolioName: premiumSeats.portfolioName,
      tier: premiumSeats.tier,
      isActive: premiumSeats.isActive,
    })
    .from(premiumSeats)
    .where(eq(premiumSeats.userId, userId))
    .limit(1);

  // Get profile-based address (for family members without seats)
  const profileResult = await db
    .select({
      property: {
        id: properties.id,
        street: properties.street,
        unit: properties.unit,
        homeImage: properties.homeImage,
        platformAddress: properties.platformAddress,
      },
    })
    .from(profiles)
    .innerJoin(households, eq(profiles.householdId, households.id))
    .innerJoin(properties, eq(households.propertyId, properties.id))
    .where(and(eq(profiles.userId, userId), eq(profiles.status, 'ACTIVE')))
    .limit(1);

  // Get published contents
  const userContents = await db
    .select({
      id: contents.id,
      title: contents.title,
      excerpt: contents.excerpt,
      content: contents.content,
      category: contents.category,
      tags: contents.tags,
      publishedAt: contents.publishedAt,
    })
    .from(contents)
    .where(and(eq(contents.authorId, userId), eq(contents.published, true)))
    .orderBy(desc(contents.publishedAt))
    .limit(10);

  // Transform localized fields to strings/objects
  const localizedContents = userContents.map(item => ({
    ...item,
    title: getLocalizedValue(item.title as Record<string, unknown>, defaultLanguage) || '',
    excerpt: getLocalizedValue(item.excerpt as Record<string, unknown>, defaultLanguage),
    content: getLocalizedContent(item.content as Record<string, unknown>, defaultLanguage) || '',
  }));

  return apiSuccess({
    ...user,
    standardSeats: seats,
    soloSeats: soloSeatsResult,
    premiumSeat: premiumSeatResult[0] || null,
    profileProperty: profileResult[0]?.property || null,
    contents: localizedContents,
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // AssistSession scope guard: metadata-scoped staff can only read, not modify content/users/settings
  const scopeError = await requireAssistScope(request, 'full');
  if (scopeError) return scopeError;

  // Authentication: verify session for role change audit logging
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return apiUnauthorized();
  }

  // Suspension guard: suspended users cannot modify their own profile
  const suspensionGuard = await throwIfSuspended(request);
  if (suspensionGuard) return suspensionGuard;

  const { tenantId } = await withTenant();
  const body = await request.json();

  const updateData: Record<string, unknown> = {};

  if (body.name !== undefined) {
    updateData.name = String(body.name);
  }
  if (body.email !== undefined) {
    updateData.email = String(body.email);
  }
  if (body.phone !== undefined) {
    updateData.phone = String(body.phone);
  }
  if (body.role) {
    updateData.role = body.role;
  }

  // Capture current role before update for audit logging
  let currentRole: string | undefined;
  if (body.role) {
    const [existingUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
      .limit(1);
    currentRole = existingUser?.role;
  }
  if (body.isActive !== undefined) {
    updateData.isActive = body.isActive === 'true' || body.isActive === true;
  }
  if (body.isPublic !== undefined) {
    updateData.isPublic = body.isPublic === 'true' || body.isPublic === true;
  }
  if (body.showEmail !== undefined) {
    updateData.showEmail = body.showEmail === 'true' || body.showEmail === true;
  }
  if (body.showPhone !== undefined) {
    updateData.showPhone = body.showPhone === 'true' || body.showPhone === true;
  }
  if (body.profileSlug !== undefined) {
    updateData.profileSlug = String(body.profileSlug) || null;
  }
  if (body.interests !== undefined) {
    updateData.interests = Array.isArray(body.interests) ? body.interests : [];
  }
  if (body.isPlatformAdmin !== undefined) {
    updateData.isPlatformAdmin = body.isPlatformAdmin === 'true' || body.isPlatformAdmin === true;
  }
  if (body.dashboardLayout !== undefined) {
    updateData.dashboardLayout = body.dashboardLayout;
  }
  if (body.avatar !== undefined) {
    updateData.avatar = body.avatar;
    updateData.image = body.avatar;
  }
  if (body.image !== undefined) {
    updateData.image = body.image;
    updateData.avatar = body.image;
  }
  if (body.residentType !== undefined) {
    updateData.residentType = String(body.residentType);
  }

  const updatedUser = await db
    .update(users)
    .set(updateData)
    .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
    .returning()
    .then(rows => rows[0]);

  if (!updatedUser) {
    return apiNotFound('User not found');
  }

  // Audit log: if role was changed, record the change
  if (body.role && currentRole && currentRole !== body.role) {
    writeAuditLog({
      action: 'USER_ROLE_CHANGED',
      actorId: session.user.id,
      targetId: id,
      tenantId,
      details: { oldRole: currentRole, newRole: body.role },
      requestId: request.headers.get('x-request-id') || undefined,
    });
  }

  let updatedSeat: { type: string; platformAddress: string } | null = null;

  if (body.platformAddress !== undefined) {
    const addr = String(body.platformAddress);

    const [premium] = await db
      .select({ id: premiumSeats.id })
      .from(premiumSeats)
      .where(eq(premiumSeats.userId, id))
      .limit(1);

    if (premium) {
      await db
        .update(premiumSeats)
        .set({ platformAddress: addr })
        .where(eq(premiumSeats.id, premium.id));
      updatedSeat = { type: 'premium', platformAddress: addr };
    } else {
      const [solo] = await db
        .select({ id: soloSeats.id })
        .from(soloSeats)
        .where(eq(soloSeats.userId, id))
        .limit(1)
        .orderBy(soloSeats.createdAt);

      if (solo) {
        await db.update(soloSeats).set({ platformAddress: addr }).where(eq(soloSeats.id, solo.id));
        updatedSeat = { type: 'solo', platformAddress: addr };
      } else {
        const [standard] = await db
          .select({ id: standardSeats.id })
          .from(standardSeats)
          .where(eq(standardSeats.userId, id))
          .limit(1);

        if (standard) {
          await db
            .update(standardSeats)
            .set({ platformAddress: addr })
            .where(eq(standardSeats.id, standard.id));
          updatedSeat = { type: 'standard', platformAddress: addr };
        }
      }
    }
  }

  return apiSuccess({ ...updatedUser, updatedSeat });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // AssistSession scope guard: metadata-scoped staff can only read, not modify content/users/settings
  const scopeError = await requireAssistScope(request, 'full');
  if (scopeError) return scopeError;

  // Suspension guard: suspended users cannot be deleted
  const suspensionGuard = await throwIfSuspended(request);
  if (suspensionGuard) return suspensionGuard;

  const { tenantId } = await withTenant();

  const deleted = await db
    .delete(users)
    .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
    .returning()
    .then(rows => rows[0]);

  if (!deleted) {
    return apiNotFound('User not found');
  }

  return apiSuccess({ success: true });
}
