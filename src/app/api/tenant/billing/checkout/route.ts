import { NextRequest } from 'next/server';
import { withTenant } from '@entities/tenant/server';
import {
  apiSuccess,
  apiError,
  apiInternalError,
  auth,
  createTenantSubscriptionCheckout,
} from '@api/server';
import { logError } from '@shared/lib';

export const maxDuration = 8;

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await withTenant();
    const body = await request.json();
    const session = await auth.api.getSession({ headers: request.headers });
    const billingEmail = session?.user?.email;

    if (!billingEmail) {
      return apiError('UNAUTHORIZED', 'User email required for billing', 401);
    }

    const result = await createTenantSubscriptionCheckout({
      tenantId,
      planId: body.planId,
      paymentGateway: body.paymentGateway || 'PAYSTACK',
      billingEmail,
      couponCode: body.couponCode,
      callbackUrl: body.callbackUrl || `${request.nextUrl.origin}/tenant/billing`,
    });

    if (!result.ok) {
      return apiError('VALIDATION_ERROR', result.message, result.status);
    }

    return apiSuccess(result.data);
  } catch (error) {
    logError(
      { component: 'tenant-billing-checkout-api', operation: 'POST' },
      'Checkout failed',
      error
    );
    return apiInternalError();
  }
}
