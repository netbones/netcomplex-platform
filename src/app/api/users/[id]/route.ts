import {
  db,
  users,
  standardSeats,
  soloSeats,
  properties,
  contents,
  profiles,
  households,
} from '@api/db';
import { NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/api/with-tenant';
import { requireAssistScope } from '@entities/tenant/api/assist-scope-guard';
import { getLocalizedValue, getLocalizedContent, defaultLanguage } from '@shared/lib';

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
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
    })
    .from(standardSeats)
    .innerJoin(properties, eq(standardSeats.propertyId, properties.id))
    .where(eq(standardSeats.userId, userId));

  // Get soloSeat with property
  const soloSeatResult = await db
    .select({
      seatType: soloSeats.seatType,
      household: {
        id: properties.id,
        street: properties.street,
        unit: properties.unit,
        homeImage: properties.homeImage,
      },
    })
    .from(soloSeats)
    .leftJoin(properties, eq(soloSeats.propertyId, properties.id))
    .where(eq(soloSeats.userId, userId))
    .limit(1);

  // Get profile-based address (for family members without seats)
  const profileResult = await db
    .select({
      property: {
        id: properties.id,
        street: properties.street,
        unit: properties.unit,
        homeImage: properties.homeImage,
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

  return NextResponse.json({
    ...user,
    standardSeats: seats,
    soloSeat: soloSeatResult[0] || null,
    profileProperty: profileResult[0]?.property || null,
    contents: localizedContents,
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // AssistSession scope guard: metadata-scoped staff can only read, not modify content/users/settings
  const scopeError = await requireAssistScope(request, 'full');
  if (scopeError) return scopeError;

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

  const updatedUser = await db
    .update(users)
    .set(updateData)
    .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
    .returning()
    .then(rows => rows[0]);

  if (!updatedUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(updatedUser);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // AssistSession scope guard: metadata-scoped staff can only read, not modify content/users/settings
  const scopeError = await requireAssistScope(request, 'full');
  if (scopeError) return scopeError;

  const { tenantId } = await withTenant();

  const deleted = await db
    .delete(users)
    .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
    .returning()
    .then(rows => rows[0]);

  if (!deleted) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
