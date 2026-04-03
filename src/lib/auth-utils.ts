import { auth } from '@/lib/auth';
import { hasPermission, canManageOwnGroupOnly, Permission } from '@/lib/permissions';
import { db, users } from '@/lib/db';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

/**
 * Retrieves the current user session and role from Better Auth.
 * @returns {Promise<{session: Session, userId: string, role: string} | null>}
 *   Session data with user ID and role, or null if not authenticated
 */
export async function getSessionAndRole() {
  const session = await auth.api.getSession({
    headers: new Headers(),
  });

  if (!session?.user?.id) {
    return null;
  }

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id));

  return {
    session,
    userId: session.user.id,
    role: user?.role || 'RESIDENT',
  };
}

/**
 * Requires the authenticated user to have a specific permission.
 * @param permission - The permission to check
 * @returns {NextResponse | null} - Error response if unauthorized, null if authorized
 */
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

/**
 * Requires the authenticated user to have a specific permission OR be a group admin.
 * Allows group admins to manage their own group's content.
 * @param permission - The permission to check
 * @returns {NextResponse | null} - Error response if unauthorized, null if authorized
 */
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

/**
 * Requires the authenticated user to have at least one of the specified permissions.
 * @param permissions - Array of permissions where any match grants access
 * @returns {NextResponse | null} - Error response if unauthorized, null if authorized
 */
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
