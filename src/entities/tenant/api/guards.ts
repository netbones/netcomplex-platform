import 'server-only';

import { auth } from '@api/auth';
import { db, users } from '@api/db';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Guards a request with platform admin authentication.
 * Returns a NextResponse with 401/403 if the user is not a platform admin.
 * Returns null if the user is authenticated and is a platform admin.
 */
export async function requirePlatformAdmin(request: NextRequest): Promise<NextResponse | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db
    .select({ isPlatformAdmin: users.isPlatformAdmin })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user[0]?.isPlatformAdmin) {
    return NextResponse.json(
      { error: 'Forbidden - Platform Admin access required' },
      { status: 403 }
    );
  }

  return null;
}
