import { NextRequest } from 'next/server';
import {
  auth,
  db,
  communityServiceListings,
  apiError,
  apiInternalError,
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
} from '@api/server';

// Drizzle imports

import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';

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
      return apiUnauthorized();
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
      return apiNotFound('Listing not found');
    }

    if (existingListing.providerId !== session.user.id) {
      return apiForbidden('Access denied');
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

    return apiSuccess({
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
    return apiInternalError();
  }
}
