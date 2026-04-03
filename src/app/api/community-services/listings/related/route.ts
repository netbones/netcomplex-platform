import { NextRequest, NextResponse } from 'next/server';


// Drizzle imports
import { db, communityServiceListings, users } from '@/lib/db';
import { eq, desc, and, or, sql } from 'drizzle-orm';
import { communityServiceReviews } from '@/lib/db';

export const maxDuration = 5;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('serviceId');
    const limit = parseInt(searchParams.get('limit') || '4');

    if (!serviceId) {
      return NextResponse.json({ error: 'serviceId is required' }, { status: 400 });
    }

    // Get current service details using Drizzle
    const [currentService] = await db
      .select({
        category: communityServiceListings.category,
        title: communityServiceListings.title,
        description: communityServiceListings.description,
      })
      .from(communityServiceListings)
      .where(eq(communityServiceListings.id, serviceId))
      .limit(1);

    if (!currentService) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // Build search term from first word of title
    const searchTerm = currentService.title?.split(' ')[0] || '';
    const searchPattern = `%${searchTerm.toLowerCase()}%`;

    // Get related services using Drizzle
    const relatedServices = await db
      .select({
        id: communityServiceListings.id,
        title: communityServiceListings.title,
        description: communityServiceListings.description,
        category: communityServiceListings.category,
        subcategory: communityServiceListings.subcategory,
        priceType: communityServiceListings.priceType,
        price: communityServiceListings.price,
        rating: communityServiceListings.rating,
        reviewCount: communityServiceListings.reviewCount,
        images: communityServiceListings.images,
        verified: communityServiceListings.verified,
        isFeatured: communityServiceListings.isFeatured,
        createdAt: communityServiceListings.createdAt,
        provider: {
          id: users.id,
          name: users.name,
          avatar: users.avatar,
        },
      })
      .from(communityServiceListings)
      .leftJoin(users, eq(communityServiceListings.providerId, users.id))
      .where(
        and(
          eq(communityServiceListings.isPublished, true),
          eq(communityServiceListings.status, 'ACTIVE' as any),
          sql`${communityServiceListings.id} != ${serviceId}`,
          or(
            eq(communityServiceListings.category, currentService.category as any),
            sql`lower(${communityServiceListings.title}) like ${searchPattern}`
          )
        )
      )
      .orderBy(desc(communityServiceListings.rating), desc(communityServiceListings.reviewCount))
      .limit(limit);

    // Get review counts for each listing
    const relatedWithCounts = await Promise.all(
      relatedServices.map(async service => {
        const [countResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(communityServiceReviews)
          .where(eq(communityServiceReviews.listingId, service.id));
        return { ...service, _count: { reviews: countResult?.count || 0 } };
      })
    );

    return NextResponse.json({ relatedServices: relatedWithCounts });
  } catch (error) {
    console.error('Related services fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
