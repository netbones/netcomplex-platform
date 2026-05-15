import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@api/auth';
import { db, assistSessions, tenants, users } from '@api/db';
import { eq, and, gt } from 'drizzle-orm';
import { logError } from '@shared/lib';

export async function GET(request: NextRequest) {
  try {
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

    return NextResponse.json(sessions);
  } catch (error) {
    logError(
      { component: 'assist-api', operation: 'LIST' },
      'Failed to list assist sessions',
      error
    );
    return NextResponse.json({ error: 'Failed to list assist sessions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const { tenantId, notes } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    // Validate tenant exists
    const tenant = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant[0]) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
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

    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    logError(
      { component: 'assist-api', operation: 'CREATE' },
      'Failed to create assist session',
      error
    );
    return NextResponse.json({ error: 'Failed to create assist session' }, { status: 500 });
  }
}
