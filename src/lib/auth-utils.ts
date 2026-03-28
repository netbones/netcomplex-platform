import { auth } from '@/lib/auth';
import { hasPermission, canManageOwnGroupOnly, Permission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function getSessionAndRole() {
  const session = await auth.api.getSession({
    headers: new Headers(),
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

export async function requirePermission(
  permission: keyof Permission
): Promise<NextResponse | null> {
  const authData = await getSessionAndRole();

  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(authData.role, permission)) {
    return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
  }

  return null;
}

export async function requireOwnPermission(
  permission: keyof Permission
): Promise<NextResponse | null> {
  const authData = await getSessionAndRole();

  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hasFullPermission = hasPermission(authData.role, permission);
  const hasOwnPermission = canManageOwnGroupOnly(authData.role);

  if (!hasFullPermission && !hasOwnPermission) {
    return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
  }

  return null;
}

export async function requireAnyPermission(
  permissions: Array<keyof Permission>
): Promise<NextResponse | null> {
  const authData = await getSessionAndRole();

  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hasAny = permissions.some(p => hasPermission(authData.role, p));

  if (!hasAny) {
    return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
  }

  return null;
}
