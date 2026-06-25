import { NextRequest } from 'next/server';
import { requirePlatformAdmin } from '@entities/tenant/server';
import { apiSuccess, apiInternalError, apiNotFound, writeAuditLog, auth, db } from '@api/server';
import { logError } from '@shared/lib';
import { tenantSubscriptions } from '@schema/tenant-subscriptions';
import { billingPlans } from '@schema/billing-plans';
import { tenants } from '@schema/tenants';
import { eq, and, desc, like, or } from 'drizzle-orm';

export const maxDuration = 8;

// GET /api/admin/platform/billing/subscriptions
// Query params: ?status=ACTIVE&tenantId=xxx&search=planName
export async function GET(request: NextRequest) {
  const guard = await requirePlatformAdmin(request);
  if (guard) return guard;

  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || undefined;
    const tenantIdFilter = searchParams.get('tenantId') || undefined;
    const searchFilter = searchParams.get('search') || undefined;

    // Build filter conditions
    const filters: Array<ReturnType<typeof eq>> = [];
    if (statusFilter) {
      const validStatuses = ['ACTIVE', 'PENDING', 'CANCELLED', 'EXPIRED', 'TRIALING', 'PAST_DUE'];
      if (validStatuses.includes(statusFilter.toUpperCase())) {
        filters.push(
          eq(
            tenantSubscriptions.status,
            statusFilter.toUpperCase() as (typeof tenantSubscriptions.$inferSelect)['status']
          )
        );
      }
    }
    if (tenantIdFilter) {
      filters.push(eq(tenantSubscriptions.tenantId, tenantIdFilter));
    }

    const searchClause = searchFilter
      ? or(like(tenants.name, `%${searchFilter}%`), like(billingPlans.name, `%${searchFilter}%`))
      : undefined;

    // Build combined where clause (Drizzle requires inline chain)
    const hasFilters = filters.length > 0 || searchClause;
    const whereClause = searchClause
      ? and(...filters, searchClause)
      : filters.length > 0
        ? and(...filters)
        : undefined;

    const qb = db
      .select({
        id: tenantSubscriptions.id,
        tenantId: tenantSubscriptions.tenantId,
        planId: tenantSubscriptions.planId,
        status: tenantSubscriptions.status,
        startDate: tenantSubscriptions.startDate,
        endDate: tenantSubscriptions.endDate,
        nextBillingDate: tenantSubscriptions.nextBillingDate,
        trialEndsAt: tenantSubscriptions.trialEndsAt,
        convertedAt: tenantSubscriptions.convertedAt,
        conversionSource: tenantSubscriptions.conversionSource,
        cancelledAt: tenantSubscriptions.cancelledAt,
        cancelReason: tenantSubscriptions.cancelReason,
        tierManualOverride: tenantSubscriptions.tierManualOverride,
        createdAt: tenantSubscriptions.createdAt,
        updatedAt: tenantSubscriptions.updatedAt,
        tenantName: tenants.name,
        planName: billingPlans.name,
        planTier: billingPlans.tier,
      })
      .from(tenantSubscriptions)
      .leftJoin(tenants, eq(tenantSubscriptions.tenantId, tenants.id))
      .leftJoin(billingPlans, eq(tenantSubscriptions.planId, billingPlans.id));

    const rows =
      hasFilters && whereClause
        ? await qb.where(whereClause).orderBy(desc(tenantSubscriptions.createdAt))
        : await qb.orderBy(desc(tenantSubscriptions.createdAt));

    return apiSuccess(rows);
  } catch (error) {
    logError(
      { component: 'platform-billing-subscriptions-api', operation: 'GET' },
      'Failed to list subscriptions',
      error
    );
    return apiInternalError();
  }
}

// PATCH /api/admin/platform/billing/subscriptions
// Admin override: cancel or change subscription status
export async function PATCH(request: NextRequest) {
  const guard = await requirePlatformAdmin(request);
  if (guard) return guard;

  try {
    const body = await request.json();
    const { subscriptionId, status, reason } = body;

    if (!subscriptionId || !status) {
      return apiNotFound('subscriptionId and status are required');
    }

    // Only allow CANCELLED or ACTIVE status changes
    if (status !== 'CANCELLED' && status !== 'ACTIVE') {
      return apiNotFound('Status must be CANCELLED or ACTIVE');
    }

    // Validate subscription exists
    const [subscription] = await db
      .select()
      .from(tenantSubscriptions)
      .where(eq(tenantSubscriptions.id, subscriptionId))
      .limit(1);

    if (!subscription) {
      return apiNotFound('Subscription not found');
    }

    const timestamp = new Date();

    if (status === 'CANCELLED') {
      // Import and use cancelTenantSubscription from tenant-billing
      const { cancelTenantSubscription } = await import('@shared/api/tenant-billing');
      const result = await cancelTenantSubscription({
        tenantId: subscription.tenantId,
        subscriptionId,
        reason: reason || 'admin_cancellation',
      });

      if (!result.ok) {
        return apiNotFound(result.message);
      }
    } else if (status === 'ACTIVE') {
      // Direct update to reactivate
      await db
        .update(tenantSubscriptions)
        .set({
          status: 'ACTIVE',
          cancelledAt: null,
          cancelReason: null,
          updatedAt: timestamp,
        })
        .where(eq(tenantSubscriptions.id, subscriptionId));
    }

    const session = await auth.api.getSession({ headers: request.headers });
    writeAuditLog({
      action: 'SETTINGS_CHANGED',
      actorId: session?.user?.id || 'unknown',
      targetId: subscriptionId,
      details: {
        previousStatus: subscription.status,
        newStatus: status,
        reason: reason || null,
      },
      requestId: request.headers.get('x-request-id') || undefined,
    });

    // Fetch and return updated subscription
    const [updated] = await db
      .select()
      .from(tenantSubscriptions)
      .where(eq(tenantSubscriptions.id, subscriptionId))
      .limit(1);

    return apiSuccess(updated);
  } catch (error) {
    logError(
      { component: 'platform-billing-subscriptions-api', operation: 'PATCH' },
      'Failed to update subscription',
      error
    );
    return apiInternalError();
  }
}
