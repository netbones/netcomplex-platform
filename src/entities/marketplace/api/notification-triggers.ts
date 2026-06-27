import { db, notifications, supabase } from '@api/server';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('marketplace-notifications');

interface CreateNotificationParams {
  tenantId: string;
  recipientUserId: string;
  senderId?: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  payload: Record<string, unknown>;
  link?: string;
}

async function createMarketplaceNotification(params: CreateNotificationParams): Promise<void> {
  try {
    const [notification] = await db
      .insert(notifications)
      .values({
        id: crypto.randomUUID(),
        tenantId: params.tenantId,
        userId: params.recipientUserId,
        senderId: params.senderId || null,
        title: params.title,
        message: params.message,
        type: params.type,
        category: 'MARKETPLACE',
        payload: params.payload,
        link: params.link || '',
        read: false,
      })
      .returning();

    // Broadcast via Supabase Realtime (non-blocking)
    supabase
      .channel(`notifications:${params.recipientUserId}`)
      .send({
        type: 'broadcast',
        event: 'new-notification',
        payload: notification,
      })
      .catch(() => {});
  } catch (error) {
    log.error(
      { operation: 'createMarketplaceNotification' },
      'Failed to create notification',
      error
    );
  }
}

// ── 8 Lifecycle Trigger Functions ──

export async function notifyInquiryReceived(params: {
  tenantId: string;
  providerId: string;
  listingId: string;
  listingTitle: string;
  inquirerName: string;
  inquirerId: string;
}): Promise<void> {
  await createMarketplaceNotification({
    tenantId: params.tenantId,
    recipientUserId: params.providerId,
    senderId: params.inquirerId,
    title: `New inquiry on "${params.listingTitle}"`,
    message: `${params.inquirerName} has sent an inquiry about your service.`,
    type: 'info',
    payload: { listingId: params.listingId, event: 'inquiry_received' },
    link: '/dashboard/providers/inquiries',
  });
}

export async function notifyInquiryResponse(params: {
  tenantId: string;
  inquirerId: string;
  providerName: string;
  listingId: string;
  listingTitle: string;
}): Promise<void> {
  await createMarketplaceNotification({
    tenantId: params.tenantId,
    recipientUserId: params.inquirerId,
    title: `Response to your inquiry on "${params.listingTitle}"`,
    message: `${params.providerName} has responded to your inquiry.`,
    type: 'info',
    payload: { listingId: params.listingId, event: 'inquiry_response' },
  });
}

export async function notifyBookingConfirmed(params: {
  tenantId: string;
  residentId: string;
  providerId: string;
  listingId: string;
  listingTitle: string;
  date: string;
  startTime: string;
  endTime: string;
}): Promise<void> {
  const bookingPayload = {
    listingId: params.listingId,
    event: 'booking_confirmed',
    date: params.date,
    startTime: params.startTime,
    endTime: params.endTime,
  };

  // Notify the resident
  await createMarketplaceNotification({
    tenantId: params.tenantId,
    recipientUserId: params.residentId,
    title: `Booking confirmed: "${params.listingTitle}"`,
    message: `Your booking for ${params.date} at ${params.startTime} has been confirmed.`,
    type: 'success',
    payload: bookingPayload,
  });

  // Notify the provider
  await createMarketplaceNotification({
    tenantId: params.tenantId,
    recipientUserId: params.providerId,
    title: `New booking confirmed: "${params.listingTitle}"`,
    message: `A new booking has been confirmed for ${params.date} at ${params.startTime}.`,
    type: 'success',
    payload: bookingPayload,
  });
}

export async function notifyPaymentReceived(params: {
  tenantId: string;
  providerId: string;
  listingId: string;
  listingTitle: string;
  amount: number;
  transactionId: string;
}): Promise<void> {
  await createMarketplaceNotification({
    tenantId: params.tenantId,
    recipientUserId: params.providerId,
    title: `Payment received for "${params.listingTitle}"`,
    message: `A payment of R${params.amount.toFixed(2)} has been received for your service.`,
    type: 'success',
    payload: {
      listingId: params.listingId,
      event: 'payment_received',
      amount: params.amount,
      transactionId: params.transactionId,
    },
  });
}

export async function notifyReviewPosted(params: {
  tenantId: string;
  providerId: string;
  listingId: string;
  listingTitle: string;
  reviewerName: string;
  rating: number;
}): Promise<void> {
  await createMarketplaceNotification({
    tenantId: params.tenantId,
    recipientUserId: params.providerId,
    title: `New review on "${params.listingTitle}"`,
    message: `${params.reviewerName} left a ${params.rating}-star review on your listing.`,
    type: 'info',
    payload: {
      listingId: params.listingId,
      event: 'review_posted',
      rating: params.rating,
    },
  });
}

export async function notifyListingApproved(params: {
  tenantId: string;
  providerId: string;
  listingId: string;
  listingTitle: string;
}): Promise<void> {
  await createMarketplaceNotification({
    tenantId: params.tenantId,
    recipientUserId: params.providerId,
    title: `Listing approved: "${params.listingTitle}"`,
    message: `Your service listing has been approved and is now visible to residents.`,
    type: 'success',
    payload: { listingId: params.listingId, event: 'listing_approved' },
  });
}

export async function notifyListingRejected(params: {
  tenantId: string;
  providerId: string;
  listingId: string;
  listingTitle: string;
  reason?: string;
}): Promise<void> {
  await createMarketplaceNotification({
    tenantId: params.tenantId,
    recipientUserId: params.providerId,
    title: `Listing not approved: "${params.listingTitle}"`,
    message: params.reason
      ? `Your listing was not approved. Reason: ${params.reason}`
      : `Your listing was not approved. Please review and resubmit.`,
    type: 'warning',
    payload: {
      listingId: params.listingId,
      event: 'listing_rejected',
      reason: params.reason || null,
    },
  });
}

export async function notifyBookingCancelled(params: {
  tenantId: string;
  providerId: string;
  listingId: string;
  listingTitle: string;
  cancelledBy: string;
}): Promise<void> {
  await createMarketplaceNotification({
    tenantId: params.tenantId,
    recipientUserId: params.providerId,
    title: `Booking cancelled for "${params.listingTitle}"`,
    message: `A booking has been cancelled by the ${params.cancelledBy}.`,
    type: 'warning',
    payload: {
      listingId: params.listingId,
      event: 'booking_cancelled',
      cancelledBy: params.cancelledBy,
    },
  });
}
