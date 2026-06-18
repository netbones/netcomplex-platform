import {
  db,
  maintenanceCategories,
  requireAnyPermission,
  apiSuccess,
  apiNotFound,
  apiGone,
  apiConflict,
  apiError,
} from '@api/server';

import { withTenant } from '@entities/tenant/server';

import { eq, and } from 'drizzle-orm';

/**
 * PATCH /api/maintenance/categories/[id] - Update a maintenance category
 * @body label - Updated display label
 * @body description - Updated description
 * Note: value changes not allowed (would break FK references)
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authError = await requireAnyPermission(['requests']);
  if (authError) return authError;

  const { tenantId } = await withTenant();

  // Verify category belongs to tenant
  const [existing] = await db
    .select()
    .from(maintenanceCategories)
    .where(and(eq(maintenanceCategories.id, id), eq(maintenanceCategories.tenantId, tenantId)))
    .limit(1);

  if (!existing) {
    return apiNotFound('Category not found');
  }

  if (existing.deletedAt) {
    return apiGone('This category has been deleted');
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {};

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

/**
 * DELETE /api/maintenance/categories/[id] - Soft-delete a maintenance category
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authError = await requireAnyPermission(['requests']);
  if (authError) return authError;

  const { tenantId } = await withTenant();

  // Verify category belongs to tenant
  const [existing] = await db
    .select()
    .from(maintenanceCategories)
    .where(and(eq(maintenanceCategories.id, id), eq(maintenanceCategories.tenantId, tenantId)))
    .limit(1);

  if (!existing) {
    return apiNotFound('Category not found');
  }

  // Soft-delete: set deletedAt
  await db
    .update(maintenanceCategories)
    .set({ deletedAt: new Date() })
    .where(eq(maintenanceCategories.id, id));

  return apiSuccess({ success: true, deleted: true });
}
