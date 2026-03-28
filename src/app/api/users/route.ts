import { auth } from '@/lib/auth';
import { hasPermission, Permission } from '@/lib/permissions';
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

  if (!hasPermission(authData.role, 'directory')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const street = searchParams.get('street') || '';
  const interest = searchParams.get('interest') || '';
  const residentType = searchParams.get('residentType') || '';
  const role = searchParams.get('role') || '';

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (street) {
    where.street = street;
  }

  if (interest) {
    where.interests = { has: interest };
  }

  if (residentType) {
    where.residentType = residentType as 'OWNER' | 'RENTER';
  }

  if (role) {
    where.role = role;
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      street: true,
      unit: true,
      phone: true,
      interests: true,
      avatar: true,
      isPublic: true,
      isActive: true,
      residentType: true,
      role: true,
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(authData.role, 'users')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();

  const user = await prisma.user.create({
    data: {
      email: body.email,
      name: body.name,
      street: body.street,
      unit: body.unit,
      phone: body.phone,
      interests: body.interests || [],
      isPublic: body.isPublic ?? true,
    },
  });

  return NextResponse.json(user, { status: 201 });
}
