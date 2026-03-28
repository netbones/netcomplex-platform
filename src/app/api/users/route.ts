import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
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
    where.residentType = residentType;
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
      residentType: true,
      role: true,
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
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
