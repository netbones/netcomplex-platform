import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/households/[id] - Get household profile with occupants and aggregated content
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: householdId } = await params;

    // Fetch household with all occupants and their content
    const household = await prisma.household.findUnique({
      where: { id: householdId },
      select: {
        id: true,
        street: true,
        unit: true,
        homeImage: true,
        platformAddress: true,
        status: true,
        createdAt: true,
        standardSeats: {
          select: {
            id: true,
            isPrimaryOwner: true,
            platformAddress: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatar: true,
                isPublic: true,
                showEmail: true,
                showPhone: true,
                contents: {
                  where: { published: true },
                  select: {
                    id: true,
                    title: true,
                    excerpt: true,
                    content: true,
                    category: true,
                    tags: true,
                    publishedAt: true,
                    createdAt: true,
                  },
                  orderBy: { publishedAt: 'desc' },
                },
              },
            },
          },
        },
        profiles: {
          select: {
            id: true,
            displayName: true,
            profileAddress: true,
            avatar: true,
            isPublic: true,
            occupantSince: true,
            occupantType: true,
            user: {
              select: {
                id: true,
                contents: {
                  where: { published: true },
                  select: {
                    id: true,
                    title: true,
                    excerpt: true,
                    content: true,
                    category: true,
                    tags: true,
                    publishedAt: true,
                    createdAt: true,
                  },
                  orderBy: { publishedAt: 'desc' },
                },
              },
            },
          },
          orderBy: { occupantSince: 'asc' },
        },
      },
    });

    if (!household) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 });
    }

    // Aggregate all content from household members
    const allContent: any[] = [];

    // Add content from Standard Seat holders
    household.standardSeats.forEach(seat => {
      if (seat.user.contents) {
        seat.user.contents.forEach(content => {
          allContent.push({
            ...content,
            author: {
              id: seat.user.id,
              name: seat.user.name,
              type: 'member',
              isPrimaryOwner: seat.isPrimaryOwner,
            },
          });
        });
      }
    });

    // Add content from Address Profile users
    household.profiles.forEach(profile => {
      if (profile.user?.contents) {
        profile.user.contents.forEach(content => {
          allContent.push({
            ...content,
            author: {
              id: profile.user!.id,
              name: profile.displayName,
              type: 'occupant',
              profileId: profile.id,
            },
          });
        });
      }
    });

    // Sort all content by published date (most recent first)
    allContent.sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

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
      occupants: [
        // Standard Seat holders
        ...household.standardSeats.map(seat => ({
          id: seat.user.id,
          name: seat.user.name,
          email: seat.user.email,
          phone: seat.user.phone,
          avatar: seat.user.avatar,
          isPublic: seat.user.isPublic,
          showEmail: seat.user.showEmail,
          showPhone: seat.user.showPhone,
          type: 'member',
          isPrimaryOwner: seat.isPrimaryOwner,
          platformAddress: seat.platformAddress,
          occupantSince: household.createdAt, // Household creation date
        })),
        // Address Profiles
        ...household.profiles.map(profile => ({
          id: profile.user?.id || profile.id,
          name: profile.displayName,
          email: null, // Profiles don't expose email
          phone: null, // Profiles don't expose phone
          avatar: profile.avatar,
          isPublic: profile.isPublic,
          showEmail: false,
          showPhone: false,
          type: 'occupant',
          profileId: profile.id,
          platformAddress: profile.profileAddress,
          occupantSince: profile.occupantSince,
          occupantType: profile.occupantType,
        })),
      ],
      content: allContent.slice(0, 20), // Limit to 20 most recent posts
      tags: householdTags,
      stats: {
        totalOccupants: household.standardSeats.length + household.profiles.length,
        totalContent: allContent.length,
        uniqueTags: householdTags.length,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching household:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
