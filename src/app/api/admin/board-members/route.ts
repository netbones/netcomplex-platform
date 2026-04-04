import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { users } from '../../../../../prisma/drizzle/users';
import { eq, inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const ASSIGNABLE_ROLES = ['BOARD', 'ADMIN', 'COMMITTEE', 'MANAGER', 'ASSOCIATE'] as const;

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

  const boardMembers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(inArray(users.role, [...ASSIGNABLE_ROLES]));

  return NextResponse.json(boardMembers);
}
