import { db, invitations } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { withTenant } from '@/lib/tenant/with-tenant';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = await withTenant();
  const { id } = await params;
  await db
    .delete(invitations)
    .where(and(eq(invitations.id, id), eq(invitations.tenantId, tenantId)));
  return NextResponse.json({ success: true });
}
