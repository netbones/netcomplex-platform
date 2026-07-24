import { createId, db, type DbSchema } from '@api/server';
import { notifications } from '@/db/schema';
import type { MeetingProxy } from '@/features/proxy-vote/model/types';

type DrizzleDB = DbSchema | typeof db;

interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: false;
  category: 'proxy_vote';
  payload: Record<string, unknown>;
}

function notificationBase(
  tenantId: string,
  userId: string
): Pick<Notification, 'id' | 'tenantId' | 'userId' | 'read' | 'category'> {
  return {
    id: createId(),
    tenantId,
    userId,
    read: false,
    category: 'proxy_vote',
  };
}

async function insertNotification(notif: Notification): Promise<void> {
  await db.insert(notifications).values(notif);
}

async function notifyProxyNominated(
  proxy: MeetingProxy,
  ownerName: string,
  meetingTitle: string
): Promise<void> {
  if (!proxy.proxyUserId) return;
  await insertNotification({
    ...notificationBase(proxy.tenantId, proxy.proxyUserId),
    title: 'You have been nominated as a proxy',
    message: `${ownerName} has appointed you as proxy for "${meetingTitle}". Review and accept.`,
    type: 'info',
    payload: { proxyId: proxy.id, meetingId: proxy.meetingId },
  });
}

async function notifyProxyAccepted(proxy: MeetingProxy): Promise<void> {
  await insertNotification({
    ...notificationBase(proxy.tenantId, proxy.ownerUserId),
    title: 'Proxy accepted',
    message: `Your proxy appointment has been accepted and is now awaiting HOA review.`,
    type: 'success',
    payload: { proxyId: proxy.id },
  });
}

async function notifyProxyDeclined(proxy: MeetingProxy): Promise<void> {
  await insertNotification({
    ...notificationBase(proxy.tenantId, proxy.ownerUserId),
    title: 'Proxy declined',
    message: `Your proxy declined the appointment. Please appoint a new proxy or attend in person.`,
    type: 'warning',
    payload: { proxyId: proxy.id },
  });
}

async function notifyHoaNewProxy(proxy: MeetingProxy, meetingTitle: string): Promise<void> {
  await insertNotification({
    ...notificationBase(proxy.tenantId, proxy.ownerUserId),
    title: 'New proxy on file',
    message: `New proxy received for "${meetingTitle}".`,
    type: 'info',
    payload: { proxyId: proxy.id, audience: 'hoa' },
  });
}

async function notifyHoaReadyForReview(proxy: MeetingProxy): Promise<void> {
  await insertNotification({
    ...notificationBase(proxy.tenantId, proxy.ownerUserId),
    title: 'Proxy ready for HOA review',
    message: `A proxy is signed by both owner and proxy. Ready for HOA review.`,
    type: 'info',
    payload: { proxyId: proxy.id, audience: 'hoa' },
  });
}

async function notifyOwnerApproved(proxy: MeetingProxy): Promise<void> {
  await insertNotification({
    ...notificationBase(proxy.tenantId, proxy.ownerUserId),
    title: 'Proxy approved',
    message: proxy.referenceCode
      ? `Your proxy was approved. QR Reference: ${proxy.referenceCode}`
      : 'Your proxy was approved.',
    type: 'success',
    payload: { proxyId: proxy.id, referenceCode: proxy.referenceCode },
  });
}

async function notifyOwnerRejected(proxy: MeetingProxy): Promise<void> {
  await insertNotification({
    ...notificationBase(proxy.tenantId, proxy.ownerUserId),
    title: 'Proxy rejected',
    message: `Your proxy was rejected${proxy.notes ? `: ${proxy.notes}` : '.'}`,
    type: 'error',
    payload: { proxyId: proxy.id, notes: proxy.notes },
  });
}

async function notifyReminder(proxy: MeetingProxy): Promise<void> {
  if (!proxy.proxyUserId) return;
  await insertNotification({
    ...notificationBase(proxy.tenantId, proxy.proxyUserId),
    title: 'Reminder to sign',
    message: `Reminder: please review and sign your proxy appointment.`,
    type: 'warning',
    payload: { proxyId: proxy.id },
  });
}

export const proxyNotifyService = {
  notifyProxyNominated,
  notifyProxyAccepted,
  notifyProxyDeclined,
  notifyHoaNewProxy,
  notifyHoaReadyForReview,
  notifyOwnerApproved,
  notifyOwnerRejected,
  notifyReminder,
};

export type { DrizzleDB };
