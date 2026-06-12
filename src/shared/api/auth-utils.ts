import { auth } from './auth';
import { hasPermission, canManageOwnGroupOnly, Permission } from '@shared/lib';
import { db, users, platformSuspensions } from './db';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { eq, and } from 'drizzle-orm';
import { apiUnauthorized, apiForbidden, apiSuspendedUser } from './api-response';

export interface SuspensionInfo {
  id: string;
  suspensionType: string;
  reason: string;
  description: string | null;
  startDate: Date;
  endDate: Date | null;
  isPermanent: boolean;
  createdById: string;
}

export interface SessionAndRole {
  session: {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
    };
  };
  userId: string;
  role: string;
  suspension: SuspensionInfo | null;
}

/**
 * Retrieves the current user session and role from Better Auth.
 * If a request is provided, uses request headers for session lookup.
 * Falls back to headers() from next/headers for App Router server context.
 * Also checks suspension status for the authenticated user.
 *
 * @param request - Optional incoming HTTP request for header-based auth
 * @returns Session data with user ID, role, and suspension info, or null if not authenticated
 */
export async function getSessionAndRole(request?: Request): Promise<SessionAndRole | null> {
  const session = await auth.api.getSession({
    headers: request?.headers ?? (await headers()),
  });

  if (!session?.user?.id) {
    return null;
  }

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id));

  const role = user?.role || 'RESIDENT';

  // Check suspension status for the authenticated user
  const suspensionInfo = await checkActiveSuspension(session.user.id);

  return {
    session,
    userId: session.user.id,
    role,
    suspension: suspensionInfo,
  };
}

/**
 * Check if a user has an active suspension, with auto-unsuspension for expired timed suspensions.
 * @param userId - The user ID to check
 * @returns SuspensionInfo if actively suspended, null otherwise
 */
async function checkActiveSuspension(userId: string): Promise<SuspensionInfo | null> {
  const [suspension] = await db
    .select({
      id: platformSuspensions.id,
      suspensionType: platformSuspensions.suspensionType,
      reason: platformSuspensions.reason,
      description: platformSuspensions.description,
      startDate: platformSuspensions.startDate,
      endDate: platformSuspensions.endDate,
      isPermanent: platformSuspensions.isPermanent,
      createdById: platformSuspensions.createdById,
    })
    .from(platformSuspensions)
    .where(and(eq(platformSuspensions.userId, userId), eq(platformSuspensions.isActive, true)))
    .limit(1);

  if (!suspension) {
    return null;
  }

  // Auto-unsuspend if the timed suspension has expired
  if (suspension.endDate && new Date(suspension.endDate) < new Date()) {
    await db
      .update(platformSuspensions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(platformSuspensions.id, suspension.id));

    await db.update(users).set({ isActive: true }).where(eq(users.id, userId));

    return null;
  }

  return suspension;
}

/**
 * Check if the current request's user is suspended.
 * Auto-unsuspends expired timed suspensions before returning.
 *
 * @param request - Incoming HTTP request
 * @returns Object with suspended flag and optional suspension details
 */
export async function requireNotSuspended(request: Request): Promise<{
  suspended: boolean;
  suspension: SuspensionInfo | null;
}> {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user?.id) {
    return { suspended: false, suspension: null };
  }

  const suspension = await checkActiveSuspension(session.user.id);
  return {
    suspended: suspension !== null,
    suspension,
  };
}

/**
 * Convenience guard that returns a 403 NextResponse if the user is suspended.
 * Returns null if not suspended (allowing clean early-return usage at top of routes).
 *
 * @param request - Incoming HTTP request
 * @returns NextResponse with 403 error if suspended, null otherwise
 */
export async function throwIfSuspended(request: Request): Promise<NextResponse | null> {
  const { suspended, suspension } = await requireNotSuspended(request);

  if (suspended) {
    return apiSuspendedUser({
      id: suspension?.id,
      reason: suspension?.reason,
      suspensionType: suspension?.suspensionType,
      startDate: suspension?.startDate,
      endDate: suspension?.endDate,
      isPermanent: suspension?.isPermanent,
    });
  }

  return null;
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
    return apiUnauthorized();
  }

  if (!hasPermission(authData.role, permission)) {
    return apiForbidden('Insufficient permissions');
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
    return apiUnauthorized();
  }

  const hasFullPermission = hasPermission(authData.role, permission);
  const hasOwnPermission = canManageOwnGroupOnly(authData.role);

  if (!hasFullPermission && !hasOwnPermission) {
    return apiForbidden('Insufficient permissions');
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
    return apiUnauthorized();
  }

  const hasAny = permissions.some(p => hasPermission(authData.role, p));

  if (!hasAny) {
    return apiForbidden('Insufficient permissions');
  }

  return null;
}
