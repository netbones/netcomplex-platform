import {
  auth,
  db,
  communityMerits,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiError,
  apiSuccess,
  now,
  writeAuditLog,
  withErrorHandler,
  rateLimitByUser,
} from '@api/server';
import { eq, and, isNull } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { hasPermission } from '@shared/lib';
import { getStandingTier } from '@entities/merit';
import { getEffectivePoints, getMeritTierThresholds } from '@/entities/merit/services';

export const maxDuration = 8;

const VALID_CATEGORIES = [
  'COMMUNITY_SERVICE',
  'VOLUNTEERISM',
  'MAINTENANCE',
  'NOISE',
  'PARKING',
  'SECURITY',
  'PETS',
  'COMPLIANCE',
  'OTHER',
] as const;

/**
 * GET /api/merits/[id] — Get a single behavior record.
 */
export const GET = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const { tenantId } = await withTenant();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return apiUnauthorized();

    if (!hasPermission(session.user.role, 'users')) return apiForbidden('Insufficient permissions');

    const [row] = await db
      .select()
      .from(communityMerits)
      .where(
        and(
          eq(communityMerits.id, id),
          eq(communityMerits.tenantId, tenantId),
          isNull(communityMerits.deletedAt)
        )
      );

    if (!row) return apiNotFound('Behavior record not found');

    return apiSuccess(row);
  }
);

/**
 * PATCH /api/merits/[id] — Update mutable fields (reason, description, category).
 */
export const PATCH = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const { tenantId } = await withTenant();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return apiUnauthorized();

    if (!hasPermission(session.user.role, 'users')) return apiForbidden('Insufficient permissions');

    const rateLimit = await rateLimitByUser(session.user.id, { windowMs: 60_000, maxRequests: 20 });
    if (rateLimit) return rateLimit;

    const body = await request.json();
    const { reason, description, category } = body;

    const updateData: Record<string, unknown> = {};
    if (reason !== undefined) updateData.reason = reason;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined && VALID_CATEGORIES.includes(category)) {
      updateData.category = category;
    }

    if (Object.keys(updateData).length === 0) {
      return apiError('VALIDATION_ERROR', 'No valid fields to update', 400);
    }

    const [record] = await db
      .select({ userId: communityMerits.userId })
      .from(communityMerits)
      .where(and(eq(communityMerits.id, id), eq(communityMerits.tenantId, tenantId)))
      .limit(1);

    await db
      .update(communityMerits)
      .set(updateData as typeof communityMerits.$inferInsert)
      .where(and(eq(communityMerits.id, id), eq(communityMerits.tenantId, tenantId)));

    await writeAuditLog({
      tenantId,
      action: 'MERIT_RECORD_UPDATED',
      targetId: id,
      actorId: session.user.id,
      details: updateData,
    });

    let standing: { overall: number; tier: string } | null = null;
    if (record?.userId) {
      const points = await getEffectivePoints(record.userId, tenantId);
      const thresholds = await getMeritTierThresholds(tenantId);
      standing = {
        overall: points.overall,
        tier: getStandingTier(points.overall, thresholds),
      };
    }

    return apiSuccess({ id, ...updateData, standing });
  }
);

/**
 * DELETE /api/merits/[id] — Soft-delete a behavior record.
 */
export const DELETE = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const { tenantId } = await withTenant();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return apiUnauthorized();

    if (!hasPermission(session.user.role, 'users')) return apiForbidden('Insufficient permissions');

    const rateLimit = await rateLimitByUser(session.user.id, { windowMs: 60_000, maxRequests: 20 });
    if (rateLimit) return rateLimit;

    const ts = now();
    await db
      .update(communityMerits)
      .set({ deletedAt: ts })
      .where(and(eq(communityMerits.id, id), eq(communityMerits.tenantId, tenantId)));

    await writeAuditLog({
      tenantId,
      action: 'MERIT_RECORD_DELETED',
      targetId: id,
      actorId: session.user.id,
    });

    return apiSuccess({ deleted: true });
  }
);
