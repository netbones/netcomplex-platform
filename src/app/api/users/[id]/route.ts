import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

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
