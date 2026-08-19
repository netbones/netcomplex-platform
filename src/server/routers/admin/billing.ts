import { z } from 'zod';
import { adminProcedure, db, router, toEnvelope } from '@api/server';
import { tenantInvoices } from '@schema/tenant-invoices';
import { tenantPayments } from '@schema/tenant-payments';
import { tenantSubscriptions } from '@schema/tenant-subscriptions';
import { billingPlans } from '@schema/billing-plans';
import { tenants } from '@schema/tenants';
import { eq, and, isNull, desc, like, lt, or } from 'drizzle-orm';

// ── Input schemas ────────────────────────────────────────────────

const ListSubscriptionsInput = z
  .object({
    status: z.string().optional(),
    search: z.string().optional(),
  })
  .optional();

const ListInvoicesInput = z
  .object({
    tenantId: z.string().optional(),
    subscriptionId: z.string().optional(),
    status: z.enum(['PENDING', 'PAID', 'VOID']).optional(),
    cursor: z.string().optional(),
    limit: z.number().min(1).max(100).default(20),
  })
  .optional();

// ── Helper ───────────────────────────────────────────────────────

function aggregateMonthlyRevenue(
  payments: Array<{
    amount: string | null;
    netAmount: string | null;
    platformFee: string | null;
    createdAt: Date;
  }>
) {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const monthLabels: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthLabels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const monthlyMap = new Map<string, { gross: number; net: number; fees: number }>(
    monthLabels.map(k => [k, { gross: 0, net: 0, fees: 0 }])
  );

  for (const p of payments) {
    const d = new Date(p.createdAt);
    if (d < sixMonthsAgo) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const entry = monthlyMap.get(key);
    if (entry) {
      entry.gross += parseFloat(p.amount ?? '0');
      entry.net += parseFloat(p.netAmount ?? '0');
      entry.fees += parseFloat(p.platformFee ?? '0');
    }
  }

  return monthLabels.map(key => {
    const entry = monthlyMap.get(key)!;
    const [year, month] = key.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    return {
      month: d.toLocaleDateString('en-ZA', { month: 'short' }),
      gross: entry.gross,
      net: entry.net,
      platformFees: entry.fees,
    };
  });
}

// ── Router ───────────────────────────────────────────────────────

