import { db, invitations } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
  const invitationList = await db.select().from(invitations).orderBy(desc(invitations.createdAt));
  return NextResponse.json(invitationList);
}

export async function POST(request: Request) {
  const body = await request.json();

  // For now, use a placeholder - in production this would come from the authenticated user
  const inviterId = body.inviterId || 'placeholder-user-id';
  const organizationId = body.organizationId || 'placeholder-org-id';

  const [invitation] = await db
    .insert(invitations)
    .values({
      id: crypto.randomUUID(),
      email: body.email,
      name: body.name,
      role: body.role ?? 'RESIDENT',
      residentType: body.residentType ?? 'OWNER',
      inviterId,
      organizationId,
      token: crypto.randomUUID(),
      status: 'PENDING',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    })
    .returning();

  return NextResponse.json(invitation, { status: 201 });
}
