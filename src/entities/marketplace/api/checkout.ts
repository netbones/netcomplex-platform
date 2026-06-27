import 'server-only';

import { db, providerSubscriptions, subscriptionTiers, paymentTransactions } from '@api/server';
import { PaystackService } from '@/server/payments/paystack';
import { PayPalService } from '@/server/payments/paypal';
import { eq, and } from 'drizzle-orm';

export interface CheckoutParams {
  booking: {
    id: string;
    tenantId: string;
    providerId: string;
    userId: string;
    price: number;
    listingId: string;
  };
  listing: {
    id: string;
    title: unknown;
    priceType: string;
  };
  userEmail: string;
  flags: { marketplacePaypal: boolean };
  gateway?: 'paystack' | 'paypal';
  callbackUrl?: string;
}

export interface CheckoutResult {
  status: 'ready' | 'configuration_required' | 'degraded';
  paymentUrl: string | null;
  reference: string;
  message?: string;
}

/**
 * Calculate platform fee from the provider's active SubscriptionTier.
 * Reads SubscriptionTier.platformFeePercent from the database — never hardcoded.
 * Falls back to 0 if no active subscription exists.
 */
export async function calculatePlatformFee(
  providerId: string,
  bookingPrice: number
): Promise<number> {
  const [row] = await db
    .select({ platformFeePercent: subscriptionTiers.platformFeePercent })
    .from(providerSubscriptions)
    .innerJoin(subscriptionTiers, eq(providerSubscriptions.tierId, subscriptionTiers.id))
    .where(
      and(
        eq(providerSubscriptions.providerId, providerId),
        eq(providerSubscriptions.status, 'ACTIVE')
      )
    )
    .limit(1);

  const feePercent = row ? Number(row.platformFeePercent) : 0;
  return bookingPrice * (feePercent / 100);
}

/**
 * Create a payment transaction record for audit trail.
 */
export async function createPaymentTransaction(params: {
  id: string;
  providerId: string;
  tenantId: string;
  subscriptionId: string;
  amount: number;
  platformFee: number;
  gateway: string;
  reference: string;
}) {
  await db.insert(paymentTransactions).values({
    id: params.id,
    providerId: params.providerId,
    tenantId: params.tenantId,
    subscriptionId: params.subscriptionId,
    amount: String(params.amount),
    platformFee: String(params.platformFee),
    processorFee: '0',
    netAmount: String(params.amount),
    status: 'PENDING',
    gateway: params.gateway as 'PAYSTACK' | 'PAYPAL',
    externalRef: params.reference,
    createdAt: new Date(),
  });
}

/**
 * Main checkout orchestrator.
 *
 * Per D-05: Pay-at-booking for FIXED-price services.
 * Per D-07: PayPal gated behind flags.marketplacePaypal + PAYPAL_CLIENT_ID env var.
 * Per D-08: Platform fee read from SubscriptionTier.platformFeePercent (not hardcoded).
 */
export async function initializeCheckout(params: CheckoutParams): Promise<CheckoutResult> {
  const paystack = new PaystackService();
  const paypal = new PayPalService();

  const totalAmount =
    params.booking.price +
    (await calculatePlatformFee(params.booking.providerId, params.booking.price));
  const reference = `svc-${params.booking.id}`;
  const callbackUrl =
    params.callbackUrl ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/services/bookings/${params.booking.id}/confirm`;

  // D-07: PayPal runtime guard
  if (params.gateway === 'paypal') {
    if (!params.flags.marketplacePaypal) {
      return {
        status: 'configuration_required',
        paymentUrl: null,
        reference,
        message: 'PayPal is not available for this marketplace.',
      };
    }

    // Pitfall 2: Also check env var
    if (!process.env.PAYPAL_CLIENT_ID) {
      return {
        status: 'configuration_required',
        paymentUrl: null,
        reference,
        message: 'PayPal is not configured for this environment.',
      };
    }

    const result = await paypal.createOrder({
      reference,
      email: params.userEmail,
      amount: totalAmount,
      currency: 'ZAR',
      callbackUrl,
      metadata: {
        bookingId: params.booking.id,
        tenantId: params.booking.tenantId,
      },
    });

    return result;
  }

  // Default: Paystack (D-05, D-07)
  // Paystack expects amount in kobo/cents (multiply by 100)
  // NOTE: PaystackService.initializePayment already does Math.round(amount * 100)
  // so we pass the amount in whole currency units.
  const result = await paystack.initializePayment({
    reference,
    email: params.userEmail,
    amount: totalAmount,
    currency: 'ZAR',
    callbackUrl,
    metadata: {
      bookingId: params.booking.id,
      tenantId: params.booking.tenantId,
    },
  });

  return result;
}
