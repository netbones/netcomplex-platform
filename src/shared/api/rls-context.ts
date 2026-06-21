import { eq } from 'drizzle-orm';
import { db, users, type RLSContext } from './db';
import { auth } from './auth';

export type { RLSContext };

export async function getRLSContext(request: Request): Promise<RLSContext | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return null;

  const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!user) return null;

  return {
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    isPlatformAdmin: user.isPlatformAdmin,
  };
}
