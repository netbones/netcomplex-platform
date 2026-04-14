import { NextResponse } from 'next/server';
import { auth } from '@api/auth';
import { db, users } from '@api/db';
import { eq, or } from 'drizzle-orm';

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

  // Build OR conditions for each board role
  const roleConditions = BOARD_ROLES.map(role => eq(users.role, role));

  const boardMembers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(or(...roleConditions));

  return NextResponse.json(boardMembers);
}
