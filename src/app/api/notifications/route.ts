import {
  auth,
  db,
  notifications,
  users,
  apiCreated,
  apiError,
  apiGone,
  apiSuccess,
  apiUnauthorized,
  notDeleted,
  rateLimitByUser,
  sendEmail,
  templates,
} from '@api/server';

import { eq, and, desc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';
import { createLogger } from '@shared/lib';

export const maxDuration = 8;

const notifyLogger = createLogger('notifications');

async function getSessionAndUserId(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return null;
  }

  return session.user.id;
}

/**
 * Get notifications for the current user.
 * Returns up to 50 notifications, optionally filtered by unread status.
 */
export async function GET(request: Request) {
  const { tenantId } = await withTenant();
  const userId = await getSessionAndUserId(request);

  if (!userId) {
    return apiUnauthorized();
  }

  const { searchParams } = new URL(request.url);
  const unread = searchParams.get('unread');

  const unreadOnly = unread === 'true';

  const results = await db
    .select()
    .from(notifications)
    .where(
      and(
        notDeleted(notifications),
        eq(notifications.userId, userId),
        eq(notifications.tenantId, tenantId)
      )
    )
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  const filtered = unreadOnly ? results.filter(n => !n.read) : results;

  return apiSuccess(filtered);
}

/**
 * Create a new notification.
 * Optionally sends an email if sendEmail is true and user has email notifications enabled.
 */
export async function POST(request: Request) {
  const { tenantId } = await withTenant();
  const userId = await getSessionAndUserId(request);

  if (!userId) {
    return apiUnauthorized();
  }

  // Rate limit: 60 notification create/modify operations per minute per user
  const rateLimit = await rateLimitByUser(userId, { windowMs: 60_000, maxRequests: 60 });
  if (rateLimit) return rateLimit;

  const body = await request.json();
  const targetUserId = body.userId || userId;
  const sendEmailNotification = body.sendEmail === true;

  // Create the notification
  const [newNotification] = await db
    .insert(notifications)
    .values({
      id: crypto.randomUUID(),
      tenantId,
      userId: targetUserId,
      title: body.title,
      message: body.message,
      type: (body.type || 'info') as 'info' | 'warning' | 'success' | 'error',
      link: body.link || '',
      read: false,
    })
    .returning();

  // Send email notification if requested and user has email notifications enabled
  if (sendEmailNotification) {
    await sendEmailNotificationIfEnabled(targetUserId, body.title, body.message).catch(error => {
      logError(
        { component: 'notifications-api', operation: 'SEND_EMAIL' },
        'Failed to send email notification',
        error
      );
    });
  }

  return apiCreated(newNotification);
}

/**
 * Mark notifications as read.
 * Supports marking single notification or all notifications as read.
 */
export async function PATCH(request: Request) {
  const { tenantId } = await withTenant();
  const userId = await getSessionAndUserId(request);

  if (!userId) {
    return apiUnauthorized();
  }

  // Rate limit: 60 notification create/modify operations per minute per user
  const rateLimit = await rateLimitByUser(userId, { windowMs: 60_000, maxRequests: 60 });
  if (rateLimit) return rateLimit;

  const body = await request.json();

  if (body.all) {
    await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          notDeleted(notifications),
          eq(notifications.userId, userId),
          eq(notifications.tenantId, tenantId)
        )
      );
  } else if (body.id) {
    await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          notDeleted(notifications),
          eq(notifications.id, body.id),
          eq(notifications.tenantId, tenantId)
        )
      );
  }

  return apiSuccess({ success: true });
}

/**
 * Send email notification if user has email notifications enabled.
 * Checks user preferences before sending.
 */
async function sendEmailNotificationIfEnabled(
  userId: string,
  title: string,
  message: string
): Promise<void> {
  try {
    // Get user and check email notification preference
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      notifyLogger.warn({ userId }, 'User not found, skipping notification email');
      return;
    }

    // Check if user has email notifications enabled
    // Using showEmail as a proxy for email notification preference
    if (!user.showEmail) {
      notifyLogger.debug({ userId }, 'User has email notifications disabled');
      return;
    }

    // Send email notification
    const html = templates.emailNotification.getHtml(title, message);

    await sendEmail({
      to: user.email,
      subject: `Soralia Village: ${title}`,
      html,
    });

    notifyLogger.info({ email: user.email }, 'Notification email sent');
  } catch (error) {
    notifyLogger.error({ userId, error }, 'Failed to send notification email');
    // Don't throw - email failure shouldn't fail the notification creation
  }
}
