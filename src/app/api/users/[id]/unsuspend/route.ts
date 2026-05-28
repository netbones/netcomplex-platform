import { auth } from '@api/auth';
import { hasPermission } from '@entities/tenant/api/permissions';
import { db, users, platformSuspensions } from '@api/db';
import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/api/with-tenant';
import { requireAssistScope } from '@entities/tenant/api/assist-scope-guard';

export const maxDuration = 8;

/**
 * POST /api/users/[id]/unsuspend - Revoke an active suspension and reactivate a user.
 * Marks the active suspension as inactive and sets user isActive=true atomically.
 * Only ADMIN/MANAGER roles with 'users' permission can unsuspend.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenantId } = await withTenant();

  // AssistSession scope guard: metadata-scoped staff cannot unsuspend users
  const scopeError = await requireAssistScope(request, 'full');
  if (scopeError) return scopeError;

  // Authentication: verify session and check admin permission
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [adminUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const adminRole = adminUser?.role || 'RESIDENT';
  if (!hasPermission(adminRole, 'users')) {
    return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
  }

  // Verify target user exists within the same tenant
  const [targetUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
    .limit(1);

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Find active suspension for this user
  const [activeSuspension] = await db
    .select({ id: platformSuspensions.id })
    .from(platformSuspensions)
    .where(and(eq(platformSuspensions.userId, id), eq(platformSuspensions.isActive, true)))
    .limit(1);

  if (!activeSuspension) {
    return NextResponse.json({ error: 'User has no active suspension' }, { status: 409 });
  }

  // Atomically deactivate suspension and reactivate user
  const updatedUser = await db.transaction(async tx => {
    await tx
      .update(platformSuspensions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(platformSuspensions.id, activeSuspension.id));

    const [user] = await tx
      .update(users)
      .set({ isActive: true })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
      });

    return user;
  });

  return NextResponse.json({ success: true, user: updatedUser });
}
