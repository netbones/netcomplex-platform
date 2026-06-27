import { NextRequest } from 'next/server';
import {
  auth,
  db,
  serviceBookings,
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiNotFound,
  apiInternalError,
} from '@api/server';
import { eq } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';
import { checkoutRequestSchema, initializeCheckout } from '@entities/marketplace/server';
import type { CheckoutResult } from '@entities/marketplace/server';
import { getPlatformPageFlagsImpl } from '@entities/tenant/server';

export const maxDuration = 8;

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    // 2. Parse and validate body
    const body = await request.json();
    const parsed = checkoutRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.message, 400);
    }

    // 3. Tenant isolation
    const { tenantId } = await withTenant();

    // 4. Fetch booking + verify ownership
    const [booking] = await db
      .select()
      .from(serviceBookings)
      .where(eq(serviceBookings.id, parsed.data.bookingId))
      .limit(1);

    if (!booking) {
      return apiNotFound('Booking not found');
    }

    if (booking.userId !== session.user.id) {
      return apiError('FORBIDDEN', 'Not your booking', 403);
    }

    if (booking.tenantId !== tenantId) {
      return apiNotFound('Booking not found');
    }

    // 5. Verify booking is in PENDING_CONFIRMATION status
    if (booking.status !== 'PENDING_CONFIRMATION') {
      return apiError('VALIDATION_ERROR', 'Booking is not in a payable state', 400);
    }

    // 6. Get platform flags for PayPal gate (D-07)
    const flags = await getPlatformPageFlagsImpl(tenantId);
    const gateway = parsed.data.gateway ?? 'paystack';

    // 7. Initialize checkout
    const result: CheckoutResult = await initializeCheckout({
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
      userEmail: session.user.email ?? '',
      flags,
      gateway,
    });

    // 8. Return payment URL
    if (result.status === 'configuration_required') {
      return apiError('VALIDATION_ERROR', result.message ?? 'Payment gateway not available', 400);
    }

    return apiSuccess({
      paymentUrl: result.paymentUrl,
      reference: result.reference,
    });
  } catch (error) {
    logError({ component: 'checkout-api', operation: 'POST' }, 'Checkout error', error);
    return apiInternalError();
  }
}
