import { NextRequest } from 'next/server';
import { apiError, apiInternalError, apiNotFound, apiSuccess, sendEmail } from '@api/server';
import { createProviderSubscriptionCheckout, requireProviderAccess } from '@shared/api';
import { providerBillingSubscribeSchema } from '@shared/lib/providers/billing';
import { logError } from '@shared/lib';

export const maxDuration = 8;

export async function POST(request: NextRequest) {
  try {
    const providerAccess = await requireProviderAccess(request);
    if ('status' in providerAccess) {
      return providerAccess;
    }

    if (!providerAccess.providerRecord) {
      return apiNotFound('Provider registration is not complete for this account');
    }

    const parsed = providerBillingSubscribeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Validation failed', 400, parsed.error.flatten());
    }

    const result = await createProviderSubscriptionCheckout({
      tenantId: providerAccess.tenantId,
      providerId: providerAccess.providerRecord.id,
      providerEmail:
        providerAccess.providerRecord.email ?? providerAccess.auth.session.user.email ?? null,
      verificationStatus: providerAccess.verification.displayStatus,
      tierId: parsed.data.tierId,
      paymentGateway: parsed.data.paymentGateway,
      callbackUrl: parsed.data.callbackUrl,
    });

    if (!result.ok) {
      return apiError('VALIDATION_ERROR', result.message, result.status);
    }

    void sendEmail({
      to: providerAccess.providerRecord.email ?? providerAccess.auth.session.user.email,
      subject: 'Subscription Checkout Ready',
      html: `<p>Your provider subscription checkout is ready. Follow the link to complete payment and activate your subscription.</p>`,
    });

    return apiSuccess(result.data);
  } catch (error) {
    logError(
      { component: 'provider-billing-subscribe-api', operation: 'POST' },
      'Provider billing subscription initialization error',
      error
    );
    return apiInternalError();
  }
}
