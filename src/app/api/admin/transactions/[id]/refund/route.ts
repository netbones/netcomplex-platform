import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import {
  apiError,
  apiInternalError,
  apiNotFound,
  apiSuccess,
  db,
  paymentTransactions,
  requireAnyPermission,
  writeAuditLog,
  getSessionAndRole,
} from '@api/server';
import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';
import { decimalToNumber } from '@shared/lib/providers/billing';
import { getRefundableAmount } from '@shared/lib/providers/admin';

export const maxDuration = 8;

const refundRequestSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().trim().min(3).max(1000),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireAnyPermission(['providers']);
    if (authError) {
      return authError;
    }

    const auth = await getSessionAndRole(request);
    const parsed = refundRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Validation failed', 400, parsed.error.flatten());
    }

    const { tenantId } = await withTenant();
    const { id } = await params;
    const [transaction] = await db
      .select()
      .from(paymentTransactions)
      .where(and(eq(paymentTransactions.tenantId, tenantId), eq(paymentTransactions.id, id)))
      .limit(1);

    if (!transaction) {
      return apiNotFound('Transaction not found');
    }

    if (transaction.status !== 'COMPLETED') {
      return apiError('VALIDATION_ERROR', 'Only completed transactions can enter refund review', 400);
    }

    const maxRefundable = getRefundableAmount({
      amount: decimalToNumber(transaction.amount),
      netAmount: decimalToNumber(transaction.netAmount),
      platformFee: decimalToNumber(transaction.platformFee),
      processorFee: decimalToNumber(transaction.processorFee),
    });

    const requestedAmount = parsed.data.amount ?? maxRefundable;
    if (requestedAmount > maxRefundable) {
      return apiError(
        'VALIDATION_ERROR',
        `Refund amount exceeds the maximum refundable amount of ${maxRefundable.toFixed(2)}`,
        400
      );
    }

    const refundReference = `manual-refund-${transaction.gateway.toLowerCase()}-${transaction.id.slice(0, 8)}-${Date.now()}`;

    if (auth) {
      writeAuditLog({
        action: 'PROVIDER_REFUND_REVIEWED',
        actorId: auth.userId,
        tenantId,
        targetId: transaction.id,
        details: {
          gateway: transaction.gateway,
          requestedAmount,
          maxRefundable,
          reason: parsed.data.reason,
          processingMode: 'MANUAL_RECONCILIATION_REQUIRED',
        },
      });
    }

    return apiSuccess({
      refundReference,
      transactionId: transaction.id,
      gateway: transaction.gateway,
      requestedAmount,
      maxRefundable,
      status: 'MANUAL_REVIEW_REQUIRED',
      message:
        'Gateway-native refund execution is not wired yet for provider billing. This request has been validated and logged for manual reconciliation.',
    });
  } catch (error) {
    logError(
      { component: 'admin-transaction-refund-api', operation: 'POST' },
      'Admin refund review error',
      error
    );
    return apiInternalError();
  }
}
