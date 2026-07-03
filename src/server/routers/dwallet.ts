import { z } from 'zod';
import {
  router,
  tenantProcedure,
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

import { walletTransactionDto, consentDto, payoutDto } from '@api/shared';

import { TRPCError } from '@trpc/server';
import { rateLimitByUser } from '@api/server';

import { eq, and, desc, sql, inArray } from 'drizzle-orm';

import { getOrCreateWallet } from '@entities/dwallet/server';
import type {
  DWalletSummary,
  ConsentState,
  TransactionItem,
  StreamConfig,
} from '@entities/dwallet';
import { createId } from '@shared/lib/id';

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
  /** Get the current user's wallet summary including balance, consents, and recent transactions.
   * @tenant */
  getWalletSummary: tenantProcedure.query(async ({ ctx }) => {
    const wallet = await getOrCreateWallet(ctx.userId, ctx.tenantId);

    const streams = await db
      .select()
      .from(dataRevenueStreams)
      .where(
        and(eq(dataRevenueStreams.tenantId, ctx.tenantId), eq(dataRevenueStreams.isActive, true))
      );

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
        and(
          eq(walletTransactions.walletId, wallet.id),
          eq(walletTransactions.tenantId, ctx.tenantId)
        )
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

  /** Get the current user's wallet balance.
   * @tenant */
  getBalance: tenantProcedure.query(async ({ ctx }) => {
    const wallet = await getOrCreateWallet(ctx.userId, ctx.tenantId);

    return toEnvelope({
      balance: wallet.balance,
      currency: wallet.currency,
      status: wallet.status,
    });
  }),

  /** List wallet transactions with optional pagination, type, and date filters.
   * @tenant */
  listTransactions: tenantProcedure.input(ListTransactionsInput).query(async ({ input, ctx }) => {
    const wallet = await getOrCreateWallet(ctx.userId, ctx.tenantId);

    const page = input?.page ?? 1;
    const limit = input?.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions = [
      eq(walletTransactions.walletId, wallet.id),
      eq(walletTransactions.tenantId, ctx.tenantId),
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

  /** Get a single wallet transaction by ID.
   * @tenant */
  getTransaction: tenantProcedure.input(IdInput).query(async ({ input, ctx }) => {
    const wallet = await getOrCreateWallet(ctx.userId, ctx.tenantId);

    const [txn] = await db
      .select()
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.id, input.id),
          eq(walletTransactions.walletId, wallet.id),
          eq(walletTransactions.tenantId, ctx.tenantId)
        )
      )
      .limit(1);

    if (!txn) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Transaction not found' });
    }

    return toEnvelope(walletTransactionDto.parse(txn));
  }),

  /** Request a payout from the user's wallet balance. Rate-limited: 1 request per 5 minutes.
   * @tenant */
  createPayout: tenantProcedure.input(CreatePayoutInput).mutation(async ({ input, ctx }) => {
    const rateLimitResult = await rateLimitByUser(ctx.userId, {
      windowMs: 300_000,
      maxRequests: 1,
    });
    if (rateLimitResult) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests. Please try again later.',
      });
    }
    const payoutMin = await getPayoutMin(ctx.tenantId);

    if (input.amount < payoutMin) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Minimum payout is R${payoutMin}`,
      });
    }

    const wallet = await getOrCreateWallet(ctx.userId, ctx.tenantId);

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
    const payoutId = createId();

    await db.insert(payoutRequests).values({
      id: payoutId,
      tenantId: ctx.tenantId,
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

  /** List the user's payout requests with optional status filter.
   * @tenant */
  listPayouts: tenantProcedure.input(ListPayoutsInput).query(async ({ input, ctx }) => {
    const wallet = await getOrCreateWallet(ctx.userId, ctx.tenantId);

    const conditions = [
      eq(payoutRequests.walletId, wallet.id),
      eq(payoutRequests.tenantId, ctx.tenantId),
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

  /** List the user's data consent states across all active revenue streams.
   * @tenant */
  listConsents: tenantProcedure.query(async ({ ctx }) => {
    const wallet = await getOrCreateWallet(ctx.userId, ctx.tenantId);

    const streams = await db
      .select()
      .from(dataRevenueStreams)
      .where(
        and(eq(dataRevenueStreams.tenantId, ctx.tenantId), eq(dataRevenueStreams.isActive, true))
      );

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

  /** Grant or revoke consent for a specific data revenue stream.
   * @tenant */
  createConsent: tenantProcedure.input(CreateConsentInput).mutation(async ({ input, ctx }) => {
    const wallet = await getOrCreateWallet(ctx.userId, ctx.tenantId);

    const [stream] = await db
      .select()
      .from(dataRevenueStreams)
      .where(
        and(
          eq(dataRevenueStreams.tenantId, ctx.tenantId),
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
    const consentId = createId();

    await db.insert(dataConsents).values({
      id: consentId,
      tenantId: ctx.tenantId,
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

  /** Revoke consent for a specific data revenue stream.
   * @tenant */
  revokeConsent: tenantProcedure.input(RevokeConsentInput).mutation(async ({ input, ctx }) => {
    const wallet = await getOrCreateWallet(ctx.userId, ctx.tenantId);

    const [stream] = await db
      .select()
      .from(dataRevenueStreams)
      .where(
        and(
          eq(dataRevenueStreams.tenantId, ctx.tenantId),
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
    const consentId = createId();

    await db.insert(dataConsents).values({
      id: consentId,
      tenantId: ctx.tenantId,
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

  /** List active data revenue streams for the current tenant.
   * @tenant */
  listStreams: tenantProcedure.query(async ({ ctx }) => {
    const streams = await db
      .select()
      .from(dataRevenueStreams)
      .where(
        and(eq(dataRevenueStreams.tenantId, ctx.tenantId), eq(dataRevenueStreams.isActive, true))
      );

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

  /** Get a specific data revenue stream by key.
   * @tenant */
  getStream: tenantProcedure.input(GetStreamInput).query(async ({ input, ctx }) => {
    const [stream] = await db
      .select()
      .from(dataRevenueStreams)
      .where(
        and(
          eq(dataRevenueStreams.tenantId, ctx.tenantId),
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
