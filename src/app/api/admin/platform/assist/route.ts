import { NextRequest } from 'next/server';
import { auth } from '@api/auth';
import { db, assistSessions, tenants, users } from '@api/db';
import { eq, and, gt } from 'drizzle-orm';
import { logError } from '@shared/lib';

import {
  apiCreated,
  apiError,
  apiSuccess,
  apiUnauthorized,
  apiInternalError,
  apiNotFound,
} from '@api/api-response';
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
      return apiSuccess({ error: 'Forbidden - Platform Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    const now = new Date();
    const whereConditions = [eq(assistSessions.isActive, true), gt(assistSessions.expiresAt, now)];

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
      return apiSuccess({ error: 'Forbidden - Platform Admin access required' }, { status: 403 });
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
        id: crypto.randomUUID(),
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
