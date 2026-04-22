import { db, userGroups } from '@api/db';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { withTenant } from '@api/tenant/server';

export async function POST(request: Request) {
  const body = await request.json();
  const { userId, groupId, role = 'MEMBER' } = body;

  // Check for existing membership
  const [existing] = await db
    .select({ id: userGroups.id })
    .from(userGroups)
    .where(and(eq(userGroups.userId, userId), eq(userGroups.groupId, groupId)))
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: 'Already a member' }, { status: 400 });
  }

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const [membership] = await db
    .insert(userGroups)
    .values({
      id: crypto.randomUUID(),
      tenantId,
      userId,
      groupId,
      role,
      joinedAt: new Date(),
    })
    .returning();

  return NextResponse.json(membership, { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const groupId = searchParams.get('groupId');

  if (!userId || !groupId) {
    return NextResponse.json({ error: 'Missing userId or groupId' }, { status: 400 });
  }

  await db
    .delete(userGroups)
    .where(and(eq(userGroups.userId, userId), eq(userGroups.groupId, groupId)));

  return NextResponse.json({ success: true });
}
