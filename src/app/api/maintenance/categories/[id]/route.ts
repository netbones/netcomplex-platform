import {
  db,
  maintenanceCategories,
  requireAnyPermission,
  apiSuccess,
  apiNotFound,
  apiError,
  now,
  notDeleted,
  withErrorHandler,
} from '@api/server';

import { withTenant } from '@entities/tenant/server';

import { eq, and } from 'drizzle-orm';

export const maxDuration = 8;

/**
 * PATCH /api/maintenance/categories/[id] - Update a maintenance category
 * @body label - Updated display label
 * @body description - Updated description
 * Note: value changes not allowed (would break FK references)
 * @deprecated Use `trpc.maintenance.updateCategory` instead
 */
export const PATCH = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const authError = await requireAnyPermission(['requests']);
    if (authError) return authError;

    const { tenantId } = await withTenant();

    // Verify category belongs to tenant
    const [existing] = await db
      .select()
      .from(maintenanceCategories)
      .where(
        and(
          eq(maintenanceCategories.id, id),
          eq(maintenanceCategories.tenantId, tenantId),
          notDeleted(maintenanceCategories)
        )
      )
      .limit(1);

    if (!existing) {
      return apiNotFound('Category not found');
    }

    const body = await request.json();

    // Prevent value changes — would break FK references
    if (body.value !== undefined && body.value !== existing.value) {
      return apiError(
        'VALIDATION_ERROR',
        'Cannot change category value — it would break existing request references',
        400
      );
    }

    const updates: Partial<typeof maintenanceCategories.$inferInsert> = {};

    if (body.label !== undefined) updates.label = body.label;
    if (body.description !== undefined) updates.description = body.description;
    if (body.isActive !== undefined) updates.isActive = body.isActive;

    const [updated] = await db
      .update(maintenanceCategories)
      .set(updates)
      .where(and(eq(maintenanceCategories.id, id), eq(maintenanceCategories.tenantId, tenantId)))
      .returning();

    return apiSuccess(updated);
  }
);

/**
 * DELETE /api/maintenance/categories/[id] - Soft-delete a maintenance category
 * @deprecated Use `trpc.maintenance.deleteCategory` instead
 */
export const DELETE = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const authError = await requireAnyPermission(['requests']);
    if (authError) return authError;

    const { tenantId } = await withTenant();

    // Verify category belongs to tenant
    const [existing] = await db
      .select()
      .from(maintenanceCategories)
      .where(
        and(
          eq(maintenanceCategories.id, id),
          eq(maintenanceCategories.tenantId, tenantId),
          notDeleted(maintenanceCategories)
        )
      )
      .limit(1);

    if (!existing) {
      return apiNotFound('Category not found');
    }

    // Soft-delete: set deletedAt
    await db
      .update(maintenanceCategories)
      .set({ deletedAt: now() })
      .where(eq(maintenanceCategories.id, id));

    return apiSuccess({ success: true, deleted: true });
  }
);
