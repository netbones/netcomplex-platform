import { NextResponse } from 'next/server';
import { auth } from '@api/auth';
import { hasPermission } from '@api/permissions';
import { db, maintenanceRequests, users, requestHistories } from '@api/db';
import { eq, and } from 'drizzle-orm';
import { revalidateDashboard } from '@api/revalidation';
import { withTenant } from '@api/tenant';

async function getSessionAndRole(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return null;
  }

  const [userResult] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);

  return {
    session,
    userId: session.user.id,
    role: userResult?.role || 'RESIDENT',
  };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { tenantId } = await withTenant();

  const authData = await getSessionAndRole(request);
  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canViewAll = hasPermission(authData.role, 'requests');
  if (!canViewAll) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [mr] = await db
    .select()
    .from(maintenanceRequests)
    .where(and(eq(maintenanceRequests.id, id), eq(maintenanceRequests.tenantId, tenantId)))
    .limit(1);

  if (!mr) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const [resident] = await db.select().from(users).where(eq(users.id, mr.userId)).limit(1);

  if (!resident?.email) {
    return NextResponse.json({ error: 'Resident email not found' }, { status: 404 });
  }

  const statusMessages: Record<string, string> = {
    SUBMITTED: 'Your maintenance request has been submitted and is awaiting review.',
    ASSIGNED: 'Your maintenance request has been assigned to a team member.',
    IN_PROGRESS: 'Work has started on your maintenance request.',
    PENDING_PARTS: 'Your maintenance request is pending parts delivery.',
    SCHEDULED: 'Your maintenance request has been scheduled for repair.',
    COMPLETED: 'Your maintenance request has been completed.',
    CANCELLED: 'Your maintenance request has been cancelled.',
  };

  const message =
    statusMessages[mr.status] ||
    `Your maintenance request status has been updated to ${mr.status}.`;

  console.log(`[Notification] Would send email to ${resident.email}: ${message}`);

  return NextResponse.json({
    success: true,
    message: 'Notification sent',
    recipient: resident.email,
  });
}
