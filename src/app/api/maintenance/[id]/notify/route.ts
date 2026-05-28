import { auth } from '@api/auth';
import { hasPermission } from '@entities/tenant/api/permissions';
import { db, maintenanceRequests, users } from '@api/db';
import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/api/with-tenant';
import { sendEmail } from '@shared/api/email/resend';
import { createLogger } from '@shared/lib';
import { apiSuccess, apiUnauthorized, apiForbidden, apiNotFound } from '@api/api-response';

const notifyLogger = createLogger('maintenance-notify');

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
    return apiUnauthorized();
  }

  const canViewAll = hasPermission(authData.role, 'requests');
  if (!canViewAll) {
    return apiForbidden();
  }

  const [mr] = await db
    .select()
    .from(maintenanceRequests)
    .where(and(eq(maintenanceRequests.id, id), eq(maintenanceRequests.tenantId, tenantId)))
    .limit(1);

  if (!mr) {
    return apiNotFound('Not found');
  }

  const [resident] = await db.select().from(users).where(eq(users.id, mr.userId)).limit(1);

  if (!resident?.email) {
    return apiNotFound('Resident email not found');
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

  const statusSubject: Record<string, string> = {
    SUBMITTED: 'Maintenance Request Received',
    ASSIGNED: 'Maintenance Request Assigned',
    IN_PROGRESS: 'Work Started on Your Request',
    PENDING_PARTS: 'Maintenance Request - Pending Parts',
    SCHEDULED: 'Maintenance Request Scheduled',
    COMPLETED: 'Maintenance Request Completed',
    CANCELLED: 'Maintenance Request Cancelled',
  };

  const message =
    statusMessages[mr.status] ||
    `Your maintenance request status has been updated to ${mr.status}.`;

  const subject = statusSubject[mr.status] || 'Maintenance Request Update';

  // Build HTML email
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
    <h2 style="color: #4F46E5; margin: 0 0 16px 0;">Soralia Village - Maintenance Update</h2>
    <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">${message}</p>
    <div style="background: white; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <p style="margin: 8px 0; color: #6b7280; font-size: 14px;">
        <strong>Category:</strong> ${mr.category}
      </p>
      <p style="margin: 8px 0; color: #6b7280; font-size: 14px;">
        <strong>Priority:</strong> ${mr.priority}
      </p>
      <p style="margin: 8px 0; color: #6b7280; font-size: 14px;">
        <strong>Status:</strong> ${mr.status}
      </p>
      <p style="margin: 8px 0; color: #6b7280; font-size: 14px;">
        <strong>Description:</strong> ${mr.description?.substring(0, 200)}...
      </p>
    </div>
    <p style="color: #9ca3af; font-size: 12px; margin: 16px 0 0 0;">
      Log in to your Soralia Village portal to view full details and track progress.
    </p>
  </div>
</body>
</html>`;

  // Send email notification
  const emailResult = await sendEmail({
    to: resident.email,
    subject,
    html,
  });

  if (!emailResult.success) {
    notifyLogger.error(
      { email: resident.email, error: emailResult.error },
      'Failed to send notification'
    );
  } else {
    notifyLogger.info({ email: resident.email }, 'Notification sent');
  }

  return apiSuccess({
    success: true,
    message: 'Notification sent',
    recipient: resident.email,
    emailSent: emailResult.success,
  });
}
