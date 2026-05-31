import { db, maintenanceCategories, maintenanceRequests } from '@api/db';
import { requireAnyPermission } from '@api/auth-utils';
import { withTenant } from '@entities/tenant/api/with-tenant';
import { apiSuccess, apiNotFound, apiConflict, apiError } from '@api/api-response';
import { eq, and, sql } from 'drizzle-orm';

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
 * DELETE /api/maintenance/categories/[id] - Archive (soft-delete) a maintenance category
 * Soft-delete if active requests use this category; hard delete otherwise
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

  // Check for active requests using this category
  const [requestCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(maintenanceRequests)
    .where(
      and(
        eq(maintenanceRequests.tenantId, tenantId),
        eq(maintenanceRequests.category, existing.value),
        sql`${maintenanceRequests.status} NOT IN ('COMPLETED', 'CANCELLED')`
      )
    );

  if (requestCount?.count > 0) {
    // Soft-delete: set isActive = false
    const [updated] = await db
      .update(maintenanceCategories)
      .set({ isActive: false })
      .where(eq(maintenanceCategories.id, id))
      .returning();

    return apiSuccess({ ...updated, archived: true, activeRequests: requestCount.count });
  }

  // Hard delete: no active requests reference this category
  await db.delete(maintenanceCategories).where(eq(maintenanceCategories.id, id));

  return apiSuccess({ success: true, deleted: true });
}
