import { z } from 'zod';
import {
  router,
  protectedProcedure,
  rateLimitMiddleware,
  db,
  walletTransactions,
  payoutRequests,
  dataConsents,
  dataRevenueStreams,
  settings,
  revalidateDashboard,
  now,
  toEnvelope,
} from '@api/server';

import { walletTransactionDto, consentDto, payoutDto } from '@server/dto';

import { TRPCError } from '@trpc/server';

import { eq, and, desc, sql, inArray } from 'drizzle-orm';

import { getOrCreateWallet } from '@entities/dwallet/server';
import type {
  DWalletSummary,
  ConsentState,
  TransactionItem,
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

const DEFAULT_PAYOUT_MIN = 50;

const CreatePayoutInput = z.object({
  amount: z.number().positive().multipleOf(0.01),
});

async function getPayoutMin(tenantId: string): Promise<number> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(and(eq(settings.tenantId, tenantId), eq(settings.key, 'dwallet_min_payout')))
    .limit(1);
  const parsed = row ? Number(row.value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PAYOUT_MIN;
}

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

    const wallet = await getOrCreateWallet(ctx.userId, tenantId);

    const streams = await db
      .select()
      .from(dataRevenueStreams)
      .where(and(eq(dataRevenueStreams.tenantId, tenantId), eq(dataRevenueStreams.isActive, true)));

    const streamKeys = streams.map(s => s.key);
    const latestConsentMap = new Map<string, typeof dataConsents.$inferSelect>();

    if (streamKeys.length > 0) {
      const latestConsents = await db
        .selectDistinctOn([dataConsents.streamKey])
        .from(dataConsents)
        .where(
          and(eq(dataConsents.walletId, wallet.id), inArray(dataConsents.streamKey, streamKeys))
        )
        .orderBy(dataConsents.streamKey, desc(dataConsents.createdAt));

      for (const c of latestConsents) {
        if (!latestConsentMap.has(c.streamKey)) {
          latestConsentMap.set(c.streamKey, c);
        }
      }
    }

    const consents: ConsentState[] = streams.map(stream => {
      const latestConsent = latestConsentMap.get(stream.key);
      return {
        streamKey: stream.key,
        label: stream.label,
        description: stream.description,
        granted: latestConsent?.granted ?? false,
        grantedAt: latestConsent?.grantedAt
          ? new Date(latestConsent.grantedAt).toISOString()
          : null,
        revokedAt: latestConsent?.revokedAt
          ? new Date(latestConsent.revokedAt).toISOString()
          : null,
      };
    });

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

    return toEnvelope(summary);
  }),

  getBalance: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const wallet = await getOrCreateWallet(ctx.userId, tenantId);

    return toEnvelope({
      balance: wallet.balance,
      currency: wallet.currency,
      status: wallet.status,
    });
  }),

  listTransactions: protectedProcedure
    .input(ListTransactionsInput)
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const wallet = await getOrCreateWallet(ctx.userId, tenantId);

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

      return toEnvelope({
        items: txns.map(r => walletTransactionDto.parse(r)),
        total,
        page,
        limit,
        hasMore: page * limit < total,
      });
    }),

  getTransaction: protectedProcedure.input(IdInput).query(async ({ input, ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const wallet = await getOrCreateWallet(ctx.userId, tenantId);

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

    return toEnvelope(walletTransactionDto.parse(txn));
  }),

  createPayout: protectedProcedure
    .use(rateLimitMiddleware({ windowMs: 300_000, maxRequests: 1 }))
    .input(CreatePayoutInput)
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const payoutMin = await getPayoutMin(tenantId);

      if (input.amount < payoutMin) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Minimum payout is R${payoutMin}`,
        });
      }

      const wallet = await getOrCreateWallet(ctx.userId, tenantId);

      const balanceNum = Number(wallet.balance);
      if (balanceNum < payoutMin) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Below minimum payout threshold of R${payoutMin}`,
        });
      }

      if (input.amount > balanceNum) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Insufficient balance',
        });
      }

      const timestamp = now();
      const payoutId = crypto.randomUUID();

      await db.insert(payoutRequests).values({
        id: payoutId,
        tenantId,
        walletId: wallet.id,
        userId: ctx.userId,
        // amount column is decimal(65,30) — Drizzle requires string for precision
        amount: input.amount.toString(),
        currency: wallet.currency,
        status: 'PENDING',
        method: 'bank_transfer',
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      revalidateDashboard();

      return toEnvelope(
        payoutDto.parse({
          id: payoutId,
          amount: input.amount,
          currency: wallet.currency,
          status: 'PENDING',
          method: 'bank_transfer',
          bankReference: null,
          processedAt: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
      );
    }),

  listPayouts: protectedProcedure.input(ListPayoutsInput).query(async ({ input, ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const wallet = await getOrCreateWallet(ctx.userId, tenantId);

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

    return toEnvelope(payouts.map(r => payoutDto.parse(r)));
  }),

  listConsents: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const wallet = await getOrCreateWallet(ctx.userId, tenantId);

    const streams = await db
      .select()
      .from(dataRevenueStreams)
      .where(and(eq(dataRevenueStreams.tenantId, tenantId), eq(dataRevenueStreams.isActive, true)));

    const streamKeys = streams.map(s => s.key);
    const latestConsentMap = new Map<string, typeof dataConsents.$inferSelect>();

    if (streamKeys.length > 0) {
      const latestConsents = await db
        .selectDistinctOn([dataConsents.streamKey])
        .from(dataConsents)
        .where(
          and(eq(dataConsents.walletId, wallet.id), inArray(dataConsents.streamKey, streamKeys))
        )
        .orderBy(dataConsents.streamKey, desc(dataConsents.createdAt));

      for (const c of latestConsents) {
        if (!latestConsentMap.has(c.streamKey)) {
          latestConsentMap.set(c.streamKey, c);
        }
      }
    }

    const consents: ConsentState[] = streams.map(stream => {
      const latestConsent = latestConsentMap.get(stream.key);
      return {
        streamKey: stream.key,
        label: stream.label,
        description: stream.description,
        granted: latestConsent?.granted ?? false,
        grantedAt: latestConsent?.grantedAt
          ? new Date(latestConsent.grantedAt).toISOString()
          : null,
        revokedAt: latestConsent?.revokedAt
          ? new Date(latestConsent.revokedAt).toISOString()
          : null,
      };
    });

    return toEnvelope(consents);
  }),

  createConsent: protectedProcedure.input(CreateConsentInput).mutation(async ({ input, ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const wallet = await getOrCreateWallet(ctx.userId, tenantId);

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
      userId: ctx.userId,
      streamKey: input.streamKey,
      granted: input.granted,
      grantedAt: input.granted ? timestamp : null,
      revokedAt: input.granted ? null : timestamp,
      createdAt: timestamp,
    });

    return toEnvelope(
      consentDto.parse({
        id: consentId,
        streamKey: input.streamKey,
        granted: input.granted,
        grantedAt: input.granted ? timestamp : null,
        revokedAt: input.granted ? null : timestamp,
        createdAt: timestamp,
      })
    );
  }),

  revokeConsent: protectedProcedure.input(RevokeConsentInput).mutation(async ({ input, ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const wallet = await getOrCreateWallet(ctx.userId, tenantId);

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
      userId: ctx.userId,
      streamKey: input.streamKey,
      granted: false,
      grantedAt: null,
      revokedAt: timestamp,
      createdAt: timestamp,
    });

    return toEnvelope(
      consentDto.parse({
        id: consentId,
        streamKey: input.streamKey,
        granted: false,
        grantedAt: null,
        revokedAt: timestamp,
        createdAt: timestamp,
      })
    );
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

    return toEnvelope(configs);
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

    return toEnvelope({
      id: stream.id,
      key: stream.key,
      label: stream.label,
      description: stream.description,
      residentSharePct: stream.residentSharePct,
      isActive: stream.isActive,
    } satisfies StreamConfig);
  }),
});
