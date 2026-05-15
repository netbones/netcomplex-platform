import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@api/auth';
import { db, assistSessions, tenants, users } from '@api/db';
import { eq } from 'drizzle-orm';
import { logError } from '@shared/lib';

async function getAssistSession(id: string) {
  const [session] = await db
    .select()
    .from(assistSessions)
    .where(eq(assistSessions.id, id))
    .limit(1);
  return session;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const assistSession = await getAssistSession(id);
    if (!assistSession) {
      return NextResponse.json({ error: 'Assist session not found' }, { status: 404 });
    }

    if (!assistSession.isActive) {
      return NextResponse.json({ error: 'Assist session already revoked' }, { status: 400 });
    }

    // Check if user is platform admin OR tenant owner
    const user = await db
      .select({ isPlatformAdmin: users.isPlatformAdmin })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    const isPlatformAdmin = user[0]?.isPlatformAdmin ?? false;

    const tenant = await db
      .select({ ownerId: tenants.ownerId })
      .from(tenants)
      .where(eq(tenants.id, assistSession.tenantId))
      .limit(1);

    const isTenantOwner = tenant[0]?.ownerId === session.user.id;

    if (!isPlatformAdmin && !isTenantOwner) {
      return NextResponse.json(
        { error: 'Forbidden - Platform Admin or tenant owner access required' },
        { status: 403 }
      );
    }

    await db
      .update(assistSessions)
      .set({
        isActive: false,
        revokedAt: new Date(),
        revokedBy: session.user.id,
      })
      .where(eq(assistSessions.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    logError(
      { component: 'assist-api', operation: 'REVOKE' },
      'Failed to revoke assist session',
      error
    );
    return NextResponse.json({ error: 'Failed to revoke assist session' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

    const assistSession = await getAssistSession(id);
    if (!assistSession) {
      return NextResponse.json({ error: 'Assist session not found' }, { status: 404 });
    }

    const body = await request.json();
    const { expiresAt } = body;

    if (!expiresAt) {
      return NextResponse.json({ error: 'expiresAt is required' }, { status: 400 });
    }

    const newExpiry = new Date(expiresAt);

    const [updated] = await db
      .update(assistSessions)
      .set({ expiresAt: newExpiry })
      .where(eq(assistSessions.id, id))
      .returning({
        id: assistSessions.id,
        expiresAt: assistSessions.expiresAt,
      });

    return NextResponse.json(updated);
  } catch (error) {
    logError(
      { component: 'assist-api', operation: 'EXTEND' },
      'Failed to extend assist session',
      error
    );
    return NextResponse.json({ error: 'Failed to extend assist session' }, { status: 500 });
  }
}
