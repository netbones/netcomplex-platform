import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
  apiInternalError,
  withErrorHandler,
  getSessionAndRole,
  db,
  dataConsents,
  dataRevenueStreams,
  dataShareBatches,
  dWallets,
  walletTransactions,
  now,
  revalidateDashboard,
} from '@api/server';
import { hasPermission } from '@shared/lib';
import { createComponentLogger } from '@shared/lib';
import { withTenant } from '@entities/tenant/server';
import { batchSchema } from '@entities/dwallet';
import { eq, and, desc } from 'drizzle-orm';

export const maxDuration = 8;

const logger = createComponentLogger('admin-dwallet-batches');

/**
 * GET /api/admin/dwallet/batches
 *
 * Lists all DataShareBatch records for the tenant, ordered by createdAt desc.
 */
export const GET = withErrorHandler(async (request: Request) => {
  const sessionData = await getSessionAndRole(request);
  if (!sessionData) return apiUnauthorized();

  if (!hasPermission(sessionData.role, 'admin')) return apiForbidden();

  try {
    const { tenantId } = await withTenant();

    const batches = await db
      .select()
      .from(dataShareBatches)
      .where(eq(dataShareBatches.tenantId, tenantId))
      .orderBy(desc(dataShareBatches.createdAt));

    return apiSuccess(batches);
  } catch (error) {
    logger.error({ event: 'list_batches_error' }, 'Failed to list batches', error);
    return apiInternalError(String(error));
  }
});

/**
 * POST /api/admin/dwallet/batches
 *
 * Creates and runs a distribution batch atomically via Drizzle .transaction().
 * Follows Pattern 4 from RESEARCH.md (Atomic Batch Distribution).
 *
 * CONSTRAINT 4: All credits succeed atomically or none do (no partial credits).
 */
export const POST = withErrorHandler(async (request: Request) => {
  const sessionData = await getSessionAndRole(request);
  if (!sessionData) return apiUnauthorized();

  if (!hasPermission(sessionData.role, 'admin')) return apiForbidden();

  try {
    const { tenantId } = await withTenant();
    const body = batchSchema.parse(await request.json());
    const { streamKey, periodStart, periodEnd, totalRevenue } = body;

    // Step 1: Read stream config
    const [stream] = await db
      .select()
      .from(dataRevenueStreams)
      .where(and(eq(dataRevenueStreams.tenantId, tenantId), eq(dataRevenueStreams.key, streamKey)))
      .limit(1);

    if (!stream) {
      return apiError('NOT_FOUND', `Stream '${streamKey}' not found`, 404);
    }

    if (!stream.isActive) {
      return apiError('STREAM_INACTIVE', `Stream '${streamKey}' is not active`, 400);
    }

    // Step 2: Compute resident pool
    const residentSharePct = Number(stream.residentSharePct);
    const residentPool = (totalRevenue * residentSharePct) / 100;

    // Step 3: Get opted-in wallets (latest consent per wallet where granted=true)
    // Use a subquery approach: get all wallets with at least one granted consent for this stream
    const consents = await db
      .selectDistinct({ walletId: dataConsents.walletId })
      .from(dataConsents)
      .where(
        and(
          eq(dataConsents.tenantId, tenantId),
          eq(dataConsents.streamKey, streamKey),
          eq(dataConsents.granted, true)
        )
      );

    const optedInWalletIds = consents.map(c => c.walletId);

    if (optedInWalletIds.length === 0) {
      return apiError('VALIDATION_ERROR', 'No opted-in wallets for this stream', 400);
    }

    // Step 4: Compute per-resident amount
    const perResidentAmount = residentPool / optedInWalletIds.length;
    const perResidentAmountStr = perResidentAmount.toFixed(2);

    const batchId = crypto.randomUUID();

    // Step 5: Atomic transaction — all credits or none
    try {
      await db.transaction(async tx => {
        for (const walletId of optedInWalletIds) {
          // Read current wallet
          const [wallet] = await tx
            .select()
            .from(dWallets)
            .where(eq(dWallets.id, walletId))
            .limit(1);

          if (!wallet) {
            throw new Error(`Wallet ${walletId} not found`);
          }

          const balanceBefore = wallet.balance;
          const balanceBeforeNum = Number(balanceBefore);
          const balanceAfterNum = balanceBeforeNum + perResidentAmount;
          const balanceAfter = balanceAfterNum.toFixed(2);
          const lifetimeEarnedNum = Number(wallet.lifetimeEarned) + perResidentAmount;

          // Insert immutable WalletTransaction CREDIT
          await tx.insert(walletTransactions).values({
            id: crypto.randomUUID(),
            tenantId,
            walletId,
            type: 'CREDIT',
            amount: perResidentAmountStr,
            currency: 'ZAR',
            description: `Data share: ${stream.label} (${periodStart}–${periodEnd})`,
            sourceType: 'RESIDENT_DATA_SHARE',
            referenceId: batchId,
            referenceType: 'data_share_batch',
            balanceBefore,
            balanceAfter,
            createdAt: now(),
          });

          // Update cached balance on DWallet
          await tx
            .update(dWallets)
            .set({
              balance: balanceAfter,
              lifetimeEarned: lifetimeEarnedNum.toFixed(2),
              updatedAt: now(),
            })
            .where(eq(dWallets.id, walletId));
        }

        // Insert COMPLETED DataShareBatch record
        await tx.insert(dataShareBatches).values({
          id: batchId,
          tenantId,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
          streamKey,
          totalRevenue: String(totalRevenue),
          residentPool: String(residentPool.toFixed(2)),
          participantCount: optedInWalletIds.length,
          status: 'COMPLETED',
          processedAt: now(),
          processedBy: sessionData.userId,
          createdAt: now(),
        });
      });
    } catch (txError) {
      // Batch FAILED — insert a FAILED record (outside the failed transaction)
      logger.error(
        { event: 'batch_failed', streamKey, tenantId },
        'Batch distribution failed — no credits applied',
        txError
      );
      // Note: 'notes' field not present on Drizzle dataShareBatches schema
      // Error message is logged via logger.error above instead
      await db.insert(dataShareBatches).values({
        id: batchId,
        tenantId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        streamKey,
        totalRevenue: String(totalRevenue),
        residentPool: String(residentPool.toFixed(2)),
        participantCount: optedInWalletIds.length,
        status: 'FAILED',
        createdAt: now(),
      });
      return apiError('INTERNAL_ERROR', 'Batch distribution failed — no credits applied', 500);
    }

    revalidateDashboard();
    logger.info(
      {
        event: 'batch_completed',
        batchId,
        streamKey,
        participantCount: optedInWalletIds.length,
        perResidentAmount: perResidentAmountStr,
      },
      'Batch distribution completed'
    );

    return apiSuccess({
      batchId,
      participantCount: optedInWalletIds.length,
      perResidentAmount: perResidentAmountStr,
    });
  } catch (error) {
    logger.error({ event: 'batch_create_error' }, 'Failed to create batch', error);
    return apiInternalError(String(error));
  }
});
