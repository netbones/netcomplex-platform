import {
  apiSuccess,
  apiError,
  apiNotFound,
  apiInternalError,
  withErrorHandler,
  db,
  payoutRequests,
  dWallets,
  walletTransactions,
  now,
} from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { createComponentLogger } from '@shared/lib';
import { withTenant } from '@entities/tenant/server';
import { payoutStatusSchema } from '@entities/dwallet';
import { eq, and } from 'drizzle-orm';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

const logger = createComponentLogger('admin-dwallet-payout');

/**
 * PATCH /api/admin/dwallet/payouts/:id
 *
 * Marks a payout as COMPLETED or REJECTED.
 *
 * COMPLETED:
 *   - Creates a WalletTransaction DEBIT (immutable append-only)
 *   - Updates wallet balance and lifetimePaid
 *   - Updates payoutRequest status, processedAt, processedBy
 *   - Uses Drizzle .transaction() for atomicity
 *
 * REJECTED:
 *   - Updates payoutRequest status, processedAt, processedBy
 *   - No balance change — resident keeps their funds
 *
 * CONSTRAINT 1: WalletTransaction rows are immutable.
 * CONSTRAINT 10 (Threat T-47-B11): Only processes PENDING payouts (prevents double-spend).
 */
export const PATCH = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const auth = await requireAuth(request, { permission: 'admin' });
    if (!auth.success) return auth.response;

    const { id: payoutId } = await params;

    try {
      const { tenantId } = await withTenant();
      const body = payoutStatusSchema.parse(await request.json());
      const { status, notes } = body;

      // Query payout request with tenant isolation
      const [payout] = await db
        .select()
        .from(payoutRequests)
        .where(and(eq(payoutRequests.id, payoutId), eq(payoutRequests.tenantId, tenantId)))
        .limit(1);

      if (!payout) return apiNotFound('Payout request not found');

      // Threat T-47-B11: Prevent double-spend — only PENDING payouts can be processed
      if (payout.status !== 'PENDING') {
        return apiError(
          'VALIDATION_ERROR',
          `Payout has already been processed (status: ${payout.status})`,
          400
        );
      }

      const timestamp = now();

      if (status === 'COMPLETED') {
        // Atomic transaction for COMPLETED: wallet update + txn insert + payout update
        await db.transaction(async tx => {
          // Get wallet with tenant isolation
          const [wallet] = await tx
            .select()
            .from(dWallets)
            .where(and(eq(dWallets.id, payout.walletId), eq(dWallets.tenantId, tenantId)))
            .limit(1);

          if (!wallet) {
            throw new Error(`Wallet ${payout.walletId} not found`);
          }

          const balanceBefore = wallet.balance;
          const payoutAmount = Number(payout.amount);
          const balanceBeforeNum = Number(balanceBefore);
          const balanceAfterNum = balanceBeforeNum - payoutAmount;
          const balanceAfter = balanceAfterNum.toFixed(2);
          const lifetimePaidNum = Number(wallet.lifetimePaid) + payoutAmount;
          const debitAmount = (-1 * payoutAmount).toFixed(2);

          // Insert immutable WalletTransaction DEBIT
          await tx.insert(walletTransactions).values({
            id: createId(),
            tenantId,
            walletId: wallet.id,
            type: 'DEBIT',
            amount: debitAmount,
            currency: 'ZAR',
            description: `Payout disbursement (ref: ${payoutId})`,
            sourceType: 'RESIDENT_DATA_SHARE',
            referenceId: payoutId,
            referenceType: 'payout',
            balanceBefore,
            balanceAfter,
            createdAt: timestamp,
          });

          // Update wallet balance
          await tx
            .update(dWallets)
            .set({
              balance: balanceAfter,
              lifetimePaid: lifetimePaidNum.toFixed(2),
              updatedAt: timestamp,
            })
            .where(eq(dWallets.id, wallet.id));

          // Update payout request
          await tx
            .update(payoutRequests)
            .set({
              status: 'COMPLETED',
              processedAt: timestamp,
              processedBy: auth.data.userId,
              updatedAt: timestamp,
              notes: notes ?? null,
            } as never)
            .where(eq(payoutRequests.id, payoutId));
        });

        logger.info(
          {
            event: 'payout_completed',
            payoutId,
            processedBy: auth.data.userId,
            tenantId,
          },
          'Payout marked COMPLETED'
        );
      } else {
        // REJECTED: No balance change — resident keeps their funds
        await db
          .update(payoutRequests)
          .set({
            status: 'REJECTED',
            processedAt: timestamp,
            processedBy: auth.data.userId,
            updatedAt: timestamp,
            notes: notes ?? null,
          } as never)
          .where(eq(payoutRequests.id, payoutId));

        logger.info(
          {
            event: 'payout_rejected',
            payoutId,
            processedBy: auth.data.userId,
            tenantId,
          },
          'Payout marked REJECTED'
        );
      }

      // Fetch updated payout
      const [updated] = await db
        .select()
        .from(payoutRequests)
        .where(eq(payoutRequests.id, payoutId))
        .limit(1);

      return apiSuccess(updated);
    } catch (error) {
      logger.error({ event: 'payout_update_error', payoutId }, 'Failed to update payout', error);
      return apiInternalError(String(error));
    }
  }
);