export const adminBillingRouter = router({
  /**
   * Revenue summary for the last 6 months — platform admin only.
   * Replaces AdminRevenueWidget → /api/admin/platform/billing/payments
   */
  getRevenue: adminProcedure.query(async () => {
    const payments = await db
      .select({
        amount: tenantPayments.amount,
        netAmount: tenantPayments.netAmount,
        platformFee: tenantPayments.platformFee,
        createdAt: tenantPayments.createdAt,
      })
      .from(tenantPayments)
      .where(and(eq(tenantPayments.status, 'COMPLETED'), isNull(tenantPayments.deletedAt)))
      .orderBy(desc(tenantPayments.createdAt))
      .limit(100);

    const monthlyRevenues = aggregateMonthlyRevenue(payments);
    const totalRevenue = monthlyRevenues.reduce((s, m) => s + m.gross, 0);
    const totalPlatformFees = monthlyRevenues.reduce((s, m) => s + m.platformFees, 0);
    const activeMonths = monthlyRevenues.filter(m => m.gross > 0).length || 1;

    return toEnvelope({
      monthlyRevenues,
      totalRevenue,
      averageMonthly: Math.round(totalRevenue / activeMonths),
      totalPlatformFees,
    });
  }),

  /**
   * Billing overview (MRR, active count, tier dist, conversions, churn).
   * Replaces AdminBillingOverviewWidget → two REST endpoints.
   */
  getBillingOverview: adminProcedure.query(async () => {
    const [subscriptions, plans] = await Promise.all([
      db
        .select({
          status: tenantSubscriptions.status,
          convertedAt: tenantSubscriptions.convertedAt,
        })
        .from(tenantSubscriptions)
        .orderBy(desc(tenantSubscriptions.createdAt)),
      db
        .select({ monthlyPrice: billingPlans.monthlyPrice, tier: billingPlans.tier })
        .from(billingPlans),
    ]);

    const active = subscriptions.filter(s => s.status === 'ACTIVE');
    const cancelled = subscriptions.filter(s => s.status === 'CANCELLED');
    const tierDist: Record<string, number> = {};
    // tier not on subscription — until a plan join is added, all are bucketed as STANDARD
    tierDist['STANDARD'] = subscriptions.length;
    const mrr = plans.reduce((sum, p) => sum + parseFloat(String(p.monthlyPrice ?? '0')), 0);
    const trialConversions = subscriptions.filter(s => s.convertedAt).length;
    const total = active.length + cancelled.length;
    const churnRate = total > 0 ? Math.round((cancelled.length / total) * 100) : 0;

    return toEnvelope({
      mrr,
      activeCount: active.length,
      tierDistribution: tierDist,
      trialConversions,
      churnRate,
    });
  }),

  /**
   * List subscriptions with optional status/search filter.
   * Replaces AdminSubscriptionsWidget → /api/admin/platform/billing/subscriptions
   */
  listSubscriptions: adminProcedure.input(ListSubscriptionsInput).query(async ({ input }) => {
    const statusFilter =
      input?.status && input.status !== 'All' ? input.status.toUpperCase() : undefined;
    const searchFilter = input?.search || undefined;

    const validStatuses = ['ACTIVE', 'PENDING', 'CANCELLED', 'EXPIRED', 'TRIALING', 'PAST_DUE'];

    const conditions = [];
    if (statusFilter && validStatuses.includes(statusFilter)) {
      conditions.push(
        eq(
          tenantSubscriptions.status,
          statusFilter as (typeof tenantSubscriptions.$inferSelect)['status']
        )
      );
    }

    const searchClause = searchFilter
      ? or(like(tenants.name, `%${searchFilter}%`), like(billingPlans.name, `%${searchFilter}%`))
      : undefined;

    const whereClause =
      conditions.length > 0 && searchClause
        ? and(...conditions, searchClause)
        : conditions.length > 0
          ? and(...conditions)
          : searchClause;

    const qb = db
      .select({
        id: tenantSubscriptions.id,
        tenantId: tenantSubscriptions.tenantId,
        planId: tenantSubscriptions.planId,
        status: tenantSubscriptions.status,
        startDate: tenantSubscriptions.startDate,
        nextBillingDate: tenantSubscriptions.nextBillingDate,
        convertedAt: tenantSubscriptions.convertedAt,
        tenantName: tenants.name,
        planName: billingPlans.name,
        planTier: billingPlans.tier,
        planMonthlyPrice: billingPlans.monthlyPrice,
      })
      .from(tenantSubscriptions)
      .leftJoin(tenants, eq(tenantSubscriptions.tenantId, tenants.id))
      .leftJoin(billingPlans, eq(tenantSubscriptions.planId, billingPlans.id));

    const rows = whereClause
      ? await qb.where(whereClause).orderBy(desc(tenantSubscriptions.createdAt))
      : await qb.orderBy(desc(tenantSubscriptions.createdAt));

    return toEnvelope(rows);
  }),

  /**
   * List invoices with optional filters: tenantId, subscriptionId, status, cursor-based pagination.
   * Replaces → /api/admin/platform/billing/invoices
   */
  listInvoices: adminProcedure.input(ListInvoicesInput).query(async ({ input }) => {
    const filters: ReturnType<typeof eq>[] = [];

    if (input?.tenantId) {
      filters.push(eq(tenantInvoices.tenantId, input.tenantId));
    }
    if (input?.subscriptionId) {
      filters.push(eq(tenantInvoices.subscriptionId, input.subscriptionId));
    }
    if (input?.status) {
      filters.push(eq(tenantInvoices.status, input.status));
    }
    if (input?.cursor) {
      filters.push(lt(tenantInvoices.id, input.cursor));
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;
    const limit = input?.limit ?? 20;

    const rows = await db
      .select({
        id: tenantInvoices.id,
        tenantId: tenantInvoices.tenantId,
        subscriptionId: tenantInvoices.subscriptionId,
        transactionId: tenantInvoices.transactionId,
        invoiceNumber: tenantInvoices.invoiceNumber,
        items: tenantInvoices.items,
        subtotal: tenantInvoices.subtotal,
        taxAmount: tenantInvoices.taxAmount,
        total: tenantInvoices.total,
        currency: tenantInvoices.currency,
        status: tenantInvoices.status,
        paidAt: tenantInvoices.paidAt,
        pdfUrl: tenantInvoices.pdfUrl,
        downloadReady: tenantInvoices.downloadReady,
        createdAt: tenantInvoices.createdAt,
        updatedAt: tenantInvoices.updatedAt,
        tenantName: tenants.name,
        subscriptionPlanName: billingPlans.name,
      })
      .from(tenantInvoices)
      .leftJoin(tenants, eq(tenantInvoices.tenantId, tenants.id))
      .leftJoin(tenantSubscriptions, eq(tenantInvoices.subscriptionId, tenantSubscriptions.id))
      .leftJoin(billingPlans, eq(tenantSubscriptions.planId, billingPlans.id))
      .where(whereClause)
      .orderBy(desc(tenantInvoices.createdAt))
      .limit(limit);

    return toEnvelope(rows);
  }),
});
