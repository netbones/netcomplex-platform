import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, households, standardSeats, profiles, contents, users } from '@/lib/db';
import { eq, asc, desc, and } from 'drizzle-orm';
import { withTenant } from '@/lib/tenant/with-tenant';
import { logError } from '@/lib/logging';
import { hasPermission } from '@/lib/permissions';

/**
 * GET /api/households/[id] - Get household profile with occupants and aggregated content
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await withTenant();
    const { id: householdId } = await params;

    // Fetch household
    const [household] = await db
      .select({
        id: households.id,
        street: households.street,
        unit: households.unit,
        homeImage: households.homeImage,
        platformAddress: households.platformAddress,
        status: households.status,
        createdAt: households.createdAt,
      })
      .from(households)
      .where(and(eq(households.id, householdId), eq(households.tenantId, tenantId)))
      .limit(1);

    if (!household) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 });
    }

    // Get standard seats (members) with user data and content
    const seats = await db
      .select({
        id: standardSeats.id,
        userId: standardSeats.userId,
        isPrimaryOwner: standardSeats.isPrimaryOwner,
        platformAddress: standardSeats.platformAddress,
        householdId: standardSeats.householdId,
        userId_ref: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        avatar: users.avatar,
        isPublic: users.isPublic,
        showEmail: users.showEmail,
        showPhone: users.showPhone,
      })
      .from(standardSeats)
      .leftJoin(users, eq(standardSeats.userId, users.id))
      .where(and(eq(standardSeats.householdId, householdId), eq(standardSeats.tenantId, tenantId)));

    // Get profiles with user data
    const profileList = await db
      .select({
        id: profiles.id,
        householdId: profiles.householdId,
        displayName: profiles.displayName,
        profileAddress: profiles.profileAddress,
        avatar: profiles.avatar,
        isPublic: profiles.isPublic,
        occupantSince: profiles.occupantSince,
        occupantType: profiles.occupantType,
        userId: profiles.userId,
      })
      .from(profiles)
      .where(and(eq(profiles.householdId, householdId), eq(profiles.tenantId, tenantId)))
      .orderBy(asc(profiles.occupantSince));

    // Get user IDs from seats and profiles
    const userIds = [
      ...seats.map(s => s.userId).filter(Boolean),
      ...profileList.map(p => p.userId).filter(Boolean),
    ];

    // Fetch contents for these users
    interface ContentItem {
      id: string;
      title: unknown;
      excerpt: unknown;
      content: unknown;
      category: string;
      tags: string[];
      publishedAt: Date | null;
      createdAt: Date;
      authorId: string | null;
      author?: {
        id: string;
        name: string;
        type: 'member' | 'occupant';
        isPrimaryOwner?: boolean;
        profileId?: string;
      };
    }
    const userContentsMap: Record<string, ContentItem[]> = {};

    if (userIds.length > 0) {
      const allContents = await db
        .select({
          id: contents.id,
          title: contents.title,
          excerpt: contents.excerpt,
          content: contents.content,
          category: contents.category,
          tags: contents.tags,
          publishedAt: contents.publishedAt,
          createdAt: contents.createdAt,
          authorId: contents.authorId,
        })
        .from(contents)
        .where(and(eq(contents.published, true), eq(contents.tenantId, tenantId)));

      // Group contents by author
      for (const content of allContents) {
        if (content.authorId) {
          if (!userContentsMap[content.authorId]) {
            userContentsMap[content.authorId] = [];
          }
          userContentsMap[content.authorId].push(content);
        }
      }
    }

    // Aggregate all content from household members
    const allContent: ContentItem[] = [];

    // Add content from Standard Seat holders
    seats.forEach(seat => {
      const contentsForUser = userContentsMap[seat.userId] || [];
      contentsForUser.forEach(content => {
        allContent.push({
          ...content,
          author: {
            id: seat.userId,
            name: seat.name || '',
            type: 'member',
            isPrimaryOwner: seat.isPrimaryOwner,
          },
        });
      });
    });

    // Add content from Address Profile users
    profileList.forEach(profile => {
      const contentsForUser = userContentsMap[profile.userId || ''] || [];
      contentsForUser.forEach(content => {
        allContent.push({
          ...content,
          author: {
            id: profile.userId || profile.id,
            name: profile.displayName,
            type: 'occupant',
            profileId: profile.id,
          },
        });
      });
    });

    // Sort all content by published date (most recent first)
    allContent.sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));

    // Generate household tag cloud from all content
    const tagCounts: { [key: string]: number } = {};
    allContent.forEach(content => {
      if (content.tags && Array.isArray(content.tags)) {
        content.tags.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    const householdTags = Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20 tags

    // Build occupants array
    const occupants = [
      // Standard Seat holders
      ...seats.map(seat => ({
        id: seat.userId,
        name: seat.name || '',
        email: seat.email || null,
        phone: seat.phone || null,
        avatar: seat.avatar || null,
        isPublic: seat.isPublic || false,
        showEmail: seat.showEmail || false,
        showPhone: seat.showPhone || false,
        type: 'member',
        isPrimaryOwner: seat.isPrimaryOwner,
        platformAddress: seat.platformAddress,
        occupantSince: household.createdAt, // Household creation date
      })),
      // Address Profiles
      ...profileList.map(profile => ({
        id: profile.userId || profile.id,
        name: profile.displayName,
        email: null, // Profiles don't expose email
        phone: null, // Profiles don't expose phone
        avatar: profile.avatar || null,
        isPublic: profile.isPublic || false,
        showEmail: false,
        showPhone: false,
        type: 'occupant',
        profileId: profile.id,
        platformAddress: profile.profileAddress,
        occupantSince: profile.occupantSince,
        occupantType: profile.occupantType,
      })),
    ];

    const response = {
      household: {
        id: household.id,
        street: household.street,
        unit: household.unit,
        homeImage: household.homeImage,
        platformAddress: household.platformAddress,
        status: household.status,
        createdAt: household.createdAt,
      },
      occupants,
      content: allContent.slice(0, 20), // Limit to 20 most recent posts
      tags: householdTags,
      stats: {
        totalOccupants: seats.length + profileList.length,
        totalContent: allContent.length,
        uniqueTags: householdTags.length,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    logError({ component: 'households-api', operation: 'GET' }, 'Error fetching household', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/households/[id] - Update household
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await withTenant();
    const { id: householdId } = await params;

    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    const role = user?.role || 'RESIDENT';

    // Check if user is a member of this household
    const [seat] = await db
      .select({ userId: standardSeats.userId })
      .from(standardSeats)
      .where(and(eq(standardSeats.householdId, householdId), eq(standardSeats.tenantId, tenantId)))
      .limit(1);

    const isHouseholdMember = seat?.userId === session.user.id;
    const canManageHouseholds = hasPermission(role, 'households');

    if (!isHouseholdMember && !canManageHouseholds) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { homeImage } = body;

    // Only allow updating homeImage for now
    const updateData: { homeImage?: string } = {};
    if (homeImage !== undefined) {
      updateData.homeImage = homeImage;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const [updated] = await db
      .update(households)
      .set(updateData)
      .where(and(eq(households.id, householdId), eq(households.tenantId, tenantId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    logError(
      { component: 'households-api', operation: 'PATCH' },
      'Error updating household',
      error
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
