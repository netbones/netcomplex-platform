import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

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
          street: true,
          unit: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(requests);
}

export async function POST(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const userId = body.userId || authData.userId;

  const maintenanceRequest = await prisma.maintenanceRequest.create({
    data: {
      userId,
      category: body.category || body.serviceType || 'general',
      priority: body.priority || 'LOW',
      description: body.description,
      images: body.images || [],
    },
  });

  return NextResponse.json(maintenanceRequest, { status: 201 });
}
