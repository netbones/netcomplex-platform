import { NextRequest } from 'next/server';
import {
  auth,
  db,
  assistSessions,
  tenants,
  users,
  apiCreated,
  apiError,
  apiForbidden,
  apiSuccess,
  apiUnauthorized,
  apiInternalError,
  apiNotFound,
  now,
} from '@api/server';

import { eq, and, gt } from 'drizzle-orm';
import { logError } from '@shared/lib';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return apiUnauthorized();
    }

    const user = await db
      .select({ isPlatformAdmin: users.isPlatformAdmin })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user[0]?.isPlatformAdmin) {
      return apiForbidden('Platform Admin access required');
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    const ts = now();
    const whereConditions = [eq(assistSessions.isActive, true), gt(assistSessions.expiresAt, ts)];

    if (tenantId) {
      whereConditions.push(eq(assistSessions.tenantId, tenantId));
    }

    const sessions = await db
      .select({
        id: assistSessions.id,
        tenantId: assistSessions.tenantId,
        staffId: assistSessions.staffId,
        scope: assistSessions.scope,
        expiresAt: assistSessions.expiresAt,
        createdAt: assistSessions.createdAt,
        notes: assistSessions.notes,
      })
      .from(assistSessions)
      .where(and(...whereConditions));

    return apiSuccess(sessions);
  } catch (error) {
    logError(
      { component: 'assist-api', operation: 'LIST' },
      'Failed to list assist sessions',
      error
    );
    return apiInternalError('Failed to list assist sessions');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return apiUnauthorized();
    }

    const user = await db
      .select({ isPlatformAdmin: users.isPlatformAdmin })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user[0]?.isPlatformAdmin) {
      return apiForbidden('Platform Admin access required');
    }

    const body = await request.json();
    const { tenantId, notes } = body;

    if (!tenantId) {
      return apiError('VALIDATION_ERROR', 'tenantId is required', 400);
    }

    // Validate tenant exists
    const tenant = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant[0]) {
      return apiNotFound('Tenant not found');
    }

    // Default expiry: 7 days from now
    const expiresAt = body.expiresAt
      ? new Date(body.expiresAt)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [newSession] = await db
      .insert(assistSessions)
      .values({
        id: createId(),
        tenantId,
        staffId: session.user.id,
        scope: 'metadata',
        expiresAt,
        isActive: true,
        notes: notes || null,
      })
      .returning({
        id: assistSessions.id,
        expiresAt: assistSessions.expiresAt,
        tenantId: assistSessions.tenantId,
        staffId: assistSessions.staffId,
        scope: assistSessions.scope,
      });

    return apiCreated(newSession);
  } catch (error) {
    logError(
      { component: 'assist-api', operation: 'CREATE' },
      'Failed to create assist session',
      error
    );
    return apiInternalError('Failed to create assist session');
  }
}
