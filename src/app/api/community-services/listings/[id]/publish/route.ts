import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/community-services/listings/[id]/publish - Publish or unpublish a listing
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { publish } = await request.json();

    // Check ownership
    const existingListing = await prisma.communityServiceListing.findUnique({
      where: { id },
    });

    if (!existingListing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (existingListing.providerId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update publish status
    const listing = await prisma.communityServiceListing.update({
      where: { id },
      data: {
        isPublished: publish,
        status: publish ? 'ACTIVE' : 'DRAFT',
      },
    });

    return NextResponse.json({
      success: true,
      listing,
      message: publish ? 'Listing published successfully' : 'Listing unpublished',
    });
  } catch (error) {
    console.error('Community service listing publish error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
