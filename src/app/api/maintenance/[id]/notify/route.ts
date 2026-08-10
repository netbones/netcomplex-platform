import {
  db,
  maintenanceRequests,
  users,
  apiSuccess,
  apiNotFound,
  sendEmail,
  withErrorHandler,
} from '@api/server';

import { requireAuth } from '@/shared/api/auth-utils';

import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { maintenanceStatusMessage, maintenanceStatusSubject } from '@entities/maintenance/server';

import { createLogger } from '@shared/lib';

export const maxDuration = 8;

const notifyLogger = createLogger('maintenance-notify');
export const POST = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const { tenantId, tenantSlug } = await withTenant();
    const tenantName = tenantSlug || 'Netcomplex';

    const auth = await requireAuth(request, { permission: 'requests', module: 'maintenance' });
    if (!auth.success) return auth.response;

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

    const message = maintenanceStatusMessage(mr.status);

    const subject = maintenanceStatusSubject(mr.status);

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
    <h2 style="color: #4F46E5; margin: 0 0 16px 0;">${tenantName} - Maintenance Update</h2>
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
      Log in to your ${tenantName} portal to view full details and track progress.
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
);
