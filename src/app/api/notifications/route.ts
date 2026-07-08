import {
  auth,
  db,
  notifications,
  users,
  supabase,
  apiCreated,
  apiSuccess,
  apiUnauthorized,
  notDeleted,
  rateLimitByUser,
  sendEmail,
  templates,
} from '@api/server';

import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';
import { createLogger } from '@shared/lib';
import { createId } from '@shared/lib/id';

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
 * Create or return an existing notification by idempotency key.
 * If `Idempotency-Key` header or `body.idempotencyKey` is provided and a notification
 * with that key already exists, returns the existing one (200) instead of creating a duplicate.
 */
export async function PUT(request: Request) {
  const { tenantId } = await withTenant();
  const userId = await getSessionAndUserId(request);

  if (!userId) {
    return apiUnauthorized();
  }

  // Rate limit: 60 notification create/modify operations per minute per user
  const rateLimit = await rateLimitByUser(userId, { windowMs: 60_000, maxRequests: 60 });
  if (rateLimit) return rateLimit;

  const body = await request.json();
  const idempotencyKey = request.headers.get('Idempotency-Key') || body.idempotencyKey;

  if (!idempotencyKey) {
    // No idempotency key — fall through to POST behaviour
    return POST(request);
  }

  // Check if a notification with this idempotency key already exists
  const existing = await db
    .select()
    .from(notifications)
    .where(
      and(
        notDeleted(notifications),
        eq(notifications.tenantId, tenantId),
        sql`${notifications.payload}->>'_idempotencyKey' = ${idempotencyKey}`
      )
    )
    .limit(1);

  if (existing[0]) {
    return apiSuccess(existing[0]);
  }

  // Create new notification with idempotency key stored in payload
  const mergedPayload = { ...(body.payload || {}), _idempotencyKey: idempotencyKey };
  const targetUserId = body.userId || userId;
  const sendEmailNotification = body.sendEmail === true;

  const [newNotification] = await db
    .insert(notifications)
    .values({
      id: createId(),
      tenantId,
      userId: targetUserId,
      senderId: body.senderId || null,
      title: body.title,
      message: body.message,
      type: (body.type || 'info') as 'info' | 'warning' | 'success' | 'error',
      link: body.link || '',
      payload: mergedPayload,
      read: false,
    })
    .returning();

  // Send email notification if requested and user has email notifications enabled
  if (sendEmailNotification) {
    await sendEmailNotificationIfEnabled(
      targetUserId,
      body.title,
      body.message,
      body.type || 'info',
      newNotification.id
    ).catch(error => {
      logError(
        { component: 'notifications-api', operation: 'SEND_EMAIL' },
        'Failed to send email notification',
        error
      );
    });
  }

  // Broadcast via Supabase Realtime
  supabase
    .channel(`notifications:${targetUserId}`)
    .send({
      type: 'broadcast',
      event: 'new-notification',
      payload: newNotification,
    })
    .catch(error => {
      logError(
        { component: 'notifications-api', operation: 'REALTIME_BROADCAST' },
        'Failed to broadcast notification',
        error
      );
    });

  return apiCreated(newNotification);
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
      id: createId(),
      tenantId,
      userId: targetUserId,
      senderId: body.senderId || null,
      title: body.title,
      message: body.message,
      type: (body.type || 'info') as 'info' | 'warning' | 'success' | 'error',
      link: body.link || '',
      payload: body.payload || null,
      read: false,
    })
    .returning();

  // Send email notification if requested and user has email notifications enabled
  if (sendEmailNotification) {
    await sendEmailNotificationIfEnabled(
      targetUserId,
      body.title,
      body.message,
      body.type || 'info',
      newNotification.id
    ).catch(error => {
      logError(
        { component: 'notifications-api', operation: 'SEND_EMAIL' },
        'Failed to send email notification',
        error
      );
    });
  }

  // Broadcast via Supabase Realtime so subscribed clients get instant updates
  supabase
    .channel(`notifications:${targetUserId}`)
    .send({
      type: 'broadcast',
      event: 'new-notification',
      payload: newNotification,
    })
    .catch(error => {
      logError(
        { component: 'notifications-api', operation: 'REALTIME_BROADCAST' },
        'Failed to broadcast notification',
        error
      );
    });

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
      .set({ read: true, readAt: new Date() })
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
      .set({ read: true, readAt: new Date() })
      .where(
        and(
          notDeleted(notifications),
          eq(notifications.id, body.id),
          eq(notifications.tenantId, tenantId)
        )
      );
  } else if (body.ids && Array.isArray(body.ids) && body.ids.length > 0) {
    await db
      .update(notifications)
      .set({ read: true, readAt: new Date() })
      .where(
        and(
          notDeleted(notifications),
          inArray(notifications.id, body.ids),
          eq(notifications.userId, userId),
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
  message: string,
  type: string = 'info',
  notificationId?: string
): Promise<void> {
  try {
    // Get user and check email notification preference
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      notifyLogger.warn({ userId }, 'User not found, skipping notification email');
      await updateDeliveryStatus(notificationId, 'FAILED');
      return;
    }

    // Check per-type notification preference (fall back to showEmail for backward compat)
    const prefs = user.notificationPreferences as Record<string, { email?: boolean }> | null;
    const emailEnabled = prefs?.[type]?.email ?? user.showEmail;

    if (!emailEnabled) {
      notifyLogger.debug({ userId, type }, 'Email notifications disabled for this type');
      await updateDeliveryStatus(notificationId, 'SKIPPED');
      return;
    }

    // Send email notification with retry
    const html = templates.emailNotification.getHtml(
      title,
      message,
      `${process.env.NEXT_PUBLIC_APP_URL || ''}/notifications`
    );
    let lastError: unknown;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (attempt > 1) {
          const delay = Math.min(1000 * 2 ** (attempt - 1), 10_000);
          await new Promise(r => setTimeout(r, delay));
        }
        await updateDeliveryStatus(notificationId, 'SENDING');
        await sendEmail({
          to: user.email,
          subject: templates.emailNotification.subject(),
          html,
        });
        await updateDeliveryStatus(notificationId, 'SENT');
        notifyLogger.info({ email: user.email, attempt }, 'Notification email sent');
        return;
      } catch (error) {
        lastError = error;
        notifyLogger.warn({ email: user.email, attempt, error }, 'Email send attempt failed');
      }
    }

    await updateDeliveryStatus(notificationId, 'FAILED');
    notifyLogger.error(
      { userId, error: lastError },
      'Failed to send notification email after 3 attempts'
    );
  } catch (error) {
    notifyLogger.error({ userId, error }, 'Failed to send notification email');
  }
}

async function updateDeliveryStatus(notificationId: string | undefined, status: string) {
  if (!notificationId) return;
  await db
    .update(notifications)
    .set({ deliveryStatus: status })
    .where(eq(notifications.id, notificationId))
    .catch(() => {});
}
