import { db, invitations } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(invitations).where(eq(invitations.id, id));
  return NextResponse.json({ success: true });
}
