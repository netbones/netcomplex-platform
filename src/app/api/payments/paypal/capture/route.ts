import { NextRequest } from 'next/server';

import { apiError, apiInternalError, apiSuccess } from '@api/server';
import { markTransactionCompletedByReference } from '@shared/api';
import { PayPalService } from '@server/payments';
import { logError } from '@shared/lib';

export const maxDuration = 8;

const paypal = new PayPalService();

type PayPalCapturePayload = {
  status?: string;
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id?: string;
        invoice_id?: string;
        custom_id?: string;
        status?: string;
      }>;
    };
    custom_id?: string;
  }>;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { orderId?: string } | null;
    const orderId = body?.orderId?.trim();

    if (!orderId) {
      return apiError('VALIDATION_ERROR', 'Missing PayPal orderId.', 400);
    }

    const payload = (await paypal.captureOrder(orderId)) as PayPalCapturePayload | null;
    const capture = payload?.purchase_units?.[0]?.payments?.captures?.[0] ?? null;
    const reference = capture?.custom_id ?? payload?.purchase_units?.[0]?.custom_id ?? null;

    if (!reference) {
      return apiError(
        'VALIDATION_ERROR',
        'PayPal capture completed but no provider transaction reference was returned.',
        400,
        payload
      );
    }

    if (capture?.status && capture.status.toUpperCase() !== 'COMPLETED') {
      return apiError(
        'VALIDATION_ERROR',
        `PayPal capture is in unexpected status: ${capture.status}`,
        400,
        payload
      );
    }

    await markTransactionCompletedByReference(reference, {
      gatewayReference: capture?.id ?? orderId,
      invoiceUrl: capture?.invoice_id ?? null,
    });

    return apiSuccess({
      orderId,
      reference,
      captureId: capture?.id ?? null,
      status: 'COMPLETED',
      message: 'PayPal payment captured successfully.',
      raw: payload,
    });
  } catch (error) {
    logError(
      { component: 'paypal-capture-api', operation: 'POST' },
      'PayPal payment capture error',
      error
    );
    return apiInternalError();
  }
}
