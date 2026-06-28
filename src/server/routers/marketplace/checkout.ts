import { z } from 'zod';
import {
  publicProcedure,
  protectedProcedure,
  db,
  serviceBookings,
  paymentTransactions,
  now,
} from '@api/server';
import { TRPCError } from '@trpc/server';
import { eq, and } from 'drizzle-orm';
import {
  initializeCheckout,
  checkoutRequestSchema,
  notifyPaymentReceived,
} from '@entities/marketplace/server';
import { getPlatformPageFlags } from '@entities/tenant/server';
import { PaystackService } from '@/server/payments/paystack';

const WebhookInput = z.object({
  body: z.string(),
  signature: z.string(),
});

export const checkoutProcedures = {
  createCheckoutSession: protectedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/marketplace/checkout',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .input(checkoutRequestSchema)
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const [booking] = await db
        .select()
        .from(serviceBookings)
        .where(eq(serviceBookings.id, input.bookingId))
        .limit(1);

      if (!booking) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });
      }

      if (booking.userId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your booking' });
      }

      if (booking.tenantId !== tenantId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });
      }

      if (booking.status !== 'PENDING_CONFIRMATION') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Booking is not in a payable state' });
      }

      const flags = await getPlatformPageFlags(tenantId);
      const gateway = input.gateway ?? 'paystack';

      const result = await initializeCheckout({
        booking: {
          id: booking.id,
          tenantId: booking.tenantId,
          providerId: booking.providerId,
          userId: booking.userId,
          price: Number(booking.price ?? 0),
          listingId: booking.listingId,
        },
        listing: {
          id: booking.listingId,
          title: '',
          priceType: 'FIXED',
        },
        userEmail: ctx.session?.user?.email ?? '',
        flags,
        gateway,
      });

      if (result.status === 'configuration_required') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.message ?? 'Payment gateway not available',
        });
      }

      return {
        paymentUrl: result.paymentUrl,
        reference: result.reference,
      };
    }),

  handleWebhook: publicProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/marketplace/webhook',
        protect: false,
        tags: ['marketplace'],
      },
    })
    .input(WebhookInput)
    .mutation(async ({ input }) => {
      const { body, signature } = input;

      if (!signature) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Missing signature' });
      }

      const paystack = new PaystackService();
      const verification = paystack.verifyWebhookSignature(body, signature);
      if (!verification.verified) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid signature' });
      }

      let event: { event?: string; data?: { reference?: string; status?: string; id?: string } };
      try {
        event = JSON.parse(body);
      } catch {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid JSON body' });
      }

      const reference = event.data?.reference;
      if (!reference || !reference.startsWith('svc-')) {
        return { status: 'ignored' };
      }

      const bookingId = reference.slice(4);

      const [booking] = await db
        .select()
        .from(serviceBookings)
        .where(eq(serviceBookings.id, bookingId))
        .limit(1);

      if (!booking) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });
      }

      if (booking.status === 'CONFIRMED') {
        return { status: 'already_processed' };
      }

      if (event.event === 'charge.success') {
        await db
          .update(serviceBookings)
          .set({
            status: 'CONFIRMED',
            paymentStatus: 'COMPLETED',
            updatedAt: now(),
          })
          .where(eq(serviceBookings.id, bookingId));

        await db
          .update(paymentTransactions)
          .set({ status: 'COMPLETED' })
          .where(eq(paymentTransactions.externalRef, reference));

        notifyPaymentReceived({
          tenantId: booking.tenantId,
          providerId: booking.providerId,
          listingId: booking.listingId,
          listingTitle: 'Service Booking',
          amount: Number(booking.price ?? 0),
          transactionId: event.data?.id ?? reference,
        }).catch(() => {});
      } else if (event.event === 'charge.failed') {
        await db
          .update(serviceBookings)
          .set({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            paymentStatus: 'FAILED' as any,
            updatedAt: now(),
          })
          .where(eq(serviceBookings.id, bookingId));

        await db
          .update(paymentTransactions)
          .set({ status: 'FAILED' })
          .where(eq(paymentTransactions.externalRef, reference));
      }

      return { status: 'processed' };
    }),
};
