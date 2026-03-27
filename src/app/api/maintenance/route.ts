import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const where: Record<string, unknown> = {};
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
  const body = await request.json();

  // Get user from auth - for now using a placeholder
  const userId = body.userId || 'demo-user-id';

  const maintenanceRequest = await prisma.maintenanceRequest.create({
    data: {
      userId,
      category: body.category,
      priority: body.priority,
      description: body.description,
      images: body.images || [],
    },
  });

  return NextResponse.json(maintenanceRequest, { status: 201 });
}
