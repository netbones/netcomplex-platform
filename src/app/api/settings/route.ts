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

  if (!authData || !hasPermission(authData.role, 'settings')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!key) {
    const settings = await prisma.setting.findMany();
    return NextResponse.json(settings);
  }

  const setting = await prisma.setting.findUnique({
    where: { key },
  });

  return NextResponse.json(setting || { key, value: null });
}

export async function POST(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData || !hasPermission(authData.role, 'settings')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();

  const setting = await prisma.setting.upsert({
    where: { key: body.key },
    update: { value: body.value },
    create: { key: body.key, value: body.value },
  });

  return NextResponse.json(setting);
}
