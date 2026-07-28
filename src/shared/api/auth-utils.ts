import { auth } from './auth';
import { hasPermission, canManageOwnGroupOnly, Permission, ModuleKey } from '@shared/lib';
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

export type AuthResult =
  | { success: true; data: SessionAndRole }
  | { success: false; response: NextResponse };

export interface AuthOptions {
  permission?: keyof Permission;
  module?: ModuleKey;
}

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

  const suspensionInfo = await checkUserSuspension(session.user.id);

  return {
    session,
    userId: session.user.id,
    role,
    suspension: suspensionInfo,
  };
}

/**
 * Unified suspension check — shared by REST (auth-utils) and tRPC (trpc/server).
 * Queries active suspension for a user, auto-unsuspends if expired.
 * Returns SuspensionInfo if actively suspended, null otherwise.
 */
export async function checkUserSuspension(
  userId: string,
  tenantId?: string
): Promise<SuspensionInfo | null> {
  const conditions = [
    eq(platformSuspensions.userId, userId),
    eq(platformSuspensions.isActive, true),
  ];
  if (tenantId) {
    conditions.push(eq(platformSuspensions.tenantId, tenantId));
  }

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
    .where(and(...conditions))
    .limit(1);

  if (!suspension) {
    return null;
  }

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
 * Single auth call that replaces the 3-line pattern in REST handlers:
 *   const authData = await getSessionAndRole(request);
 *   if (!authData) return apiUnauthorized();
 *   const guard = guardSuspension(authData);
 *   if (guard) return guard;
 *
 * Optionally checks permission and module feature-gate.
 */
export async function requireAuth(request: Request, options?: AuthOptions): Promise<AuthResult> {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return { success: false, response: apiUnauthorized() };
  }

  const guard = guardSuspension(authData);
  if (guard) {
    return { success: false, response: guard };
  }

  if (options?.permission && !hasPermission(authData.role, options.permission)) {
    return { success: false, response: apiForbidden('Insufficient permissions') };
  }

  if (options?.module) {
    const { assertModuleEnabled } = await import('@entities/tenant/server');
    const featureCheck = await assertModuleEnabled(options.module);
    if (featureCheck) {
      return { success: false, response: featureCheck };
    }
  }

  return { success: true, data: authData };
}

async function checkActiveSuspension(userId: string): Promise<SuspensionInfo | null> {
  return checkUserSuspension(userId);
}

export async function requireNotSuspended(request: Request): Promise<{
  suspended: boolean;
  suspension: SuspensionInfo | null;
}> {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user?.id) {
    return { suspended: false, suspension: null };
  }

  const suspension = await checkUserSuspension(session.user.id);
  return {
    suspended: suspension !== null,
    suspension,
  };
}

export function guardSuspension(authData: SessionAndRole): NextResponse | null {
  if (!authData.suspension) return null;
  return apiSuspendedUser({
    id: authData.suspension.id,
    reason: authData.suspension.reason,
    suspensionType: authData.suspension.suspensionType,
    startDate: authData.suspension.startDate,
    endDate: authData.suspension.endDate,
    isPermanent: authData.suspension.isPermanent,
  });
}

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
