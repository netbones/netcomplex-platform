import { apiError, apiSuccess } from '@api/server';
import {
  cancelProviderSubscriptionById,
  markTransactionCompletedByReference,
  markTransactionFailedByReference,
} from '@shared/api';
import { PaystackService } from '@server/payments';

export const maxDuration = 8;

const paystack = new PaystackService();

export async function POST(request: Request) {
  const bodyText = await request.text();
  const signatureResult = paystack.verifyWebhookSignature(
    bodyText,
    request.headers.get('x-paystack-signature')
  );

  if (!signatureResult.verified) {
    return apiError('FORBIDDEN', signatureResult.reason ?? 'Invalid Paystack signature', 403);
  }

  const event = JSON.parse(bodyText) as {
    event?: string;
    data?: {
      reference?: string;
      metadata?: { subscriptionId?: string };
    };
  };

  switch (event.event) {
    case 'charge.success':
      if (event.data?.reference) {
        await markTransactionCompletedByReference(event.data.reference);
      }
      break;
    case 'charge.failed':
      if (event.data?.reference) {
        await markTransactionFailedByReference(event.data.reference);
      }
      break;
    case 'subscription.disable':
      if (event.data?.metadata?.subscriptionId) {
        await cancelProviderSubscriptionById(event.data.metadata.subscriptionId);
      }
      break;
    case 'subscription.create':
    default:
      break;
  }

  return apiSuccess({ received: true, provider: 'paystack', event: event.event ?? 'unknown' });
}
