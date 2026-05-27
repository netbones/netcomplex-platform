import { NextResponse } from 'next/server';
import { auth } from '@api/auth';
import { db, users } from '@api/db';
import { eq, or, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/api/with-tenant';

export const dynamic = 'force-dynamic';

const BOARD_ROLES = ['BOARD', 'ADMIN', 'COMMITTEE'] as const;

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [currentUser] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);

  if (!currentUser || !['BOARD', 'ADMIN'].includes(currentUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { tenantId } = await withTenant();

  const roleConditions = BOARD_ROLES.map(role => eq(users.role, role));

  const boardMembers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), or(...roleConditions)));

  return NextResponse.json(boardMembers);
}
