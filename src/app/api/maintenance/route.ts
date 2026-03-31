import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { maintenanceRequestSchema } from '@/lib/schemas';

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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  return {
    session,
    userId: session.user.id,
    role: user?.role || 'RESIDENT',
  };
}

/**
 * GET /api/maintenance - List maintenance requests
 * Admins see all requests, residents see only their own
 * @query status - Filter by SUBMITTED, IN_PROGRESS, COMPLETED, CANCELLED
 */
export async function GET(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canViewAll = hasPermission(authData.role, 'requests');

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const where: Record<string, unknown> = canViewAll ? {} : { userId: authData.userId };
  if (status) {
    where.status = status;
  }

  const requests = await prisma.maintenanceRequest.findMany({
    where,
    include: {
      user: {
        select: {
          name: true,
          email: true,
          standardSeats: {
            select: {
              household: { select: { street: true, unit: true } },
            },
            take: 1,
          },
          soloSeat: {
            select: {
              household: { select: { street: true, unit: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(requests);
}

/**
 * POST /api/maintenance - Create a new maintenance request
 * @body userId - Optional user ID (defaults to authenticated user)
 * @body category - Issue category (PLUMBING, ELECTRICAL, etc.)
 * @body priority - Priority level (LOW, MEDIUM, HIGH, EMERGENCY)
 * @body description - Detailed description
 * @body images - Optional array of image URLs
 */
export async function POST(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Validate input with Zod schema
    const validationResult = maintenanceRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { category, priority, description, preferredDate, preferredTime } = validationResult.data;
    const userId = body.userId || authData.userId;

    const maintenanceRequest = await prisma.maintenanceRequest.create({
      data: {
        userId,
        category,
        priority,
        description,
        images: body.images || [],
        // Note: preferredDate and preferredTime could be stored in a separate field or handled differently
        // For now, they're captured in validation but not used in creation
      },
    });

    return NextResponse.json(maintenanceRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating maintenance request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
