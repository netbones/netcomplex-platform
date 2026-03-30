import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      street: true,
      unit: true,
      phone: true,
      interests: true,
      avatar: true,
      homeImage: true,
      books: true,
      dashboardLayout: true,
      isPublic: true,
      showEmail: true,
      showPhone: true,
      residentType: true,
      role: true,
      createdAt: true,
      contents: {
        where: { published: true },
        select: {
          id: true,
          title: true,
          excerpt: true,
          content: true,
          category: true,
          publishedAt: true,
        },
        orderBy: { publishedAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const updateData: Record<string, unknown> = {};

  if (body.role) {
    updateData.role = body.role;
  }
  if (body.residentType) {
    updateData.residentType = body.residentType as Prisma.EnumResidentTypeFieldRefInput<
      'OWNER' | 'RENTER' | 'SUSPENDED'
    >;
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

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(user);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
