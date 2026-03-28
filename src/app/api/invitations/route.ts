import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const invitations = await prisma.invitation.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(invitations);
}

export async function POST(request: Request) {
  const body = await request.json();

  const invitation = await prisma.invitation.create({
    data: {
      email: body.email,
      name: body.name,
      street: body.street || null,
      unit: body.unit || null,
      residentType: body.residentType || 'OWNER',
      role: body.role || 'RESIDENT',
    },
  });

  return NextResponse.json(invitation, { status: 201 });
}
