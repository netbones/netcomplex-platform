import { z } from 'zod';
import {
  router,
  protectedProcedure,
  db,
  walletTransactions,
  payoutRequests,
  dataConsents,
  dataRevenueStreams,
  revalidateDashboard,
  now,
} from '@api/server';

import { TRPCError } from '@trpc/server';

import { eq, and, desc, sql } from 'drizzle-orm';

import { getOrCreateWallet } from '@entities/dwallet/server';
import type {
  DWalletSummary,
  ConsentState,
  TransactionItem,
  PayoutRequestItem,
  StreamConfig,
} from '@entities/dwallet';

const IdInput = z.object({ id: z.string() });

const ListTransactionsInput = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    type: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .optional();

const CreatePayoutInput = z.object({
  amount: z.number().positive().min(50, 'Minimum payout is R50'),
});

const ListPayoutsInput = z
  .object({
    status: z.string().optional(),
  })
  .optional();

const CreateConsentInput = z.object({
  streamKey: z.string().min(1),
  granted: z.boolean(),
});

const RevokeConsentInput = z.object({
  streamKey: z.string().min(1),
});

const GetStreamInput = z.object({
  streamKey: z.string().min(1),
});

// ──────────────────────────────────────────
// Router
// ──────────────────────────────────────────

export const dwalletRouter = router({
  getWalletSummary: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const wallet = await getOrCreateWallet(ctx.userId!, tenantId);

    const streams = await db
      .select()
      .from(dataRevenueStreams)
      .where(and(eq(dataRevenueStreams.tenantId, tenantId), eq(dataRevenueStreams.isActive, true)));

    const consents: ConsentState[] = await Promise.all(
      streams.map(async stream => {
        const [latestConsent] = await db
          .select()
          .from(dataConsents)
          .where(and(eq(dataConsents.walletId, wallet.id), eq(dataConsents.streamKey, stream.key)))
          .orderBy(desc(dataConsents.createdAt))
          .limit(1);

        return {
          streamKey: stream.key,
          label: stream.label,
          description: stream.description,
          granted: latestConsent?.granted ?? false,
          grantedAt: latestConsent?.grantedAt?.toISOString() ?? null,
          revokedAt: latestConsent?.revokedAt?.toISOString() ?? null,
        };
      })
    );

    const recentTxns = await db
      .select()
      .from(walletTransactions)
      .where(
        and(eq(walletTransactions.walletId, wallet.id), eq(walletTransactions.tenantId, tenantId))
      )
      .orderBy(desc(walletTransactions.createdAt))
      .limit(5);

    const recentTransactions: TransactionItem[] = recentTxns.map(txn => ({
      id: txn.id,
      type: txn.type as TransactionItem['type'],
      amount: txn.amount,
      description: txn.description,
      sourceType: txn.sourceType as TransactionItem['sourceType'],
      balanceBefore: txn.balanceBefore,
      balanceAfter: txn.balanceAfter,
      createdAt: txn.createdAt.toISOString(),
    }));

    const summary: DWalletSummary = {
      balance: wallet.balance,
      lifetimeEarned: wallet.lifetimeEarned,
      lifetimePaid: wallet.lifetimePaid,
      currency: wallet.currency,
      status: wallet.status as DWalletSummary['status'],
      consents,
      recentTransactions,
    };

    return summary;
  }),

  getBalance: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const wallet = await getOrCreateWallet(ctx.userId!, tenantId);

    return {
      balance: wallet.balance,
      currency: wallet.currency,
      status: wallet.status,
    };
  }),

  listTransactions: protectedProcedure
    .input(ListTransactionsInput)
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const wallet = await getOrCreateWallet(ctx.userId!, tenantId);

      const page = input?.page ?? 1;
      const limit = input?.limit ?? 20;
      const offset = (page - 1) * limit;

      const conditions = [
        eq(walletTransactions.walletId, wallet.id),
        eq(walletTransactions.tenantId, tenantId),
      ];

      if (input?.type) {
        conditions.push(
          eq(
            walletTransactions.type,
            input.type as (typeof walletTransactions.type.enumValues)[number]
          )
        );
      }

      if (input?.startDate) {
        conditions.push(sql`${walletTransactions.createdAt} >= ${new Date(input.startDate)}`);
      }

      if (input?.endDate) {
        conditions.push(sql`${walletTransactions.createdAt} <= ${new Date(input.endDate)}`);
      }

      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(walletTransactions)
        .where(and(...conditions));

      const total = countResult?.count ?? 0;

      const txns = await db
        .select()
        .from(walletTransactions)
        .where(and(...conditions))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(limit)
        .offset(offset);

      const transactions: TransactionItem[] = txns.map(txn => ({
        id: txn.id,
        type: txn.type as TransactionItem['type'],
        amount: txn.amount,
        description: txn.description,
        sourceType: txn.sourceType as TransactionItem['sourceType'],
        balanceBefore: txn.balanceBefore,
        balanceAfter: txn.balanceAfter,
        createdAt: txn.createdAt.toISOString(),
      }));

      return {
        items: transactions,
        total,
        page,
        limit,
        hasMore: page * limit < total,
      };
    }),

  getTransaction: protectedProcedure.input(IdInput).query(async ({ input, ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const wallet = await getOrCreateWallet(ctx.userId!, tenantId);

    const [txn] = await db
      .select()
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.id, input.id),
          eq(walletTransactions.walletId, wallet.id),
          eq(walletTransactions.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!txn) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Transaction not found' });
    }

    return {
      id: txn.id,
      type: txn.type as TransactionItem['type'],
      amount: txn.amount,
      description: txn.description,
      sourceType: txn.sourceType as TransactionItem['sourceType'],
      balanceBefore: txn.balanceBefore,
      balanceAfter: txn.balanceAfter,
      createdAt: txn.createdAt.toISOString(),
    };
  }),

  createPayout: protectedProcedure.input(CreatePayoutInput).mutation(async ({ input, ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const wallet = await getOrCreateWallet(ctx.userId!, tenantId);

    const balanceNum = Number(wallet.balance);
    if (balanceNum < 50) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Below minimum payout threshold of R50',
      });
    }

    const timestamp = now();
    const payoutId = crypto.randomUUID();

    await db.insert(payoutRequests).values({
      id: payoutId,
      tenantId,
      walletId: wallet.id,
      userId: ctx.userId!,
      amount: input.amount.toString(),
      currency: wallet.currency,
      status: 'PENDING',
      method: 'bank_transfer',
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    revalidateDashboard();

    return {
      id: payoutId,
      amount: input.amount.toString(),
      status: 'PENDING' as const,
      method: 'bank_transfer',
      createdAt: timestamp.toISOString(),
    };
  }),

  listPayouts: protectedProcedure.input(ListPayoutsInput).query(async ({ input, ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const wallet = await getOrCreateWallet(ctx.userId!, tenantId);

    const conditions = [
      eq(payoutRequests.walletId, wallet.id),
      eq(payoutRequests.tenantId, tenantId),
    ];

    if (input?.status) {
      conditions.push(
        eq(payoutRequests.status, input.status as (typeof payoutRequests.status.enumValues)[number])
      );
    }

    const payouts = await db
      .select()
      .from(payoutRequests)
      .where(and(...conditions))
      .orderBy(desc(payoutRequests.createdAt));

    const items: PayoutRequestItem[] = payouts.map(p => ({
      id: p.id,
      amount: p.amount,
      status: p.status as PayoutRequestItem['status'],
      method: p.method,
      createdAt: p.createdAt.toISOString(),
      processedAt: p.processedAt?.toISOString() ?? null,
      notes: p.notes,
    }));

    return items;
  }),

  listConsents: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const wallet = await getOrCreateWallet(ctx.userId!, tenantId);

    const streams = await db
      .select()
      .from(dataRevenueStreams)
      .where(and(eq(dataRevenueStreams.tenantId, tenantId), eq(dataRevenueStreams.isActive, true)));

    const consents: ConsentState[] = await Promise.all(
      streams.map(async stream => {
        const [latestConsent] = await db
          .select()
          .from(dataConsents)
          .where(and(eq(dataConsents.walletId, wallet.id), eq(dataConsents.streamKey, stream.key)))
          .orderBy(desc(dataConsents.createdAt))
          .limit(1);

        return {
          streamKey: stream.key,
          label: stream.label,
          description: stream.description,
          granted: latestConsent?.granted ?? false,
          grantedAt: latestConsent?.grantedAt?.toISOString() ?? null,
          revokedAt: latestConsent?.revokedAt?.toISOString() ?? null,
        };
      })
    );

    return consents;
  }),

  createConsent: protectedProcedure.input(CreateConsentInput).mutation(async ({ input, ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const wallet = await getOrCreateWallet(ctx.userId!, tenantId);

    const [stream] = await db
      .select()
      .from(dataRevenueStreams)
      .where(
        and(
          eq(dataRevenueStreams.tenantId, tenantId),
          eq(dataRevenueStreams.key, input.streamKey),
          eq(dataRevenueStreams.isActive, true)
        )
      );

    if (!stream) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Revenue stream '${input.streamKey}' not found or inactive`,
      });
    }

    const timestamp = now();
    const consentId = crypto.randomUUID();

    await db.insert(dataConsents).values({
      id: consentId,
      tenantId,
      walletId: wallet.id,
      userId: ctx.userId!,
      streamKey: input.streamKey,
      granted: input.granted,
      grantedAt: input.granted ? timestamp : null,
      revokedAt: input.granted ? null : timestamp,
      createdAt: timestamp,
    });

    return { streamKey: input.streamKey, granted: input.granted };
  }),

  revokeConsent: protectedProcedure.input(RevokeConsentInput).mutation(async ({ input, ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const wallet = await getOrCreateWallet(ctx.userId!, tenantId);

    const [stream] = await db
      .select()
      .from(dataRevenueStreams)
      .where(
        and(
          eq(dataRevenueStreams.tenantId, tenantId),
          eq(dataRevenueStreams.key, input.streamKey),
          eq(dataRevenueStreams.isActive, true)
        )
      );

    if (!stream) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Revenue stream '${input.streamKey}' not found or inactive`,
      });
    }

    const timestamp = now();
    const consentId = crypto.randomUUID();

    await db.insert(dataConsents).values({
      id: consentId,
      tenantId,
      walletId: wallet.id,
      userId: ctx.userId!,
      streamKey: input.streamKey,
      granted: false,
      grantedAt: null,
      revokedAt: timestamp,
      createdAt: timestamp,
    });

    return { streamKey: input.streamKey, granted: false };
  }),

  listStreams: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const streams = await db
      .select()
      .from(dataRevenueStreams)
      .where(and(eq(dataRevenueStreams.tenantId, tenantId), eq(dataRevenueStreams.isActive, true)));

    const configs: StreamConfig[] = streams.map(stream => ({
      id: stream.id,
      key: stream.key,
      label: stream.label,
      description: stream.description,
      residentSharePct: stream.residentSharePct,
      isActive: stream.isActive,
    }));

    return configs;
  }),

  getStream: protectedProcedure.input(GetStreamInput).query(async ({ input, ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const [stream] = await db
      .select()
      .from(dataRevenueStreams)
      .where(
        and(
          eq(dataRevenueStreams.tenantId, tenantId),
          eq(dataRevenueStreams.key, input.streamKey),
          eq(dataRevenueStreams.isActive, true)
        )
      )
      .limit(1);

    if (!stream) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Stream not found' });
    }

    return {
      id: stream.id,
      key: stream.key,
      label: stream.label,
      description: stream.description,
      residentSharePct: stream.residentSharePct,
      isActive: stream.isActive,
    } satisfies StreamConfig;
  }),
});
