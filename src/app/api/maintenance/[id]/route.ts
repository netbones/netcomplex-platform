import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const maintenanceRequest = await prisma.maintenanceRequest.update({
    where: { id },
    data: {
      status: body.status,
    },
  });

  return NextResponse.json(maintenanceRequest);
}
