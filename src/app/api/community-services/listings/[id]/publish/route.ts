import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// Drizzle imports
import { db, communityServiceListings } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { withTenant } from '@/lib/tenant/with-tenant';
import { logError } from '@/lib/logging';

/**
 * POST /api/community-services/listings/[id]/publish - Publish or unpublish a listing
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Enforce tenant isolation
    const { tenantId } = await withTenant();

    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { publish } = await request.json();

    // Check ownership using Drizzle (with tenant filter)
    const [existingListing] = await db
      .select({ providerId: communityServiceListings.providerId })
      .from(communityServiceListings)
      .where(
        and(eq(communityServiceListings.id, id), eq(communityServiceListings.tenantId, tenantId))
      )
      .limit(1);

    if (!existingListing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (existingListing.providerId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update publish status with Drizzle
    await db
      .update(communityServiceListings)
      .set({
        isPublished: publish,
        status: publish ? 'ACTIVE' : 'DRAFT',
        updatedAt: new Date(),
      })
      .where(eq(communityServiceListings.id, id));

    // Fetch updated listing
    const [listing] = await db
      .select()
      .from(communityServiceListings)
      .where(eq(communityServiceListings.id, id))
      .limit(1);

    return NextResponse.json({
      success: true,
      listing,
      message: publish ? 'Listing published successfully' : 'Listing unpublished',
    });
  } catch (error) {
    logError(
      { component: 'listings-publish-api', operation: 'POST' },
      'Community service listing publish error',
      error
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
