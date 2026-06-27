import { NextRequest } from 'next/server';
import {
  db,
  serviceBookings,
  paymentTransactions,
  apiSuccess,
  apiError,
  apiNotFound,
  apiInternalError,
} from '@api/server';
import { PaystackService } from '@/server/payments/paystack';
import { eq } from 'drizzle-orm';
import { logError } from '@shared/lib';
import { notifyPaymentReceived } from '@entities/marketplace/server';

const paystack = new PaystackService();

export async function POST(request: NextRequest) {
  try {
    // 1. Read raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    if (!signature) {
      return apiError('VALIDATION_ERROR', 'Missing signature', 400);
    }

    // 2. Verify Paystack HMAC-SHA512 signature
    const verification = paystack.verifyWebhookSignature(rawBody, signature);
    if (!verification.verified) {
      return apiError('VALIDATION_ERROR', 'Invalid signature', 400);
    }

    // 3. Parse event
    let event: { event?: string; data?: { reference?: string; status?: string; id?: string } };
    try {
      event = JSON.parse(rawBody);
    } catch {
      return apiError('VALIDATION_ERROR', 'Invalid JSON body', 400);
    }

    // 4. Extract bookingId from reference
    const reference = event.data?.reference;
    if (!reference?.startsWith('svc-')) {
      return apiError('VALIDATION_ERROR', 'Invalid reference format', 400);
    }

    const bookingId = reference.replace('svc-', '');

    // 5. Fetch booking
    const [booking] = await db
      .select()
      .from(serviceBookings)
      .where(eq(serviceBookings.id, bookingId))
      .limit(1);

    if (!booking) {
      return apiNotFound('Booking not found');
    }

    // 6. Idempotency: if already CONFIRMED, return 200 without changes
    if (booking.status === 'CONFIRMED') {
      return apiSuccess({ status: 'already_processed' });
    }

    // 7. Update booking based on event
    if (event.event === 'charge.success') {
      // Update booking status
      await db
        .update(serviceBookings)
        .set({
          status: 'CONFIRMED',
          paymentStatus: 'COMPLETED',
          updatedAt: new Date(),
        })
        .where(eq(serviceBookings.id, bookingId));

      // Update payment transaction
      await db
        .update(paymentTransactions)
        .set({ status: 'COMPLETED' })
        .where(eq(paymentTransactions.externalRef, reference));

      // Fire notification (non-blocking, fire-and-forget)
      notifyPaymentReceived({
        tenantId: booking.tenantId,
        providerId: booking.providerId,
        listingId: booking.listingId,
        listingTitle: 'Service Booking', // Title resolved from listing would need join
        amount: Number(booking.price ?? 0),
        transactionId: event.data?.id ?? reference,
      }).catch(() => {});
    } else if (event.event === 'charge.failed') {
      // Update booking payment status only — booking stays PENDING_CONFIRMATION
      await db
        .update(serviceBookings)
        .set({
          paymentStatus: 'FAILED',
          updatedAt: new Date(),
        })
        .where(eq(serviceBookings.id, bookingId));

      // Update payment transaction
      await db
        .update(paymentTransactions)
        .set({ status: 'FAILED' })
        .where(eq(paymentTransactions.externalRef, reference));
    }

    return apiSuccess({ status: 'processed' });
  } catch (error) {
    logError({ component: 'marketplace-webhook', operation: 'POST' }, 'Webhook error', error);
    return apiInternalError();
  }
}
