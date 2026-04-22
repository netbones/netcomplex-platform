import { db, users, standardSeats, soloSeats, properties, contents } from '@api/db';
import { NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { withTenant } from '@api/tenant/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenantId } = await withTenant();

  // Get user data (filter by tenantId)
  const userResult = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      interests: users.interests,
      avatar: users.avatar,
      books: users.books,
      dashboardLayout: users.dashboardLayout,
      isPublic: users.isPublic,
      showEmail: users.showEmail,
      showPhone: users.showPhone,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
    .limit(1);

  if (!userResult[0]) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const user = userResult[0];

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
    })
    .from(standardSeats)
    .innerJoin(properties, eq(standardSeats.propertyId, properties.id))
    .where(eq(standardSeats.userId, id));

  // Get soloSeat with property
  const soloSeatResult = await db
    .select({
      seatType: soloSeats.seatType,
      property: {
        id: properties.id,
        street: properties.street,
        unit: properties.unit,
        homeImage: properties.homeImage,
      },
    })
    .from(soloSeats)
    .leftJoin(properties, eq(soloSeats.propertyId, properties.id))
    .where(eq(soloSeats.userId, id))
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
    .where(and(eq(contents.authorId, id), eq(contents.published, true)))
    .orderBy(desc(contents.publishedAt))
    .limit(10);

  return NextResponse.json({
    ...user,
    standardSeats: seats,
    soloSeat: soloSeatResult[0] || null,
    contents: userContents,
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenantId } = await withTenant();
  const body = await request.json();

  const updateData: Record<string, unknown> = {};

  if (body.role) {
    updateData.role = body.role;
  }
  if (body.isActive !== undefined) {
    updateData.isActive = body.isActive === 'true' || body.isActive === true;
  }
  if (body.showEmail !== undefined) {
    updateData.showEmail = body.showEmail === 'true' || body.showEmail === true;
  }
  if (body.showPhone !== undefined) {
    updateData.showPhone = body.showPhone === 'true' || body.showPhone === true;
  }
  if (body.dashboardLayout !== undefined) {
    updateData.dashboardLayout = body.dashboardLayout;
  }
  if (body.avatar !== undefined) {
    updateData.avatar = body.avatar;
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
