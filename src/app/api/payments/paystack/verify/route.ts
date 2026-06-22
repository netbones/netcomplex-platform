import { NextRequest } from 'next/server';

import { apiError, apiInternalError, apiSuccess } from '@api/server';
import { markTransactionCompletedByReference, markTransactionFailedByReference } from '@shared/api';
import { PaystackService } from '@server/payments';
import { logError } from '@shared/lib';

export const maxDuration = 8;

const paystack = new PaystackService();

type PaystackVerifyPayload = {
  status?: boolean;
  message?: string;
  data?: {
    status?: string;
    reference?: string;
  };
};

export async function GET(request: NextRequest) {
  try {
    const reference = request.nextUrl.searchParams.get('reference')?.trim();
    if (!reference) {
      return apiError('VALIDATION_ERROR', 'Missing Paystack reference.', 400);
    }

    const payload = (await paystack.verifyPayment(reference)) as PaystackVerifyPayload | null;
    const paymentStatus = payload?.data?.status?.toLowerCase();

    if (payload?.status && paymentStatus === 'success') {
      await markTransactionCompletedByReference(reference);
      return apiSuccess({
        reference,
        status: 'COMPLETED',
        message: payload?.message ?? 'Paystack payment verified successfully.',
        raw: payload,
      });
    }

    if (paymentStatus === 'failed' || paymentStatus === 'abandoned') {
      await markTransactionFailedByReference(reference);
      return apiSuccess({
        reference,
        status: 'FAILED',
        message: payload?.message ?? 'Paystack payment was not completed.',
        raw: payload,
      });
    }

    return apiError(
      'VALIDATION_ERROR',
      payload?.message ?? 'Unable to verify the Paystack payment for this reference.',
      400,
      payload
    );
  } catch (error) {
    logError(
      { component: 'paystack-verify-api', operation: 'GET' },
      'Paystack payment verification error',
      error
    );
    return apiInternalError();
  }
}
