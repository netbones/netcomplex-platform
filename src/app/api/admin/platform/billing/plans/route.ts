import { NextRequest } from 'next/server';
import { requirePlatformAdmin } from '@entities/tenant/server';
import { apiSuccess, apiInternalError, apiNotFound, writeAuditLog, auth, db } from '@api/server';
import { logError } from '@shared/lib';
import { billingPlans } from '@schema/billing-plans';
import { tenants } from '@schema/tenants';
import { eq, asc } from 'drizzle-orm';

export const maxDuration = 8;

// GET /api/admin/platform/billing/plans — List all billing plans with tenant names
export async function GET(request: NextRequest) {
  const guard = await requirePlatformAdmin(request);
  if (guard) return guard;

  try {
    const rows = await db
      .select({
        id: billingPlans.id,
        tenantId: billingPlans.tenantId,
        name: billingPlans.name,
        description: billingPlans.description,
        monthlyPrice: billingPlans.monthlyPrice,
        annualPrice: billingPlans.annualPrice,
        currency: billingPlans.currency,
        interval: billingPlans.interval,
        modulesIncluded: billingPlans.modulesIncluded,
        pageLimits: billingPlans.pageLimits,
        seatLimits: billingPlans.seatLimits,
        aiQuota: billingPlans.aiQuota,
        features: billingPlans.features,
        tier: billingPlans.tier,
        isDefault: billingPlans.isDefault,
        isActive: billingPlans.isActive,
        sortOrder: billingPlans.sortOrder,
        createdAt: billingPlans.createdAt,
        updatedAt: billingPlans.updatedAt,
        tenantName: tenants.name,
      })
      .from(billingPlans)
      .leftJoin(tenants, eq(billingPlans.tenantId, tenants.id))
      .orderBy(asc(billingPlans.sortOrder));

    return apiSuccess(rows);
  } catch (error) {
    logError(
      { component: 'platform-billing-plans-api', operation: 'GET' },
      'Failed to list billing plans',
      error
    );
    return apiInternalError();
  }
}

// PATCH /api/admin/platform/billing/plans — Update a billing plan
export async function PATCH(request: NextRequest) {
  const guard = await requirePlatformAdmin(request);
  if (guard) return guard;

  try {
    const body = await request.json();
    const { planId, ...updates } = body;

    if (!planId) {
      return apiNotFound('planId is required');
    }

    // Validate plan exists
    const [existing] = await db
      .select({ id: billingPlans.id, name: billingPlans.name })
      .from(billingPlans)
      .where(eq(billingPlans.id, planId))
      .limit(1);

    if (!existing) {
      return apiNotFound('Billing plan not found');
    }

    // Build whitelisted update payload
    const allowedFields: Record<string, unknown> = {};
    const whitelist = [
      'name',
      'description',
      'monthlyPrice',
      'annualPrice',
      'modulesIncluded',
      'pageLimits',
      'seatLimits',
      'aiQuota',
      'isActive',
    ];

    for (const field of whitelist) {
      if (field in updates) {
        allowedFields[field] = updates[field];
      }
    }

    if (Object.keys(allowedFields).length === 0) {
      return apiSuccess(existing);
    }

    const [updated] = await db
      .update(billingPlans)
      .set({
        ...allowedFields,
        updatedAt: new Date(),
      } as typeof billingPlans.$inferInsert)
      .where(eq(billingPlans.id, planId))
      .returning();

    const session = await auth.api.getSession({ headers: request.headers });
    writeAuditLog({
      action: 'SETTINGS_CHANGED',
      actorId: session?.user?.id || 'unknown',
      targetId: planId,
      details: { previousName: existing.name, updatedFields: Object.keys(allowedFields) },
      requestId: request.headers.get('x-request-id') || undefined,
    });

    return apiSuccess(updated);
  } catch (error) {
    logError(
      { component: 'platform-billing-plans-api', operation: 'PATCH' },
      'Failed to update billing plan',
      error
    );
    return apiInternalError();
  }
}
