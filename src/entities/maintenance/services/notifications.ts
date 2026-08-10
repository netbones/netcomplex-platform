import { db, notifications, users } from '@api/server';
import { broadcastNotification, createComponentLogger } from '@shared/lib';
import { createId } from '@shared/lib/id';
import { and, eq, sql } from 'drizzle-orm';

const log = createComponentLogger('maintenance-notifications');

// Admin roles with the `requests` permission per ROLE_PERMISSIONS (src/shared/lib/permissions.ts):
// COMMITTEE, BOARD, ADMIN, MANAGER. Inlined in the SQL IN (...) query below.

export const MAINTENANCE_STATUS_MESSAGES: Record<string, string> = {
  SUBMITTED: 'Your maintenance request has been submitted and is awaiting review.',
  ASSIGNED: 'Your maintenance request has been assigned to a team member.',
  IN_PROGRESS: 'Work has started on your maintenance request.',
  PENDING_PARTS: 'Your maintenance request is pending parts delivery.',
  SCHEDULED: 'Your maintenance request has been scheduled for repair.',
  COMPLETED: 'Your maintenance request has been completed.',
  CANCELLED: 'Your maintenance request has been cancelled.',
};

export const MAINTENANCE_STATUS_SUBJECTS: Record<string, string> = {
  SUBMITTED: 'Maintenance Request Received',
  ASSIGNED: 'Maintenance Request Assigned',
  IN_PROGRESS: 'Work Started on Your Request',
  PENDING_PARTS: 'Maintenance Request - Pending Parts',
  SCHEDULED: 'Maintenance Request Scheduled',
  COMPLETED: 'Maintenance Request Completed',
  CANCELLED: 'Maintenance Request Cancelled',
};

export function maintenanceStatusMessage(status: string): string {
  return (
    MAINTENANCE_STATUS_MESSAGES[status] ||
    `Your maintenance request status has been updated to ${status}.`
  );
}

export function maintenanceStatusSubject(status: string): string {
  return MAINTENANCE_STATUS_SUBJECTS[status] || 'Maintenance Request Update';
}

interface NotificationParams {
  tenantId: string;
  recipientUserId: string;
  senderId?: string | null;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  payload: Record<string, unknown>;
  link?: string;
}

async function insertMaintenanceNotification(params: NotificationParams): Promise<void> {
  try {
    const [notification] = await db
      .insert(notifications)
      .values({
        id: createId(),
        tenantId: params.tenantId,
        userId: params.recipientUserId,
        senderId: params.senderId ?? null,
        title: params.title,
        message: params.message,
        type: params.type,
        category: 'MAINTENANCE',
        payload: params.payload,
        link: params.link || '',
        read: false,
      })
      .returning();

    broadcastNotification(
      params.recipientUserId,
      notification as unknown as Record<string, unknown>
    );
  } catch (error) {
    log.error(
      { operation: 'insertMaintenanceNotification', recipientUserId: params.recipientUserId },
      'Failed to create maintenance notification',
      error
    );
  }
}

/**
 * Notify the resident/requester that their maintenance request status changed.
 */
export async function notifyResidentStatusChange(params: {
  tenantId: string;
  requestId: string;
  residentUserId: string;
  senderId: string;
  status: string;
  category: string;
  ticketNumber?: string | null;
}): Promise<void> {
  const type: NotificationParams['type'] =
    params.status === 'COMPLETED' ? 'success' : params.status === 'CANCELLED' ? 'warning' : 'info';

  await insertMaintenanceNotification({
    tenantId: params.tenantId,
    recipientUserId: params.residentUserId,
    senderId: params.senderId,
    title: maintenanceStatusSubject(params.status),
    message: maintenanceStatusMessage(params.status),
    type,
    payload: {
      requestId: params.requestId,
      ticketNumber: params.ticketNumber ?? null,
      status: params.status,
      category: params.category,
    },
    link: `/dashboard/services/maintenance/${params.requestId}`,
  });
}

/**
 * Fanout: notify all active tenant admins (roles with `requests` permission) of a new request.
 * Excludes the requester so they don't get notified of their own submission.
 */
export async function notifyAdminsNewRequest(params: {
  tenantId: string;
  requestId: string;
  requesterId: string;
  category: string;
  priority: string;
}): Promise<void> {
  const adminUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.tenantId, params.tenantId),
        sql`${users.role} IN ('COMMITTEE', 'BOARD', 'ADMIN', 'MANAGER')`,
        eq(users.isActive, true)
      )
    );

  if (adminUsers.length === 0) return;

  await Promise.all(
    adminUsers
      .filter(admin => admin.id !== params.requesterId)
      .map(admin =>
        insertMaintenanceNotification({
          tenantId: params.tenantId,
          recipientUserId: admin.id,
          senderId: params.requesterId,
          title: 'New maintenance request',
          message: `A new ${params.priority.toLowerCase()} maintenance request (${params.category}) has been submitted.`,
          type: 'info',
          payload: {
            requestId: params.requestId,
            category: params.category,
            priority: params.priority,
          },
          link: `/dashboard/services/maintenance/${params.requestId}`,
        })
      )
  );
}
