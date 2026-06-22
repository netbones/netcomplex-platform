import { apiError, apiSuccess } from '@api/server';
import {
  cancelProviderSubscriptionById,
  markTransactionCompletedByReference,
  markTransactionFailedByReference,
} from '@shared/api';
import { PayPalService } from '@server/payments';

export const maxDuration = 8;

const paypal = new PayPalService();

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as {
    event_type?: string;
    resource?: {
      id?: string;
      custom_id?: string;
      invoice_id?: string;
      supplementary_data?: {
        related_ids?: {
          order_id?: string;
        };
      };
    };
  } | null;

  if (!payload) {
    return apiError('VALIDATION_ERROR', 'Invalid PayPal webhook payload', 400);
  }

  const verification = await paypal.verifyWebhookSignature(
    payload as Record<string, unknown>,
    request.headers
  );
  if (!verification.verified) {
    return apiError('FORBIDDEN', verification.reason ?? 'Invalid PayPal signature', 403);
  }

  const reference =
    payload.resource?.custom_id ?? payload.resource?.supplementary_data?.related_ids?.order_id;

  switch (payload.event_type) {
    case 'PAYMENT.CAPTURE.COMPLETED':
      if (reference) {
        await markTransactionCompletedByReference(reference, {
          gatewayReference: payload.resource?.id ?? null,
          invoiceUrl: payload.resource?.invoice_id ?? null,
        });
      }
      break;
    case 'PAYMENT.CAPTURE.DENIED':
    case 'PAYMENT.CAPTURE.DECLINED':
      if (reference) {
        await markTransactionFailedByReference(reference);
      }
      break;
    case 'BILLING.SUBSCRIPTION.CANCELLED': {
      const subscriptionId = payload.resource?.custom_id;
      if (subscriptionId) {
        await cancelProviderSubscriptionById(subscriptionId);
      }
      break;
    }
    default:
      break;
  }

  return apiSuccess({ received: true, provider: 'paypal', event: payload.event_type ?? 'unknown' });
}
