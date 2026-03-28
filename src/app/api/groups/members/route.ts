import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const { userId, groupId, role = 'MEMBER' } = body;

  const existing = await prisma.userGroup.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });

  if (existing) {
    return NextResponse.json({ error: 'Already a member' }, { status: 400 });
  }

  const membership = await prisma.userGroup.create({
    data: { userId, groupId, role },
  });

  return NextResponse.json(membership, { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const groupId = searchParams.get('groupId');

  if (!userId || !groupId) {
    return NextResponse.json({ error: 'Missing userId or groupId' }, { status: 400 });
  }

  await prisma.userGroup.delete({
    where: { userId_groupId: { userId, groupId } },
  });

  return NextResponse.json({ success: true });
}
