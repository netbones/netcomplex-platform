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
} from '@api/server';
import { eq, and, isNull } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { hasPermission } from '@shared/lib';

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

    return apiSuccess({ id, ...updateData });
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
